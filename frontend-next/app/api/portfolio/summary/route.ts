import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET() {
  try {
    const res = await pythonFetch('/api/portfolio/summary')
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, summary: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
