import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth redirect. Exchanges the authorization code
 * with our FastAPI backend, then sets the cs_token cookie.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    // User denied or something went wrong — back to login with error flag
    return NextResponse.redirect(new URL('/login?error=google_denied', req.url))
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.INTERNAL_API_URL || 'http://localhost:8080'

  if (!redirectUri) {
    return NextResponse.redirect(new URL('/login?error=oauth_config', req.url))
  }

  try {
    // Exchange code with FastAPI
    const res = await fetch(`${backendUrl}/api/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })

    if (!res.ok) {
      console.error('[Google OAuth] Exchange failed:', await res.text())
      return NextResponse.redirect(new URL('/login?error=google_exchange', req.url))
    }

    const data: { access_token: string } = await res.json()

    // Set cookie — identical to regular login route
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('cs_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[Google OAuth] Unexpected error:', err)
    return NextResponse.redirect(new URL('/login?error=google_error', req.url))
  }
}
