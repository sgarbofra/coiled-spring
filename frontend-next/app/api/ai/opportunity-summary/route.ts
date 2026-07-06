import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/ai/opportunity-summary', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: 35000,
    })

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
    console.error('[opportunity-summary]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
