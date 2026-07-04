'use client'

import { useEffect, useRef, useState } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#888888',
}

type WhatIfPosition = {
  trade_id: number
  underlying: string
  option_type: string
  strike: number
  expiration: string
  direction: string
  quantity: number
  current_spot: number
  new_spot: number
  actual_change_pct: number
  beta: number | null
  iv_used_pct: number
  new_iv_pct: number
  current_value: number
  scenario_value: number
  pnl_delta: number
  pnl_delta_pct: number
}

type WhatIfResult = {
  is_multi_underlying: boolean
  positions: WhatIfPosition[]
  aggregate: {
    total_current_value: number
    total_scenario_value: number
    total_pnl_delta: number
    total_pnl_delta_pct: number
  } | null
}

function fmt2(v: number) { return v.toFixed(2) }
function fmtPnl(v: number) {
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`
}
function pnlColor(v: number) { return v >= 0 ? bb.green : bb.red }

function SliderRow({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const color = value > 0 ? bb.green : value < 0 ? bb.red : bb.gray
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: bb.amber, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', minWidth: 60, textAlign: 'right' }}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: bb.orange, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: bb.gray, marginTop: 2 }}>
        <span>{min}{unit}</span><span>0</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function WhatIfSimulator({ portfolioId }: { portfolioId: number }) {
  const [marketChg, setMarketChg] = useState(0)
  const [ivChg, setIvChg] = useState(0)
  const [daysFwd, setDaysFwd] = useState(0)
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchWhatIf = (m: number, iv: number, d: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const qs = `market_change_pct=${m}&iv_change_pct=${iv}&days_forward=${d}`
        const r = await fetch(`/api/portfolio/${portfolioId}/what-if?${qs}`, { credentials: 'include' })
        const data = await r.json()
        if (!r.ok || !data.ok) throw new Error(data.error ?? 'Error')
        setResult(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  useEffect(() => {
    fetchWhatIf(marketChg, ivChg, daysFwd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, marketChg, ivChg, daysFwd])

  return (
    <div style={{ background: bb.surface, border: `1px solid ${bb.border2}`, fontFamily: 'Courier New, monospace' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${bb.orange}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: bb.yellow, letterSpacing: 2 }}>
            PORTFOLIO WHAT-IF SIMULATOR
          </div>
          <div style={{ fontSize: 11, color: bb.gray, marginTop: 2 }}>
            Black-Scholes scenario analysis · Theoretical prices — actual market prices may differ
          </div>
        </div>
        {loading && <span style={{ fontSize: 11, color: bb.amber, letterSpacing: 1 }}>COMPUTING…</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* Sliders */}
        <div style={{ flex: '0 0 280px', padding: '16px 20px', borderRight: `1px solid ${bb.border}` }}>
          <SliderRow
            label={result?.is_multi_underlying ? 'MARKET MOVE (SPX %)' : 'UNDERLYING CHANGE'}
            value={marketChg} min={-50} max={50} step={1} unit="%"
            onChange={v => setMarketChg(v)}
          />
          <SliderRow
            label="IV CHANGE"
            value={ivChg} min={-50} max={50} step={1} unit="%"
            onChange={v => setIvChg(v)}
          />
          <SliderRow
            label="DAYS FORWARD"
            value={daysFwd} min={0} max={365} step={1} unit="d"
            onChange={v => setDaysFwd(v)}
          />
          <button
            onClick={() => { setMarketChg(0); setIvChg(0); setDaysFwd(0) }}
            style={{
              width: '100%', padding: '6px', background: 'transparent',
              border: `1px solid ${bb.border2}`, color: bb.gray,
              fontFamily: 'inherit', fontSize: 11, letterSpacing: 1, cursor: 'pointer',
            }}
          >
            RESET
          </button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, minWidth: 0, padding: '16px 20px' }}>

          {/* Multi-underlying disclaimer */}
          {result?.is_multi_underlying && (
            <div style={{
              background: '#1a1100', border: `1px solid ${bb.amber}`,
              padding: '8px 12px', marginBottom: 14, fontSize: 11, color: bb.amber, lineHeight: 1.6,
            }}>
              ⚠ <strong>MULTI-UNDERLYING MODE</strong> — The "Market Move" slider represents an <strong>SPX index move</strong>.
              Each stock price is adjusted by its CAPM beta: <em>ΔS = β × ΔS_market</em>.
              Stocks with β &gt; 1 amplify the market move; β &lt; 1 dampens it.
              This model does not capture idiosyncratic risk.
            </div>
          )}

          {error && (
            <div style={{ color: bb.red, fontSize: 12, padding: '20px 0' }}>⚠ {error}</div>
          )}

          {result && !error && result.positions.length === 0 && (
            <div style={{ color: bb.gray, fontSize: 12, padding: '20px 0' }}>
              No open positions with IV data available.
            </div>
          )}

          {result && result.positions.length > 0 && (
            <>
              {/* Aggregate banner */}
              {result.aggregate && (() => {
                const agg = result.aggregate
                const c = pnlColor(agg.total_pnl_delta)
                return (
                  <div style={{
                    background: bb.panel, border: `1px solid ${bb.border2}`,
                    padding: '10px 14px', marginBottom: 14,
                    display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: bb.gray, letterSpacing: 1 }}>PORTFOLIO P&L</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: c, marginTop: 2 }}>
                        {fmtPnl(agg.total_pnl_delta)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: bb.gray, letterSpacing: 1 }}>P&L %</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: c, marginTop: 2 }}>
                        {agg.total_pnl_delta >= 0 ? '+' : ''}{agg.total_pnl_delta_pct}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: bb.gray, letterSpacing: 1 }}>CURRENT VALUE</div>
                      <div style={{ fontSize: 13, color: bb.white, marginTop: 2 }}>
                        ${fmt2(agg.total_current_value)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: bb.gray, letterSpacing: 1 }}>SCENARIO VALUE</div>
                      <div style={{ fontSize: 13, color: bb.white, marginTop: 2 }}>
                        ${fmt2(agg.total_scenario_value)}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Per-position table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['POSITION', 'DIR', 'QTY', 'SPOT NOW→NEW', result?.is_multi_underlying ? 'β / CHG%' : 'CHG%', 'IV NOW→NEW', 'CUR VAL', 'SCEN VAL', 'P&L'].map((h, i) => (
                        <th key={i} style={{
                          padding: '5px 8px', fontSize: 10, color: bb.yellow, letterSpacing: 1,
                          borderBottom: `1px solid ${bb.orange}`, textAlign: i > 2 ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.positions.map(p => (
                      <tr key={p.trade_id} style={{ borderBottom: `1px solid ${bb.border}` }}>
                        <td style={{ padding: '5px 8px', color: bb.orange, whiteSpace: 'nowrap' }}>
                          {p.underlying} {p.option_type.toUpperCase()} {p.strike}
                        </td>
                        <td style={{ padding: '5px 8px', color: p.direction === 'long' ? bb.green : bb.red }}>
                          {p.direction.toUpperCase()}
                        </td>
                        <td style={{ padding: '5px 8px', color: bb.white }}>{p.quantity}</td>
                        <td style={{ padding: '5px 8px', color: bb.white, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          ${fmt2(p.current_spot)} → <span style={{ color: p.new_spot >= p.current_spot ? bb.green : bb.red }}>${fmt2(p.new_spot)}</span>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {p.beta !== null && (
                            <span style={{ color: bb.gray, fontSize: 10 }}>β{fmt2(p.beta)} · </span>
                          )}
                          <span style={{ color: p.actual_change_pct >= 0 ? bb.green : bb.red, fontWeight: 600 }}>
                            {p.actual_change_pct >= 0 ? '+' : ''}{fmt2(p.actual_change_pct)}%
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', color: bb.gray, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {p.iv_used_pct}% → {p.new_iv_pct}%
                        </td>
                        <td style={{ padding: '5px 8px', color: bb.white, textAlign: 'right' }}>
                          ${fmt2(p.current_value)}
                        </td>
                        <td style={{ padding: '5px 8px', color: bb.white, textAlign: 'right' }}>
                          ${fmt2(p.scenario_value)}
                        </td>
                        <td style={{ padding: '5px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: pnlColor(p.pnl_delta) }}>
                          {fmtPnl(p.pnl_delta)}
                          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>
                            ({p.pnl_delta_pct >= 0 ? '+' : ''}{p.pnl_delta_pct}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
