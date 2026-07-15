import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await pythonFetch(`/api/hv-screener${qs ? `?${qs}` : ''}`)

    if (!res.ok) {
      let errMsg = `Backend ${res.status}`
      try {
        const err = await res.json()
        errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
      } catch { /* non-JSON */ }
      return NextResponse.json({ ok: false, error: errMsg }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
