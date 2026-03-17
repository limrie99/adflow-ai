import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sendAdApproved, sendAdRejected } from '@/lib/email'
import { clientAdPatchSchema } from '@/lib/validation'

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
  const parsed = clientAdPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { id, status, client_feedback, approved_at, rejected_at } = parsed.data

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

  // Notify admin when client approves/rejects
  if (ad && status) {
    const { data: clientInfo } = await admin
      .from('agency_clients')
      .select('business_name, admin_user_id')
      .eq('id', clientRecord.id)
      .single()

    if (clientInfo) {
      // Get admin's email
      const { data: { user: adminUser } } = await admin.auth.admin.getUserById(clientInfo.admin_user_id)
      const adminEmail = adminUser?.email

      if (adminEmail) {
        const clientName = clientInfo.business_name || 'Client'
        if (status === 'approved') {
          sendAdApproved(adminEmail, clientName, ad.title).catch(() => {})
        } else if (status === 'rejected') {
          sendAdRejected(adminEmail, clientName, ad.title, ad.client_feedback || '').catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({ ad })
}
