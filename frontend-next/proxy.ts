import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/youtube-tutorials',
  '/api/youtube-documentaries',
  '/api/sec-companies'
]
const ONBOARDING_ONLY = ['/onboarding', '/api/broker']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow landing page and public routes
  if (pathname === '/' || PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = request.cookies.get('cs_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Onboarding routes are accessible when logged in regardless of broker status
  if (ONBOARDING_ONLY.some(p => pathname.startsWith(p))) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|logo.png|book.png|hero-bg.mp4|.*\\.svg|robots.txt|sitemap.xml).*)'
  ],
}
