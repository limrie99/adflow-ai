import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sendAdReadyForReview } from '@/lib/email'
import { adminAdPatchSchema, adminAdCreateSchema } from '@/lib/validation'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAdminUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const admin = getSupabaseAdmin()
  const { data: role } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (role?.role !== 'admin') return null
  return user
}

// GET /api/admin/ads - List ads with optional status filter
export async function GET(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const clientId = req.nextUrl.searchParams.get('client_id')

  const admin = getSupabaseAdmin()
  let query = admin
    .from('client_ads')
    .select(`
      *,
      agency_clients!inner(business_name, contact_name)
    `)
    .eq('admin_user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }
  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: ads, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten the join
  const formatted = (ads || []).map((ad) => ({
    ...ad,
    client_name: ad.agency_clients?.business_name || 'Unknown',
    agency_clients: undefined,
  }))

  return NextResponse.json({ ads: formatted })
}

// POST /api/admin/ads - Create a new ad for a client
export async function POST(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = adminAdCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { client_id, title, platform, ad_copy, targeting, budget_daily, status, scheduled_for } = parsed.data

  const admin = getSupabaseAdmin()

  // Verify this client belongs to the admin
  const { data: client } = await admin
    .from('agency_clients')
    .select('id')
    .eq('id', client_id)
    .eq('admin_user_id', user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data: ad, error } = await admin
    .from('client_ads')
    .insert({
      client_id,
      admin_user_id: user.id,
      title,
      platform,
      ad_copy,
      targeting,
      budget_daily: budget_daily || null,
      status,
      scheduled_for: scheduled_for || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ad })
}

// PATCH /api/admin/ads - Update an ad
export async function PATCH(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = adminAdPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { id, ...validatedUpdates } = parsed.data

  // Add updated_at
  const updates = { ...validatedUpdates, updated_at: new Date().toISOString() }

  const admin = getSupabaseAdmin()
  const { data: ad, error } = await admin
    .from('client_ads')
    .update(updates)
    .eq('id', id)
    .eq('admin_user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send email notification when ad is sent for approval
  if (updates.status === 'pending_approval' && ad) {
    const { data: client } = await admin
      .from('agency_clients')
      .select('contact_email, business_name')
      .eq('id', ad.client_id)
      .single()

    if (client?.contact_email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      sendAdReadyForReview(
        client.contact_email,
        ad.title,
        `${appUrl}/client/ads/${ad.id}`
      ).catch(() => {}) // fire-and-forget
    }
  }

  return NextResponse.json({ ad })
}
