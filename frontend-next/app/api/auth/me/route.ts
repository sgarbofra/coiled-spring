import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET() {
  try {
    const res = await pythonFetch('/api/auth/me')
    if (!res.ok) return NextResponse.json(null, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}

export async function DELETE() {
  console.log('[DELETE /api/auth/me] Received request')
  try {
    const res = await pythonFetch('/api/auth/me', {
      method: 'DELETE'
    })

    console.log('[DELETE /api/auth/me] Backend response:', res.status)

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to delete account' }))
      console.log('[DELETE /api/auth/me] Error:', error)
      return NextResponse.json(error, { status: res.status })
    }

    const data = await res.json()
    console.log('[DELETE /api/auth/me] Success:', data)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[DELETE /api/auth/me] Exception:', msg)
    return NextResponse.json({ detail: msg }, { status: 500 })
  }
}
