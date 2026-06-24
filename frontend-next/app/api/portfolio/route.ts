import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

// GET /api/portfolio — lista portafogli utente
export async function GET() {
  try {
    const res = await pythonFetch('/api/portfolio')
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, portfolios: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/portfolio — crea portafoglio
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/portfolio', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ ok: false, error: data.detail }, { status: res.status })
    return NextResponse.json({ ok: true, portfolio: data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
