import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const res = await pythonFetch(`/api/scanner/vol-surface/${symbol}`)
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
