'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { computeCandidateScore, computeWhyPanel, scoreColor } from '@/lib/cs-score'
import RiskPanel, { computeFlags } from '@/components/RiskPanel'
import VolSurface from '@/components/VolSurface'

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

function HVChart({ prices }: { prices: PricePoint[] }) {
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

  // Calcola HV 20 giorni rolling (annualizzata)
  const WINDOW = 20
  const hvData: Array<{ date: string; hv: number; idx: number }> = []
  for (let i = WINDOW; i < prices.length; i++) {
    const slice = prices.slice(i - WINDOW, i + 1)
    const logReturns = slice.slice(1).map((p, j) => Math.log(p.close / slice[j].close))
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
    const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (logReturns.length - 1)
    hvData.push({ date: prices[i].date, hv: Math.sqrt(variance * 252) * 100, idx: i })
  }

  if (!hvData.length) return null

  const H = 90
  const padL = 58, padR = 16, padT = 8, padB = 20
  const W = width
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const hvValues = hvData.map((d) => d.hv)
  const minHV = Math.min(...hvValues)
  const maxHV = Math.max(...hvValues)
  const range = maxHV - minHV || 1

  const xScale = (i: number) => padL + (i / (prices.length - 1)) * chartW
  const yScale = (v: number) => padT + chartH - ((v - minHV) / range) * chartH

  const path = hvData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.idx).toFixed(1)},${yScale(d.hv).toFixed(1)}`)
    .join(' ')
  const fillPath = `${path} L${xScale(hvData[hvData.length - 1].idx).toFixed(1)},${(padT + chartH).toFixed(1)} L${xScale(hvData[0].idx).toFixed(1)},${(padT + chartH).toFixed(1)} Z`

  const yTicks = [minHV, (minHV + maxHV) / 2, maxHV].map((v) => ({
    y: yScale(v),
    label: `${v.toFixed(0)}%`,
  }))

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - padL
    const priceIdx = Math.round((mx / chartW) * (prices.length - 1))
    const closest = hvData.reduce((best, d) =>
      Math.abs(d.idx - priceIdx) < Math.abs(best.idx - priceIdx) ? d : best, hvData[0])
    setHoverIdx(closest.idx)
  }

  const hoveredPoint = hoverIdx !== null
    ? (hvData.find((d) => d.idx === hoverIdx) ?? hvData[hvData.length - 1])
    : null

  const hvColor = '#00DD00'

  return (
    <div ref={containerRef} style={{ width: '100%', marginTop: 6 }}>
      <div style={{ padding: '0 0 2px 58px', fontSize: 10, fontFamily: 'monospace', color: bb.gray, letterSpacing: 0.5 }}>
        HV 20D (VOL. STORICA ANNUALIZZATA)
      </div>
      <svg
        width={W}
        height={H}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ display: 'block', cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="hvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hvColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={hvColor} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="hvClip">
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

        <path d={fillPath} fill="url(#hvGrad)" clipPath="url(#hvClip)" />
        <path d={path} fill="none" stroke={hvColor} strokeWidth={1.5} clipPath="url(#hvClip)" />
        <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke={bb.border2} strokeWidth={1} />

        {hoveredPoint && (() => {
          const tx = xScale(hoveredPoint.idx)
          const ty = yScale(hoveredPoint.hv)
          const boxW = 86
          const boxH = 36
          const bx = tx + 8 + boxW > W ? tx - boxW - 8 : tx + 8
          const by = ty - boxH / 2 < padT ? padT : ty + boxH / 2 > padT + chartH ? padT + chartH - boxH : ty - boxH / 2
          return (
            <>
              <line x1={tx} y1={padT} x2={tx} y2={padT + chartH} stroke={hvColor} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} />
              <circle cx={tx} cy={ty} r={3} fill={hvColor} />
              <rect x={bx} y={by} width={boxW} height={boxH} fill={bb.panel} stroke={bb.border2} rx={2} />
              <text x={bx + 6} y={by + 13} fill={bb.gray} fontSize={10} fontFamily="monospace">{hoveredPoint.date}</text>
              <text x={bx + 6} y={by + 27} fill={hvColor} fontSize={12} fontFamily="monospace" fontWeight="bold">
                {hoveredPoint.hv.toFixed(1)}%
              </text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}

// ── HV Rank Panel ─────────────────────────────────────────────────────────────
function calcHV(prices: PricePoint[], window: number): number | null {
  if (prices.length < window + 1) return null
  const slice = prices.slice(prices.length - window - 1)
  const logR = slice.slice(1).map((p, i) => Math.log(p.close / slice[i].close))
  const mean = logR.reduce((a, b) => a + b, 0) / logR.length
  const variance = logR.reduce((a, b) => a + (b - mean) ** 2, 0) / (logR.length - 1)
  return Math.sqrt(variance * 252) * 100
}

function HVRankPanel({ prices }: { prices: PricePoint[] }) {
  if (prices.length < 22) return null

  // Calcola rolling HV20 su tutta la serie per il ranking
  const allHV20: number[] = []
  for (let i = 20; i < prices.length; i++) {
    const slice = prices.slice(i - 20, i + 1)
    const logR = slice.slice(1).map((p, j) => Math.log(p.close / slice[j].close))
    const mean = logR.reduce((a, b) => a + b, 0) / logR.length
    const variance = logR.reduce((a, b) => a + (b - mean) ** 2, 0) / (logR.length - 1)
    allHV20.push(Math.sqrt(variance * 252) * 100)
  }

  const currentHV20 = allHV20[allHV20.length - 1]
  const hv60 = calcHV(prices, 60)
  const hv252 = calcHV(prices, 252)

  // HV Rank = % di valori storici INFERIORI all'attuale (basso = vol compressa)
  const belowCount = allHV20.filter(v => v < currentHV20).length
  const hvRank = Math.round((belowCount / allHV20.length) * 100)

  const rankColor = hvRank <= 30 ? '#00CC44' : hvRank <= 60 ? '#FFB300' : '#FF3333'
  const rankLabel = hvRank <= 30 ? 'VOL COMPRESSA' : hvRank <= 60 ? 'VOL MEDIA' : 'VOL ELEVATA'

  return (
    <div style={{
      marginTop: 8, marginBottom: 2,
      background: bb.panel, border: `1px solid ${bb.border}`,
      padding: '10px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: bb.gray, letterSpacing: 1, fontFamily: 'monospace' }}>
          HV RANK — VOL. STORICA COMPRESSA?
        </span>
        <span style={{ fontSize: 11, fontWeight: 'bold', color: rankColor, letterSpacing: 1, fontFamily: 'monospace' }}>
          {rankLabel}
        </span>
      </div>

      {/* Gauge bar */}
      <div style={{ position: 'relative', height: 8, background: '#1a1a00', borderRadius: 2, marginBottom: 10 }}>
        {/* Zone colorate statiche */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', background: 'rgba(0,204,68,0.25)', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '30%', top: 0, width: '30%', height: '100%', background: 'rgba(255,179,0,0.20)' }} />
        <div style={{ position: 'absolute', left: '60%', top: 0, width: '40%', height: '100%', background: 'rgba(255,51,51,0.20)', borderRadius: '0 2px 2px 0' }} />
        {/* Indicatore posizione */}
        <div style={{
          position: 'absolute', top: -2, left: `calc(${hvRank}% - 4px)`,
          width: 8, height: 12, background: rankColor, borderRadius: 2,
          boxShadow: `0 0 6px ${rankColor}`,
        }} />
      </div>

      {/* Valori numerici */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: bb.gray }}>
          HV20 <span style={{ color: rankColor, fontWeight: 'bold' }}>{currentHV20.toFixed(1)}%</span>
        </span>
        {hv60 !== null && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: bb.gray }}>
            HV60 <span style={{ color: bb.white }}>{hv60.toFixed(1)}%</span>
          </span>
        )}
        {hv252 !== null && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: bb.gray }}>
            HV252 <span style={{ color: bb.white }}>{hv252.toFixed(1)}%</span>
          </span>
        )}
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: bb.gray }}>
          RANK <span style={{ color: rankColor, fontWeight: 'bold' }}>{hvRank}%</span>
          <span style={{ color: bb.gray, fontSize: 10 }}> ({allHV20.length}d)</span>
        </span>
        {hv60 !== null && (
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: bb.gray }}>
            HV20/HV60 <span style={{ color: currentHV20 < hv60 ? '#00CC44' : '#FF3333', fontWeight: 'bold' }}>
              {(currentHV20 / hv60).toFixed(2)}x
            </span>
          </span>
        )}
      </div>
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

  // ── Modalità: HV screener (mode=hv) vs Scanner opzione ────────────────────
  const mode = searchParams.get('mode') ?? ''
  const isHVMode = mode === 'hv'
  const hvHV30 = parseFloat(searchParams.get('hv30') ?? '0')
  const hvRankParam = parseFloat(searchParams.get('hv_rank') ?? '0')
  const hvPct = parseFloat(searchParams.get('hv_pct') ?? '0')
  const hv52wHigh = parseFloat(searchParams.get('hv_52w_high') ?? '0')
  const hv52wLow = parseFloat(searchParams.get('hv_52w_low') ?? '0')
  const companyName = searchParams.get('company') ?? ''

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

  // ── IV History state ──────────────────────────────────────────────────────
  type IVRecord = { date: string; dte_bucket: number; iv_pct: number }
  const [ivHistory, setIvHistory] = useState<IVRecord[] | null>(null)
  const [ivHistoryLoading, setIvHistoryLoading] = useState(false)
  const [ivHistoryOpen, setIvHistoryOpen] = useState(false)

  const fetchIvHistory = async () => {
    if (ivHistory !== null) { setIvHistoryOpen((o) => !o); return }
    setIvHistoryLoading(true)
    setIvHistoryOpen(true)
    try {
      const res = await fetch(`/api/scanner/iv-history/${ticker}`, { credentials: 'include' })
      const data = await res.json()
      setIvHistory(data.records ?? [])
    } catch { setIvHistory([]) } finally { setIvHistoryLoading(false) }
  }

  // ── AI Summary state ──────────────────────────────────────────────────────
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // ── Personal Notes state ──────────────────────────────────────────────────
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteLastSaved, setNoteLastSaved] = useState<Date | null>(null)

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

  // ── Fetch nota al mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ticker || !expiration || !strike) return
    fetch(
      `/api/notes?ticker=${encodeURIComponent(ticker)}&strike=${strike}&expiration=${encodeURIComponent(expiration)}`,
      { credentials: 'include' }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.note) {
          setNoteText(data.note.note_text ?? '')
          if (data.note.updated_at) setNoteLastSaved(new Date(data.note.updated_at))
        }
      })
      .catch(() => { /* silent — note non critica */ })
  }, [ticker, strike, expiration])

  const scoreInput = { delta, vega, dte, spread_pct, open_interest: oi }
  const score = computeCandidateScore(scoreInput) ?? 0
  const why = computeWhyPanel(scoreInput)
  const sColor = scoreColor(score)

  const riskFlagList = computeFlags({ spread_pct, open_interest: oi, dte, earnings_date: earningsDate })
  const flagCount = riskFlagList.length
  const riskLevel = flagCount === 0 ? 'LOW' : flagCount <= 2 ? 'MEDIUM' : 'HIGH'
  const riskColor = flagCount === 0 ? '#00CC00' : flagCount <= 2 ? '#FFAA00' : '#FF3333'

  const currentPrice = history?.prices.at(-1)?.close ?? null
  const low1y = history ? Math.min(...history.prices.map((p) => p.close)) : null
  const high1y = history ? Math.max(...history.prices.map((p) => p.close)) : null

  // ── AI Summary fetch ──────────────────────────────────────────────────────
  const fetchAiSummary = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/opportunity-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticker,
          strike,
          expiration,
          delta,
          dte,
          spread_pct,
          open_interest: oi,
          mid,
          vega,
          theta,
          candidate_score: score,
          why_panel: why,
          risk_flags: riskFlagList.map((f) => f.label),
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'AI error')
      setAiSummary(data.summary)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Note save on blur ─────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!ticker || !expiration || !strike) return
    setNoteSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticker, strike, expiration, note_text: noteText }),
      })
      const data = await res.json()
      if (data.ok && data.note?.updated_at) {
        setNoteLastSaved(new Date(data.note.updated_at))
      }
    } catch (err) { console.error('[notes] save failed', err) } finally {
      setNoteSaving(false)
    }
  }

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
            <span style={{ cursor: 'pointer', color: bb.amber }} onClick={() => router.push(isHVMode ? '/hv-screener' : '/scanner')}>
              {isHVMode ? 'HV Screener' : 'Scanner'}
            </span>
            <span style={{ margin: '0 6px', color: bb.border2 }}>›</span>
            <span style={{ color: bb.gray }}>{isHVMode ? 'Volatility Detail' : 'Opportunity'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, color: bb.orange, letterSpacing: 1 }}>
            {ticker} — {isHVMode ? 'Volatility Analysis' : 'Opportunity Analysis'}
            {isHVMode && companyName && (
              <span style={{ fontSize: 13, color: bb.gray, marginLeft: 10, fontWeight: 400, letterSpacing: 0 }}>
                {companyName}
              </span>
            )}
          </h1>
        </div>
        <button
          onClick={() => isHVMode ? router.push('/hv-screener') : router.back()}
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
          {history && !loadingChart && <HVChart prices={history.prices} />}
          {history && !loadingChart && <HVRankPanel prices={history.prices} />}

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
              <button
                onClick={fetchIvHistory}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: `1px solid ${bb.yellow}`,
                  color: bb.yellow,
                  fontFamily: 'monospace',
                  fontSize: 10,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  letterSpacing: 1,
                  opacity: ivHistoryLoading ? 0.6 : 1,
                }}
              >
                {ivHistoryLoading ? '⟳ LOADING...' : ivHistoryOpen ? '▲ HIDE IV HISTORY' : '▼ IV HISTORY'}
              </button>
            </div>
          )}
          {/* ── IV HISTORY TABLE ─────────────────────────────── */}
          {ivHistoryOpen && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${bb.border2}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: bb.yellow, letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
                IV HISTORY — ATM IMPLIED VOLATILITY ({ticker})
              </div>
              {ivHistoryLoading && (
                <div style={{ color: bb.amber, fontSize: 12, padding: '20px 0' }}>Loading IV history…</div>
              )}
              {!ivHistoryLoading && ivHistory !== null && ivHistory.length === 0 && (
                <div style={{ color: bb.gray, fontSize: 12, fontStyle: 'italic' }}>
                  No IV history yet — data accumulates daily after 16:30 UTC.
                </div>
              )}
              {!ivHistoryLoading && ivHistory !== null && ivHistory.length > 0 && (() => {
                // Raggruppa per data → { date: { 30: iv, 60: iv, 90: iv, 180: iv } }
                const byDate: Record<string, Record<number, number>> = {}
                for (const r of ivHistory) {
                  if (!byDate[r.date]) byDate[r.date] = {}
                  byDate[r.date][r.dte_bucket] = r.iv_pct
                }
                const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
                const buckets = [30, 60, 90, 180]
                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${bb.border2}` }}>
                          <th style={{ textAlign: 'left', padding: '4px 10px', color: bb.gray, fontWeight: 600 }}>DATE</th>
                          {buckets.map((b) => (
                            <th key={b} style={{ textAlign: 'right', padding: '4px 10px', color: bb.yellow, fontWeight: 600 }}>
                              {b}d IV
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dates.map((d, i) => (
                          <tr key={d} style={{ borderBottom: `1px solid ${i % 2 === 0 ? bb.border : 'transparent'}`, background: i % 2 === 0 ? bb.panel : 'transparent' }}>
                            <td style={{ padding: '4px 10px', color: bb.gray }}>{d}</td>
                            {buckets.map((b) => {
                              const v = byDate[d][b]
                              const color = v == null ? bb.border2 : v >= 40 ? bb.green : v >= 25 ? bb.amber : bb.white
                              return (
                                <td key={b} style={{ textAlign: 'right', padding: '4px 10px', color }}>
                                  {v != null ? `${v.toFixed(1)}%` : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: 9, color: bb.gray, marginTop: 8, fontStyle: 'italic' }}>
                      {ivHistory.length} records — color: green ≥40% | amber ≥25% | white below
                    </div>
                  </div>
                )
              })()}
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
          {isHVMode ? (
            /* ── HV MODE: pannello snapshot volatilità ───────────────────────── */
            <>
              <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 12 }}>
                  HV SNAPSHOT — {ticker}
                </div>
                {(() => {
                  const rankColor = hvRankParam >= 80 ? bb.red : hvRankParam >= 50 ? bb.amber : bb.green
                  const rankLabel = hvRankParam >= 80 ? 'VOLATILITÀ ELEVATA' : hvRankParam >= 50 ? 'VOLATILITÀ MEDIA' : 'VOL COMPRESSA'
                  return (
                    <>
                      <FieldRow label="HV 30D" value={hvHV30 > 0 ? `${hvHV30.toFixed(1)}%` : '—'} color={bb.white} />
                      <FieldRow label="HV Rank" value={hvRankParam > 0 ? `${hvRankParam.toFixed(1)}` : '—'} color={rankColor} />
                      <FieldRow label="HV Percentile" value={hvPct > 0 ? `${hvPct.toFixed(1)}%` : '—'} color={bb.white} />
                      <FieldRow label="52W HV High" value={hv52wHigh > 0 ? `${hv52wHigh.toFixed(1)}%` : '—'} color={bb.red} />
                      <FieldRow label="52W HV Low" value={hv52wLow > 0 ? `${hv52wLow.toFixed(1)}%` : '—'} color={bb.green} />
                      {currentPrice !== null && (
                        <FieldRow label="Last Price" value={`$${currentPrice.toFixed(2)}`} color={bb.orange} />
                      )}
                      {low1y !== null && <FieldRow label="1Y Low" value={`$${low1y.toFixed(2)}`} color={bb.red} />}
                      {high1y !== null && <FieldRow label="1Y High" value={`$${high1y.toFixed(2)}`} color={bb.green} />}
                      {/* Rank gauge */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 10, color: rankColor, letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
                          {rankLabel}
                        </div>
                        <div style={{ position: 'relative', height: 8, background: '#1a1a00', borderRadius: 2 }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', background: 'rgba(0,221,0,0.25)', borderRadius: '2px 0 0 2px' }} />
                          <div style={{ position: 'absolute', left: '30%', top: 0, width: '30%', height: '100%', background: 'rgba(255,170,0,0.20)' }} />
                          <div style={{ position: 'absolute', left: '60%', top: 0, width: '40%', height: '100%', background: 'rgba(255,51,51,0.20)', borderRadius: '0 2px 2px 0' }} />
                          <div style={{
                            position: 'absolute', top: -2,
                            left: `calc(${Math.min(hvRankParam, 100)}% - 4px)`,
                            width: 8, height: 12, background: rankColor, borderRadius: 2,
                            boxShadow: `0 0 6px ${rankColor}`,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: bb.gray }}>
                          <span>0 — VOL MIN</span>
                          <span>100 — VOL MAX</span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '12px 14px', fontSize: 11, color: bb.gray, lineHeight: 1.6 }}>
                <div style={{ color: bb.amber, fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>NOTA</div>
                I grafici a sinistra mostrano Price History 1Y e HV 20D calcolata in tempo reale dai prezzi di chiusura. I valori HV Rank in questo pannello provengono dal daily snapshot dell&apos;HV Screener.
              </div>
            </>
          ) : (
            /* ── SCANNER MODE: contract details + CS Score + Risk ──────────── */
            <>
              <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>
                  CONTRACT DETAILS
                </div>
                <FieldRow label="Ticker" value={ticker} color={bb.orange} />
                <FieldRow label="Type" value={optType.toUpperCase()} color={optType === 'call' ? bb.green : bb.red} />
                <FieldRow label="Strike" value={`$${strike.toFixed(2)}`} />
                <FieldRow label="Expiration" value={expiration} />
                <FieldRow label="DTE" value={`${dte} days`} color={dte >= 300 ? bb.green : dte >= 150 ? bb.amber : bb.red} />
                <FieldRow label="Mid Price" value={`$${mid.toFixed(2)}`} />
                <FieldRow label="Spread" value={`${spread_pct.toFixed(1)}%`} color={spread_pct <= 5 ? bb.green : spread_pct <= 10 ? bb.amber : bb.red} />
                <FieldRow label="Open Int." value={oi.toLocaleString()} color={oi >= 100 ? bb.green : bb.red} />
                <FieldRow label="Delta" value={delta.toFixed(3)} />
                <FieldRow label="Vega" value={vega.toFixed(4)} color={vega >= 1.0 ? bb.green : vega >= 0.5 ? bb.amber : bb.red} />
                <FieldRow label="Theta" value={theta.toFixed(4)} color={bb.red} />
              </div>

              <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>CS SCORE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 38, fontWeight: 700, color: sColor, fontFamily: 'monospace', lineHeight: 1, minWidth: 56 }}>
                    {score}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 6, background: bb.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', background: sColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: bb.gray, marginTop: 4 }}>
                      {score > 75 ? 'STRONG CANDIDATE' : score >= 70 ? 'ACCEPTABLE' : 'WEAK / AVOID'}
                    </div>
                  </div>
                </div>
              </div>

              {why.length > 0 && (
                <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>SCORE BREAKDOWN</div>
                  {why.map((line, i) => (
                    <div key={i} style={{ fontSize: 12, color: bb.white, padding: '4px 0', borderBottom: i < why.length - 1 ? `1px solid ${bb.border}` : 'none', fontFamily: 'monospace' }}>
                      {line}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: bb.panel, border: `1px solid ${bb.border2}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: bb.amber, letterSpacing: 1, marginBottom: 10 }}>RISK FLAGS</div>
                {riskFlagList.length === 0 ? (
                  <div style={{ color: bb.green, fontSize: 12, fontFamily: 'monospace', padding: '3px 0' }}>✅ No immediate risks</div>
                ) : (
                  riskFlagList.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: f.color, fontFamily: 'monospace', padding: '5px 0', borderBottom: i < riskFlagList.length - 1 ? `1px solid ${bb.border}` : 'none' }}>
                      {f.label}
                    </div>
                  ))
                )}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${bb.border2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: bb.gray, fontFamily: 'monospace', letterSpacing: 1 }}>OVERALL RISK</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: riskColor, fontFamily: 'monospace', letterSpacing: 2 }}>{riskLevel}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── COILED AI ANALYSIS + PERSONAL NOTES — solo in scanner mode ── */}
      {!isHVMode && <div style={{ borderTop: `1px solid ${bb.border}`, padding: '20px 24px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* AI Summary */}
        <div style={{ flex: '1 1 340px', border: `1px solid ${bb.orange}`, background: bb.panel, boxSizing: 'border-box' }}>
          <div style={{ borderBottom: `1px solid ${bb.orange}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: bb.orange, letterSpacing: 2, fontWeight: 700 }}>COILED AI ANALYSIS</span>
            <button
              onClick={fetchAiSummary}
              disabled={aiLoading}
              style={{
                background: aiLoading ? bb.border : 'transparent',
                border: `1px solid ${bb.orange}`,
                color: bb.orange,
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '3px 10px',
                cursor: aiLoading ? 'default' : 'pointer',
                letterSpacing: 1,
                opacity: aiLoading ? 0.6 : 1,
              }}
            >
              {aiLoading ? 'LOADING...' : aiSummary ? 'REFRESH ANALYSIS' : 'GENERATE ANALYSIS'}
            </button>
          </div>
          <div style={{ padding: '12px 14px', minHeight: 80 }}>
            {!aiSummary && !aiLoading && !aiError && (
              <div style={{ color: bb.gray, fontSize: 11, fontStyle: 'italic' }}>
                Click &quot;Generate Analysis&quot; for an educational AI summary.
              </div>
            )}
            {aiLoading && <div style={{ color: bb.amber, fontSize: 11 }}>Analyzing with Coiled AI...</div>}
            {aiError && <div style={{ color: bb.red, fontSize: 11 }}>Warning {aiError}</div>}
            {aiSummary && !aiLoading && (
              <div style={{ color: bb.white, fontSize: 11, lineHeight: 1.65 }}>{aiSummary}</div>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${bb.border}`, padding: '6px 14px', fontSize: 9, color: bb.gray, fontStyle: 'italic' }}>
            Educational content only — not investment advice.
          </div>
        </div>

        {/* Personal Notes */}
        <div style={{ flex: '1 1 300px', border: `1px solid ${bb.border2}`, background: bb.panel, boxSizing: 'border-box' }}>
          <div style={{ borderBottom: `1px solid ${bb.border2}`, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: bb.amber, letterSpacing: 2, fontWeight: 700 }}>PERSONAL NOTES</span>
            {noteSaving && <span style={{ fontSize: 9, color: bb.gray }}>Saving...</span>}
            {noteLastSaved && !noteSaving && (
              <span style={{ fontSize: 9, color: bb.gray }}>
                Saved {noteLastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div style={{ padding: '10px 14px' }}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={saveNote}
              placeholder={`Add your notes on ${ticker} ${optType.toUpperCase()} $${strike} ${expiration}...`}
              rows={5}
              style={{
                width: '100%',
                background: bb.bg,
                border: `1px solid ${bb.border2}`,
                color: bb.white,
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 1.6,
                padding: '8px 10px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = bb.amber)}
            />
            <div style={{ fontSize: 9, color: bb.gray, marginTop: 4 }}>Saved automatically on focus loss.</div>
          </div>
        </div>
      </div>}

      {/* ── VOLATILITY SURFACE ─────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${bb.border}`, padding: '20px 24px' }}>
        <VolSurface symbol={ticker} optionType={optType} defaultColorMode="cs" />
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
