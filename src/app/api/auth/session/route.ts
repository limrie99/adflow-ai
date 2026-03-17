import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signSession, SESSION_COOKIE } from '@/lib/auth-edge'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-change-me'
const SEVEN_DAYS = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
    }

    // Verify the token server-side using Supabase admin
    const admin = getSupabaseAdmin()
    const { data: { user }, error } = await admin.auth.getUser(access_token)

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Look up the role from the database (server-side, not forgeable)
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = roleData?.role || 'saas_user'

    // Sign the session payload with HMAC
    const payload = {
      userId: user.id,
      role,
      exp: Math.floor(Date.now() / 1000) + SEVEN_DAYS,
    }

    const signed = await signSession(payload, SESSION_SECRET)

    // Set HttpOnly signed cookie
    const res = NextResponse.json({ role })
    res.cookies.set(SESSION_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS,
    })

    // Also keep the access token as HttpOnly cookie for API routes
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS,
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }
}

// DELETE to clear session (logout)
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  res.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 })
  return res
}
