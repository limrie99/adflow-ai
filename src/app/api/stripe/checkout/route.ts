import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
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

  const { package_id } = await req.json()
  if (!package_id) {
    return NextResponse.json({ error: 'package_id is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Get client record
  const { data: clientRecord } = await admin
    .from('agency_clients')
    .select('id, stripe_customer_id, contact_email')
    .eq('client_user_id', user.id)
    .single()

  if (!clientRecord) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get package
  const { data: pkg } = await admin
    .from('ad_packages')
    .select('*')
    .eq('id', package_id)
    .eq('is_active', true)
    .single()

  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  try {
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create or get Stripe customer
    let customerId = clientRecord.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clientRecord.contact_email || user.email,
        metadata: { client_id: clientRecord.id },
      })
      customerId = customer.id

      // Save customer ID
      await admin
        .from('agency_clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', clientRecord.id)
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: pkg.stripe_price_id
        ? [{ price: pkg.stripe_price_id, quantity: 1 }]
        : [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: pkg.name,
                description: `${pkg.ad_count} ad credits for your campaigns`,
              },
              unit_amount: Math.round(pkg.price * 100),
            },
            quantity: 1,
          }],
      metadata: {
        client_id: clientRecord.id,
        package_id: pkg.id,
        ad_count: String(pkg.ad_count),
      },
      success_url: `${appUrl}/client/billing?success=true`,
      cancel_url: `${appUrl}/client/billing?canceled=true`,
    })

    // Record pending payment
    await admin
      .from('client_payments')
      .insert({
        client_id: clientRecord.id,
        amount: pkg.price,
        description: pkg.name,
        status: 'pending',
        stripe_checkout_session_id: session.id,
      })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
