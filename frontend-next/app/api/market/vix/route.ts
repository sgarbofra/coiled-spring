import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

/**
 * GET /api/market/vix
 * Proxy to Python's /api/market/vix — returns 1-year VIX history.
 * Requires auth (pythonFetch forwards cs_token cookie).
 */
export async function GET() {
  try {
    const res = await pythonFetch('/api/market/vix')
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'VIX data unavailable' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
