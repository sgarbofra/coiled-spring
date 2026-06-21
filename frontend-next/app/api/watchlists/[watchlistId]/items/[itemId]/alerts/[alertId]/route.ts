import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

type Ctx = { params: Promise<{ watchlistId: string; itemId: string; alertId: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { watchlistId, itemId, alertId } = await params
  try {
    const body = await req.json()
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, alert: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { watchlistId, itemId, alertId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alertId}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
