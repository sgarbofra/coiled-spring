import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function POST(req: Request) {
  console.log('[ROUTE] Scanner run called')
  try {
    const body = await req.json()
    console.log('[ROUTE] Request body:', JSON.stringify(body))
    const res = await pythonFetch('/api/scanner/run', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    console.log('[ROUTE] Backend response status:', res.status)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    console.log('[ROUTE] Returning results:', data.results?.length || 0, 'items')
    // Backend now returns {ok, results, ticker_names} - pass through directly
    return NextResponse.json(data)
  } catch (e) {
    console.error('[ROUTE] Error:', e)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
