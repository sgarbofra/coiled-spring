import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const res = await pythonFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[RESET-PASSWORD ERROR]', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
