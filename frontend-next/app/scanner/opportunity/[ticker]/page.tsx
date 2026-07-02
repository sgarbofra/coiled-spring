'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { computeCandidateScore, computeWhyPanel, scoreColor } from '@/lib/cs-score'
import RiskPanel from '@/components/RiskPanel'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#888888',
  gridLine: '#1a1a00',
}

type PricePoint = { date: string; close: number }
type PriceHistory = { ticker: string; prices: PricePoint[]; change_1y_pct: number | null }

function buildMonthlyTicks(prices: PricePoint[]): Array<{ x: number; label: string }> {
  const seen = new Set<string>()
  return []
}

function PriceChart({ prices }: { prices: PricePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!prices.length) return null

  const H = 300
  const padL = 58, padR = 16, padT = 12, padB = 36
  const W = width
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const closes = prices.map((p) => p.close)
  const minC = Math.min(...closes)
  const maxC = Math.max(...closes)
  const range = maxC - minC || 1

  const xScale = (i: number) => padL + (i / (prices.length - 1)) * chartW
  const yScale = (v: number) => padT + chartH - ((v - minC) / range) * chartH

  const path = prices
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.close).toFixed(1)}`)
    .join(' ')

  const fillPath = `${path} L${xScale(prices.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`

  const monthTicks: Array<{ x: number; label: string }> = []
  const seen = new Set<string>()
  prices.forEach((p, i) => {
    const key = p.date.slice(0, 7)
    if (!seen.has(key)) {
      seen.add(key)
      const d = new Date(p.date)
      monthTicks.push({ x: xScale(i), label: d.toLocaleDateString('en-US', { month: 'short' }) })
    }
  })

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = minC + (range / 4) * i
    return { y: yScale(v), label: `$${v < 10 ? v.toFixed(2) : v.toFixed(0)}` }
  })

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - padL
    const idx = Math.round((mx / chartW) * (prices.length - 1))
    if (idx >= 0 && idx < prices.length) setHoverIdx(idx)
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={W}
        height={H}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ display: 'block', cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bb.orange} stopOpacity="0.25" />
            <stop offset="100%" stopColor={bb.orange} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={padL} y={padT} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={padL + chartW} y2={t.y} stroke={bb.gridLine} strokeWidth={1} />
            <text x={padL - 6} y={t.y + 4} textAnchor="end" fill={bb.gray} fontSize={10} fontFamily="monospace">
              {t.label}
            </text>
          </g>
        ))}

        <path d={fillPath} fill="url(#lineGrad)" clipPath="url(#chartClip)" />
        <path d={path} fill="none" stroke={bb.orange} strokeWidth={2} clipPath="url(#chartClip)" />

        {monthTicks
          .filter((_, i) => i % 2 === 0)
          .map((t, i) => (
            <text key={i} x={t.x} y={H - 6} textAnchor="middle" fill={bb.gray} fontSize={10} fontFamily="monospace">
              {t.label}
            </text>
          ))}

        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke={bb.border2} strokeWidth={1} />

        {hoverIdx !== null && (() => {
          const tx = xScale(hoverIdx)
          const ty = yScale(prices[hoverIdx].close)
          const boxW = 90
          const boxH = 36
          const bx = tx + 8 + boxW > W ? tx - boxW - 8 : tx + 8
          const by = ty - boxH / 2 < padT ? padT : ty - boxH / 2
          return (
            <>
              <line x1={tx} y1={padT} x2={tx} y2={padT + chartH} stroke={bb.amber} strokeWidth={1} strokeDasharray="4 3" />
              <circle cx={tx} cy={ty} r={4} fill={bb.orange} stroke={bb.amber} strokeWidth={1.5} />
              <rect x={bx} y={by} width={boxW} height={boxH} fill={bb.panel} stroke={bb.border2} rx={2} />
              <text x={bx + 6} y={by + 13} fill={bb.gray} fontSize={10} fontFamily="monospace">
                {prices[hoverIdx].date}
              </text>
              <text x={bx + 6} y={by + 27} fill={bb.orange} fontSize={12} fontFamily="monospace" fontWeight="bold">
                ${prices[hoverIdx].close.toFixed(2)}
              </text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}

function FieldRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        borderBottom: `1px solid ${bb.border}`,
      }}
    >
      <span style={{ color: bb.gray, fontSize: 12, fontFamily: 'monospace' }}>{label}</span>
      <span style={{ color: color ?? bb.white, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}

function OpportunityContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const ticker = (params?.ticker as string)?.toUpperCase() ?? ''

  const strike = parseFloat(searchParams.get('strike') ?? '0')
  const expiration = searchParams.get('expiration') ?? ''
  const optType = (searchParams.get('type') ?? 'call').toLowerCase()
  const delta = parseFloat(searchParams.get('delta') ?? '0')
  const mid = parseFloat(searchParams.get('mid') ?? '0')
  const spread_pct = parseFloat(searchParams.get('spread_pct') ?? '0') * 100
  const oi = parseInt(searchParams.get('oi') ?? '0', 10)
  const dte = parseInt(searchParams.get('dte') ?? '0', 10)
  const vega = parseFloat(searchParams.get('vega') ?? '0')
  const theta = parseFloat(searchParams.get('theta') ?? '0')
  const earningsDate = searchParams.get('earnings_date') ?? undefined

  const [history, setHistory] = useState<PriceHistory | null>(null)
  const [loadingChart, setLoadingChart] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) return
    setLoadingChart(true)
    setChartError(null)
    fetch(`/api/price-history/${ticker}?period=1y`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: PriceHistory) => {
        if (data.prices?.length) setHistory(data)
        else setChartError('No price data available')
      })
      .catch((e) => setChartError(e.message ?? 'Failed to load price history'))
      .finally(() => setLoadingChart(false))
  }, [ticker])

  const scoreInput = { delta, vega, dte, spread_pct, open_interest: oi }
  const score = computeCandidateScore(scoreInput) ?? 0
  const why = computeWhyPanel(scoreInput)
  const sColor = scoreColor(score)

  const currentPrice = history?.prices.at(-1)?.close ?? null
  const low1y = history ? Math.min(...history.prices.map((p) => p.close)) : null
  const high1y = history ? Math.max(...history.prices.map((p) => p.close)) : null

  return (
    <div style={{ minHeight: '100vh', background: bb.bg, color: bb.white, fontFamily: 'monospace' }}>
      <div
        style={{
          background: bb.surface,
          borderBottom: `1px solid ${bb.border2}`,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: bb.gray, marginBottom: 4 }}>
            <span style={{ cursor: 'pointer', color: bb.amber }} onClick={() => router.push('/scanner')}>
              Scanner
            </span>
            <span style={{ margin: '0 6px', color: bb.border2 }}>›</span>
            <span style={{ color: bb.gray }}>Opportunity</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, color: bb.orange, letterSpacing: 1 }}>
            {ticker} — Opportunity Analysis
          </h1>
        </div>
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: `1px solid ${bb.border2}`,
            color: bb.amber,
            fontFamily: 'monospace',
            fontSize: 12,
            padding: '6px 14px',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = bb.amber)}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = bb.border2)}
        >
          ← Back to Scanner
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '1 1 60%',
            minWidth: 300,
            padding: '20px 24px',
            borderRight: `1px solid ${bb.border}`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, color: bb.gray, letterSpacing: 0.5 }}>PRICE HISTORY — 1Y</span>
            {history?.change_1y_pct != null && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: history.change_1y_pct >= 0 ? bb.green : bb.red,
                }}
              >
                {history.change_1y_pct >= 0 ? '+' : ''}
                {history.change_1y_pct.toFixed(2)}%
              </span>
            )}
          </div>

          {loadingChart && (
            <div style={{ color: bb.amber, fontSize: 13, padding: '80px 0', textAlign: 'center' }}>
              Loading price data…
            </div>
          )}
          {chartError && !loadingChart && (
            <div style={{ color: bb.red, fontSize: 13, padding: '80px 0', textAlign: 'center' }}>
              ⚠ {chartError}
            </div>
          )}
          {history && !loadingChart && <PriceChart prices={history.prices} />}

          {currentPrice !== null && (
            <div
              style={{
                marginTop: 14,
                background: bb.panel,
                border: `1px solid ${bb.border}`,
                padding: '8px 14px',
                display: 'flex',
                gap: 28,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 12, color: bb.gray }}>
                Current{' '}
                <span style={{ color: bb.white, fontWeight: 700 }}>${currentPrice.toFixed(2)}</span>
              </span>
              {low1y !== null && (
                <span style={{ fontSize: 12, color: bb.gray }}>
                  1Y Low <span style={{ color: bb.red }}>${low1y.toFixed(2)}</span>
                </span>
              )}
              {high1y !== null && (
                <span style={{ fontSize: 12, color: bb.gray }}>
                  1Y High <span style={{ color: bb.green }}>${high1y.toFixed(2)}</span>
                </span>
              )}
              {currentPrice !== null && strike > 0 && (
                <span style={{ fontSize: 12, color: bb.gray }}>
                  Strike dist.{' '}
                  <span style={{ color: bb.amber }}>
                    {((strike - currentPrice) / currentPrice * 100).toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            flex: '1 1 320px',
            minWidth: 280,
            padding: '20px 24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: bb.panel,
              border: `1px solid ${bb.border2}`,
              padding: '14px 16px',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>
              CONTRACT DETAILS
            </div>
            <FieldRow label="Ticker" value={ticker} color={bb.orange} />
            <FieldRow label="Type" value={optType.toUpperCase()} color={optType === 'call' ? bb.green : bb.red} />
            <FieldRow label="Strike" value={`$${strike.toFixed(2)}`} />
            <FieldRow label="Expiration" value={expiration} />
            <FieldRow
              label="DTE"
              value={`${dte} days`}
              color={dte >= 300 ? bb.green : dte >= 150 ? bb.amber : bb.red}
            />
            <FieldRow label="Mid Price" value={`$${mid.toFixed(2)}`} />
            <FieldRow
              label="Spread"
              value={`${spread_pct.toFixed(1)}%`}
              color={spread_pct <= 5 ? bb.green : spread_pct <= 10 ? bb.amber : bb.red}
            />
            <FieldRow label="Open Int." value={oi.toLocaleString()} color={oi >= 100 ? bb.green : bb.red} />
            <FieldRow label="Delta" value={delta.toFixed(3)} />
            <FieldRow
              label="Vega"
              value={vega.toFixed(4)}
              color={vega >= 1.0 ? bb.green : vega >= 0.5 ? bb.amber : bb.red}
            />
            <FieldRow label="Theta" value={theta.toFixed(4)} color={bb.red} />
          </div>

          <div
            style={{
              background: bb.panel,
              border: `1px solid ${bb.border2}`,
              padding: '14px 16px',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>
              CS SCORE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: sColor,
                  fontFamily: 'monospace',
                  lineHeight: 1,
                  minWidth: 56,
                }}
              >
                {score}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ height: 6, background: bb.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(score, 100)}%`,
                      height: '100%',
                      background: sColor,
                      borderRadius: 3,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: bb.gray, marginTop: 4 }}>
                  {score > 75 ? 'STRONG CANDIDATE' : score >= 70 ? 'ACCEPTABLE' : 'WEAK / AVOID'}
                </div>
              </div>
            </div>
          </div>

          {why.length > 0 && (
            <div
              style={{
                background: bb.panel,
                border: `1px solid ${bb.border2}`,
                padding: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>
                SCORE BREAKDOWN
              </div>
              {why.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: bb.white,
                    padding: '4px 0',
                    borderBottom: i < why.length - 1 ? `1px solid ${bb.border}` : 'none',
                    fontFamily: 'monospace',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              background: bb.panel,
              border: `1px solid ${bb.border2}`,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>
              RISK FLAGS
            </div>
            <RiskPanel
              spread_pct={spread_pct}
              open_interest={oi}
              dte={dte}
              earnings_date={earningsDate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OpportunityPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF6600',
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      }
    >
      <OpportunityContent />
    </Suspense>
  )
}
