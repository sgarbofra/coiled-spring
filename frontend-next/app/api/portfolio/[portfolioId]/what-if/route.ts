import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  try {
    const { portfolioId } = await params
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await pythonFetch(`/api/portfolio/${portfolioId}/what-if?${qs}`)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, ...data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
