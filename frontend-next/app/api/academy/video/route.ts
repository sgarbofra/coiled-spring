/**
 * GET /api/academy/video?module_id=1&language=en
 *
 * Genera una signed URL R2 (TTL 4h) per il video del modulo richiesto.
 * Implementazione AWS Signature V4 con crypto nativo Node.js — zero dipendenze esterne.
 *
 * Auth richiesta. Modulo 1 sempre accessibile; moduli 2-5 richiedono che il
 * modulo precedente sia stato superato.
 *
 * Se le env var R2 non sono ancora configurate restituisce { unavailable: true }
 * invece di 500 — il frontend mostra un placeholder senza crashare.
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { pythonFetch } from '@/lib/python-api'

// ── Mapping ordine modulo + lingua → chiave R2 ────────────────────────────────

const VIDEO_KEYS: Record<number, Record<string, string>> = {
  1: { en: '1-en.mp4', it: '1-it.mp4' },
  2: { en: '2-en.mp4', it: '2-it.mp4' },
  3: { en: '3-en.mp4', it: '3-it.mp4' },
  4: { en: '4-en.mp4', it: '4-it.mp4' },
  5: { en: '5-en.mp4', it: '5-it.mp4' },
}

// ── AWS Signature V4 presigned URL (S3-compatible, funziona con R2) ───────────

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac('AWS4' + secret, date), region), service), 'aws4_request')
}

function presignGetUrl({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  expiresIn,
}: {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  key: string
  expiresIn: number
}): string {
  const region = 'auto'
  const service = 's3'
  const host = `${accountId}.r2.cloudflarestorage.com`

  // Date strings
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const dateStamp = amzDate.slice(0, 8)

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const credential = `${accessKeyId}/${credentialScope}`

  // Canonical URI: oggetti R2 con bucket implicito nell'endpoint
  const canonicalUri = `/${key}`

  // Query string parametri ordinati alfabeticamente
  const qp: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ]
  qp.sort((a, b) => a[0].localeCompare(b[0]))
  const canonicalQueryString = qp
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n')

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex')

  // Endpoint con bucket nel path (R2 path-style)
  return `https://${host}/${bucket}/${key}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Auth
  const me = await pythonFetch('/api/auth/me')
  if (!me.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const moduleId = parseInt(searchParams.get('module_id') ?? '1')
  const language = searchParams.get('language') ?? 'en'

  if (!VIDEO_KEYS[moduleId]) {
    return NextResponse.json({ error: 'Invalid module_id' }, { status: 400 })
  }
  if (!['en', 'it'].includes(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  // Moduli 2-5: verifica che il precedente sia stato superato
  if (moduleId > 1) {
    const resultsRes = await pythonFetch('/api/academy/results')
    if (!resultsRes.ok) {
      return NextResponse.json({ error: 'Cannot verify module access' }, { status: 500 })
    }
    const raw = await resultsRes.json()
    const results: Array<{ module_id: number; passed: boolean }> = Array.isArray(raw)
      ? raw
      : (raw.results ?? [])
    const prevPassed = results.some(r => r.module_id === moduleId - 1 && r.passed)
    if (!prevPassed) {
      return NextResponse.json(
        { error: `Module ${moduleId} locked — complete Module ${moduleId - 1} first` },
        { status: 403 },
      )
    }
  }

  // R2 non ancora configurato → placeholder (non 500)
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ unavailable: true, reason: 'Video not yet available' })
  }

  try {
    const url = presignGetUrl({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket: 'coiledspring-academy-videos',
      key: VIDEO_KEYS[moduleId][language],
      expiresIn: 4 * 60 * 60, // 4 ore
    })
    return NextResponse.json({ ok: true, url, expiresIn: 14400 })
  } catch (e) {
    console.error('[ACADEMY] presign error:', e)
    return NextResponse.json({ error: 'Failed to generate video URL' }, { status: 500 })
  }
}
