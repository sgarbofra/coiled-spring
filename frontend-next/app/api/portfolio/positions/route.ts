import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'active'
    const res = await pythonFetch(`/api/portfolio/positions?status=${status}`)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, positions: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
