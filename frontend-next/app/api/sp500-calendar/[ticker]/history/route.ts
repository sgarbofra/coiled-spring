import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

// GET /api/sp500-calendar/[ticker]/history?limit=252
export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get('limit') ?? '252'
    const ticker = params.ticker.toUpperCase()
    const res = await pythonFetch(`/api/sp500-calendar/${ticker}/history?limit=${limit}`)

    if (!res.ok) {
      let errMsg = `Backend ${res.status}`
      try {
        const err = await res.json()
        errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
      } catch { /* non-JSON */ }
      return NextResponse.json({ ok: false, error: errMsg }, { status: res.status })
    }

    return NextResponse.json(await res.json())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
