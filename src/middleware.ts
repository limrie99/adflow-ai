import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth-edge'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-change-me'

// Routes that require admin role
const ADMIN_ROUTES = ['/admin', '/agency', '/dashboard', '/campaigns', '/leads']

// Routes that require client role
const CLIENT_ROUTES = ['/client']

// Routes that require any authentication
const ALL_PROTECTED = [...ADMIN_ROUTES, ...CLIENT_ROUTES]

// Auth pages (login, signup)
const AUTH_PAGES = ['/login', '/onboarding']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = ALL_PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))
  const isAdminRoute = ADMIN_ROUTES.some((p) => pathname.startsWith(p))
  const isClientRoute = CLIENT_ROUTES.some((p) => pathname.startsWith(p))

  // Verify signed session cookie (server-signed, not forgeable)
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value
  let role: string | null = null
  let authenticated = false

  if (sessionCookie) {
    const payload = await verifySession(sessionCookie, SESSION_SECRET)
    if (payload) {
      role = payload.role
      authenticated = true
    }
  }

  // Fallback: check for access token (for backwards compat during transition)
  const hasToken = authenticated || !!req.cookies.get('sb-access-token')?.value

  // Not logged in → redirect to login
  if (isProtected && !hasToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in on auth page → redirect to role-based home
  if (isAuthPage && hasToken) {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    } else if (role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Role-based access control (only enforced when we have a verified role)
  if (authenticated && role) {
    // Clients trying to access admin routes → redirect to client dashboard
    if (isAdminRoute && role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url))
    }

    // Admins can access everything
    // saas_user can access dashboard/campaigns/leads but not /admin or /client
    if (isClientRoute && role !== 'client' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/campaigns/:path*',
    '/leads/:path*',
    '/agency/:path*',
    '/admin/:path*',
    '/client/:path*',
    '/login',
    '/onboarding',
  ],
}
