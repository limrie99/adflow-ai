import { NextRequest, NextResponse } from 'next/server'

// Routes that require admin role
const ADMIN_ROUTES = ['/admin', '/agency', '/dashboard', '/campaigns', '/leads']

// Routes that require client role
const CLIENT_ROUTES = ['/client']

// Routes that require any authentication
const ALL_PROTECTED = [...ADMIN_ROUTES, ...CLIENT_ROUTES]

// Auth pages (login, signup)
const AUTH_PAGES = ['/login', '/onboarding']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('sb-access-token')?.value
  const role = req.cookies.get('user-role')?.value // 'admin' | 'client' | 'saas_user'

  const isProtected = ALL_PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))
  const isAdminRoute = ADMIN_ROUTES.some((p) => pathname.startsWith(p))
  const isClientRoute = CLIENT_ROUTES.some((p) => pathname.startsWith(p))

  // Not logged in → redirect to login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in on auth page → redirect to role-based home
  if (isAuthPage && token) {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    } else if (role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Role-based access control
  if (token && role) {
    // Clients trying to access admin routes → redirect to client dashboard
    if (isAdminRoute && role === 'client') {
      return NextResponse.redirect(new URL('/client', req.url))
    }

    // Admins can access everything, no redirect needed
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
