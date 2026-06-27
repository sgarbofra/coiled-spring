import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

type Ctx = { params: Promise<{ portfolioId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { portfolioId } = await params
  try {
    const res = await pythonFetch(`/api/portfolio/${portfolioId}`, { method: 'DELETE' })
    if (res.status === 204) return NextResponse.json({ ok: true })
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: false, error: err.detail ?? 'Delete failed' }, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
