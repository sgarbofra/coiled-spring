import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  let portfolioId: string | undefined
  try {
    portfolioId = (await params).portfolioId
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()

    // yfinance calls can be slow — allow up to 60s
    const res = await pythonFetch(`/api/portfolio/${portfolioId}/what-if?${qs}`, { timeoutMs: 60000 })

    if (!res.ok) {
      let errMsg = `Backend ${res.status}`
      try {
        const err = await res.json()
        errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
      } catch { /* non-JSON body */ }
      return NextResponse.json({ ok: false, error: errMsg }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, ...data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    console.error(`[what-if] portfolio ${portfolioId}:`, msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
