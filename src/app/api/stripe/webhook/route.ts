import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const clientId = session.metadata?.client_id
    const adCount = parseInt(session.metadata?.ad_count || '0', 10)

    if (clientId && adCount > 0) {
      // Update payment status
      await admin
        .from('client_payments')
        .update({
          status: 'paid',
          stripe_payment_intent_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || null,
        })
        .eq('stripe_checkout_session_id', session.id)

      // Add ad credits to client
      const { data: client } = await admin
        .from('agency_clients')
        .select('ads_remaining')
        .eq('id', clientId)
        .single()

      if (client) {
        await admin
          .from('agency_clients')
          .update({ ads_remaining: (client.ads_remaining || 0) + adCount })
          .eq('id', clientId)
      }
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session

    await admin
      .from('client_payments')
      .update({ status: 'failed' })
      .eq('stripe_checkout_session_id', session.id)
  }

  return NextResponse.json({ received: true })
}
