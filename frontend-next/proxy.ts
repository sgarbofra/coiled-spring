import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC = ['/login', '/register', '/api/auth']
const ONBOARDING_ONLY = ['/onboarding', '/api/broker']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = request.cookies.get('cs_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Onboarding routes are accessible when logged in regardless of broker status
  if (ONBOARDING_ONLY.some(p => pathname.startsWith(p))) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
