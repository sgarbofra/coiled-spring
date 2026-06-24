import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

// POST /api/portfolio/[portfolioId]/trades — inserisce trade (apre o chiude posizione)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  try {
    const { portfolioId } = await params
    const body = await req.json()
    const res = await pythonFetch(`/api/portfolio/${portfolioId}/trades`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ ok: false, error: data.detail }, { status: res.status })
    return NextResponse.json({ ok: true, result: data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
