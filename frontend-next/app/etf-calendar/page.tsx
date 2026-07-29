'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'

// ── Palette terminale ─────────────────────────────────────────────────────────
const C = {
  bg:       'var(--bg-primary)',
  surface:  'var(--bg-panel)',
  hover:    'var(--bg-hover)',
  border:   'var(--border)',
  accent:   'var(--accent)',
  accentDim:'var(--accent-dim)',
  text:     'var(--text-primary)',
  muted:    'var(--text-secondary)',
  dim:      'var(--text-tertiary)',
  green:    'var(--positive)',
  red:      'var(--negative)',
  greenBg:  'color-mix(in srgb, var(--positive) 10%, transparent)',
  redBg:    'color-mix(in srgb, var(--negative) 10%, transparent)',
  amberBg:  'var(--accent-dim)',
}

// ── Tipi ──────────────────────────────────────────────────────────────────────
type Signal = 'RICH' | 'WATCH' | 'FAIR' | 'CHEAP' | 'INSUFFICIENT_DATA' | 'NO_DATA'

type ETFRow = {
  ticker: string
  snap_date: string | null
  spot_price: number | null
  iv_30d: number | null
  iv_60d: number | null
  iv_90d: number | null
  credit_30v60_pct: number | null
  credit_30v90_pct: number | null
  credit_60v90_pct: number | null
  z_score_30v60: number | null
  z_score_30v90: number | null
  z_score_60v90: number | null
  signal_30v60: Signal | null
  history_days: number | null
  computed_at: string | null
}

type SortKey = 'ticker' | 'z_score_30v60' | 'credit_30v60_pct' | 'credit_30v90_pct' | 'history_days'
type SortDir = 'asc' | 'desc'

// ── Signal config ─────────────────────────────────────────────────────────────
const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  RICH:              { label: 'RICH',         color: C.red,    bg: C.redBg,   desc: 'Spread storicamente caro — buy near / sell far' },
  WATCH:             { label: 'WATCH',        color: C.accent, bg: C.amberBg, desc: 'Zona di osservazione' },
  FAIR:              { label: 'FAIR',         color: C.muted,  bg: 'transparent', desc: 'Pricing nella norma storica' },
  CHEAP:             { label: 'CHEAP',        color: C.green,  bg: C.greenBg, desc: 'Spread storicamente economico — sell near / buy far' },
  INSUFFICIENT_DATA: { label: 'COLD START',   color: C.dim,    bg: 'transparent', desc: 'Dati insufficienti — storia in accumulo' },
  NO_DATA:           { label: 'NO DATA',      color: C.dim,    bg: 'transparent', desc: 'ETF non ancora scansionato' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (v: number | null, d = 2) => v === null ? '—' : v.toFixed(d)
const fmtZ = (v: number | null) => v === null ? '—' : (v > 0 ? '+' : '') + v.toFixed(2)

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

function zScoreColor(z: number | null): string {
  if (z === null) return C.muted
  if (z >= 1.5)  return C.red
  if (z >= 0.5)  return C.accent
  if (z > -1.5)  return C.muted
  return C.green
}

function creditBarWidth(v: number | null, max = 3): string {
  if (v === null) return '0%'
  return Math.min(100, (Math.abs(v) / max) * 100) + '%'
}

// Data raccolta dall'avvio (hardcoded come oggi al momento del deploy)
const COLLECTION_START = new Date().toLocaleDateString('en-GB', {
  day: '2-digit', month: 'long', year: 'numeric'
})
const SIGNAL_READY_DAYS = 20
const FULL_HISTORY_DAYS = 252

// ── Componente principale ─────────────────────────────────────────────────────
function ETFCalendarContent() {
  const [rows, setRows]         = useState<ETFRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [sortKey, setSortKey]   = useState<SortKey>('z_score_30v60')
  const [sortDir, setSortDir]   = useState<SortDir>('desc')
  const [sigFilter, setSigFilter] = useState<string>('ALL')
  const [isMobile, setIsMobile] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = sigFilter !== 'ALL' ? `?signal_filter=${sigFilter}` : ''
      const res = await fetch(`/api/etf-calendar${qs}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setRows(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }, [sigFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [rows, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortIcon = (key: SortKey) => sortKey !== key ? ' ⇅' : sortDir === 'desc' ? ' ▼' : ' ▲'

  // Statistiche rapide
  const totalWithData   = rows.filter(r => r.history_days && r.history_days > 0).length
  const totalWithSignal = rows.filter(r => r.history_days && r.history_days >= SIGNAL_READY_DAYS).length
  const maxHistory      = rows.reduce((m, r) => Math.max(m, r.history_days ?? 0), 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'var(--font-sans)', padding: '0' }}>

      {/* ── Header ── */}
      <div style={{
        backgroundColor: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '12px 16px' : '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: C.text, letterSpacing: '-0.3px' }}>
              ETF CALENDAR MONITOR
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
              color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4,
              padding: '1px 6px', letterSpacing: '0.5px',
            }}>BETA</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Call calendar spread ATM benchmarking · 15 ETF · Aggiornato ogni giorno alle 17:30 CET
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={fetchData} style={{
            background: 'transparent', color: C.accent, border: `1px solid ${C.border}`,
            padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            borderRadius: 5, fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentDim }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}>
            ↺ REFRESH
          </button>
          <button onClick={() => setShowLegend(v => !v)} style={{
            background: showLegend ? C.accentDim : 'transparent',
            color: C.muted, border: `1px solid ${C.border}`,
            padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            borderRadius: 5, fontFamily: 'var(--font-mono)',
          }}>
            {showLegend ? '▲ GUIDA' : '▼ GUIDA'}
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px 12px' : '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── DISCLAIMER ── */}
        <div style={{
          background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-panel))',
          border: `1px solid color-mix(in srgb, var(--accent) 40%, var(--border))`,
          borderRadius: 8,
          padding: isMobile ? '14px 16px' : '18px 22px',
          marginBottom: 20,
        }}>
          {/* Titolo disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>⏳</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
              PAGINA IN FASE DI RACCOLTA DATI
            </span>
          </div>

          {/* Spiegazione */}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65, marginBottom: 12 }}>
            <strong style={{ color: C.accent }}>Cos'è questa pagina.</strong>{' '}
            Misura ogni giorno se il <em>call calendar spread ATM</em> su 15 ETF liquidi è storicamente caro o
            economico rispetto alla sua media a 52 settimane. La metrica chiave è il <strong>credit%</strong>:
            il costo del time spread normalizzato sul prezzo spot —&nbsp;
            <code style={{ fontSize: 11, background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 3 }}>
              credit_30v60% = (price_60d − price_30d) / spot × 100
            </code>.
            Un z-score positivo alto significa che il calendario è storicamente caro; negativo, che è economico.
          </div>

          {/* Timeline operatività */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 14,
          }}>
            {[
              {
                icon: '📅',
                title: 'Raccolta dati avviata',
                body: `${COLLECTION_START} — da oggi il sistema salva ogni giorno credit% e IV sintetiche per tutti i 15 ETF.`,
                ok: true,
              },
              {
                icon: '📊',
                title: `Segnali attivi (≥ ${SIGNAL_READY_DAYS} giorni)`,
                body: `Dopo ${SIGNAL_READY_DAYS} osservazioni giornaliere il z-score diventa calcolabile e i badge RICH / WATCH / FAIR / CHEAP appaiono. Oggi: ${totalWithSignal}/15 ETF con segnale.`,
                ok: totalWithSignal === 15,
              },
              {
                icon: '🎯',
                title: `Baseline completa (≥ ${FULL_HISTORY_DAYS} giorni)`,
                body: `Dopo ${FULL_HISTORY_DAYS} sessioni (~1 anno di trading) la media 52 settimane è statisticamente robusta e i segnali sono pienamente affidabili.`,
                ok: maxHistory >= FULL_HISTORY_DAYS,
              },
            ].map(step => (
              <div key={step.title} style={{
                background: step.ok ? C.greenBg : 'var(--bg-hover)',
                border: `1px solid ${step.ok ? 'color-mix(in srgb, var(--positive) 30%, transparent)' : C.border}`,
                borderRadius: 6, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: step.ok ? C.green : C.text, marginBottom: 4 }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>

          {/* Cosa è già utile adesso */}
          <div style={{
            fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`,
            paddingTop: 10, lineHeight: 1.6,
          }}>
            <strong style={{ color: C.text }}>Cosa è già utile da subito:</strong>{' '}
            anche senza storia, il credit% assoluto permette di confrontare cross-asset quale ETF ha il
            time spread più costoso oggi. Le colonne <em>Credit 30v60%</em> e <em>Term Structure</em>
            sono operative dal primo giorno. I badge segnale (z-score) appariranno progressivamente
            man mano che la storia si accumula — attualmente <strong style={{ color: C.text }}>{totalWithData}/15</strong> ETF
            hanno almeno un dato storico, storia massima:{' '}
            <strong style={{ color: C.text }}>{maxHistory} giorni</strong>.
          </div>
        </div>

        {/* ── Legenda espandibile ── */}
        {showLegend && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: '0.3px' }}>
              GUIDA AI SEGNALI
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
              {Object.entries(SIGNAL_CONFIG).map(([key, cfg]) => (
                <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: cfg.color, background: cfg.bg,
                    border: `1px solid ${cfg.color}`,
                    borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{cfg.desc}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10, lineHeight: 1.65 }}>
              <strong style={{ color: C.text }}>Credit 30v60%</strong> = (prezzo call ATM 60d − prezzo call ATM 30d) / spot × 100.
              Sempre positivo in condizioni normali (la far-term vale di più). {' '}
              <strong style={{ color: C.text }}>Z-score</strong> = (credit_oggi − media_52w) / std_52w.
              Misura quante deviazioni standard il credito odierno si discosta dalla propria media storica.
            </div>
          </div>
        )}

        {/* ── Filtri segnale ── */}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center',
          marginBottom: 14, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: C.muted, marginRight: 4, fontFamily: 'var(--font-mono)' }}>SEGNALE:</span>
          {['ALL', 'RICH', 'WATCH', 'FAIR', 'CHEAP'].map(s => {
            const cfg = s === 'ALL' ? null : SIGNAL_CONFIG[s]
            const active = sigFilter === s
            return (
              <button
                key={s}
                onClick={() => setSigFilter(s)}
                style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                  letterSpacing: '0.4px', border: '1px solid',
                  color:       active ? (cfg ? cfg.color : C.accent) : C.muted,
                  borderColor: active ? (cfg ? cfg.color : C.accent) : C.border,
                  background:  active ? (cfg ? cfg.bg : C.accentDim) : 'transparent',
                  transition: 'all 0.12s',
                }}
              >{s}</button>
            )
          })}
          {sigFilter !== 'ALL' && (
            <button onClick={() => setSigFilter('ALL')} style={{
              fontSize: 10, color: C.muted, background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '3px 6px',
            }}>✕ clear</button>
          )}
        </div>

        {/* ── Stato loading / error ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Caricamento dati ETF...
          </div>
        )}
        {error && (
          <div style={{
            background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8,
            padding: '12px 16px', color: C.red, fontSize: 12, marginBottom: 12,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Tabella ── */}
        {!loading && !error && (
          <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: C.surface, borderBottom: `2px solid ${C.border}` }}>
                  {[
                    { key: 'ticker',          label: 'ETF',           title: 'Ticker ETF' },
                    { key: null,              label: 'SPOT',          title: 'Prezzo spot' },
                    { key: null,              label: 'IV 30d',        title: 'IV sintetica 30 giorni (%)' },
                    { key: null,              label: 'IV 60d',        title: 'IV sintetica 60 giorni (%)' },
                    { key: null,              label: 'IV 90d',        title: 'IV sintetica 90 giorni (%)' },
                    { key: 'credit_30v60_pct',label: 'CREDIT 30v60%', title: '(price_60d − price_30d) / spot × 100' },
                    { key: 'credit_30v90_pct',label: '30v90%',        title: '(price_90d − price_30d) / spot × 100' },
                    { key: 'z_score_30v60',   label: 'Z-SCORE',       title: 'Z-score 30v60 rispetto a media 52 settimane' },
                    { key: null,              label: 'SEGNALE',       title: 'Classificazione basata su z-score' },
                    { key: 'history_days',    label: 'STORIA',        title: 'Giorni di storia disponibili' },
                    { key: null,              label: 'DATA',          title: 'Data ultimo aggiornamento' },
                  ].map((col, i) => (
                    <th key={i}
                      onClick={() => col.key ? handleSort(col.key as SortKey) : undefined}
                      title={col.title}
                      style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                        color: sortKey === col.key ? C.accent : C.muted,
                        cursor: col.key ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {col.label}{col.key ? sortIcon(col.key as SortKey) : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: 12 }}>
                      {sigFilter !== 'ALL' ? `Nessun ETF con segnale "${sigFilter}" al momento.` : 'Nessun dato disponibile.'}
                    </td>
                  </tr>
                ) : sorted.map((row, idx) => {
                  const sig = row.signal_30v60 ?? 'NO_DATA'
                  const cfg = SIGNAL_CONFIG[sig] ?? SIGNAL_CONFIG['NO_DATA']
                  const hasHistory = (row.history_days ?? 0) > 0
                  const histPct = Math.min(100, ((row.history_days ?? 0) / FULL_HISTORY_DAYS) * 100)

                  return (
                    <tr key={row.ticker} style={{
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)',
                      borderBottom: `1px solid ${C.border}`,
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)')}
                    >
                      {/* Ticker */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: C.accent, fontSize: 13 }}>
                        {row.ticker}
                      </td>

                      {/* Spot */}
                      <td style={{ padding: '10px 12px', color: C.text, textAlign: 'right' }}>
                        {row.spot_price !== null ? `$${row.spot_price.toFixed(2)}` : '—'}
                      </td>

                      {/* IV 30d */}
                      <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>
                        {fmt(row.iv_30d)}%
                      </td>

                      {/* IV 60d */}
                      <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>
                        {fmt(row.iv_60d)}%
                      </td>

                      {/* IV 90d */}
                      <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>
                        {fmt(row.iv_90d)}%
                      </td>

                      {/* Credit 30v60 con bar */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ color: hasHistory ? C.text : C.muted, fontWeight: hasHistory ? 600 : 400 }}>
                            {fmt(row.credit_30v60_pct, 3)}%
                          </span>
                          {row.credit_30v60_pct !== null && (
                            <div style={{ width: 60, height: 3, background: C.border, borderRadius: 2 }}>
                              <div style={{
                                width: creditBarWidth(row.credit_30v60_pct),
                                height: '100%', borderRadius: 2,
                                background: zScoreColor(row.z_score_30v60),
                              }} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Credit 30v90 */}
                      <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>
                        {fmt(row.credit_30v90_pct, 3)}%
                      </td>

                      {/* Z-score */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{
                          color: zScoreColor(row.z_score_30v60),
                          fontWeight: row.z_score_30v60 !== null ? 700 : 400,
                        }}>
                          {fmtZ(row.z_score_30v60)}
                        </span>
                      </td>

                      {/* Segnale badge */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                          color: cfg.color, background: cfg.bg,
                          border: `1px solid ${cfg.color === C.muted || cfg.color === C.dim ? C.border : cfg.color}`,
                          borderRadius: 4, padding: '2px 7px', letterSpacing: '0.4px',
                          whiteSpace: 'nowrap',
                          opacity: sig === 'INSUFFICIENT_DATA' || sig === 'NO_DATA' ? 0.6 : 1,
                        }}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Storia con progress bar */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 11, color: hasHistory ? C.text : C.dim }}>
                            {row.history_days ?? 0}d
                          </span>
                          <div style={{ width: 50, height: 3, background: C.border, borderRadius: 2 }}>
                            <div style={{
                              width: histPct + '%', height: '100%', borderRadius: 2,
                              background: histPct >= 100 ? C.green : histPct >= 20 ? C.accent : C.dim,
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Data */}
                      <td style={{ padding: '10px 12px', color: C.dim, fontSize: 11 }}>
                        {fmtDate(row.snap_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer info ── */}
        <div style={{
          marginTop: 16, fontSize: 11, color: C.dim, lineHeight: 1.7,
          borderTop: `1px solid ${C.border}`, paddingTop: 12,
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px 24px',
        }}>
          <span>📡 <strong style={{ color: C.muted }}>Fonte dati:</strong> yfinance — prezzi ATM mid (bid+ask)/2 per le scadenze reali più vicine al target DTE</span>
          <span>🕐 <strong style={{ color: C.muted }}>Aggiornamento:</strong> ogni giorno lavorativo alle 17:30 CET / 16:30 UTC (dopo chiusura mercati US)</span>
          <span>📐 <strong style={{ color: C.muted }}>Interpolazione:</strong> media pesata lineare tra le due scadenze che straddlano 30d / 60d / 90d (metodologia VIX-style)</span>
          <span>⚠ <strong style={{ color: C.muted }}>Disclaimer:</strong> solo a scopo informativo — non costituisce consulenza finanziaria o raccomandazione d'investimento</span>
        </div>
      </div>
    </div>
  )
}

// ── Export con protezione auth ────────────────────────────────────────────────
export default function ETFCalendarPage() {
  return (
    <ProtectedRoute>
      <ETFCalendarContent />
    </ProtectedRoute>
  )
}
