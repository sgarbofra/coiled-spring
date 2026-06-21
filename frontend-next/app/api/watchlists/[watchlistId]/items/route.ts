import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformItem, transformCandidateToPython } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items`)
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

// Single add (from [watchlistId]/page.tsx submitAdd)
export async function POST(req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const body = await req.json()
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/bulk-add`, {
      method: 'POST',
      body: JSON.stringify({ items: [transformCandidateToPython(body)] }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    const items = (data as unknown[]).map(transformItem)
    return NextResponse.json({ ok: true, item: items[0] ?? null }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
