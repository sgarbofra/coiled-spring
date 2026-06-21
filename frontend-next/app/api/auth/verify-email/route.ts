import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const res = await pythonFetch(`/api/auth/verify-email?token=${token}`, {
      method: 'GET',
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[VERIFY-EMAIL ERROR]', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
