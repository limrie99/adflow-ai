import { NextRequest, NextResponse } from 'next/server'
import { generateCompetitorStrategy } from '@/lib/website-scanner'
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

  const { niche, location, business_context } = await req.json()
  if (!niche || !location) {
    return NextResponse.json({ error: 'Niche and location are required' }, { status: 400 })
  }

  try {
    const result = await generateCompetitorStrategy(niche, location, business_context)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
