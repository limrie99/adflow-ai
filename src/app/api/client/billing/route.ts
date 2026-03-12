import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/client/billing - Get client info, packages, and payment history
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Get client record
  const { data: clientRecord } = await admin
    .from('agency_clients')
    .select('id, business_name, ads_remaining')
    .eq('client_user_id', user.id)
    .single()

  // Get active packages
  const { data: packages } = await admin
    .from('ad_packages')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  // Get payment history
  let payments: unknown[] = []
  if (clientRecord) {
    const { data: paymentData } = await admin
      .from('client_payments')
      .select('*')
      .eq('client_id', clientRecord.id)
      .order('created_at', { ascending: false })

    payments = paymentData || []
  }

  return NextResponse.json({
    client: clientRecord ? {
      business_name: clientRecord.business_name,
      ads_remaining: clientRecord.ads_remaining,
    } : null,
    packages: packages || [],
    payments,
  })
}
