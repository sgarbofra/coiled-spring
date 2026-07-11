import { NextRequest, NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(req: NextRequest) {
  try {
    const tickers = req.nextUrl.searchParams.get('tickers')
    if (!tickers) {
      return NextResponse.json({}, { status: 200 })
    }

    const res = await pythonFetch(`/api/scanner/iv-ranks?tickers=${encodeURIComponent(tickers)}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.detail || 'Backend error' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[iv-ranks proxy error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
