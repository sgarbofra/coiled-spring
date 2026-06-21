import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformItem } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string; itemId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { watchlistId, itemId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}`)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, item: transformItem(data) })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { watchlistId, itemId } = await params
  try {
    const body = await req.json()
    // Only forward fields Python accepts
    const patch: Record<string, unknown> = {}
    if (body.status !== undefined) patch.status = body.status
    if (body.notes !== undefined) patch.notes = body.notes
    if (body.quantity !== undefined) patch.quantity = body.quantity

    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, item: transformItem(data) })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { watchlistId, itemId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/${itemId}`, {
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
