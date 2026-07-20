/**
 * GET /api/academy/results
 * Tutti i QuizResult dell'utente autenticato.
 */

import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET() {
  try {
    const res = await pythonFetch('/api/academy/results')
    if (!res.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: res.status })
    const data = await res.json()
    return NextResponse.json({ ok: true, results: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
