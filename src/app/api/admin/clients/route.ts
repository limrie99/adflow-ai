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

// GET /api/admin/clients - List all clients for this admin
export async function GET(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: clients, error } = await admin
    .from('agency_clients')
    .select('*')
    .eq('admin_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients })
}

// POST /api/admin/clients - Create a new client
export async function POST(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { business_name, contact_name, contact_email, contact_phone, niche, website, location, monthly_ad_budget, notes } = body

  if (!business_name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: client, error } = await admin
    .from('agency_clients')
    .insert({
      admin_user_id: user.id,
      business_name,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      niche: niche || null,
      website: website || null,
      location: location || null,
      monthly_ad_budget: monthly_ad_budget || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client })
}

// PATCH /api/admin/clients - Update a client
export async function PATCH(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: client, error } = await admin
    .from('agency_clients')
    .update(updates)
    .eq('id', id)
    .eq('admin_user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client })
}
