'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { computeCandidateScore, computeWhyPanel, scoreColor } from '@/lib/cs-score'
import { computeFlags } from '@/components/RiskPanel'

const bb = {
  bg: '#000000', surface: 'var(--bg-panel)', panel: 'var(--bg-panel)',
  border: 'var(--border)', border2: 'var(--border)',
  orange: 'var(--accent)', amber: 'var(--accent)', yellow: 'var(--accent)',
  green: 'var(--positive)', red: 'var(--negative)', white: 'var(--text-primary)', gray: 'var(--text-secondary)',
  bestBg: '#003300',
}

type ScanResult = {
  underlying: string; option_type: string; strike: number; expiration: string
  dte: number; bid: number; ask: number; mid: number; last_price: number; spread_pct: number
  iv: number; iv_rank: number; delta: number; gamma: number; vega: number
  theta: number; open_interest: number; volume: number; symbol_key: string
}

type RatingRow = {
  label: string
  getValue: (r: ScanResult) => string
  getNumeric: (r: ScanResult) => number
  bestIs: 'max' | 'min' | 'closest'   // closest = closest to 0.30 (delta)
  closestTarget?: number
  colorFn?: (r: ScanResult) => string
}

const RATING_ROWS: RatingRow[] = [
  {
    label: 'DELTA (|Δ|)',
    getValue: r => Math.abs(r.delta).toFixed(3),
    getNumeric: r => Math.abs(r.delta),
    bestIs: 'closest',
    closestTarget: 0.30,
    colorFn: r => {
      const d = Math.abs(r.delta)
      return d >= 0.25 && d <= 0.40 ? bb.green : d >= 0.20 && d <= 0.45 ? bb.amber : bb.red
    },
  },
  {
    label: 'SPREAD %',
    getValue: r => `${r.spread_pct.toFixed(1)}%`,
    getNumeric: r => r.spread_pct,
    bestIs: 'min',
    colorFn: r => r.spread_pct <= 5 ? bb.green : r.spread_pct <= 10 ? bb.amber : bb.red,
  },
  {
    label: 'DTE',
    getValue: r => `${r.dte}d`,
    getNumeric: r => r.dte,
    bestIs: 'max',
    colorFn: r => r.dte >= 300 ? bb.green : r.dte >= 150 ? bb.amber : bb.red,
  },
  {
    label: 'OPEN INTEREST',
    getValue: r => r.open_interest.toLocaleString(),
    getNumeric: r => r.open_interest,
    bestIs: 'max',
    colorFn: r => r.open_interest >= 1000 ? bb.green : r.open_interest >= 100 ? bb.amber : bb.red,
  },
  {
    label: 'MID PRICE',
    getValue: r => `$${r.mid.toFixed(2)}`,
    getNumeric: r => r.mid,
    bestIs: 'min',  // lower premium = less capital at risk (for long vol)
  },
  {
    label: 'VEGA',
    getValue: r => r.vega.toFixed(4),
    getNumeric: r => r.vega,
    bestIs: 'max',
    colorFn: r => r.vega >= 1.0 ? bb.green : r.vega >= 0.5 ? bb.amber : bb.red,
  },
  {
    label: 'THETA (daily)',
    getValue: r => r.theta.toFixed(4),
    getNumeric: r => r.theta,
    bestIs: 'max',  // theta is negative; closest to 0 = least time decay
    colorFn: r => bb.red,
  },
  {
    label: 'IV %',
    getValue: r => `${r.iv.toFixed(1)}%`,
    getNumeric: r => r.iv,
    bestIs: 'min',  // long vol: want to buy when IV is low
  },
]

// Colore e icona per righe WHY panel (stringhe con emoji 🟢/🟡/🟠/🔴 o keyword)
function whyColor(line: string): string {
  if (line.startsWith('🟢') || line.startsWith('Excellent')) return bb.green
  if (line.startsWith('🟡') || line.startsWith('🟠') || line.startsWith('Good') || line.startsWith('Short') || line.startsWith('Acceptable')) return bb.amber
  return bb.red
}
function whyIcon(line: string): string {
  if (line.startsWith('🟢') || line.startsWith('Excellent')) return '✓'
  if (line.startsWith('🟡') || line.startsWith('🟠') || line.startsWith('Good') || line.startsWith('Short') || line.startsWith('Acceptable')) return '·'
  return '✗'
}

function getBestIndex(contracts: ScanResult[], row: RatingRow): number {
  if (contracts.length === 0) return -1
  const values = contracts.map(row.getNumeric)
  if (row.bestIs === 'max') {
    const max = Math.max(...values)
    return values.indexOf(max)
  }
  if (row.bestIs === 'min') {
    const min = Math.min(...values)
    return values.indexOf(min)
  }
  // closest
  const target = row.closestTarget ?? 0
  const dists = values.map(v => Math.abs(v - target))
  const minDist = Math.min(...dists)
  return dists.indexOf(minDist)
}

function ColHeader({ r, idx, total }: { r: ScanResult; idx: number; total: number }) {
  const score = computeCandidateScore({ delta: r.delta, vega: r.vega, dte: r.dte, spread_pct: r.spread_pct, open_interest: r.open_interest }) ?? 0
  const color = scoreColor(score)
  return (
    <th style={{
      padding: '10px 14px',
      textAlign: 'center',
      background: bb.surface,
      borderBottom: `2px solid ${bb.orange}`,
      borderRight: idx < total - 1 ? `1px solid ${bb.border2}` : undefined,
      minWidth: 160,
    }}>
      <div style={{ color: bb.orange, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{r.underlying}</div>
      <div style={{ color: r.option_type === 'call' ? bb.green : bb.red, fontSize: 11, marginTop: 2 }}>
        {r.option_type.toUpperCase()} ${r.strike} · {r.expiration}
      </div>
      <div style={{ color, fontSize: 22, fontWeight: 700, marginTop: 6 }}>{score}</div>
      <div style={{ color: bb.gray, fontSize: 10 }}>CS SCORE</div>
    </th>
  )
}

function CompareContent() {
  const router = useRouter()
  const [contracts, setContracts] = useState<ScanResult[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cs_compare_contracts')
      if (raw) setContracts(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  if (contracts.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: bb.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: bb.amber, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        No contracts selected.{' '}
        <span style={{ color: bb.orange, cursor: 'pointer', marginLeft: 8 }} onClick={() => router.push('/scanner')}>
          ← Back to Scanner
        </span>
      </div>
    )
  }

  const bestScore = contracts.reduce((best, r) => {
    const s = computeCandidateScore({ delta: r.delta, vega: r.vega, dte: r.dte, spread_pct: r.spread_pct, open_interest: r.open_interest }) ?? 0
    return s > (best.score) ? { r, score: s } : best
  }, { r: contracts[0], score: 0 })

  const colStyle = (isBest: boolean, extraColor?: string): React.CSSProperties => ({
    padding: '7px 14px',
    textAlign: 'center',
    borderRight: `1px solid ${bb.border}`,
    borderBottom: `1px solid ${bb.border}`,
    background: isBest ? bb.bestBg : 'transparent',
    color: isBest ? bb.green : (extraColor ?? bb.white),
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: isBest ? 700 : 400,
    transition: 'background 0.2s',
  })

  const labelStyle: React.CSSProperties = {
    padding: '7px 14px',
    textAlign: 'left',
    color: bb.gray,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: 1,
    borderBottom: `1px solid ${bb.border}`,
    borderRight: `1px solid ${bb.border2}`,
    background: bb.surface,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ minHeight: '100vh', background: bb.bg, color: bb.white, fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <div style={{ background: bb.surface, borderBottom: `1px solid ${bb.border2}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: bb.gray, marginBottom: 4 }}>
            <span style={{ color: bb.amber, cursor: 'pointer' }} onClick={() => router.push('/scanner')}>Scanner</span>
            <span style={{ margin: '0 6px', color: bb.border2 }}>›</span>
            <span>Compare Contracts</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 18, color: bb.orange, letterSpacing: 1 }}>
            COMPARE CONTRACTS — {contracts.length} selected
          </h1>
        </div>
        <button
          onClick={() => router.back()}
          style={{ background: 'transparent', border: `1px solid ${bb.border2}`, color: bb.amber, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 14px', cursor: 'pointer', letterSpacing: 1 }}
        >
          ← Back to Scanner
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', padding: '24px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ ...labelStyle, color: bb.yellow, fontSize: 11, letterSpacing: 2, fontWeight: 700, verticalAlign: 'bottom' }}>
                PARAMETER
              </th>
              {contracts.map((r, i) => (
                <ColHeader key={r.symbol_key} r={r} idx={i} total={contracts.length} />
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── IDENTIFIERS ────────────────────────────────── */}
            <tr>
              <td style={{ ...labelStyle, color: bb.amber, fontWeight: 700, fontSize: 11, letterSpacing: 2, paddingTop: 12 }}>
                IDENTIFIERS
              </td>
              {contracts.map((r, i) => (
                <td key={i} style={{ ...colStyle(false), color: bb.gray, fontSize: 11, paddingTop: 12 }} />
              ))}
            </tr>
            {[
              { label: 'TICKER', fn: (r: ScanResult) => r.underlying, color: bb.orange },
              { label: 'TYPE', fn: (r: ScanResult) => r.option_type.toUpperCase(), color: (r: ScanResult) => r.option_type === 'call' ? bb.green : bb.red },
              { label: 'STRIKE', fn: (r: ScanResult) => `$${r.strike}` },
              { label: 'EXPIRATION', fn: (r: ScanResult) => r.expiration },
            ].map(row => (
              <tr key={row.label}>
                <td style={labelStyle}>{row.label}</td>
                {contracts.map((r, i) => (
                  <td key={i} style={{ ...colStyle(false), color: typeof row.color === 'function' ? (row.color as (r: ScanResult) => string)(r) : (row.color ?? bb.white) }}>
                    {row.fn(r)}
                  </td>
                ))}
              </tr>
            ))}

            {/* ── NUMERIC METRICS ────────────────────────────── */}
            <tr>
              <td style={{ ...labelStyle, color: bb.amber, fontWeight: 700, fontSize: 11, letterSpacing: 2, paddingTop: 12 }}>
                NUMERIC METRICS
              </td>
              {contracts.map((r, i) => (
                <td key={i} style={{ ...colStyle(false), paddingTop: 12 }} />
              ))}
            </tr>
            {RATING_ROWS.map(row => {
              const bestIdx = getBestIndex(contracts, row)
              return (
                <tr key={row.label}>
                  <td style={labelStyle}>{row.label}</td>
                  {contracts.map((r, i) => {
                    const isBest = i === bestIdx
                    const c = row.colorFn ? row.colorFn(r) : bb.white
                    return (
                      <td key={i} style={colStyle(isBest, isBest ? undefined : c)}>
                        {row.getValue(r)}
                        {isBest && <span style={{ fontSize: 9, marginLeft: 4, color: bb.green }}>▲ BEST</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* ── CS SCORE ───────────────────────────────────── */}
            <tr>
              <td style={{ ...labelStyle, color: bb.amber, fontWeight: 700, fontSize: 11, letterSpacing: 2, paddingTop: 12 }}>
                CS ANALYSIS
              </td>
              {contracts.map((r, i) => (
                <td key={i} style={{ ...colStyle(false), paddingTop: 12 }} />
              ))}
            </tr>

            {/* CS Score row */}
            {(() => {
              const scores = contracts.map(r => computeCandidateScore({ delta: r.delta, vega: r.vega, dte: r.dte, spread_pct: r.spread_pct, open_interest: r.open_interest }) ?? 0)
              const maxScore = Math.max(...scores)
              return (
                <tr>
                  <td style={labelStyle}>CS CANDIDATE SCORE</td>
                  {contracts.map((r, i) => {
                    const s = scores[i]
                    const isBest = s === maxScore
                    const color = scoreColor(s)
                    return (
                      <td key={i} style={{ ...colStyle(isBest), color: isBest ? bb.green : color, fontWeight: 700, fontSize: 16 }}>
                        {s}
                        {isBest && <span style={{ fontSize: 9, marginLeft: 4, color: bb.green }}>▲ BEST</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })()}

            {/* Rating labels — via computeWhyPanel: [deltaLabel, liquidityLabel, dteLabel, vegaLabel] */}
            {(['DELTA RATING', 'LIQUIDITY RATING', 'DTE RATING', 'VEGA RATING'] as const).map((label, lineIdx) => (
              <tr key={label}>
                <td style={labelStyle}>{label}</td>
                {contracts.map((r, i) => {
                  const why = computeWhyPanel({ delta: r.delta, vega: r.vega, dte: r.dte, spread_pct: r.spread_pct, open_interest: r.open_interest })
                  const val = why[lineIdx] ?? '—'
                  return (
                    <td key={i} style={{ ...colStyle(false), color: whyColor(val), fontSize: 11 }}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* WHY Panel — completo */}
            <tr>
              <td style={labelStyle}>WHY PANEL</td>
              {contracts.map((r, i) => {
                const why = computeWhyPanel({ delta: r.delta, vega: r.vega, dte: r.dte, spread_pct: r.spread_pct, open_interest: r.open_interest })
                return (
                  <td key={i} style={{ ...colStyle(false), textAlign: 'left', fontSize: 11, lineHeight: 1.7 }}>
                    {why.map((line, j) => (
                      <div key={j} style={{ color: whyColor(line) }}>{whyIcon(line)} {line}</div>
                    ))}
                  </td>
                )
              })}
            </tr>

            {/* Risk Flags */}
            <tr>
              <td style={labelStyle}>RISK FLAGS</td>
              {contracts.map((r, i) => {
                const flags = computeFlags({ spread_pct: r.spread_pct, open_interest: r.open_interest, dte: r.dte, earnings_date: null })
                return (
                  <td key={i} style={{ ...colStyle(false), textAlign: 'left', fontSize: 11, lineHeight: 1.7 }}>
                    {flags.length === 0
                      ? <span style={{ color: bb.green }}>✅ No immediate risks</span>
                      : flags.map((f, j) => (
                          <div key={j} style={{ color: f.color }}>{f.label}</div>
                        ))
                    }
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>

        {/* Footer — Best Overall */}
        <div style={{
          marginTop: 24,
          padding: '14px 20px',
          background: bb.bestBg,
          border: `1px solid ${bb.green}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ color: bb.green, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
            ▲ BEST OVERALL (CS SCORE):
          </span>
          <span style={{ color: bb.orange, fontWeight: 700, fontSize: 15 }}>
            {bestScore.r.underlying} {bestScore.r.option_type.toUpperCase()} ${bestScore.r.strike} · {bestScore.r.expiration}
          </span>
          <span style={{ color: bb.green, fontSize: 18, fontWeight: 700 }}>
            {bestScore.score}
          </span>
          <span style={{ color: bb.gray, fontSize: 11 }}>
            — Lower IV Rank = better entry for long volatility strategy
          </span>
        </div>

        {/* Quick links to Opportunity */}
        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {contracts.map(r => {
            const p = new URLSearchParams({
              strike: String(r.strike),
              expiration: r.expiration,
              type: r.option_type,
              delta: String(r.delta),
              mid: String(r.mid),
              spread_pct: String(r.spread_pct / 100),
              oi: String(r.open_interest),
              dte: String(r.dte),
              vega: String(r.vega),
              theta: String(r.theta),
            })
            return (
              <button
                key={r.symbol_key}
                onClick={() => router.push(`/scanner/opportunity/${r.underlying}?${p.toString()}`)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${bb.orange}`,
                  color: bb.orange,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                📊 {r.underlying} ${r.strike} Opportunity →
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
        Loading…
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
