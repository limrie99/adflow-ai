import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
  const { client_id, title, platform, ad_copy, targeting, budget_daily, status, scheduled_for } = body

  if (!client_id || !title) {
    return NextResponse.json({ error: 'client_id and title are required' }, { status: 400 })
  }

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
      platform: platform || 'meta',
      ad_copy: ad_copy || {},
      targeting: targeting || {},
      budget_daily: budget_daily || null,
      status: status || 'draft',
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
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 })
  }

  // Add updated_at
  updates.updated_at = new Date().toISOString()

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

  return NextResponse.json({ ad })
}
