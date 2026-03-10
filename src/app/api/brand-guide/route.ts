import { NextRequest, NextResponse } from 'next/server'
import { generateBrandStyleGuide } from '@/lib/brand-guide'
import { deductCredits } from '@/lib/usage'
import { supabase } from '@/lib/supabase'

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

  const { niche, agency_name, target_audience, brand_vibe } = await req.json()
  if (!niche) {
    return NextResponse.json({ error: 'Niche is required' }, { status: 400 })
  }

  const creditCheck = await deductCredits(user.id, 'ad_generated')
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.message }, { status: 402 })
  }

  try {
    const result = await generateBrandStyleGuide(niche, agency_name, target_audience, brand_vibe)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
