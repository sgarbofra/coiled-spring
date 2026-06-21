import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')

    if (!ticker) {
      return NextResponse.json({ ok: false, error: 'Ticker parameter required' }, { status: 400 })
    }

    const res = await fetch(`${BACKEND_URL}/scanner/ticker-info?ticker=${ticker}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Failed to fetch ticker info' }))
      return NextResponse.json({ ok: false, error: errorData.detail }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, ...data })
  } catch (error) {
    console.error('Ticker info error:', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
