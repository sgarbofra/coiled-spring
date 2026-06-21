import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const PYTHON_BASE = process.env.PYTHON_API_URL ?? 'http://localhost:8001'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('cs_token')?.value

    console.log('[STRIPE PROXY] Received request for checkout session')
    console.log('[STRIPE PROXY] Token from cookie:', token ? token.substring(0, 20) + '...' : '(missing)')

    if (!token) {
      console.log('[STRIPE PROXY] ERROR: No token found in cookies')
      return NextResponse.json(
        { detail: 'Unauthorized - no token' },
        { status: 401 }
      )
    }

    const body = await req.json()
    console.log('[STRIPE PROXY] Request body:', body)

    const res = await fetch(`${PYTHON_BASE}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    console.log('[STRIPE PROXY] Backend response status:', res.status)

    if (!res.ok) {
      const err = await res.json()
      console.log('[STRIPE PROXY] Backend error:', err)
      return NextResponse.json(err, { status: res.status })
    }

    const data = await res.json()
    console.log('[STRIPE PROXY] Success - checkout URL:', data.checkout_url)

    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[STRIPE PROXY] Error:', msg)
    return NextResponse.json({ detail: msg }, { status: 500 })
  }
}
