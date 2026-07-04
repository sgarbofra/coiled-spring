'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#666600',
}

// ── Black-Scholes (TypeScript) ─────────────────────────────────────────────

function normCdf(x: number): number {
  // Abramowitz & Stegun — max error 7.5e-8
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const t = 1 / (1 + p * Math.abs(x) / Math.SQRT2)
  let poly = 0
  for (let i = a.length - 1; i >= 0; i--) poly = poly * t + a[i]
  const erf = 1 - poly * t * Math.exp(-(x * x) / 2)
  return 0.5 * (1 + sign * erf)
}

function bsPrice(S: number, K: number, T: number, r: number, sigma: number, isCall: boolean): number {
  if (S <= 0 || K <= 0 || sigma <= 0) return isCall ? Math.max(S - K, 0) : Math.max(K - S, 0)
  if (T <= 0) return isCall ? Math.max(S - K, 0) : Math.max(K - S, 0)
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  if (isCall) return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2)
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1)
}

// ── Types ──────────────────────────────────────────────────────────────────

type PosData = {
  trade_id: number
  underlying: string
  option_type: string
  strike: number
  expiration: string      // ISO date, e.g. "2027-06-17"
  direction: string
  quantity: number
  current_spot: number
  iv_used_pct: number     // IV in %, e.g. 10.2
  current_value: number   // current BS value in $ (signed: long=+, short=-)
  beta: number | null
}

// ── Chart config ───────────────────────────────────────────────────────────

const TIME_CURVES = [
  { days: 0,   label: 'Today',  color: '#FF6600', width: 2.5 },
  { days: 7,   label: '+7d',    color: '#FFE000', width: 1.8 },
  { days: 30,  label: '+30d',   color: '#AAFFAA', width: 1.8 },
  { days: 90,  label: '+90d',   color: '#00CCDD', width: 1.8 },
  { days: 180, label: '+180d',  color: '#4488FF', width: 1.5 },
  { days: 365, label: '+365d',  color: '#CC66FF', width: 1.5 },
]

// X axis: spot move % from -40% to +40%, step 1% (81 points)
const X_RANGE = Array.from({ length: 81 }, (_, i) => -40 + i)
const R = 0.05  // risk-free rate

// ── Payoff computation ─────────────────────────────────────────────────────

function portfolioPayoff(
  positions: PosData[],
  isMulti: boolean,
  spotMovePct: number,  // % move in underlying (or SPX for multi)
  daysForward: number,
  ivShiftPct: number,
): number {
  const now = Date.now()
  let total = 0
  for (const p of positions) {
    if (!p.iv_used_pct || p.iv_used_pct <= 0) continue
    const currentDte = Math.max((new Date(p.expiration).getTime() - now) / 86400000, 0)
    const newDte = Math.max(currentDte - daysForward, 0)
    const T_new = newDte / 365

    const actualMove = isMulti ? (p.beta ?? 1) * spotMovePct : spotMovePct
    const S_new = p.current_spot * (1 + actualMove / 100)

    const iv_base = p.iv_used_pct / 100
    const iv_new = Math.max(iv_base * (1 + ivShiftPct / 100), 0.001)

    const isCall = p.option_type === 'call'
    const sign = p.direction === 'long' ? 1 : -1

    const priceNew = bsPrice(S_new, p.strike, T_new, R, iv_new, isCall)
    total += (priceNew * 100 * p.quantity * sign) - p.current_value
  }
  return total
}

// ── Build Plotly traces ────────────────────────────────────────────────────

function buildTraces(positions: PosData[], isMulti: boolean, ivShiftPct: number): object[] {
  const now = Date.now()
  const maxDte = Math.max(...positions.map(p =>
    Math.max((new Date(p.expiration).getTime() - now) / 86400000, 0)
  ))

  const traces: object[] = []

  for (const c of TIME_CURVES) {
    if (c.days > 0 && c.days >= maxDte) continue   // skip curves past expiry

    const y = X_RANGE.map(x => portfolioPayoff(positions, isMulti, x, c.days, ivShiftPct))

    traces.push({
      x: X_RANGE,
      y,
      type: 'scatter',
      mode: 'lines',
      name: c.label,
      line: { color: c.color, width: c.width },
      hovertemplate: `<b>${c.label}</b><br>Move: %{x:+d}%<br>P&L: $%{y:,.2f}<extra></extra>`,
    })
  }

  // Break-even line
  traces.push({
    x: [X_RANGE[0], X_RANGE[X_RANGE.length - 1]],
    y: [0, 0],
    type: 'scatter',
    mode: 'lines',
    name: 'Break-even',
    line: { color: '#555500', width: 1, dash: 'dot' },
    showlegend: false,
    hoverinfo: 'skip',
  })

  return traces
}

// ── Plotly layout ──────────────────────────────────────────────────────────

function buildLayout(isMulti: boolean, positions: PosData[]): object {
  const underlyings = [...new Set(positions.map(p => p.underlying))].join(' / ')
  const xTitle = isMulti
    ? 'Market Move — SPX (%)'
    : `${underlyings} Move (%)`

  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(10,10,0,0.7)',
    font: { family: 'Courier New, monospace', color: '#AAAA00', size: 11 },
    margin: { t: 16, r: 24, b: 56, l: 90 },
    xaxis: {
      title: { text: xTitle, font: { color: '#FFAA00', size: 11 } },
      tickcolor: '#333300', gridcolor: '#1a1a00',
      zerolinecolor: '#FF6600', zerolinewidth: 2,
      color: '#888800', ticksuffix: '%',
    },
    yaxis: {
      title: { text: 'Portfolio P&L ($)', font: { color: '#FFAA00', size: 11 } },
      tickcolor: '#333300', gridcolor: '#1a1a00',
      zerolinecolor: '#666600', zerolinewidth: 1,
      color: '#888800', tickprefix: '$', tickformat: ',.0f',
    },
    legend: {
      bgcolor: 'rgba(0,0,0,0.6)', font: { color: '#CCCC00', size: 11 },
      bordercolor: '#333300', borderwidth: 1,
      x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top',
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: '#111100', bordercolor: '#FF6600',
      font: { color: '#FFFFFF', family: 'Courier New', size: 11 },
    },
    shapes: [{
      // Vertical marker at x=0 (current price)
      type: 'line', x0: 0, x1: 0, yref: 'paper', y0: 0, y1: 1,
      line: { color: '#FF6600', width: 1.5, dash: 'dash' },
    }],
    annotations: [{
      x: 0, yref: 'paper', y: 1.0, text: '▼ NOW',
      showarrow: false, font: { color: '#FF6600', size: 10, family: 'Courier New' },
      xanchor: 'center', yanchor: 'bottom',
    }],
  }
}

// ── Position summary bar ───────────────────────────────────────────────────

function PositionBar({ positions }: { positions: PosData[] }) {
  return (
    <div style={{
      padding: '6px 24px', borderBottom: `1px solid ${bb.border}`,
      display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11,
    }}>
      {positions.map(p => (
        <div key={p.trade_id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: bb.orange, fontWeight: 700 }}>
            {p.underlying} {p.option_type.toUpperCase()} {p.strike}
          </span>
          <span style={{ color: p.direction === 'long' ? bb.green : bb.red }}>
            {p.direction.toUpperCase()}
          </span>
          <span style={{ color: '#888800' }}>×{p.quantity}</span>
          <span style={{ color: '#777700' }}>
            IV {p.iv_used_pct.toFixed(1)}%
          </span>
          {p.beta !== null && (
            <span style={{ color: '#555500' }}>β{p.beta?.toFixed(2)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function WhatIfSimulator({ portfolioId }: { portfolioId: number }) {
  const [positions, setPositions] = useState<PosData[] | null>(null)
  const [isMulti, setIsMulti] = useState(false)
  const [ivShift, setIvShift] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(
      `/api/portfolio/${portfolioId}/what-if?market_change_pct=0&iv_change_pct=0&days_forward=0`,
      { credentials: 'include' }
    )
      .then(r => r.json())
      .then(data => {
        if (!data.ok) throw new Error(data.error ?? 'Backend error')
        setIsMulti(!!data.is_multi_underlying)
        setPositions(data.positions ?? [])
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [portfolioId])

  const hasPos = positions && positions.length > 0
  const traces  = hasPos ? buildTraces(positions, isMulti, ivShift) : []
  const layout  = hasPos ? buildLayout(isMulti, positions) : {}

  return (
    <div style={{
      background: bb.surface,
      border: `1px solid ${bb.border2}`,
      fontFamily: 'Courier New, monospace',
    }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${bb.orange}`,
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: bb.yellow, letterSpacing: 2 }}>
            PORTFOLIO PAYOFF DIAGRAM
          </div>
          <div style={{ fontSize: 10, color: bb.gray, marginTop: 2 }}>
            Black-Scholes · IV computed from live market prices · Theoretical values
          </div>
        </div>
        {loading && <span style={{ fontSize: 11, color: bb.amber, letterSpacing: 1 }}>LOADING…</span>}
      </div>

      {/* Multi-underlying disclaimer */}
      {isMulti && hasPos && (
        <div style={{
          background: '#1a1100', borderBottom: `1px solid ${bb.amber}`,
          padding: '5px 24px', fontSize: 10, color: bb.amber,
        }}>
          ⚠ MULTI-UNDERLYING — X axis = SPX % move · Each stock moves by its CAPM beta: ΔS = β × ΔS<sub>spx</sub>
        </div>
      )}

      {/* Position pills */}
      {hasPos && <PositionBar positions={positions} />}

      {/* IV shift slider */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${bb.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: bb.amber, letterSpacing: 1 }}>
            IV SHIFT — shift all implied volatilities proportionally
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
            color: ivShift > 0 ? bb.red : ivShift < 0 ? bb.green : bb.gray,
            minWidth: 60, textAlign: 'right',
          }}>
            {ivShift > 0 ? '+' : ''}{ivShift}%
          </span>
        </div>
        <input
          type="range" min={-50} max={50} step={1} value={ivShift}
          onChange={e => setIvShift(Number(e.target.value))}
          style={{ width: '100%', accentColor: bb.orange, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: bb.gray, marginTop: 2 }}>
          <span>-50% (vol collapse)</span>
          <span>0</span>
          <span>+50% (vol spike)</span>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ padding: '0 4px 4px', minHeight: 440 }}>
        {error && (
          <div style={{ color: bb.red, padding: '20px 24px', fontSize: 12 }}>⚠ {error}</div>
        )}
        {!loading && positions !== null && positions.length === 0 && (
          <div style={{ color: bb.gray, padding: '24px 24px', fontSize: 12 }}>
            No open positions with IV data available.
            <div style={{ marginTop: 8, color: '#444400' }}>
              The simulator needs live option prices to compute implied volatility.
            </div>
          </div>
        )}
        {hasPos && (
          <Plot
            data={traces as never[]}
            layout={layout as never}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', height: 440 }}
            useResizeHandler
          />
        )}
      </div>

      {/* Legend */}
      {hasPos && (
        <div style={{
          borderTop: `1px solid ${bb.border}`,
          padding: '6px 24px',
          display: 'flex', gap: 16, flexWrap: 'wrap',
          fontSize: 10, color: bb.gray,
        }}>
          <span>Each line = P&L at different time horizon (theta decay effect)</span>
          {TIME_CURVES.map(c => (
            <span key={c.days} style={{ color: c.color }}>─ {c.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
