import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTopAdsForWeek } from '@/lib/scraper/orchestrator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const niche = req.nextUrl.searchParams.get('niche') || 'automotive'
  const week = req.nextUrl.searchParams.get('week') || undefined
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

  try {
    const ads = await getTopAdsForWeek(niche, week, limit)

    // Calculate run duration for each ad
    const enriched = ads.map((ad, i) => {
      const start = ad.ad_delivery_start ? new Date(ad.ad_delivery_start as string) : null
      const end = ad.ad_delivery_stop ? new Date(ad.ad_delivery_stop as string) : new Date()
      const runDays = start ? Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        ...ad,
        rank: i + 1,
        run_duration_days: runDays,
      }
    })

    return NextResponse.json({
      niche,
      week_of: week || 'current',
      total: enriched.length,
      ads: enriched,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch top ads' },
      { status: 500 }
    )
  }
}
