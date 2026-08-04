'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'

// ── Design tokens (consistent with app) ──────────────────────────────────────
const C = {
  bg:       '#0c0e12',
  surface:  '#111318',
  surface2: '#161922',
  border:   '#1e2330',
  orange:   '#e87722',
  white:    '#f0f2f5',
  gray:     '#8b94a3',
  dim:      '#444444',
  green:    '#4ade80',
  red:      '#f87171',
  yellow:   '#facc15',
  blue:     '#4a9eff',
  purple:   '#a78bfa',
}
const MONO = "'JetBrains Mono', 'Courier New', monospace"
const SANS = "'Figtree', -apple-system, BlinkMacSystemFont, sans-serif"

// ── VIX Regime ───────────────────────────────────────────────────────────────
type Regime = { label: string; color: string; desc: string; grade: string }

function vixRegime(vix: number): Regime {
  if (vix < 12) return { label: 'ULTRA COMPRESSED', color: C.green,  desc: 'Finestra LEAPS eccezionale — IV al minimo storico',  grade: 'A+' }
  if (vix < 15) return { label: 'COMPRESSED',       color: C.green,  desc: 'Finestra LEAPS ideale — buy convexity',             grade: 'A'  }
  if (vix < 20) return { label: 'NORMAL',            color: C.yellow, desc: 'Zona neutra — alta selettività richiesta',          grade: 'B'  }
  if (vix < 25) return { label: 'ELEVATED',          color: C.orange, desc: 'Vol in espansione — dimensiona con cautela',        grade: 'C'  }
  if (vix < 30) return { label: 'HIGH',              color: '#ff6b35',desc: 'LEAPS costosi — posizioni piccole',                 grade: 'D'  }
  return            { label: 'SPIKE',              color: C.red,    desc: 'Vol in picco — attendi la compressione',            grade: 'F'  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type HVRow = {
  ticker: string
  company_name?: string
  hv20?: number
  hv60?: number
  hv252?: number
  hv_rank?: number
  compression_streak?: number
}

type PriceStats = { current_price?: number; year_high?: number; year_low?: number; ma20?: number }

type PortfolioItem = { id: number; name: string; open_positions: number }

type PortfolioSummary = {
  open_positions: number
  closed_positions: number
  unrealized_pnl: number
  realized_pnl: number
  total_pnl: number
  winners: number
  losers: number
}

// ── Nav cards definition ──────────────────────────────────────────────────────
const NAV_CARDS = [
  { label: 'LEAPS SCANNER',  sub: 'Scan 3,500+ underlyings', href: '/scanner',     icon: '⟳', color: C.orange },
  { label: 'WATCHLIST',      sub: 'Monitora candidati',       href: '/watchlists',  icon: '◆', color: C.green  },
  { label: 'PORTFOLIO',      sub: 'Traccia posizioni aperte', href: '/portfolio',   icon: '△', color: C.blue   },
  { label: 'HV SCREENER',    sub: 'Vol storica compatta',     href: '/hv-screener', icon: '▣', color: C.yellow },
  { label: 'COILED AI',      sub: 'Analisi AI del contratto', href: '/ai',          icon: '◉', color: C.purple },
]

// ── Skeleton component ────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = '20px' }: { w?: string; h?: string }) {
  return (
    <div className="skeleton" style={{ width: w, height: h, borderRadius: '3px' }} />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [today, setToday] = useState('')

  // VIX state
  const [vix, setVix]           = useState<number | null>(null)
  const [vixLoading, setVixL]   = useState(true)

  // VIX derived stats (52W H/L, MA20) — calcolati dai dati già scaricati
  const [vixYear52High, setVixYear52High] = useState<number | null>(null)
  const [vixYear52Low,  setVixYear52Low]  = useState<number | null>(null)
  const [vixMa20,       setVixMa20]       = useState<number | null>(null)

  // HV Radar state
  const [hvData, setHvData]     = useState<HVRow[]>([])
  const [hvLoading, setHvL]     = useState(true)
  const [hvAge, setHvAge]       = useState<string | null>(null)

  // Portfolio state
  const [portfolio, setPortfolio]       = useState<PortfolioItem | null>(null)
  const [summary, setSummary]           = useState<PortfolioSummary | null>(null)
  const [portfolioLoading, setPortfolioL] = useState(true)
  const [hasPortfolios, setHasPortfolios] = useState<boolean | null>(null)

  // Price stats for HV Radar tickers
  const [priceStats, setPriceStats] = useState<Record<string, PriceStats>>({})

  // Today's date
  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }))
  }, [])

  // ── Fetch VIX ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/market/vix')
      .then(r => r.json())
      .then((data: Array<{ date: string; close: number }>) => {
        if (Array.isArray(data) && data.length > 0) {
          const closes = data.map(d => d.close)
          setVix(closes[closes.length - 1])
          setVixYear52High(Math.max(...closes))
          setVixYear52Low(Math.min(...closes))
          if (closes.length >= 20) {
            const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
            setVixMa20(Math.round(ma20 * 100) / 100)
          }
        }
      })
      .catch(() => {})
      .finally(() => setVixL(false))
  }, [])

  // ── Fetch HV Screener — top 7 most compressed ─────────────────────────────
  useEffect(() => {
    fetch('/api/hv-screener?sort_by=hv_rank&limit=7')
      .then(r => r.json())
      .then((res) => {
        const rows: HVRow[] = res?.data || res?.tickers || []
        const sorted = rows
          .filter(r => typeof r.hv_rank === 'number' && (r.hv20 ?? 0) > 0)
          .sort((a, b) => (a.hv_rank ?? 100) - (b.hv_rank ?? 100))
          .slice(0, 7)
        setHvData(sorted)
        if (res?.computed_at) {
          const d = new Date(res.computed_at)
          setHvAge(d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
        }
      })
      .catch(() => {})
      .finally(() => setHvL(false))
  }, [])

  // ── Fetch price stats for HV Radar tickers ───────────────────────────────
  useEffect(() => {
    if (hvData.length === 0) return
    const tickers = hvData.map(r => r.ticker)
    Promise.all(
      tickers.map(t =>
        fetch(`/api/market/price-stats/${t}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => data ? ({ ticker: t, data }) : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, PriceStats> = {}
      results.forEach(r => { if (r) map[r.ticker] = r.data })
      setPriceStats(map)
    })
  }, [hvData])

  // ── Fetch portfolio list → then first portfolio summary ───────────────────
  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(async (data) => {
        const list: PortfolioItem[] = data?.portfolios || []
        setHasPortfolios(list.length > 0)
        if (list.length > 0) {
          const first = list[0]
          setPortfolio(first)
          const sumRes = await fetch(`/api/portfolio/${first.id}/summary`)
          const sumData = await sumRes.json()
          if (sumData?.ok && sumData?.summary) setSummary(sumData.summary)
        }
      })
      .catch(() => setHasPortfolios(false))
      .finally(() => setPortfolioL(false))
  }, [])

  const regime = vix !== null ? vixRegime(vix) : null

  const fmt = (n: number) =>
    (n >= 0 ? '+' : '') + n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <ProtectedRoute>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 6px #4ade80}50%{opacity:.4;box-shadow:0 0 2px #4ade80} }
        @keyframes shimmer { 0%{background-position:-600px 0}100%{background-position:600px 0} }
        .pulse { animation: pulse-dot 2s ease-in-out infinite; }
        .skeleton {
          background: linear-gradient(90deg, #1a1d24 25%, #1e222b 50%, #1a1d24 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.6s infinite;
        }
        .nav-card {
          transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
          cursor: pointer;
        }
        .nav-card:hover {
          border-color: rgba(232,119,34,.4) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(232,119,34,.1);
        }
        .hv-row { cursor: pointer; transition: background .15s; }
        .hv-row:hover { background: rgba(232,119,34,.05) !important; }
        .regime-pill {
          transition: all .15s;
        }
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .nav-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .nav-grid  { grid-template-columns: 1fr !important; }
          .regime-pills { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.white, fontFamily: SANS }}>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{
          borderBottom: `1px solid ${C.border}`,
          padding: '0.75rem 2rem',
          background: '#080a0e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <span className="pulse" style={{
              display: 'inline-block', width: '7px', height: '7px',
              borderRadius: '50%', background: C.green, flexShrink: 0,
            }} />
            <span style={{ fontFamily: MONO, fontSize: '0.72rem', color: C.gray, letterSpacing: '2.5px', fontWeight: '700' }}>
              COMMAND CENTER
            </span>
            <span style={{ fontFamily: MONO, fontSize: '0.65rem', color: C.dim }}>·</span>
            <span style={{ fontFamily: MONO, fontSize: '0.65rem', color: C.dim, letterSpacing: '0.5px' }}>{today}</span>
          </div>
          <button
            onClick={() => router.push('/scanner')}
            style={{
              background: C.orange, color: '#0c0e12', border: 'none',
              padding: '0.4rem 1rem', fontFamily: MONO, fontSize: '0.7rem',
              fontWeight: '700', letterSpacing: '1px', cursor: 'pointer', borderRadius: '2px',
            }}
          >
            APRI SCANNER →
          </button>
        </div>

        <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

          {/* ── VIX Regime Banner ──────────────────────────────────────────── */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '6px', padding: '1.1rem 1.5rem',
            marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
          }}>
            {/* VIX number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: '0.58rem', color: C.dim, letterSpacing: '2.5px' }}>VIX</span>
              {vixLoading ? (
                <Skeleton w="68px" h="2.4rem" />
              ) : vix !== null ? (
                <span style={{ fontFamily: MONO, fontSize: '2.4rem', fontWeight: '700', color: regime?.color ?? C.white, lineHeight: 1 }}>
                  {vix.toFixed(2)}
                </span>
              ) : (
                <span style={{ fontFamily: MONO, fontSize: '1.1rem', color: C.dim }}>N/A</span>
              )}
            </div>

            {/* Vertical divider */}
            <div style={{ width: '1px', height: '3.2rem', background: C.border, flexShrink: 0 }} />

            {/* Regime label */}
            {regime ? (
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontFamily: MONO, fontSize: '1rem', fontWeight: '700', color: regime.color, letterSpacing: '0.5px' }}>
                    {regime.label}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: '0.65rem',
                    background: regime.color, color: '#000',
                    padding: '0.08rem 0.35rem', fontWeight: '700', borderRadius: '2px',
                  }}>
                    {regime.grade}
                  </span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: C.gray }}>{regime.desc}</div>
              </div>
            ) : !vixLoading && (
              <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: C.dim }}>Dati regime non disponibili</span>
            )}

            {/* 52W H/L + MA20 */}
            {!vixLoading && (vixYear52High !== null || vixMa20 !== null) && (
              <>
                <div style={{ width: '1px', height: '3.2rem', background: C.border, flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
                  {vixYear52High !== null && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '2px', marginBottom: '0.2rem' }}>52W HIGH</div>
                      <div style={{ fontFamily: MONO, fontSize: '1.1rem', fontWeight: '700', color: C.red }}>{vixYear52High.toFixed(2)}</div>
                    </div>
                  )}
                  {vixYear52Low !== null && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '2px', marginBottom: '0.2rem' }}>52W LOW</div>
                      <div style={{ fontFamily: MONO, fontSize: '1.1rem', fontWeight: '700', color: C.green }}>{vixYear52Low.toFixed(2)}</div>
                    </div>
                  )}
                  {vixMa20 !== null && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '2px', marginBottom: '0.2rem' }}>MA20</div>
                      <div style={{ fontFamily: MONO, fontSize: '1.1rem', fontWeight: '700', color: C.blue }}>{vixMa20.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={{ flex: 1 }} />

            {/* Reference pills */}
            <div className="regime-pills" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {([
                { range: '< 15',   desc: 'LEAPS window', lo: 0,  hi: 15, color: C.green  },
                { range: '15–20',  desc: 'Neutral zone',  lo: 15, hi: 20, color: C.yellow },
                { range: '20–30',  desc: 'Elevated',      lo: 20, hi: 30, color: C.orange },
                { range: '> 30',   desc: 'Vol spike',     lo: 30, hi: 999,color: C.red    },
              ] as const).map((p) => {
                const active = vix !== null && vix >= p.lo && vix < p.hi
                return (
                  <div key={p.range} className="regime-pill" style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.22rem 0.55rem',
                    background: active ? `${p.color}18` : 'transparent',
                    border: `1px solid ${active ? p.color : C.border}`,
                    borderRadius: '3px',
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.6rem', color: p.color, fontWeight: '700' }}>{p.range}</span>
                    <span style={{ fontFamily: MONO, fontSize: '0.58rem', color: C.dim }}>{p.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Main 2-column grid ─────────────────────────────────────────── */}
          <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', marginBottom: '1.25rem' }}>

            {/* ── LEFT: HV Radar ─────────────────────────────────────────── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>

              {/* Card header */}
              <div style={{
                borderBottom: `1px solid ${C.border}`, padding: '0.8rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: '0.62rem', color: C.orange, fontWeight: '700', letterSpacing: '2px' }}>
                    ◈ TODAY&apos;S RADAR
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: '0.58rem', color: C.dim, marginLeft: '0.75rem' }}>
                    tickers più compressi per HV Rank
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {hvAge && (
                    <span style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim }}>aggiornato {hvAge}</span>
                  )}
                  <button
                    onClick={() => router.push('/hv-screener')}
                    style={{
                      background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.gray, padding: '0.28rem 0.65rem',
                      fontFamily: MONO, fontSize: '0.58rem', cursor: 'pointer', borderRadius: '2px', letterSpacing: '1px',
                    }}
                  >
                    FULL SCREENER →
                  </button>
                </div>
              </div>

              {/* Column headers */}
              <div style={{
                display: 'grid', gridTemplateColumns: '76px 64px 64px 1fr 80px',
                padding: '0.45rem 1.25rem', borderBottom: `1px solid ${C.border}`,
              }}>
                {['TICKER', 'HV20', 'HV60', 'HV RANK (% nell\'anno)', 'STREAK'].map(h => (
                  <span key={h} style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '1.5px', fontWeight: '700' }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {hvLoading ? (
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[1,2,3,4,5].map(i => <Skeleton key={i} h="30px" />)}
                </div>
              ) : hvData.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', fontFamily: MONO, fontSize: '0.75rem', color: C.dim }}>
                  Dati HV non ancora calcolati — torna tra qualche minuto
                </div>
              ) : (
                <>
                  {hvData.map((row, i) => {
                    const rank = row.hv_rank ?? 50
                    const rankColor = rank < 15 ? C.green : rank < 30 ? C.yellow : rank < 50 ? C.orange : C.red
                    const streakGood = (row.compression_streak ?? 0) >= 5

                    return (
                      <div
                        key={row.ticker}
                        className="hv-row"
                        onClick={() => router.push(`/scanner?ticker=${row.ticker}`)}
                        style={{
                          display: 'grid', gridTemplateColumns: '76px 64px 64px 1fr 80px',
                          padding: '0.6rem 1.25rem',
                          borderBottom: i < hvData.length - 1 ? `1px solid rgba(30,35,48,0.6)` : 'none',
                        }}
                      >
                        <div>
                          <span style={{ fontFamily: MONO, fontSize: '0.82rem', color: C.orange, fontWeight: '700' }}>
                            {row.ticker}
                          </span>
                          {priceStats[row.ticker] && (
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
                              {priceStats[row.ticker].year_high != null && (
                                <span style={{ fontFamily: MONO, fontSize: '0.5rem', color: C.green }}>
                                  H {priceStats[row.ticker].year_high?.toFixed(0)}
                                </span>
                              )}
                              {priceStats[row.ticker].year_low != null && (
                                <span style={{ fontFamily: MONO, fontSize: '0.5rem', color: C.red }}>
                                  L {priceStats[row.ticker].year_low?.toFixed(0)}
                                </span>
                              )}
                              {priceStats[row.ticker].ma20 != null && (
                                <span style={{ fontFamily: MONO, fontSize: '0.5rem', color: C.blue }}>
                                  MA20 {priceStats[row.ticker].ma20?.toFixed(0)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: '0.78rem', color: C.white }}>
                          {row.hv20 != null ? row.hv20.toFixed(1) + '%' : '—'}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: '0.78rem', color: C.gray }}>
                          {row.hv60 != null ? row.hv60.toFixed(1) + '%' : '—'}
                        </span>
                        {/* Rank bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.75rem' }}>
                          <div style={{ flex: 1, height: '3px', background: '#1a1d24', borderRadius: '2px' }}>
                            <div style={{
                              width: `${Math.min(100, rank)}%`, height: '100%',
                              background: rankColor, borderRadius: '2px', transition: 'width .5s ease',
                            }} />
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: '0.7rem', color: rankColor, fontWeight: '700', minWidth: '32px', textAlign: 'right' }}>
                            {rank.toFixed(0)}%
                          </span>
                        </div>
                        {/* Streak */}
                        <span style={{ fontFamily: MONO, fontSize: '0.7rem', color: streakGood ? C.green : C.dim }}>
                          {row.compression_streak != null ? `${row.compression_streak}d` : '—'}
                          {streakGood && ' ✦'}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Card footer */}
              <div style={{
                borderTop: `1px solid ${C.border}`, padding: '0.5rem 1.25rem',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim }}>
                  CLICK TICKER → SCANNER · ✦ STREAK ≥ 5gg = SEGNALE SNIPER
                </span>
                <span style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim }}>
                  DATI AGGIORNATI GIORNALMENTE
                </span>
              </div>
            </div>

            {/* ── RIGHT: Portfolio Snapshot ───────────────────────────────── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', overflow: 'hidden' }}>

              {/* Card header */}
              <div style={{
                borderBottom: `1px solid ${C.border}`, padding: '0.8rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: MONO, fontSize: '0.62rem', color: C.orange, fontWeight: '700', letterSpacing: '2px' }}>
                  ◈ PORTFOLIO SNAPSHOT
                </span>
                {portfolio && (
                  <button
                    onClick={() => router.push('/portfolio')}
                    style={{
                      background: 'transparent', border: `1px solid ${C.border}`,
                      color: C.gray, padding: '0.28rem 0.65rem',
                      fontFamily: MONO, fontSize: '0.58rem', cursor: 'pointer', borderRadius: '2px', letterSpacing: '1px',
                    }}
                  >
                    APRI →
                  </button>
                )}
              </div>

              <div style={{ padding: '1.25rem' }}>
                {/* Loading */}
                {portfolioLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Skeleton h="3rem" />
                    <Skeleton h="1.5rem" />
                    <Skeleton h="4.5rem" />
                    <Skeleton h="1.5rem" />
                  </div>
                )}

                {/* No portfolio */}
                {!portfolioLoading && hasPortfolios === false && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: C.dim, marginBottom: '0.5rem' }}>
                      Nessun portfolio creato
                    </div>
                    <div style={{ fontFamily: SANS, fontSize: '0.8rem', color: C.gray, marginBottom: '1.5rem', lineHeight: '1.6' }}>
                      Crea il tuo primo portfolio per tracciare posizioni aperte e P&L
                    </div>
                    <button
                      onClick={() => router.push('/portfolio')}
                      style={{
                        background: C.orange, color: '#0c0e12', border: 'none',
                        padding: '0.55rem 1.25rem', fontFamily: MONO,
                        fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', borderRadius: '2px', letterSpacing: '1px',
                      }}
                    >
                      CREA PORTFOLIO →
                    </button>
                  </div>
                )}

                {/* Portfolio with data */}
                {!portfolioLoading && portfolio && summary && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Total P&L */}
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '2.5px', marginBottom: '0.3rem' }}>
                        TOTAL P&L
                      </div>
                      <div style={{
                        fontFamily: MONO, fontSize: '2.1rem', fontWeight: '700', lineHeight: 1,
                        color: summary.total_pnl >= 0 ? C.green : C.red,
                      }}>
                        {fmt(summary.total_pnl)}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: '0.6rem', color: C.dim, marginTop: '0.3rem', display: 'flex', gap: '0.75rem' }}>
                        <span>
                          Unrealized:{' '}
                          <span style={{ color: summary.unrealized_pnl >= 0 ? C.green : C.red }}>
                            {summary.unrealized_pnl >= 0 ? '+' : ''}{Math.round(summary.unrealized_pnl).toLocaleString('en-US')} USD
                          </span>
                        </span>
                        <span style={{ color: C.dim }}>·</span>
                        <span>
                          Realized:{' '}
                          <span style={{ color: summary.realized_pnl >= 0 ? C.green : C.red }}>
                            {summary.realized_pnl >= 0 ? '+' : ''}{Math.round(summary.realized_pnl).toLocaleString('en-US')} USD
                          </span>
                        </span>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: C.border }} />

                    {/* Stats 3-grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      {([
                        { label: 'OPEN POS',  value: summary.open_positions,  color: C.white  },
                        { label: 'WINNERS',   value: summary.winners,          color: C.green  },
                        { label: 'LOSERS',    value: summary.losers,           color: C.red    },
                      ] as const).map(s => (
                        <div key={s.label} style={{
                          textAlign: 'center', padding: '0.6rem 0.4rem',
                          background: C.surface2, borderRadius: '3px',
                        }}>
                          <div style={{ fontFamily: MONO, fontSize: '1.4rem', fontWeight: '700', color: s.color }}>{s.value}</div>
                          <div style={{ fontFamily: MONO, fontSize: '0.52rem', color: C.dim, letterSpacing: '1.5px', marginTop: '0.1rem' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Win-rate bar */}
                    {(summary.winners + summary.losers) > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: MONO, fontSize: '0.55rem', color: C.dim, letterSpacing: '2px' }}>WIN RATE</span>
                          <span style={{ fontFamily: MONO, fontSize: '0.6rem', color: C.green, fontWeight: '700' }}>
                            {Math.round(summary.winners / (summary.winners + summary.losers) * 100)}%
                          </span>
                        </div>
                        <div style={{ height: '3px', background: '#1a1d24', borderRadius: '2px' }}>
                          <div style={{
                            width: `${Math.round(summary.winners / (summary.winners + summary.losers) * 100)}%`,
                            height: '100%', background: C.green, borderRadius: '2px', transition: 'width .6s ease',
                          }} />
                        </div>
                      </div>
                    )}

                    <div style={{
                      fontFamily: MONO, fontSize: '0.55rem', color: C.dim,
                      borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem',
                    }}>
                      {portfolio.name} · prezzi ritardati 15 min
                    </div>
                  </div>
                )}

                {/* Portfolio exists but no summary (no positions yet) */}
                {!portfolioLoading && portfolio && !summary && (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ fontFamily: MONO, fontSize: '0.78rem', color: C.dim, marginBottom: '1rem' }}>
                      Portfolio vuoto — nessuna posizione aperta
                    </div>
                    <button
                      onClick={() => router.push('/scanner')}
                      style={{
                        background: 'transparent', color: C.orange, border: `1px solid ${C.orange}`,
                        padding: '0.45rem 1rem', fontFamily: MONO,
                        fontSize: '0.68rem', fontWeight: '600', cursor: 'pointer', borderRadius: '2px', letterSpacing: '1px',
                      }}
                    >
                      TROVA OPPORTUNITÀ →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Quick Navigation ─────────────────────────────────────────────── */}
          <div className="nav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
            {NAV_CARDS.map(card => (
              <div
                key={card.href}
                className="nav-card"
                onClick={() => router.push(card.href)}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: '6px', padding: '1.25rem 1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.6rem',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: '1.4rem', color: card.color }}>{card.icon}</span>
                <div>
                  <div style={{
                    fontFamily: MONO, fontSize: '0.65rem', color: C.white,
                    fontWeight: '700', letterSpacing: '1.5px', marginBottom: '0.2rem',
                  }}>
                    {card.label}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: '0.75rem', color: C.dim }}>{card.sub}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  )
}
