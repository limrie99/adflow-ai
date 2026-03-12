import { NextRequest, NextResponse } from 'next/server'
import { scrapeAdLibrary } from '@/lib/ad-library'
import { deductCredits } from '@/lib/usage'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { niche, location, competitors, real_ads, playbook_mode } = await req.json()
  if (!niche) {
    return NextResponse.json({ error: 'Niche is required' }, { status: 400 })
  }

  const creditCheck = await deductCredits(user.id, 'ad_generated')
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.message }, { status: 402 })
  }

  try {
    // If real ads passed in (from playbook page), use them directly for Claude analysis
    let realAdContext = ''
    if (real_ads && Array.isArray(real_ads) && real_ads.length > 0) {
      realAdContext = real_ads.map((ad: Record<string, unknown>) =>
        `Advertiser: ${ad.advertiser_name}\nHeadline: ${ad.headline || 'N/A'}\nBody: ${ad.body_text || 'N/A'}\nCTA: ${ad.cta || 'N/A'}\nRunning: ${ad.run_duration_days || '?'} days\nPlatforms: ${(ad.platforms as string[])?.join(', ') || 'Facebook'}\nScore: ${ad.performance_score || 0}`
      ).join('\n---\n')
    } else {
      // Check for cached scraped ads in database
      const supabaseAdmin = getSupabaseAdmin()
      const { data: cachedAds } = await supabaseAdmin
        .from('scraped_ads')
        .select('advertiser_name, headline, body_text, cta, platforms, media_type, ad_delivery_start, performance_score, spend_upper')
        .eq('niche', niche)
        .eq('is_active', true)
        .order('performance_score', { ascending: false })
        .limit(20)

      if (cachedAds && cachedAds.length > 0) {
        const now = new Date()
        realAdContext = cachedAds.map((ad) => {
          const start = ad.ad_delivery_start ? new Date(ad.ad_delivery_start) : null
          const days = start ? Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0
          return `Advertiser: ${ad.advertiser_name}\nHeadline: ${ad.headline || 'N/A'}\nBody: ${ad.body_text || 'N/A'}\nCTA: ${ad.cta || 'N/A'}\nRunning: ${days} days\nPlatforms: ${ad.platforms?.join(', ') || 'Facebook'}\nScore: ${ad.performance_score || 0}`
        }).join('\n---\n')
      }
    }

    // Pass real ad context to scrapeAdLibrary (Claude will analyze real data if available)
    const result = await scrapeAdLibrary(niche, location || '', competitors, realAdContext)

    return NextResponse.json({
      ...result,
      data_source: realAdContext ? 'real_scraped' : 'ai_generated',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ad spy failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
