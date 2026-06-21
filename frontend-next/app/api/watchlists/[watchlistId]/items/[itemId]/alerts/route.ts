import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

type Ctx = { params: Promise<{ watchlistId: string; itemId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { watchlistId, itemId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts`)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, alerts: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { watchlistId, itemId } = await params
  try {
    const body = await req.json()
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, alert: data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
