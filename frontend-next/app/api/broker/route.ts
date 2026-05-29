import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET() {
  try {
    const res = await pythonFetch('/api/broker')
    if (res.status === 404) return NextResponse.json({ ok: false, broker: null })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, broker: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/broker', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ ok: true, broker: data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const res = await pythonFetch('/api/broker', { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
