'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'

const C = {
  bg:        'var(--bg-primary)',
  surface:   'var(--bg-panel)',
  hover:     'var(--bg-hover)',
  border:    'var(--border)',
  accent:    'var(--accent)',
  accentDim: 'var(--accent-dim)',
  text:      'var(--text-primary)',
  muted:     'var(--text-secondary)',
  dim:       'var(--text-tertiary)',
  green:     'var(--positive)',
  red:       'var(--negative)',
  greenBg:   'color-mix(in srgb, var(--positive) 10%, transparent)',
  redBg:     'color-mix(in srgb, var(--negative) 10%, transparent)',
  amberBg:   'var(--accent-dim)',
}

type Signal = 'RICH' | 'WATCH' | 'FAIR' | 'CHEAP' | 'INSUFFICIENT_DATA' | 'NO_DATA'

type SP500Row = {
  ticker: string
  snap_date: string | null
  spot_price: number | null
  iv_30d: number | null
  iv_60d: number | null
  iv_90d: number | null
  credit_30v60_pct: number | null
  credit_30v90_pct: number | null
  z_score_30v60: number | null
  signal_30v60: Signal | null
  history_days: number | null
  computed_at: string | null
}

type ApiResponse = {
  data: SP500Row[]
  total: number
  total_tickers: number
  page: number
  page_size: number
  pages: number
}

const SIGNAL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  RICH:              { label: 'RICH',       color: C.red,    bg: C.redBg   },
  WATCH:             { label: 'WATCH',      color: C.accent, bg: C.amberBg },
  FAIR:              { label: 'FAIR',       color: C.muted,  bg: 'transparent' },
  CHEAP:             { label: 'CHEAP',      color: C.green,  bg: C.greenBg },
  INSUFFICIENT_DATA: { label: 'BUILDING…',  color: C.dim,    bg: 'transparent' },
  NO_DATA:           { label: 'NO DATA',    color: C.dim,    bg: 'transparent' },
}

const fmt   = (v: number | null, d = 2) => v === null ? '—' : v.toFixed(d)
const fmtZ  = (v: number | null) => v === null ? '—' : (v > 0 ? '+' : '') + v.toFixed(2)
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }
  catch { return '—' }
}

function zColor(z: number | null): string {
  if (z === null) return C.muted
  if (z >= 1.5)  return C.red
  if (z >= 0.5)  return C.accent
  if (z > -1.5)  return C.muted
  return C.green
}

const SIGNAL_READY = 20
const FULL_HISTORY = 252
const PAGE_SIZE    = 50

// ── Main component ────────────────────────────────────────────────────────────
function SP500CalendarContent() {
  const [rows, setRows]             = useState<SP500Row[]>([])
  const [meta, setMeta]             = useState<Omit<ApiResponse, 'data'> | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sigFilter, setSigFilter]   = useState<string>('ALL')
  const [sortKey, setSortKey]       = useState<string>('z_score_30v60')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc')
  const [page, setPage]             = useState(1)
  const [isMobile, setIsMobile]     = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({
        sort_by:   sortKey,
        sort_dir:  sortDir,
        page:      String(page),
        page_size: String(PAGE_SIZE),
      })
      if (sigFilter !== 'ALL') params.set('signal_filter', sigFilter)
      if (search.trim())       params.set('search', search.trim())

      const res = await fetch(`/api/sp500-calendar?${params}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json: ApiResponse = await res.json()
      setRows(json.data ?? [])
      setMeta({ total: json.total, total_tickers: json.total_tickers, page: json.page, page_size: json.page_size, pages: json.pages })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally { setLoading(false) }
  }, [sortKey, sortDir, page, sigFilter, search])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [sigFilter, search, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortIcon = (key: string) => sortKey !== key ? ' ⇅' : sortDir === 'desc' ? ' ▼' : ' ▲'

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const pages = meta?.pages ?? 1

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'var(--font-sans)' }}>

      {/* ── Header ── */}
      <div style={{
        backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '12px 16px' : '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700, color: C.text }}>
              S&amp;P 500 CALENDAR MONITOR
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '1px 6px',
            }}>BETA</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            ATM call calendar spread · S&amp;P 500 constituents · Updated Mon–Fri at 18:00 CET
            {meta && (
              <span style={{ marginLeft: 12, color: C.dim }}>
                {meta.total_tickers} tickers with data
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchData} style={{
          background: 'transparent', color: C.accent, border: `1px solid ${C.border}`,
          padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          borderRadius: 5, fontFamily: 'var(--font-mono)',
        }}>↺ REFRESH</button>
      </div>

      <div style={{ padding: isMobile ? '12px' : '16px 24px', maxWidth: 1500, margin: '0 auto' }}>

        {/* ── Cold-start notice ── */}
        <div style={{
          background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-panel))',
          border: `1px solid color-mix(in srgb, var(--accent) 30%, var(--border))`,
          borderRadius: 8, padding: '12px 18px', marginBottom: 16,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⏳</span>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65 }}>
            <strong style={{ color: C.text }}>Data collection in progress.</strong>{' '}
            Credit% columns are useful from day one — they rank which stocks have the richest time spread today.
            Signal badges (RICH / CHEAP) appear after <strong style={{ color: C.accent }}>20 daily snapshots</strong> per ticker,
            and reach full reliability after <strong style={{ color: C.accent }}>252 trading days</strong> (~1 year).
            The scan runs every weekday at <strong style={{ color: C.accent }}>18:00 CET</strong> and processes all S&amp;P 500 constituents in batches.
            Not sure how to read this?{' '}
            <a href="/etf-calendar" style={{ color: C.accent, textDecoration: 'none' }}>
              See the ETF Calendar guide →
            </a>
          </div>
        </div>

        {/* ── Toolbar: search + signal filter ── */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14,
          flexWrap: 'wrap',
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search ticker…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                padding: '5px 10px 5px 30px', borderRadius: 5, fontSize: 12,
                fontFamily: 'var(--font-mono)', width: 160, outline: 'none',
              }}
            />
            <span style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              color: C.muted, fontSize: 12, pointerEvents: 'none',
            }}>🔍</span>
          </div>

          {/* Signal filter */}
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'var(--font-mono)' }}>SIGNAL:</span>
          {['ALL', 'RICH', 'WATCH', 'FAIR', 'CHEAP'].map(s => {
            const cfg = s === 'ALL' ? null : SIGNAL_CFG[s]
            const active = sigFilter === s
            return (
              <button key={s} onClick={() => setSigFilter(s)} style={{
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                padding: '3px 10px', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.4px',
                border: '1px solid',
                color:       active ? (cfg ? cfg.color : C.accent) : C.muted,
                borderColor: active ? (cfg ? cfg.color : C.accent) : C.border,
                background:  active ? (cfg ? cfg.bg : C.accentDim) : 'transparent',
              }}>{s}</button>
            )
          })}
          {(sigFilter !== 'ALL' || search) && (
            <button onClick={() => { setSigFilter('ALL'); setSearchInput(''); setSearch('') }} style={{
              fontSize: 10, color: C.muted, background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '3px 6px',
            }}>✕ clear all</button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Pagination info */}
          {meta && (
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {meta.total_tickers} results · page {page}/{pages}
            </span>
          )}
        </div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Loading S&amp;P 500 data…
          </div>
        )}
        {error && (
          <div style={{
            background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8,
            padding: '12px 16px', color: C.red, fontSize: 12, marginBottom: 12,
          }}>⚠ {error}</div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: C.surface, borderBottom: `2px solid ${C.border}` }}>
                    {([
                      { key: 'ticker',           label: 'TICKER',         tip: 'S&P 500 stock ticker' },
                      { key: 'spot_price',        label: 'SPOT',           tip: 'Current price' },
                      { key: null,                label: 'IV 30d',         tip: 'Synthetic IV at 30 DTE (%)' },
                      { key: null,                label: 'IV 60d',         tip: 'Synthetic IV at 60 DTE (%)' },
                      { key: null,                label: 'IV 90d',         tip: 'Synthetic IV at 90 DTE (%)' },
                      { key: 'credit_30v60_pct',  label: 'CREDIT 30v60%',  tip: '(60d call − 30d call) / spot × 100. Higher = more expensive time spread.' },
                      { key: null,                label: '30v90%',         tip: '(90d call − 30d call) / spot × 100' },
                      { key: 'z_score_30v60',     label: 'Z-SCORE',        tip: 'Standard deviations from 52w average. Color: red=RICH, green=CHEAP.' },
                      { key: null,                label: 'SIGNAL',         tip: 'Based on z-score. RICH: expensive spread. CHEAP: cheap spread.' },
                      { key: 'history_days',      label: 'HIST',           tip: 'Days of history collected (bar fills toward 252 = 1 year)' },
                      { key: null,                label: 'DATE',           tip: 'Last snapshot date' },
                    ] as { key: string | null; label: string; tip: string }[]).map((col, i) => (
                      <th key={i} title={col.tip}
                        onClick={() => col.key && handleSort(col.key)}
                        style={{
                          padding: '9px 10px', textAlign: 'left',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                          color: sortKey === col.key ? C.accent : C.muted,
                          cursor: col.key ? 'pointer' : 'default',
                          whiteSpace: 'nowrap', userSelect: 'none',
                        }}>
                        {col.label}{col.key ? sortIcon(col.key) : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: C.muted, fontSize: 12 }}>
                        {search ? `No tickers matching "${search}"` : sigFilter !== 'ALL' ? `No tickers with signal "${sigFilter}"` : 'No data yet — first scan runs today at 18:00 CET.'}
                      </td>
                    </tr>
                  ) : rows.map((row, idx) => {
                    const sig = row.signal_30v60 ?? 'NO_DATA'
                    const cfg = SIGNAL_CFG[sig] ?? SIGNAL_CFG['NO_DATA']
                    const histPct = Math.min(100, ((row.history_days ?? 0) / FULL_HISTORY) * 100)

                    return (
                      <tr key={row.ticker}
                        style={{
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)',
                          borderBottom: `1px solid ${C.border}`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)')}
                      >
                        {/* Ticker */}
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: C.accent, fontSize: 12 }}>
                          {row.ticker}
                        </td>

                        {/* Spot */}
                        <td style={{ padding: '8px 10px', color: C.text, textAlign: 'right', fontSize: 11 }}>
                          {row.spot_price !== null ? `$${row.spot_price.toFixed(2)}` : '—'}
                        </td>

                        {/* IV 30/60/90 */}
                        <td style={{ padding: '8px 10px', color: C.muted, textAlign: 'right', fontSize: 11 }}>{fmt(row.iv_30d)}%</td>
                        <td style={{ padding: '8px 10px', color: C.muted, textAlign: 'right', fontSize: 11 }}>{fmt(row.iv_60d)}%</td>
                        <td style={{ padding: '8px 10px', color: C.muted, textAlign: 'right', fontSize: 11 }}>{fmt(row.iv_90d)}%</td>

                        {/* Credit 30v60 con mini-bar */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>
                              {fmt(row.credit_30v60_pct, 3)}%
                            </span>
                            {row.credit_30v60_pct !== null && (
                              <div style={{ width: 48, height: 3, background: C.border, borderRadius: 2 }}>
                                <div style={{
                                  width: `${Math.min(100, (Math.abs(row.credit_30v60_pct) / 3) * 100)}%`,
                                  height: '100%', borderRadius: 2,
                                  background: zColor(row.z_score_30v60),
                                }} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Credit 30v90 */}
                        <td style={{ padding: '8px 10px', color: C.muted, textAlign: 'right', fontSize: 11 }}>
                          {fmt(row.credit_30v90_pct, 3)}%
                        </td>

                        {/* Z-score */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span style={{ fontSize: 11, color: zColor(row.z_score_30v60), fontWeight: row.z_score_30v60 !== null ? 700 : 400 }}>
                            {fmtZ(row.z_score_30v60)}
                          </span>
                        </td>

                        {/* Signal badge */}
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: cfg.color, background: cfg.bg,
                            border: `1px solid ${cfg.color === C.muted || cfg.color === C.dim ? C.border : cfg.color}`,
                            borderRadius: 4, padding: '1px 6px', letterSpacing: '0.4px', whiteSpace: 'nowrap',
                            opacity: sig === 'INSUFFICIENT_DATA' || sig === 'NO_DATA' ? 0.6 : 1,
                          }}>{cfg.label}</span>
                        </td>

                        {/* History bar */}
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 10, color: (row.history_days ?? 0) > 0 ? C.text : C.dim }}>
                              {row.history_days ?? 0}d
                            </span>
                            <div style={{ width: 40, height: 3, background: C.border, borderRadius: 2 }}>
                              <div style={{
                                width: histPct + '%', height: '100%', borderRadius: 2,
                                background: histPct >= 100 ? C.green : histPct >= 8 ? C.accent : C.dim,
                              }} />
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '8px 10px', color: C.dim, fontSize: 10 }}>
                          {fmtDate(row.snap_date)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination controls ── */}
            {pages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 8, marginTop: 16,
              }}>
                <button
                  onClick={() => setPage(1)} disabled={page === 1}
                  style={pageBtnStyle(page === 1)}>«</button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={pageBtnStyle(page === 1)}>‹</button>

                {/* Page number pills */}
                {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                  let p: number
                  if (pages <= 7) {
                    p = i + 1
                  } else if (page <= 4) {
                    p = i + 1
                  } else if (page >= pages - 3) {
                    p = pages - 6 + i
                  } else {
                    p = page - 3 + i
                  }
                  return (
                    <button key={p} onClick={() => setPage(p)} style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                      border: `1px solid ${p === page ? C.accent : C.border}`,
                      color: p === page ? C.accent : C.muted,
                      background: p === page ? C.accentDim : 'transparent',
                    }}>{p}</button>
                  )
                })}

                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                  style={pageBtnStyle(page === pages)}>›</button>
                <button
                  onClick={() => setPage(pages)} disabled={page === pages}
                  style={pageBtnStyle(page === pages)}>»</button>
              </div>
            )}
          </>
        )}

        {/* ── Footer ── */}
        <div style={{
          marginTop: 16, fontSize: 11, color: C.dim, lineHeight: 1.7,
          borderTop: `1px solid ${C.border}`, paddingTop: 12,
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '6px 24px',
        }}>
          <span>📡 <strong style={{ color: C.muted }}>Source:</strong> yfinance — ATM call mid-price, bid/ask spread filtered (&lt;50%)</span>
          <span>🕐 <strong style={{ color: C.muted }}>Schedule:</strong> Mon–Fri at 18:00 CET, batch of 50 tickers with rate-limit pauses</span>
          <span>📐 <strong style={{ color: C.muted }}>Method:</strong> VIX-style linear interpolation to synthetic 30d/60d/90d constant maturities</span>
          <span>⚠ <strong style={{ color: C.muted }}>Disclaimer:</strong> Informational only — not financial advice or an investment recommendation</span>
        </div>
      </div>
    </div>
  )
}

function pageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 12, fontFamily: 'var(--font-mono)',
    padding: '4px 10px', borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1px solid ${C.border}`,
    color: disabled ? C.dim : C.muted,
    background: 'transparent',
    opacity: disabled ? 0.4 : 1,
  }
}

export default function SP500CalendarPage() {
  return (
    <ProtectedRoute>
      <SP500CalendarContent />
    </ProtectedRoute>
  )
}
