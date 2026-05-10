import { NextRequest, NextResponse } from 'next/server'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://bright-college-admin-react.vercel.app',
]

function setCorsHeaders(res: NextResponse, origin: string) {
  res.headers.set('Access-Control-Allow-Origin', origin)
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ─── Route lists ──────────────────────────────────────────────────────────────
// Logged-in users should NOT be able to visit these
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

// These require authentication
const PROTECTED_PREFIXES = ['/landing', '/marketplace', '/jobs', '/shops', '/account']

// ─── Proxy (Next.js 16 middleware) ────────────────────────────────────────────
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const origin = req.headers.get('origin') ?? ''

  // 1. Handle CORS preflight + headers for all /api/* routes
  if (pathname.startsWith('/api/')) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin)

    // Preflight — browser checks allowed headers/methods before the real request
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      if (isAllowed) setCorsHeaders(res, origin)
      return res
    }

    // Actual API call
    const res = NextResponse.next()
    if (isAllowed) setCorsHeaders(res, origin)
    return res
  }

  // 2. Redirect root → landing
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/landing', req.url))
  }

  // 3. Auth guard — accessToken cookie is the source of truth
  const isLoggedIn = Boolean(req.cookies.get('accessToken')?.value)

  // Logged in → block auth pages, redirect to landing
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/landing', req.url))
  }

  // Not logged in → block protected pages, redirect to login
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  if (!isLoggedIn && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // All good — continue normal processing
  return NextResponse.next()
}

// Run on everything except Next.js internals, static assets, and public folder
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
