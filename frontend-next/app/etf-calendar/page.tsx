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
  blueBg:    'color-mix(in srgb, #60a5fa 8%, transparent)',
  blue:      '#60a5fa',
}

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

const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string; meaning: string; action: string }> = {
  RICH:              { label: 'RICH',        color: C.red,   bg: C.redBg,   meaning: 'Time spread is historically expensive',           action: 'Consider buying near-term / selling far-term leg' },
  WATCH:             { label: 'WATCH',       color: C.accent,bg: C.amberBg, meaning: 'Approaching expensive territory — monitor closely', action: 'Wait for confirmation before entering' },
  FAIR:              { label: 'FAIR',        color: C.muted, bg: 'transparent', meaning: 'Spread is within normal historical range',     action: 'No strong edge in either direction' },
  CHEAP:             { label: 'CHEAP',       color: C.green, bg: C.greenBg, meaning: 'Time spread is historically inexpensive',          action: 'Consider selling near-term / buying far-term leg' },
  INSUFFICIENT_DATA: { label: 'BUILDING...',  color: C.dim,   bg: 'transparent', meaning: 'Less than 20 days of history collected',     action: 'Signal not yet statistically meaningful' },
  NO_DATA:           { label: 'NO DATA',     color: C.dim,   bg: 'transparent', meaning: 'ETF not yet scanned',                         action: '—' },
}

const ETF_GROUPS: Record<string, string[]> = {
  'Broad Equity': ['SPY', 'QQQ', 'IWM', 'DIA'],
  'Sector': ['XLF', 'XLE', 'XLK', 'XLV', 'XLU'],
  'Macro / Alt': ['GLD', 'TLT', 'SLV', 'EEM', 'EFA', 'HYG'],
}

const fmt   = (v: number | null, d = 2) => v === null ? '—' : v.toFixed(d)
const fmtZ  = (v: number | null) => v === null ? '—' : (v > 0 ? '+' : '') + v.toFixed(2)
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

function zColor(z: number | null): string {
  if (z === null) return C.muted
  if (z >= 1.5)  return C.red
  if (z >= 0.5)  return C.accent
  if (z > -1.5)  return C.muted
  return C.green
}

function barW(v: number | null, max = 3): string {
  if (v === null) return '0%'
  return Math.min(100, (Math.abs(v) / max) * 100) + '%'
}

const SIGNAL_READY = 20
const FULL_HISTORY = 252

// ── Explainer box component ───────────────────────────────────────────────────
function ExplainerBox({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, letterSpacing: '0.4px' }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function ETFCalendarContent() {
  const [rows, setRows]           = useState<ETFRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [sortKey, setSortKey]     = useState<SortKey>('z_score_30v60')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')
  const [sigFilter, setSigFilter] = useState<string>('ALL')
  const [isMobile, setIsMobile]   = useState(false)
  const [tab, setTab]             = useState<'dashboard' | 'guide'>('dashboard')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
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
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally { setLoading(false) }
  }, [sigFilter])

  useEffect(() => { fetchData() }, [fetchData])

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

  const totalWithData   = rows.filter(r => (r.history_days ?? 0) > 0).length
  const totalWithSignal = rows.filter(r => (r.history_days ?? 0) >= SIGNAL_READY).length
  const maxHistory      = rows.reduce((m, r) => Math.max(m, r.history_days ?? 0), 0)

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px', padding: '8px 16px', cursor: 'pointer',
    background: active ? C.accent : 'transparent',
    color: active ? '#0d1117' : C.muted,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 5,
  })

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
            <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: C.text }}>
              ETF CALENDAR MONITOR
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '1px 6px',
            }}>BETA</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            Daily ATM call calendar spread benchmarking · 15 ETFs · Updated Mon–Fri at 17:30 CET
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={TAB_STYLE(tab === 'dashboard')} onClick={() => setTab('dashboard')}>DASHBOARD</button>
          <button style={TAB_STYLE(tab === 'guide')} onClick={() => setTab('guide')}>HOW TO READ</button>
          <button onClick={fetchData} style={{
            background: 'transparent', color: C.accent, border: `1px solid ${C.border}`,
            padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            borderRadius: 5, fontFamily: 'var(--font-mono)',
          }}>↺ REFRESH</button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════
            TAB: HOW TO READ
        ══════════════════════════════════════════════ */}
        {tab === 'guide' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* What is this page */}
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-panel))',
              border: `1px solid color-mix(in srgb, var(--accent) 35%, var(--border))`,
              borderRadius: 8, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12 }}>
                📋 What is this page?
              </div>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.75, margin: '0 0 12px' }}>
                This page answers a daily question: <strong style={{ color: C.accent }}>is it cheap or expensive to buy extra time on an ETF option right now — compared to its own history?</strong>
              </p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, margin: 0 }}>
                Every trading day the terminal fetches the price of the at-the-money call option at 30, 60, and 90
                days to expiry for 15 major ETFs. It calculates how much more the longer-dated option costs versus
                the shorter one, normalizes that difference to the ETF's spot price, and compares today's reading
                to the last 52 weeks of the same metric. The result is a signal: RICH, WATCH, FAIR, or CHEAP.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

              <ExplainerBox title="WHAT IS A CALL CALENDAR SPREAD?" icon="📚">
                <p style={{ margin: '0 0 10px' }}>
                  A <strong style={{ color: C.text }}>calendar spread</strong> means buying an option at one expiry
                  and selling the same option at a different expiry — same strike, different date.
                </p>
                <p style={{ margin: '0 0 10px' }}>
                  The most common setup: <strong style={{ color: C.text }}>buy the 60-day call, sell the 30-day call</strong>.
                  You pay the difference in premium. That difference is called the <em>calendar credit</em>.
                </p>
                <p style={{ margin: 0 }}>
                  The idea is simple: time decays faster on the near-term option. If the stock stays near the
                  strike, the 30-day you sold loses value quickly while the 60-day you bought retains more of
                  its value. That's your profit source.
                </p>
              </ExplainerBox>

              <ExplainerBox title="WHAT IS CREDIT% AND WHY DOES IT MATTER?" icon="📐">
                <p style={{ margin: '0 0 10px' }}>
                  <strong style={{ color: C.text }}>Credit%</strong> is the cost of the time spread as a fraction of the ETF's price:
                </p>
                <div style={{
                  background: 'var(--bg-hover)', borderRadius: 6, padding: '10px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: C.accent, marginBottom: 10,
                }}>
                  Credit 30v60% = (price of 60d call − price of 30d call) / spot × 100
                </div>
                <p style={{ margin: 0 }}>
                  Dividing by the spot price lets you <strong style={{ color: C.text }}>compare across ETFs</strong> regardless of their price.
                  SPY at $540 and GLD at $230 are directly comparable — both expressed as a % of spot.
                  A higher credit% means the market is charging more for extra time.
                </p>
              </ExplainerBox>

              <ExplainerBox title="WHAT IS THE Z-SCORE?" icon="📊">
                <p style={{ margin: '0 0 10px' }}>
                  The z-score tells you how today's credit% compares to its own <strong style={{ color: C.text }}>52-week history</strong>:
                </p>
                <div style={{
                  background: 'var(--bg-hover)', borderRadius: 6, padding: '10px 14px',
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: C.accent, marginBottom: 10,
                }}>
                  Z = (today's credit% − 52w average) / 52w standard deviation
                </div>
                <p style={{ margin: 0 }}>
                  A z-score of <strong style={{ color: C.red }}>+2.0</strong> means today's spread cost is 2 standard deviations above the yearly average — unusually expensive.
                  A z-score of <strong style={{ color: C.green }}>−1.8</strong> means it's unusually cheap.
                  Zero means perfectly average. The z-score is the core of every signal badge.
                </p>
              </ExplainerBox>

              <ExplainerBox title="HOW TO READ THE SIGNAL BADGES" icon="🚦">
                {Object.entries(SIGNAL_CONFIG).filter(([k]) => !['NO_DATA'].includes(k)).map(([key, cfg]) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      color: cfg.color, border: `1px solid ${cfg.color}`, background: cfg.bg,
                      borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                      opacity: key === 'INSUFFICIENT_DATA' ? 0.7 : 1,
                    }}>{cfg.label}</span>
                    <div>
                      <div style={{ fontSize: 11, color: C.text }}>{cfg.meaning}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{cfg.action}</div>
                    </div>
                  </div>
                ))}
              </ExplainerBox>

            </div>

            {/* Thresholds table */}
            <ExplainerBox title="Z-SCORE THRESHOLDS AT A GLANCE" icon="📏">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['Signal', 'Z-score range', 'What it means', 'Potential use'].map(h => (
                        <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: C.muted, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sig: 'RICH',  color: C.red,    range: 'above +1.5', meaning: 'Top ~7% historically', use: 'Sell the far-leg, buy the near-leg' },
                      { sig: 'WATCH', color: C.accent, range: '+0.5 to +1.5', meaning: 'Moderately expensive', use: 'Monitor; avoid buying the calendar' },
                      { sig: 'FAIR',  color: C.muted,  range: '−0.5 to +0.5', meaning: 'Near the 52w average', use: 'No structural edge' },
                      { sig: 'CHEAP', color: C.green,  range: 'below −1.5', meaning: 'Bottom ~7% historically', use: 'Buy the far-leg, sell the near-leg' },
                    ].map(r => (
                      <tr key={r.sig} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: r.color, fontWeight: 700 }}>{r.sig}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: C.text }}>{r.range}</td>
                        <td style={{ padding: '8px 12px', color: C.muted }}>{r.meaning}</td>
                        <td style={{ padding: '8px 12px', color: C.muted }}>{r.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExplainerBox>

            {/* Step-by-step usage */}
            <ExplainerBox title="HOW TO USE THIS PAGE — STEP BY STEP" icon="🧭">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: '1', title: 'Sort by Z-Score', body: 'Click the Z-SCORE column header to sort from highest to lowest. The top rows are the ETFs where the calendar spread is most expensive right now, relative to their own history.' },
                  { step: '2', title: 'Filter by signal', body: 'Use the signal filter buttons (RICH / CHEAP / etc.) above the table to focus on specific categories. RICH = potential sell opportunity on the spread. CHEAP = potential buy opportunity.' },
                  { step: '3', title: 'Check the Credit%', body: 'The Credit 30v60% column shows the raw cost of the time spread today. Even without z-score history, higher % = more expensive. Use it to rank ETFs cross-asset from day one.' },
                  { step: '4', title: 'Check the History bar', body: 'The HISTORY column shows how many days of data we have for each ETF. The colored bar fills toward 252 days (1 year). Shorter bars = less reliable z-scores. Look for bars that are at least 25% full before acting on signals.' },
                  { step: '5', title: 'Read IV 30d / 60d / 90d', body: 'These are synthetic implied volatility levels at constant maturities. Rising IV across the term structure means the market expects more uncertainty further out — which can make longer-dated options expensive relative to near-term.' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: C.accentDim,
                      border: `1px solid ${C.accent}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0,
                    }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ExplainerBox>

            {/* Disclaimer */}
            <div style={{
              background: 'color-mix(in srgb, var(--negative) 5%, var(--bg-panel))',
              border: `1px solid color-mix(in srgb, var(--negative) 25%, var(--border))`,
              borderRadius: 8, padding: '14px 20px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6 }}>⚠ IMPORTANT DISCLAIMER</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                This page is <strong style={{ color: C.text }}>for informational and educational purposes only</strong>.
                It does not constitute financial advice, investment recommendations, or an offer to buy or sell any
                security or derivative. Options trading involves substantial risk of loss. Past statistical patterns
                (z-scores) do not guarantee future performance. Always conduct your own analysis and consult a
                qualified financial advisor before trading.
              </div>
            </div>

            <button onClick={() => setTab('dashboard')} style={{
              alignSelf: 'flex-start', background: C.accent, color: '#0d1117',
              border: 'none', padding: '8px 20px', fontSize: 12, fontWeight: 700,
              borderRadius: 6, cursor: 'pointer', letterSpacing: '0.3px',
            }}>
              → GO TO DASHBOARD
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: DASHBOARD
        ══════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            {/* ── Status banner ── */}
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-panel))',
              border: `1px solid color-mix(in srgb, var(--accent) 35%, var(--border))`,
              borderRadius: 8, padding: isMobile ? '14px 16px' : '16px 22px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13 }}>⏳</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: 'var(--font-mono)', letterSpacing: '0.4px' }}>
                  DATA COLLECTION IN PROGRESS
                </span>
              </div>

              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: '0 0 14px' }}>
                This monitor started collecting data when it was deployed. The <strong style={{ color: C.accent }}>Credit%</strong> columns
                are useful from day one — they show which ETF has the most expensive time spread today in absolute terms.
                Signal badges (RICH / CHEAP etc.) will appear after at least <strong style={{ color: C.accent }}>20 daily snapshots</strong> per ETF,
                and become fully reliable after <strong style={{ color: C.accent }}>252 trading days (~1 year)</strong>.
                Not sure how to read this? Click <strong style={{ color: C.accent }}>HOW TO READ</strong> above.
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10,
              }}>
                {[
                  { icon: '✅', label: 'Data collection active', sub: `${totalWithData}/15 ETFs have at least 1 snapshot`, ok: true },
                  { icon: '📊', label: `Signals active (≥${SIGNAL_READY}d)`, sub: `${totalWithSignal}/15 ETFs have enough history for z-score`, ok: totalWithSignal === 15 },
                  { icon: '🎯', label: `Full 52w baseline (≥${FULL_HISTORY}d)`, sub: `Max history collected: ${maxHistory} days of ${FULL_HISTORY} needed`, ok: maxHistory >= FULL_HISTORY },
                ].map(s => (
                  <div key={s.label} style={{
                    background: s.ok ? C.greenBg : 'var(--bg-hover)',
                    border: `1px solid ${s.ok ? 'color-mix(in srgb, var(--positive) 30%, transparent)' : C.border}`,
                    borderRadius: 6, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.ok ? C.green : C.text, marginBottom: 4 }}>
                      {s.icon} {s.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Signal filter ── */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: C.muted, marginRight: 4, fontFamily: 'var(--font-mono)' }}>SIGNAL:</span>
              {['ALL', 'RICH', 'WATCH', 'FAIR', 'CHEAP'].map(s => {
                const cfg = s === 'ALL' ? null : SIGNAL_CONFIG[s]
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
              {sigFilter !== 'ALL' && (
                <button onClick={() => setSigFilter('ALL')} style={{
                  fontSize: 10, color: C.muted, background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '3px 6px',
                }}>✕ clear</button>
              )}
            </div>

            {/* ── Loading / Error ── */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Loading ETF data...
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
              <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: C.surface, borderBottom: `2px solid ${C.border}` }}>
                      {([
                        { key: 'ticker',           label: 'ETF',             tip: 'Ticker symbol and asset class group' },
                        { key: null,               label: 'SPOT',            tip: 'Current ETF price' },
                        { key: null,               label: 'IV 30d',          tip: 'Synthetic implied volatility at 30 days to expiry (%)' },
                        { key: null,               label: 'IV 60d',          tip: 'Synthetic implied volatility at 60 days to expiry (%)' },
                        { key: null,               label: 'IV 90d',          tip: 'Synthetic implied volatility at 90 days to expiry (%)' },
                        { key: 'credit_30v60_pct', label: 'CREDIT 30v60%',   tip: '(60d ATM call − 30d ATM call) / spot × 100. Higher = more expensive spread.' },
                        { key: 'credit_30v90_pct', label: 'CREDIT 30v90%',   tip: '(90d ATM call − 30d ATM call) / spot × 100' },
                        { key: 'z_score_30v60',    label: 'Z-SCORE',         tip: 'How many std deviations today\'s 30v60 credit is above/below its 52w average. Sortable.' },
                        { key: null,               label: 'SIGNAL',          tip: 'Classification based on z-score. Click HOW TO READ for thresholds.' },
                        { key: 'history_days',     label: 'HISTORY',         tip: 'Trading days of data collected so far. Bar fills toward 252 days (1 year).' },
                        { key: null,               label: 'UPDATED',         tip: 'Date of last snapshot' },
                      ] as { key: SortKey | null; label: string; tip: string }[]).map((col, i) => (
                        <th key={i} title={col.tip}
                          onClick={() => col.key && handleSort(col.key)}
                          style={{
                            padding: '10px 12px', textAlign: 'left',
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
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: C.muted, fontSize: 12 }}>
                          {sigFilter !== 'ALL' ? `No ETFs with signal "${sigFilter}" at this time.` : 'No data available.'}
                        </td>
                      </tr>
                    ) : sorted.map((row, idx) => {
                      const sig = row.signal_30v60 ?? 'NO_DATA'
                      const cfg = SIGNAL_CONFIG[sig] ?? SIGNAL_CONFIG['NO_DATA']
                      const histPct = Math.min(100, ((row.history_days ?? 0) / FULL_HISTORY) * 100)

                      // Find ETF group label
                      const group = Object.entries(ETF_GROUPS).find(([, tickers]) => tickers.includes(row.ticker))?.[0] ?? ''

                      return (
                        <tr key={row.ticker}
                          style={{
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)')}
                        >
                          {/* ETF + group */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>{row.ticker}</div>
                            <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{group}</div>
                          </td>

                          {/* Spot */}
                          <td style={{ padding: '10px 12px', color: C.text, textAlign: 'right' }}>
                            {row.spot_price !== null ? `$${row.spot_price.toFixed(2)}` : '—'}
                          </td>

                          {/* IV 30/60/90 */}
                          <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>{fmt(row.iv_30d)}%</td>
                          <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>{fmt(row.iv_60d)}%</td>
                          <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>{fmt(row.iv_90d)}%</td>

                          {/* Credit 30v60 + bar */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                              <span style={{ color: C.text, fontWeight: 600 }}>{fmt(row.credit_30v60_pct, 3)}%</span>
                              {row.credit_30v60_pct !== null && (
                                <div style={{ width: 60, height: 3, background: C.border, borderRadius: 2 }}>
                                  <div style={{ width: barW(row.credit_30v60_pct), height: '100%', borderRadius: 2, background: zColor(row.z_score_30v60) }} />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Credit 30v90 */}
                          <td style={{ padding: '10px 12px', color: C.muted, textAlign: 'right' }}>{fmt(row.credit_30v90_pct, 3)}%</td>

                          {/* Z-score */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <span style={{ color: zColor(row.z_score_30v60), fontWeight: row.z_score_30v60 !== null ? 700 : 400 }}>
                              {fmtZ(row.z_score_30v60)}
                            </span>
                          </td>

                          {/* Signal badge */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                              color: cfg.color, background: cfg.bg,
                              border: `1px solid ${cfg.color === C.muted || cfg.color === C.dim ? C.border : cfg.color}`,
                              borderRadius: 4, padding: '2px 7px', letterSpacing: '0.4px', whiteSpace: 'nowrap',
                              opacity: sig === 'INSUFFICIENT_DATA' || sig === 'NO_DATA' ? 0.6 : 1,
                            }}>{cfg.label}</span>
                          </td>

                          {/* History bar */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: 11, color: (row.history_days ?? 0) > 0 ? C.text : C.dim }}>
                                {row.history_days ?? 0}d
                              </span>
                              <div style={{ width: 50, height: 3, background: C.border, borderRadius: 2 }}>
                                <div style={{
                                  width: histPct + '%', height: '100%', borderRadius: 2,
                                  background: histPct >= 100 ? C.green : histPct >= (SIGNAL_READY / FULL_HISTORY * 100) ? C.accent : C.dim,
                                }} />
                              </div>
                            </div>
                          </td>

                          {/* Date */}
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

            {/* ── Footer ── */}
            <div style={{
              marginTop: 16, fontSize: 11, color: C.dim, lineHeight: 1.7,
              borderTop: `1px solid ${C.border}`, paddingTop: 12,
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px 24px',
            }}>
              <span>📡 <strong style={{ color: C.muted }}>Data source:</strong> yfinance — ATM call mid-price (bid+ask)/2 for real expirations bracketing each target DTE</span>
              <span>🕐 <strong style={{ color: C.muted }}>Update schedule:</strong> Mon–Fri at 17:30 CET / 16:30 UTC (after US market close)</span>
              <span>📐 <strong style={{ color: C.muted }}>Interpolation:</strong> Linear weighting between the two real expirations bracketing 30d / 60d / 90d (VIX-style methodology)</span>
              <span>⚠ <strong style={{ color: C.muted }}>Disclaimer:</strong> Informational only — not financial advice or an investment recommendation</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ETFCalendarPage() {
  return (
    <ProtectedRoute>
      <ETFCalendarContent />
    </ProtectedRoute>
  )
}
