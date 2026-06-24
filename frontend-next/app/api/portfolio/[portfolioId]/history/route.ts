import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  try {
    const { portfolioId } = await params
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status_filter') ?? ''
    const qs = statusFilter ? `?status_filter=${statusFilter}` : ''
    const res = await pythonFetch(`/api/portfolio/${portfolioId}/history${qs}`)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, trades: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
