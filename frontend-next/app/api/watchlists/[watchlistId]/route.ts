import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformWatchlist } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}`)
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

export async function PATCH(req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const body = await req.json()
    const res = await pythonFetch(`/api/watchlists/${watchlistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: body.name }),
    })
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

export async function DELETE(_req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
