import { NextRequest, NextResponse } from 'next/server'
import { generateOutreachMessage } from '@/lib/anthropic'
import { trackUsage } from '@/lib/usage'
import { supabase } from '@/lib/supabase'
import type { Niche } from '@/types'

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

  const { business_id, leads } = await req.json()
  // leads: Array<{ instagram_handle: string, name?: string }>

  if (!business_id || !leads?.length) {
    return NextResponse.json({ error: 'business_id and leads required' }, { status: 400 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name, niche')
    .eq('id', business_id)
    .eq('user_id', user.id)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const results = []

  for (const lead of leads as Array<{ instagram_handle: string; name?: string }>) {
    const message = await generateOutreachMessage(
      business.niche as Niche,
      business.name,
      lead.name
    )

    // Save lead record
    const { data: leadRecord } = await supabase
      .from('leads')
      .insert({
        business_id,
        user_id: user.id,
        instagram_handle: lead.instagram_handle,
        name: lead.name,
        platform: 'instagram',
        status: 'pending',
        message_sent: message,
      })
      .select()
      .single()

    await trackUsage(user.id, 'lead_outreach')

    // Note: Actual Instagram DM sending requires Instagram Graph API
    // with proper business account permissions. The message is generated
    // and stored — delivery is handled client-side or via a connected Instagram account.
    results.push({
      lead: lead.instagram_handle,
      message,
      lead_id: leadRecord?.id,
    })
  }

  return NextResponse.json({ results })
}
