'use client'

import { useCallback, useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { computeCandidateScore, computeWhyPanel, scoreColor } from '@/lib/cs-score'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#999999',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Portfolio = {
  id: number
  name: string
  open_positions: number
  created_at: string
}

type OpenPosition = {
  trade_id: number
  underlying: string
  option_type: string
  strike: number
  expiration: string
  dte: number
  direction: string
  quantity: number
  entry_price: number
  current_mid: number | null
  current_bid: number | null
  current_ask: number | null
  current_last: number | null
  pnl_price: number | null
  price_source: string   // "mid"|"bid"|"ask"|"last"|"bs_theoretical"
  current_iv: number | null
  current_delta: number | null
  current_vega: number | null
  current_open_interest: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
  notes: string | null
  last_refreshed: string | null
  data_source: string
}

type GreeksRow = {
  underlying: string
  net_delta: number
  net_gamma: number
  net_vega: number
  net_theta: number
  positions_count: number
}

type TradeHistory = {
  id: number
  portfolio_id: number
  underlying: string
  option_type: string
  strike: number
  expiration: string
  direction: string
  quantity: number
  entry_price: number
  status: string
  close_price: number | null
  realized_pnl: number | null
  closed_at: string | null
  notes: string | null
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '-'
  return Number(v).toFixed(decimals)
}

function fmtPnl(v: number | null): string {
  if (v == null) return '-'
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`
}

function fmtPct(v: number | null): string {
  if (v == null) return '-'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function pnlColor(v: number | null): string {
  if (v == null) return bb.gray
  return v >= 0 ? bb.green : bb.red
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: bb.amber, fontWeight: 'bold', marginBottom: '6px', marginTop: '2px' }}>
      {children}
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: '6px 10px', fontSize: '11px', letterSpacing: '1px',
      color: bb.yellow, fontWeight: 'bold', textAlign: right ? 'right' : 'left',
      borderBottom: `1px solid ${bb.orange}`, whiteSpace: 'nowrap',
    }}>{children}</th>
  )
}

function Td({ children, right, color }: { children: React.ReactNode; right?: boolean; color?: string }) {
  return (
    <td style={{
      padding: '6px 10px', fontSize: '13px', color: color ?? bb.white,
      textAlign: right ? 'right' : 'left', borderBottom: `1px solid ${bb.border}`,
      whiteSpace: 'nowrap',
    }}>{children}</td>
  )
}

// ── Close Position Modal ───────────────────────────────────────────────────────

type CloseTarget = {
  position: OpenPosition
  portfolioId: number
}

function CloseModal({ target, onDone, onCancel }: {
  target: CloseTarget
  onDone: () => void
  onCancel: () => void
}) {
  const p = target.position
  // Per chiudere un LONG si vende (short), per chiudere uno SHORT si compra (long)
  const closeDirection = p.direction === 'long' ? 'short' : 'long'
  // Prezzo suggerito: BID se stiamo vendendo (chiudiamo long), ASK se compriamo (chiudiamo short)
  const suggestedPrice = p.direction === 'long'
    ? (p.current_bid ?? p.current_last ?? p.current_mid ?? p.entry_price)
    : (p.current_ask ?? p.current_last ?? p.current_mid ?? p.entry_price)

  const [price, setPrice] = useState(suggestedPrice?.toFixed(2) ?? '')
  const [qty, setQty] = useState(String(p.quantity))
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const handleClose = async () => {
    const priceNum = parseFloat(price)
    const qtyNum = parseInt(qty)
    if (isNaN(priceNum) || priceNum <= 0) { setErr('Invalid price'); return }
    if (isNaN(qtyNum) || qtyNum <= 0 || qtyNum > p.quantity) { setErr(`Quantity must be 1–${p.quantity}`); return }

    setSubmitting(true)
    setErr('')
    try {
      const body = {
        option_contract: {
          underlying: p.underlying,
          option_type: p.option_type,
          expiration: p.expiration.split('T')[0],
          strike: p.strike,
          symbol_key: `${p.underlying}-${p.expiration.replace(/-/g, '').split('T')[0]}${p.option_type === 'call' ? 'C' : 'P'}${Math.round(p.strike)}`,
        },
        direction: closeDirection,
        quantity: qtyNum,
        price: priceNum,
        notes: 'Position close',
      }
      const r = await fetch(`/api/portfolio/${target.portfolioId}/trades`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Close error')
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSubmitting(false)
    }
  }

  const pnlPreview = (() => {
    const priceNum = parseFloat(price)
    const qtyNum = parseInt(qty)
    if (isNaN(priceNum) || isNaN(qtyNum)) return null
    const sign = p.direction === 'long' ? 1 : -1
    return (priceNum - p.entry_price) * 100 * qtyNum * sign
  })()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: bb.bg, border: `1px solid ${bb.orange}`,
        padding: '24px', width: '420px', fontFamily: 'Courier New, monospace', color: bb.white,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: bb.orange, letterSpacing: '1px', marginBottom: '16px' }}>
          CLOSE POSITION
        </div>

        {/* Contract info */}
        <div style={{ backgroundColor: bb.surface, border: `1px solid ${bb.border2}`, padding: '10px', marginBottom: '16px', fontSize: '13px' }}>
          <div style={{ color: bb.amber }}>{p.underlying} {p.option_type.toUpperCase()} {p.strike} — {new Date(p.expiration).toLocaleDateString('en-US')}</div>
          <div style={{ color: bb.gray, marginTop: '4px' }}>
            Position: <span style={{ color: p.direction === 'long' ? bb.green : bb.red }}>{p.direction.toUpperCase()}</span>
            {' · '}Qty: {p.quantity}
            {' · '}Entry: ${fmt(p.entry_price)}
          </div>
          <div style={{ color: bb.gray, marginTop: '2px', fontSize: '11px' }}>
            Current prices — BID: {p.current_bid != null ? `$${fmt(p.current_bid)}` : '-'} · ASK: {p.current_ask != null ? `$${fmt(p.current_ask)}` : '-'} · LAST: {p.current_last != null ? `$${fmt(p.current_last)}` : '-'}
          </div>
        </div>

        {/* Campi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: bb.amber, letterSpacing: '1px', marginBottom: '4px' }}>
              CLOSE PRICE ({p.direction === 'long' ? 'BID' : 'ASK'})
            </div>
            <input value={price} onChange={e => setPrice(e.target.value)}
              style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: bb.amber, letterSpacing: '1px', marginBottom: '4px' }}>
              QUANTITY (max {p.quantity})
            </div>
            <input value={qty} onChange={e => setQty(e.target.value)} type="number" min={1} max={p.quantity}
              style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* PNL preview */}
        {pnlPreview != null && (
          <div style={{ padding: '8px 12px', backgroundColor: bb.surface, border: `1px solid ${bb.border2}`, marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: bb.gray, letterSpacing: '1px' }}>ESTIMATED REALIZED PNL: </span>
            <span style={{ color: pnlColor(pnlPreview), fontWeight: 'bold' }}>{fmtPnl(pnlPreview)}</span>
          </div>
        )}

        {err && <div style={{ color: bb.red, fontSize: '12px', marginBottom: '8px' }}>{err}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            border: `1px solid ${bb.border2}`, backgroundColor: 'transparent',
            color: bb.gray, padding: '6px 16px', fontSize: '13px',
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px',
          }}>CANCEL</button>
          <button onClick={handleClose} disabled={submitting} style={{
            border: `1px solid ${bb.red}`, backgroundColor: 'rgba(255,51,51,0.15)',
            color: bb.red, padding: '6px 16px', fontSize: '13px', fontWeight: 'bold',
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px',
            opacity: submitting ? 0.5 : 1,
          }}>{submitting ? '...' : 'CLOSE POSITION'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Positions tab ──────────────────────────────────────────────────────────────

const AUTO_REFRESH_SEC = 120 // 2 min — allineato con OPTPRICE_TTL backend

function PositionsTab({ portfolioId }: { portfolioId: number }) {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closeTarget, setCloseTarget] = useState<OpenPosition | null>(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SEC)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [hoveredTradeId, setHoveredTradeId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/portfolio/${portfolioId}/positions`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Errore caricamento posizioni')
      setPositions(d.positions ?? [])
      setLastRefresh(new Date())
      setCountdown(AUTO_REFRESH_SEC)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [portfolioId])

  // Auto-refresh ogni AUTO_REFRESH_SEC secondi
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(); return AUTO_REFRESH_SEC }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [load])

  const totalPnl = positions.reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0)

  if (loading) return <div style={{ color: bb.amber, padding: '24px', fontFamily: 'Courier New, monospace' }}>LOADING...</div>
  if (error) return <div style={{ color: bb.red, padding: '24px', fontFamily: 'Courier New, monospace' }}>{error}</div>

  return (
    <div>
      {/* Close modal */}
      {closeTarget && (
        <CloseModal
          target={{ position: closeTarget, portfolioId }}
          onDone={() => { setCloseTarget(null); load() }}
          onCancel={() => setCloseTarget(null)}
        />
      )}

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '24px', padding: '12px 0', borderBottom: `1px solid ${bb.border2}`, marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: bb.gray, letterSpacing: '1px' }}>OPEN POSITIONS</div>
          <div style={{ fontSize: '20px', color: bb.amber, fontWeight: 'bold' }}>{positions.length}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: bb.gray, letterSpacing: '1px' }}>UNREALIZED PNL</div>
          <div style={{ fontSize: '20px', color: pnlColor(totalPnl), fontWeight: 'bold' }}>{fmtPnl(totalPnl)}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button onClick={load} disabled={loading} style={{
            border: `1px solid ${bb.border2}`, backgroundColor: 'transparent',
            color: bb.amber, padding: '4px 12px', fontSize: '12px',
            fontFamily: 'Courier New, monospace', cursor: 'pointer', letterSpacing: '1px',
            opacity: loading ? 0.5 : 1,
          }}>↻ {loading ? 'LOADING...' : 'REFRESH'}</button>
          <div style={{ fontSize: '11px', color: bb.gray, letterSpacing: '0.5px' }}>
            {lastRefresh && `upd. ${lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} · `}
            <span style={{ color: countdown <= 15 ? bb.amber : bb.gray }}>
              next in {countdown}s
            </span>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div style={{ color: bb.gray, padding: '32px', textAlign: 'center', fontSize: '13px', letterSpacing: '1px' }}>
          NO OPEN POSITIONS
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Courier New, monospace' }}>
            <thead>
              <tr>
                <Th>UNDERLYING</Th>
                <Th>TYPE</Th>
                <Th right>STRIKE</Th>
                <Th>EXPIRATION</Th>
                <Th right>DTE</Th>
                <Th>DIR.</Th>
                <Th right>QTY</Th>
                <Th right>ENTRY</Th>
                <Th right>BID</Th>
                <Th right>ASK</Th>
                <Th right>MID</Th>
                <Th right>LAST</Th>
                <Th right>IV%</Th>
                <Th right>PNL $</Th>
                <Th right>PNL %</Th>
                <Th right>CS</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const usingLast = p.price_source === 'last'
                const usingBS   = p.price_source === 'bs_theoretical'
                const isHovered = hoveredTradeId === p.trade_id

                // CS Score per questa posizione
                const spreadPct = (p.current_bid != null && p.current_ask != null && p.current_mid != null && p.current_mid > 0)
                  ? (p.current_ask - p.current_bid) / p.current_mid * 100
                  : null
                const csInput = {
                  delta: p.current_delta,
                  vega: p.current_vega,
                  dte: p.dte,
                  spread_pct: spreadPct,
                  open_interest: p.current_open_interest,
                }
                const csScore = computeCandidateScore(csInput)
                const csWhy   = computeWhyPanel(csInput)

                return (
                <tr key={p.trade_id}
                  style={{ backgroundColor: isHovered ? bb.surface : 'transparent' }}
                  onMouseEnter={() => setHoveredTradeId(p.trade_id)}
                  onMouseLeave={() => setHoveredTradeId(null)}>
                  <Td color={bb.orange}>{p.underlying}</Td>
                  <Td color={bb.amber}>{p.option_type.toUpperCase()}</Td>
                  <Td right>{fmt(p.strike, 0)}</Td>
                  <Td>{new Date(p.expiration).toLocaleDateString('en-US')}</Td>
                  <Td right color={p.dte < 90 ? bb.red : bb.white}>{p.dte}</Td>
                  <Td color={p.direction === 'long' ? bb.green : bb.red}>{p.direction.toUpperCase()}</Td>
                  <Td right>{p.quantity}</Td>
                  <Td right>${fmt(p.entry_price)}</Td>
                  <Td right>{p.current_bid != null ? `$${fmt(p.current_bid)}` : '-'}</Td>
                  <Td right>{p.current_ask != null ? `$${fmt(p.current_ask)}` : '-'}</Td>
                  <Td right>{p.current_mid != null ? `$${fmt(p.current_mid)}` : '-'}</Td>
                  <Td right color={usingLast ? bb.amber : bb.gray}>{p.current_last != null ? `$${fmt(p.current_last)}` : '-'}</Td>
                  <Td right>{p.current_iv != null ? `${fmt(p.current_iv, 1)}%` : '-'}</Td>
                  <Td right color={pnlColor(p.unrealized_pnl)}>
                    {fmtPnl(p.unrealized_pnl)}
                    {usingLast && <span title="PNL calculated on Last price (bid/ask unavailable)" style={{ fontSize: '9px', color: bb.amber, marginLeft: '3px', verticalAlign: 'super' }}>L</span>}
                    {usingBS   && <span title="PNL calculated on Black-Scholes theoretical price (no market data)" style={{ fontSize: '9px', color: bb.gray, marginLeft: '3px', verticalAlign: 'super' }}>BS</span>}
                  </Td>
                  <Td right color={pnlColor(p.unrealized_pnl_pct)}>{fmtPct(p.unrealized_pnl_pct)}</Td>
                  {/* CS Score badge */}
                  <td style={{ padding: '4px 8px', borderBottom: `1px solid ${bb.border}`, textAlign: 'right', position: 'relative', fontFamily: 'Courier New, monospace' }}>
                    {csScore != null ? (
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: scoreColor(csScore) }}>{csScore}</span>
                    ) : (
                      <span style={{ color: bb.gray, fontSize: '11px' }}>—</span>
                    )}
                    {/* WHY panel — appare on hover riga */}
                    {isHovered && csScore != null && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                        backgroundColor: '#000', border: `1px solid ${bb.orange}`,
                        padding: '10px 14px', width: '230px', zIndex: 100,
                        fontFamily: 'Courier New, monospace', fontSize: '11px',
                        color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
                        whiteSpace: 'normal', textAlign: 'left',
                        letterSpacing: '0.5px', lineHeight: '1.6',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ color: bb.orange, fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>
                            CS SCORE
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', color: scoreColor(csScore) }}>{csScore}</span>
                        </div>
                        {csWhy.map((line, i) => (
                          <div key={i} style={{ marginBottom: '3px', paddingLeft: '8px', borderLeft: `2px solid ${bb.border2}` }}>
                            {line}
                          </div>
                        ))}
                        {p.current_delta == null && (
                          <div style={{ marginTop: '6px', color: bb.amber, fontSize: '10px' }}>
                            ⚠ Greeks non disponibili (IV mancante)
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: `1px solid ${bb.border}` }}>
                    <button onClick={() => setCloseTarget(p)} style={{
                      border: `1px solid ${bb.red}`, backgroundColor: 'rgba(255,51,51,0.1)',
                      color: bb.red, padding: '2px 8px', fontSize: '11px', fontWeight: 'bold',
                      fontFamily: 'Courier New, monospace', cursor: 'pointer', letterSpacing: '1px',
                      whiteSpace: 'nowrap',
                    }}>CLOSE</button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Greeks tab ─────────────────────────────────────────────────────────────────

function GreeksTab({ portfolioId }: { portfolioId: number }) {
  const [rows, setRows] = useState<GreeksRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/portfolio/${portfolioId}/greeks`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error)
        setRows(d.greeks ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [portfolioId])

  if (loading) return <div style={{ color: bb.amber, padding: '24px', fontFamily: 'Courier New, monospace' }}>LOADING...</div>
  if (error) return <div style={{ color: bb.red, padding: '24px', fontFamily: 'Courier New, monospace' }}>{error}</div>

  if (rows.length === 0) return (
    <div style={{ color: bb.gray, padding: '32px', textAlign: 'center', fontSize: '13px', letterSpacing: '1px', fontFamily: 'Courier New, monospace' }}>
      NO OPEN POSITIONS — GREEKS UNAVAILABLE
    </div>
  )

  // Totals
  const totals = rows.reduce((acc, r) => ({
    net_delta: acc.net_delta + r.net_delta,
    net_gamma: acc.net_gamma + r.net_gamma,
    net_vega: acc.net_vega + r.net_vega,
    net_theta: acc.net_theta + r.net_theta,
  }), { net_delta: 0, net_gamma: 0, net_vega: 0, net_theta: 0 })

  return (
    <div>
      {/* Portfolio totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'NET DELTA', value: fmt(totals.net_delta, 3), color: bb.amber },
          { label: 'NET GAMMA', value: fmt(totals.net_gamma, 4), color: bb.white },
          { label: 'NET VEGA',  value: fmt(totals.net_vega, 3),  color: bb.orange },
          { label: 'NET THETA', value: fmt(totals.net_theta, 4), color: totals.net_theta < 0 ? bb.red : bb.green },
        ].map(item => (
          <div key={item.label} style={{ backgroundColor: bb.surface, border: `1px solid ${bb.border2}`, padding: '12px' }}>
            <div style={{ fontSize: '11px', color: bb.gray, letterSpacing: '1px', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: item.color, fontFamily: 'Courier New, monospace' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Per-underlying breakdown */}
      <Label>EXPOSURE BY UNDERLYING</Label>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Courier New, monospace' }}>
        <thead>
          <tr>
            <Th>UNDERLYING</Th>
            <Th right>POSITIONS</Th>
            <Th right>NET DELTA</Th>
            <Th right>NET GAMMA</Th>
            <Th right>NET VEGA</Th>
            <Th right>NET THETA</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.underlying}
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = bb.surface)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <Td color={bb.orange}>{r.underlying}</Td>
              <Td right>{r.positions_count}</Td>
              <Td right color={bb.amber}>{fmt(r.net_delta, 3)}</Td>
              <Td right>{fmt(r.net_gamma, 4)}</Td>
              <Td right color={bb.orange}>{fmt(r.net_vega, 3)}</Td>
              <Td right color={r.net_theta < 0 ? bb.red : bb.green}>{fmt(r.net_theta, 4)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── History tab ────────────────────────────────────────────────────────────────

function HistoryTab({ portfolioId }: { portfolioId: number }) {
  const [trades, setTrades] = useState<TradeHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')

  useEffect(() => {
    setLoading(true)
    const qs = filter !== 'all' ? `?status_filter=${filter}` : ''
    fetch(`/api/portfolio/${portfolioId}/history${qs}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error)
        setTrades(d.trades ?? [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [portfolioId, filter])

  const totalRealized = trades
    .filter(t => t.status === 'closed' && t.realized_pnl != null)
    .reduce((s, t) => s + (t.realized_pnl ?? 0), 0)

  const filterBtn = (f: typeof filter, label: string) => (
    <button onClick={() => setFilter(f)} style={{
      border: `1px solid ${filter === f ? bb.orange : bb.border2}`,
      backgroundColor: filter === f ? 'rgba(255,102,0,0.15)' : 'transparent',
      color: filter === f ? bb.orange : bb.gray,
      padding: '3px 10px', fontSize: '12px',
      fontFamily: 'Courier New, monospace', cursor: 'pointer', letterSpacing: '1px',
    }}>{label}</button>
  )

  if (loading) return <div style={{ color: bb.amber, padding: '24px', fontFamily: 'Courier New, monospace' }}>LOADING...</div>
  if (error) return <div style={{ color: bb.red, padding: '24px', fontFamily: 'Courier New, monospace' }}>{error}</div>

  return (
    <div>
      {/* Filter + realized summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {filterBtn('all', 'ALL')}
        {filterBtn('open', 'OPEN')}
        {filterBtn('closed', 'CLOSED')}
        {filter !== 'open' && (
          <div style={{ marginLeft: 'auto', fontSize: '13px', fontFamily: 'Courier New, monospace' }}>
            <span style={{ color: bb.gray, letterSpacing: '1px', marginRight: '8px' }}>REALIZED PNL:</span>
            <span style={{ color: pnlColor(totalRealized), fontWeight: 'bold' }}>{fmtPnl(totalRealized)}</span>
          </div>
        )}
      </div>

      {trades.length === 0 ? (
        <div style={{ color: bb.gray, padding: '32px', textAlign: 'center', fontSize: '13px', letterSpacing: '1px', fontFamily: 'Courier New, monospace' }}>
          NO TRADES
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Courier New, monospace' }}>
            <thead>
              <tr>
                <Th>UNDERLYING</Th>
                <Th>TYPE</Th>
                <Th right>STRIKE</Th>
                <Th>EXPIRATION</Th>
                <Th>DIR.</Th>
                <Th right>QTY</Th>
                <Th right>ENTRY</Th>
                <Th right>CLOSE</Th>
                <Th>STATUS</Th>
                <Th right>PNL REALIZ.</Th>
                <Th>DATE</Th>
                <Th>NOTES</Th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id}
                  style={{ backgroundColor: 'transparent', opacity: t.status === 'closed' ? 0.75 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = bb.surface)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Td color={bb.orange}>{t.underlying}</Td>
                  <Td color={bb.amber}>{t.option_type.toUpperCase()}</Td>
                  <Td right>{fmt(t.strike, 0)}</Td>
                  <Td>{new Date(t.expiration).toLocaleDateString('en-US')}</Td>
                  <Td color={t.direction === 'long' ? bb.green : bb.red}>{t.direction.toUpperCase()}</Td>
                  <Td right>{t.quantity}</Td>
                  <Td right>${fmt(t.entry_price)}</Td>
                  <Td right>{t.close_price != null ? `$${fmt(t.close_price)}` : '-'}</Td>
                  <Td color={t.status === 'open' ? bb.green : bb.gray}>{t.status.toUpperCase()}</Td>
                  <Td right color={pnlColor(t.realized_pnl)}>{t.realized_pnl != null ? fmtPnl(t.realized_pnl) : '-'}</Td>
                  <Td>{new Date(t.created_at).toLocaleDateString('en-US')}</Td>
                  <Td color={bb.gray}>{t.notes ?? '-'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tab, setTab] = useState<'positions' | 'greeks' | 'history'>('positions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const loadPortfolios = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/portfolio', { credentials: 'include' })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Errore')
      const list: Portfolio[] = d.portfolios ?? []
      setPortfolios(list)
      if (list.length > 0 && selectedId == null) setSelectedId(list[0].id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => { loadPortfolios() }, []) // eslint-disable-line

  const createPortfolio = async () => {
    const name = newName.trim()
    if (!name) return
    if (portfolios.length >= 3) { alert('Maximum 3 portfolios per account'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/portfolio', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Errore creazione')
      setNewName('')
      await loadPortfolios()
      setSelectedId(d.portfolio.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Errore creazione')
    } finally {
      setCreating(false)
    }
  }

  const deletePortfolio = async (id: number) => {
    if (!confirm('Delete this portfolio and all its trades? This cannot be undone.')) return
    setDeleting(id)
    try {
      const r = await fetch(`/api/portfolio/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error ?? 'Failed to delete portfolio')
        return
      }
      if (selectedId === id) setSelectedId(null)
      await loadPortfolios()
    } catch {
      alert('Failed to delete portfolio')
    } finally {
      setDeleting(null)
    }
  }

  const selected = portfolios.find(p => p.id === selectedId)

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      border: 'none', borderBottom: `2px solid ${tab === t ? bb.orange : 'transparent'}`,
      backgroundColor: 'transparent',
      color: tab === t ? bb.orange : bb.gray,
      padding: '8px 16px', fontSize: '13px',
      fontFamily: 'Courier New, monospace', cursor: 'pointer', letterSpacing: '1px',
      fontWeight: tab === t ? 'bold' : 'normal',
    }}>{label}</button>
  )

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', height: '100%', backgroundColor: bb.bg, fontFamily: 'Courier New, monospace', color: bb.white, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width: '220px', minWidth: '220px', borderRight: `1px solid ${bb.border2}`, display: 'flex', flexDirection: 'column', padding: '12px', gap: '4px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: bb.amber, fontWeight: 'bold', marginBottom: '8px' }}>
            PORTFOLIOS
          </div>

          {loading ? (
            <div style={{ color: bb.gray, fontSize: '12px' }}>LOADING...</div>
          ) : error ? (
            <div style={{ color: bb.red, fontSize: '12px' }}>{error}</div>
          ) : portfolios.length === 0 ? (
            <div style={{ color: bb.gray, fontSize: '12px', letterSpacing: '0.5px' }}>No portfolios.<br />Create one below.</div>
          ) : (
            portfolios.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'stretch', gap: '2px' }}>
                <button onClick={() => { setSelectedId(p.id); setTab('positions') }}
                  style={{
                    flex: 1, border: `1px solid ${selectedId === p.id ? bb.orange : bb.border}`,
                    backgroundColor: selectedId === p.id ? 'rgba(255,102,0,0.12)' : 'transparent',
                    color: selectedId === p.id ? bb.orange : bb.white,
                    padding: '8px 10px', textAlign: 'left',
                    fontFamily: 'inherit', fontSize: '13px', cursor: 'pointer',
                    letterSpacing: '0.5px',
                  }}>
                  <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: selectedId === p.id ? bb.amber : bb.gray, marginTop: '2px' }}>
                    {p.open_positions} open position{p.open_positions !== 1 ? 's' : ''}
                  </div>
                </button>
                <button
                  onClick={() => deletePortfolio(p.id)}
                  disabled={deleting === p.id}
                  title="Delete portfolio"
                  style={{
                    border: `1px solid ${bb.border}`, backgroundColor: 'transparent',
                    color: bb.red, padding: '0 8px', fontSize: '11px', fontFamily: 'inherit',
                    cursor: deleting === p.id ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.5px', opacity: deleting === p.id ? 0.4 : 1,
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a0000' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  {deleting === p.id ? '...' : 'DEL'}
                </button>
              </div>
            ))
          )}

          {/* Crea nuovo */}
          {portfolios.length < 3 && (
            <div style={{ marginTop: '12px', borderTop: `1px solid ${bb.border2}`, paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', color: bb.gray, letterSpacing: '1px', marginBottom: '6px' }}>NEW PORTFOLIO</div>
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createPortfolio() }}
                placeholder="NOME..."
                style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '12px', fontFamily: 'inherit', letterSpacing: '0.5px', boxSizing: 'border-box' }}
              />
              <button onClick={createPortfolio} disabled={creating || !newName.trim()}
                style={{
                  marginTop: '4px', width: '100%',
                  border: `1px solid ${bb.border2}`, backgroundColor: 'rgba(255,102,0,0.1)',
                  color: bb.orange, padding: '4px', fontSize: '12px',
                  fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px',
                  opacity: creating || !newName.trim() ? 0.4 : 1,
                }}>
                {creating ? '...' : '+ ADD'}
              </button>
            </div>
          )}
        </div>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: bb.gray, fontSize: '13px', letterSpacing: '1px' }}>
              SELECT OR CREATE A PORTFOLIO
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ borderBottom: `1px solid ${bb.border2}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: bb.orange, letterSpacing: '1px' }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: '12px', color: bb.gray }}>
                  {selected.open_positions} posizioni aperte
                </div>
              </div>

              {/* Tabs */}
              <div style={{ borderBottom: `1px solid ${bb.border2}`, padding: '0 20px', display: 'flex', gap: '0' }}>
                {tabBtn('positions', 'POSITIONS')}
                {tabBtn('greeks', 'GREEKS')}
                {tabBtn('history', 'HISTORY')}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {tab === 'positions' && <PositionsTab key={selected.id} portfolioId={selected.id} />}
                {tab === 'greeks'    && <GreeksTab    key={selected.id} portfolioId={selected.id} />}
                {tab === 'history'   && <HistoryTab   key={selected.id} portfolioId={selected.id} />}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
