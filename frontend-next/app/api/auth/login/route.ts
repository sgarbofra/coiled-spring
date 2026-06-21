import { NextResponse } from 'next/server'

const PYTHON_BASE = process.env.PYTHON_API_URL ?? 'http://localhost:8001'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await fetch(`${PYTHON_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ ok: false, error: err.detail || 'Login failed' }, { status: res.status })
    }

    const data = await res.json()

    const response = NextResponse.json({ ok: true, user: data.user })
    response.cookies.set('cs_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[login proxy error]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
