import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

type Ctx = { params: Promise<{ watchlistId: string }> }

// Frontend calls PATCH; Python expects POST
export async function PATCH(req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const body = await req.json()
    const itemIds: string[] = body.itemIds ?? body.ids ?? []
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds.map(Number) }),
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

export async function POST(req: Request, ctx: Ctx) {
  return PATCH(req, ctx)
}
