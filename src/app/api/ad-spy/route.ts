import { NextRequest, NextResponse } from 'next/server'
import { scrapeAdLibrary } from '@/lib/ad-library'
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

  const { niche, location, competitors } = await req.json()
  if (!niche || !location) {
    return NextResponse.json({ error: 'Niche and location are required' }, { status: 400 })
  }

  const creditCheck = await deductCredits(user.id, 'ad_generated')
  if (!creditCheck.ok) {
    return NextResponse.json({ error: creditCheck.message }, { status: 402 })
  }

  try {
    const result = await scrapeAdLibrary(niche, location, competitors)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ad spy failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
