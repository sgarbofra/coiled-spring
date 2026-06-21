import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/scanner/results/add-to-watchlist', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, item: data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
