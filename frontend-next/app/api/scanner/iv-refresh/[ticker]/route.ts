import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params
    const ticker = rawTicker?.toUpperCase().trim()
    if (!ticker) {
      return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })
    }

    // Forward cookies for auth
    const cookieHeader = req.headers.get('cookie') ?? ''
    const res = await pythonFetch(`/api/scanner/iv-refresh/${ticker}`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ error: err.detail || 'Backend error' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('[iv-refresh proxy error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
