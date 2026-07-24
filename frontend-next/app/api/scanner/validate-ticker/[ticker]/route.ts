import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params
    const ticker = rawTicker?.toUpperCase().trim()
    if (!ticker) {
      return NextResponse.json({ valid: false, reason: 'Missing ticker' }, { status: 400 })
    }

    const res = await pythonFetch(`/api/scanner/validate-ticker/${ticker}`)

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, has_options: false, price: null, reason: 'Backend error' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[validate-ticker proxy error]', e)
    return NextResponse.json(
      { valid: false, has_options: false, price: null, reason: 'Server error' },
      { status: 500 }
    )
  }
}
