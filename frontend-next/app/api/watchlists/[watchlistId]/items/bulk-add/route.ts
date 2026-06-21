import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'
import { transformItem, transformCandidateToPython } from '@/lib/transform'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const body = await req.json()
    const pythonItems = (body.items as unknown[]).map(c =>
      transformCandidateToPython(c as Record<string, unknown>)
    )
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/items/bulk-add`, {
      method: 'POST',
      body: JSON.stringify({ items: pythonItems }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(
      { ok: true, items: (data as unknown[]).map(transformItem) },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
