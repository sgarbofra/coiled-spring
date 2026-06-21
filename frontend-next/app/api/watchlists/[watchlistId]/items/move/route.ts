import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformItem } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const body = await req.json()
    const itemIds: string[] = body.itemIds ?? []
    const targetId: string = body.targetWatchlistId ?? body.toWatchlistId ?? ''
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/move`, {
      method: 'POST',
      body: JSON.stringify({
        item_ids: itemIds.map(Number),
        target_watchlist_id: Number(targetId),
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, items: (data as unknown[]).map(transformItem) })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// Frontend also sends PATCH for move in some places
export async function PATCH(req: Request, ctx: Ctx) {
  return POST(req, ctx)
}
