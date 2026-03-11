import { ScrapedAd } from './types'

interface MetaAdArchiveResponse {
  data: MetaAdEntry[]
  paging?: {
    cursors?: { after?: string }
    next?: string
  }
}

interface MetaAdEntry {
  id?: string
  page_name?: string
  page_id?: string
  ad_creative_bodies?: string[]
  ad_creative_link_titles?: string[]
  ad_creative_link_captions?: string[]
  ad_creative_link_descriptions?: string[]
  ad_delivery_start_time?: string
  ad_delivery_stop_time?: string
  publisher_platforms?: string[]
  estimated_audience_size?: { lower_bound?: number; upper_bound?: number }
  spend?: { lower_bound?: string; upper_bound?: string }
  impressions?: { lower_bound?: string; upper_bound?: string }
  currency?: string
  ad_snapshot_url?: string
}

async function getMetaAccessToken(): Promise<string | null> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return null

  try {
    const res = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      return data.access_token || null
    }
  } catch {
    // Failed to get token
  }
  return null
}

function getNicheSearchTerms(niche: string, location: string): string[] {
  const city = location.split(',')[0]?.trim() || ''
  const prefix = city ? `${city} ` : ''

  const nicheTerms: Record<string, string[]> = {
    automotive: [`${prefix}car dealership`, `${prefix}auto dealer`, 'new car deals', 'used cars for sale', `${prefix}trucks for sale`],
    car_dealership: [`${prefix}car dealership`, `${prefix}auto dealer`, 'car sale', 'new car deals'],
    real_estate: [`${prefix}realtor`, `${prefix}homes for sale`, 'real estate agent', 'home buying', `${prefix}houses`],
    home_services: [`${prefix}plumber`, `${prefix}HVAC`, `${prefix}roofing`, `${prefix}electrician`, 'home repair'],
    medical_dental: [`${prefix}dentist`, `${prefix}dental implants`, 'teeth whitening', `${prefix}orthodontist`, 'dental office'],
    law: [`${prefix}lawyer`, `${prefix}attorney`, 'personal injury lawyer', 'legal help', `${prefix}law firm`],
    local_services: [`${prefix}salon`, `${prefix}gym`, `${prefix}spa`, `${prefix}cleaning service`, 'near me'],
    wedding: [`${prefix}wedding photographer`, `${prefix}wedding venue`, 'wedding planner', 'bridal shop', 'wedding DJ'],
  }

  return nicheTerms[niche] || [`${prefix}${niche}`, `${niche} near me`, `best ${niche}`]
}

export async function fetchAdsFromAPI(params: {
  niche: string
  location: string
  countryCode: string
  searchTerms?: string[]
  limit?: number
}): Promise<ScrapedAd[]> {
  const accessToken = await getMetaAccessToken()
  if (!accessToken) {
    throw new Error('META_APP_ID and META_APP_SECRET required for Ad Library API')
  }

  const terms = params.searchTerms || getNicheSearchTerms(params.niche, params.location)
  const maxPerTerm = Math.ceil((params.limit || 50) / terms.length)
  const allAds: ScrapedAd[] = []

  for (const term of terms.slice(0, 8)) {
    try {
      let cursor: string | undefined
      let fetched = 0

      while (fetched < maxPerTerm) {
        const searchParams = new URLSearchParams({
          access_token: accessToken,
          search_terms: term,
          ad_type: 'ALL',
          ad_reached_countries: JSON.stringify([params.countryCode]),
          ad_active_status: 'ACTIVE',
          fields: [
            'id',
            'page_name',
            'page_id',
            'ad_creative_bodies',
            'ad_creative_link_titles',
            'ad_creative_link_captions',
            'ad_creative_link_descriptions',
            'ad_delivery_start_time',
            'ad_delivery_stop_time',
            'publisher_platforms',
            'estimated_audience_size',
            'spend',
            'impressions',
            'currency',
            'ad_snapshot_url',
          ].join(','),
          limit: String(Math.min(25, maxPerTerm - fetched)),
        })

        if (cursor) searchParams.set('after', cursor)

        const res = await fetch(
          `https://graph.facebook.com/v19.0/ads_archive?${searchParams}`,
          { signal: AbortSignal.timeout(15000) }
        )

        if (!res.ok) {
          const errText = await res.text().catch(() => 'unknown error')
          console.error(`Meta API error for "${term}": ${res.status} - ${errText}`)
          break
        }

        const data: MetaAdArchiveResponse = await res.json()
        if (!data.data?.length) break

        for (const entry of data.data) {
          allAds.push(mapMetaEntryToScrapedAd(entry, params.niche, params.location, params.countryCode))
        }

        fetched += data.data.length
        cursor = data.paging?.cursors?.after
        if (!cursor || !data.paging?.next) break

        // Rate limit: small delay between pages
        await new Promise(r => setTimeout(r, 500))
      }

      // Rate limit: delay between search terms
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`Failed to fetch ads for "${term}":`, err)
      continue
    }
  }

  return allAds
}

function mapMetaEntryToScrapedAd(
  entry: MetaAdEntry,
  niche: string,
  location: string,
  countryCode: string
): ScrapedAd {
  const bodyTexts = entry.ad_creative_bodies || []
  const headlines = entry.ad_creative_link_titles || []
  const captions = entry.ad_creative_link_captions || []

  return {
    external_id: entry.id || undefined,
    advertiser_name: entry.page_name || 'Unknown',
    niche,
    location_query: location,
    country_code: countryCode,
    headline: headlines[0] || undefined,
    body_text: bodyTexts[0] || undefined,
    cta: captions[0] || entry.ad_creative_link_descriptions?.[0] || undefined,
    platforms: entry.publisher_platforms || ['facebook'],
    media_type: 'image', // API doesn't directly expose this, default
    ad_delivery_start: entry.ad_delivery_start_time
      ? new Date(entry.ad_delivery_start_time).toISOString().split('T')[0]
      : undefined,
    ad_delivery_stop: entry.ad_delivery_stop_time
      ? new Date(entry.ad_delivery_stop_time).toISOString().split('T')[0]
      : null,
    is_active: !entry.ad_delivery_stop_time,
    spend_lower: entry.spend?.lower_bound ? parseInt(entry.spend.lower_bound) : undefined,
    spend_upper: entry.spend?.upper_bound ? parseInt(entry.spend.upper_bound) : undefined,
    impressions_lower: entry.impressions?.lower_bound ? parseInt(entry.impressions.lower_bound) : undefined,
    impressions_upper: entry.impressions?.upper_bound ? parseInt(entry.impressions.upper_bound) : undefined,
    raw_data: entry as Record<string, unknown>,
    source: 'api',
  }
}

export { getNicheSearchTerms }
