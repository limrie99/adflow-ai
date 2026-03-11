import { NextRequest, NextResponse } from 'next/server'
import { runScrapeJob } from '@/lib/scraper/orchestrator'
import { getNicheSearchTerms } from '@/lib/scraper/meta-api'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== (process.env.SCRAPE_CRON_SECRET || 'adflow-scrape-2024')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nicheParam = req.nextUrl.searchParams.get('niche')
  const niches = nicheParam
    ? [nicheParam]
    : (process.env.SCRAPE_NICHES || 'automotive,real_estate,medical_dental,law,home_services,local_services,wedding').split(',')

  const country = process.env.SCRAPE_COUNTRY || 'US'
  const results: Record<string, unknown>[] = []

  for (const niche of niches) {
    try {
      const searchTerms = getNicheSearchTerms(niche.trim(), '')
      const result = await runScrapeJob({
        niche: niche.trim(),
        location: '',
        countryCode: country,
        searchTerms,
      })
      results.push({ niche: niche.trim(), ...result })
    } catch (error) {
      results.push({
        niche: niche.trim(),
        error: error instanceof Error ? error.message : 'Failed',
      })
    }
  }

  const totalAds = results.reduce((sum, r) => sum + ((r.ads_found as number) || 0), 0)
  const totalNew = results.reduce((sum, r) => sum + ((r.ads_new as number) || 0), 0)

  return NextResponse.json({
    success: true,
    total_ads_found: totalAds,
    total_new: totalNew,
    niches_processed: results.length,
    results,
  })
}
