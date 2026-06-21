import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformWatchlist } from '@/lib/transform'

export async function GET() {
  try {
    const res = await pythonFetch('/api/watchlists')
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, watchlists: (data as unknown[]).map(transformWatchlist) })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name: body.name }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, watchlist: transformWatchlist(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
