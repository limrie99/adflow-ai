import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getClientUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/client/ads - List ads for this client
export async function GET(req: NextRequest) {
  const user = await getClientUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Find which agency_client this user belongs to
  const { data: clientRecord } = await admin
    .from('agency_clients')
    .select('id')
    .eq('client_user_id', user.id)
    .single()

  if (!clientRecord) {
    return NextResponse.json({ ads: [] })
  }

  const { data: ads, error } = await admin
    .from('client_ads')
    .select('*')
    .eq('client_id', clientRecord.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ads })
}

// PATCH /api/client/ads - Client approves/rejects an ad
export async function PATCH(req: NextRequest) {
  const user = await getClientUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, status, client_feedback, approved_at, rejected_at } = body

  if (!id) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 })
  }

  // Only allow approve/reject from client
  if (status && !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Clients can only approve or reject ads' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Verify this ad belongs to the client
  const { data: clientRecord } = await admin
    .from('agency_clients')
    .select('id')
    .eq('client_user_id', user.id)
    .single()

  if (!clientRecord) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (client_feedback) updates.client_feedback = client_feedback
  if (approved_at) updates.approved_at = approved_at
  if (rejected_at) updates.rejected_at = rejected_at

  const { data: ad, error } = await admin
    .from('client_ads')
    .update(updates)
    .eq('id', id)
    .eq('client_id', clientRecord.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ad })
}
