/**
 * GET  /api/academy/progress?module_id=1&language=en
 *   → Restituisce l'ultima posizione salvata { position_seconds: number }.
 *     Mai 404: se non esiste, 0.0.
 *
 * POST /api/academy/progress
 *   Body: { module_id: number, language: string, position_seconds: number }
 *   → Upsert silenzioso. Fail silently lato client.
 *
 * Entrambi i metodi richiedono autenticazione (il cookie cs_token viene
 * inoltrato al backend Python tramite pythonFetch).
 */

import { NextResponse } from 'next/server'
import { pythonFetch } from '@/lib/python-api'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const moduleId = searchParams.get('module_id') ?? '1'
  const language = encodeURIComponent(searchParams.get('language') ?? 'en')

  const res = await pythonFetch(`/api/academy/progress/${moduleId}?language=${language}`)
  if (!res.ok) {
    // Utente non autenticato o errore backend — restituisce 0 senza errore
    return NextResponse.json({ position_seconds: 0 })
  }
  return NextResponse.json(await res.json())
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })

  const res = await pythonFetch('/api/academy/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Fail silently: non bloccante per il client
  if (!res.ok) return NextResponse.json({ ok: true })
  return NextResponse.json(await res.json())
}
