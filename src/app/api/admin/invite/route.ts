import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'
import { inviteSchema } from '@/lib/validation'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify admin
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

  // Check admin role
  const { data: roleData } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { client_id, email, password } = parsed.data

  // Verify the client belongs to this admin
  const { data: client } = await admin
    .from('agency_clients')
    .select('id, client_user_id')
    .eq('id', client_id)
    .eq('admin_user_id', user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  if (client.client_user_id) {
    return NextResponse.json({ error: 'Client already has a login' }, { status: 400 })
  }

  try {
    // Create the user account via admin API
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 500 })
    }

    // Set role to 'client'
    await admin
      .from('user_roles')
      .upsert({ user_id: newUser.user.id, role: 'client' })

    // Link client to user
    await admin
      .from('agency_clients')
      .update({ client_user_id: newUser.user.id, contact_email: email })
      .eq('id', client_id)

    // Also give them credits
    await admin
      .from('user_credits')
      .upsert({ user_id: newUser.user.id, credits: 0 })

    // Send welcome email with credentials
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    sendWelcomeEmail(email, password, `${appUrl}/login`).catch(() => {})

    return NextResponse.json({
      success: true,
      user_id: newUser.user.id,
      message: 'Client account created successfully',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create client account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
