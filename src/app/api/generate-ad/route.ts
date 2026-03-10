import { NextRequest, NextResponse } from 'next/server'
import { generateAdCopy } from '@/lib/anthropic'
import { deductCredits } from '@/lib/usage'
import { supabase } from '@/lib/supabase'
import type { GenerateAdRequest } from '@/types'

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

  const body: GenerateAdRequest = await req.json()
  const { niche, business_name, location, platform, offer, unique_value } = body

  if (!niche || !business_name || !location || !platform) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const creditCheck = await deductCredits(user.id, 'ad_generated')
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.message }, { status: 402 })
  }

  const result = await generateAdCopy({ niche, business_name, location, platform, offer, unique_value })

  // Save generated ads to DB
  await supabase.from('campaigns').insert({
    user_id: user.id,
    name: `${business_name} - ${platform} - ${new Date().toLocaleDateString()}`,
    niche,
    platform,
    status: 'draft',
    ad_copy: result.ads[0],
    targeting: {
      location,
      radius_miles: 25,
      age_min: 25,
      age_max: 65,
      interests: niche === 'real_estate' ? ['real estate', 'home buying'] : ['legal services'],
      budget_daily: 20,
    },
    impressions: 0,
    clicks: 0,
    leads: 0,
    spend: 0,
  })

  return NextResponse.json(result)
}
