import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createHmac } from 'crypto'

// Credit bundles available on Whop
const BUNDLE_CREDITS: Record<string, number> = {
  starter: 20,    // $9
  pro: 60,        // $24
  agency: 200,    // $69
}

function verifyWhopSignature(payload: string, signature: string): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${expected}` === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-whop-signature') ?? ''

  if (!verifyWhopSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.action === 'payment.completed') {
    const { user_id: whopUserId, product_id, metadata } = event.data

    // metadata.supabase_user_id should be passed from Whop checkout
    const supabaseUserId = metadata?.supabase_user_id
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Missing supabase_user_id in metadata' }, { status: 400 })
    }

    const credits = BUNDLE_CREDITS[product_id] ?? 0
    if (!credits) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
    }

    // Upsert credits
    const { data: existing } = await supabaseAdmin
      .from('user_credits')
      .select('credits')
      .eq('user_id', supabaseUserId)
      .single()

    if (existing) {
      await supabaseAdmin
        .from('user_credits')
        .update({ credits: existing.credits + credits, updated_at: new Date().toISOString() })
        .eq('user_id', supabaseUserId)
    } else {
      await supabaseAdmin
        .from('user_credits')
        .insert({ user_id: supabaseUserId, credits, whop_user_id: whopUserId })
    }
  }

  return NextResponse.json({ received: true })
}
