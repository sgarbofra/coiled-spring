import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformWatchlist } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/activate`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, watchlist: transformWatchlist(data) })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
