import { createClient } from '@supabase/supabase-js'
import { fetchAdsFromAPI, getNicheSearchTerms } from './meta-api'
import { calculatePerformanceScore, getCurrentWeekMonday } from './scoring'
import { ScrapedAd, ScrapeRunConfig, ScrapeRunResult } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function runScrapeJob(config: ScrapeRunConfig): Promise<ScrapeRunResult> {
  // Create scrape run record
  const { data: run } = await supabaseAdmin
    .from('scrape_runs')
    .insert({
      niche: config.niche,
      location: config.location,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const runId = run?.id

  try {
    // Fetch ads from Meta API
    const searchTerms = config.searchTerms.length > 0
      ? config.searchTerms
      : getNicheSearchTerms(config.niche, config.location)

    const ads = await fetchAdsFromAPI({
      niche: config.niche,
      location: config.location,
      countryCode: config.countryCode,
      searchTerms,
      limit: 50,
    })

    if (ads.length === 0) {
      await updateRunStatus(runId, 'completed', { ads_found: 0, ads_new: 0 })
      return { ads_found: 0, ads_new: 0, ads_updated: 0 }
    }

    // Score and dedupe
    const weekOf = getCurrentWeekMonday()
    let adsNew = 0
    let adsUpdated = 0

    for (const ad of ads) {
      const score = calculatePerformanceScore(ad)

      // Check for existing ad (by external_id or advertiser+headline combo)
      const existing = ad.external_id
        ? await findByExternalId(ad.external_id)
        : await findByContent(ad.advertiser_name, ad.headline || '', ad.body_text || '')

      if (existing) {
        // Update existing ad
        await supabaseAdmin
          .from('scraped_ads')
          .update({
            is_active: ad.is_active,
            spend_lower: ad.spend_lower,
            spend_upper: ad.spend_upper,
            impressions_lower: ad.impressions_lower,
            impressions_upper: ad.impressions_upper,
            performance_score: score,
            ad_delivery_stop: ad.ad_delivery_stop,
            scraped_at: new Date().toISOString(),
            week_of: weekOf,
            raw_data: ad.raw_data,
          })
          .eq('id', existing.id)
        adsUpdated++
      } else {
        // Insert new ad
        await supabaseAdmin
          .from('scraped_ads')
          .insert({
            external_id: ad.external_id,
            advertiser_name: ad.advertiser_name,
            niche: ad.niche,
            location_query: ad.location_query,
            country_code: ad.country_code,
            headline: ad.headline,
            body_text: ad.body_text,
            cta: ad.cta,
            platforms: ad.platforms,
            media_type: ad.media_type,
            ad_delivery_start: ad.ad_delivery_start,
            ad_delivery_stop: ad.ad_delivery_stop,
            is_active: ad.is_active,
            spend_lower: ad.spend_lower,
            spend_upper: ad.spend_upper,
            impressions_lower: ad.impressions_lower,
            impressions_upper: ad.impressions_upper,
            performance_score: score,
            raw_data: ad.raw_data,
            source: ad.source,
            week_of: weekOf,
          })
        adsNew++
      }
    }

    await updateRunStatus(runId, 'completed', {
      ads_found: ads.length,
      ads_new: adsNew,
    })

    return { ads_found: ads.length, ads_new: adsNew, ads_updated: adsUpdated }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await updateRunStatus(runId, 'failed', { error_message: msg })
    throw error
  }
}

export async function getTopAds(niche: string, limit = 20): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from('scraped_ads')
    .select('*')
    .eq('niche', niche)
    .eq('is_active', true)
    .not('performance_score', 'is', null)
    .order('performance_score', { ascending: false })
    .limit(limit)

  return data || []
}

export async function getTopAdsForWeek(niche: string, weekOf?: string, limit = 20): Promise<Record<string, unknown>[]> {
  const week = weekOf || getCurrentWeekMonday()
  const { data } = await supabaseAdmin
    .from('scraped_ads')
    .select('*')
    .eq('niche', niche)
    .eq('week_of', week)
    .eq('is_active', true)
    .not('performance_score', 'is', null)
    .order('performance_score', { ascending: false })
    .limit(limit)

  // If no data for this week, fall back to most recent data
  if (!data?.length) {
    return getTopAds(niche, limit)
  }

  return data
}

async function findByExternalId(externalId: string) {
  const { data } = await supabaseAdmin
    .from('scraped_ads')
    .select('id')
    .eq('external_id', externalId)
    .single()
  return data
}

async function findByContent(advertiser: string, headline: string, bodyText: string) {
  let query = supabaseAdmin
    .from('scraped_ads')
    .select('id')
    .eq('advertiser_name', advertiser)

  if (headline) query = query.eq('headline', headline)
  if (bodyText) query = query.eq('body_text', bodyText)

  const { data } = await query.limit(1).single()
  return data
}

async function updateRunStatus(
  runId: string | undefined,
  status: string,
  extra: Record<string, unknown> = {}
) {
  if (!runId) return
  await supabaseAdmin
    .from('scrape_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', runId)
}
