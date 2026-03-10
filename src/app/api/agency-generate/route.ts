import { NextRequest, NextResponse } from 'next/server'
import { generateAdsFromWebsiteData, type ScannedBusiness } from '@/lib/website-scanner'
import { deductCredits } from '@/lib/usage'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'

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

  const { scanned_data, strategy, platform } = await req.json() as {
    scanned_data: ScannedBusiness
    strategy: { recommended_offers: string[]; recommended_ctas: string[]; strategy_summary: string }
    platform: 'meta' | 'google'
  }

  if (!scanned_data || !strategy || !platform) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const creditCheck = await deductCredits(user.id, 'ad_generated')
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.message }, { status: 402 })
  }

  try {
    const result = await generateAdsFromWebsiteData(scanned_data, strategy, platform)

    // Map niche from industry string
    const nicheMap: Record<string, string> = {
      'car dealership': 'automotive',
      'dealership': 'automotive',
      'auto': 'automotive',
      'dental': 'medical_dental',
      'dentist': 'medical_dental',
      'medical': 'medical_dental',
      'law': 'law',
      'legal': 'law',
      'attorney': 'law',
      'real estate': 'real_estate',
      'realtor': 'real_estate',
      'plumb': 'home_services',
      'hvac': 'home_services',
      'roof': 'home_services',
      'electric': 'home_services',
      'home': 'home_services',
      'salon': 'local_services',
      'gym': 'local_services',
      'wedding': 'wedding',
      'photography': 'wedding',
    }

    const industry = scanned_data.industry.toLowerCase()
    let niche = 'local_services'
    for (const [key, val] of Object.entries(nicheMap)) {
      if (industry.includes(key)) {
        niche = val
        break
      }
    }

    // Save campaign to DB
    await supabaseAdmin.from('campaigns').insert({
      user_id: user.id,
      name: `${scanned_data.business_name} - ${platform} - Agency`,
      niche,
      platform,
      status: 'draft',
      ad_copy: result.ads[0],
      targeting: {
        location: scanned_data.location,
        radius_miles: 25,
        age_min: 25,
        age_max: 65,
        interests: scanned_data.services.slice(0, 3),
        budget_daily: 20,
      },
      impressions: 0,
      clicks: 0,
      leads: 0,
      spend: 0,
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
