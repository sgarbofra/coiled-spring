import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

type Ctx = { params: Promise<{ watchlistId: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const { watchlistId } = await params
  try {
    const res = await pythonFetch(`/api/watchlists/${watchlistId}/refresh`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
