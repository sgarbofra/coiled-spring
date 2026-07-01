'use client'

import { useEffect, useMemo, useState } from 'react'
import TradeModal from './TradeModal'
import { computeCandidateScore, computeWhyPanel, scoreColor } from '@/lib/cs-score'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type Alert = {
  id: string
  alert_type: string
  threshold_value: string | number | null
  is_enabled: boolean
}

type SavedInstrument = {
  id: string; symbol: string; underlyingSymbol: string; instrumentType: string
  optionSide: string | null; strike: number | null; expirationDate: string | null
  dte: number | null; premiumPaid: number | null; currentPremium: number | null
  ivCurrent: number | null; ivRank: number | null; ivPercentile: number | null
  ivMovingAvg: number | null; delta: number | null; gamma: number | null
  vega: number | null; theta: number | null; openInterest: number | null
  volume: number | null; bid: number | null; ask: number | null
  bidAskSpread: number | null; theoreticalPnl: number | null; notes: string | null
}

type Props = { watchlistId: string; itemId: string; open: boolean; onClose: () => void }

const ALERT_TYPES = [
  { value: 'iv_rank_below',  label: 'IV RANK BELOW' },
  { value: 'iv_rank_above',  label: 'IV RANK ABOVE' },
  { value: 'iv_below',       label: 'IV BELOW' },
  { value: 'iv_above',       label: 'IV ABOVE' },
  { value: 'delta_above',    label: 'DELTA ABOVE' },
  { value: 'delta_below',    label: 'DELTA BELOW' },
  { value: 'price_above',    label: 'PRICE ABOVE' },
  { value: 'price_below',    label: 'PRICE BELOW' },
  { value: 'dte_below',      label: 'DTE BELOW' },
]

export default function ItemDetailsDrawer({ watchlistId, itemId, open, onClose }: Props) {
  const [item, setItem] = useState<SavedInstrument | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [alertType, setAlertType] = useState(ALERT_TYPES[0].value)
  const [threshold, setThreshold] = useState('')
  const [addingAlert, setAddingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true); setRefreshing(true); setError(null)
      try {
        // 1. Refresh live prices in DB (cache 2 min lato backend)
        await fetch(`/api/watchlists/${watchlistId}/refresh`, { method: 'POST' })
        setRefreshing(false)
        // 2. Carica item aggiornato + alerts in parallelo
        const [itemRes, alertsRes] = await Promise.all([
          fetch(`/api/watchlists/${watchlistId}/items/${itemId}`),
          fetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts`),
        ])
        const itemJson = await itemRes.json()
        const alertsJson = await alertsRes.json()
        if (!itemRes.ok || !itemJson.ok) throw new Error(itemJson.error || 'Failed to load item')
        setItem(itemJson.item)
        setAlerts(alertsJson.ok ? alertsJson.alerts : [])
      } catch (e: unknown) {
        setRefreshing(false)
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally { setLoading(false) }
    }
    load()
  }, [open, watchlistId, itemId])

  const pnlPct = useMemo(() => {
    if (item?.premiumPaid == null || item?.currentPremium == null || item.premiumPaid === 0) return null
    return null // P&L tracked in portfolio only
  }, [item])

  const addAlert = async () => {
    if (!threshold.trim()) return
    setAddingAlert(true); setAlertError(null)
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: alertType,
          threshold_value: Number(threshold),
          is_enabled: true,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to add alert')
      setAlerts(prev => [...prev, json.alert])
      setThreshold('')
    } catch (e: unknown) {
      setAlertError(e instanceof Error ? e.message : 'Failed to add alert')
    } finally { setAddingAlert(false) }
  }

  const toggleAlert = async (alert: Alert) => {
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alert.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !alert.is_enabled }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setAlerts(prev => prev.map(a => a.id === alert.id ? json.alert : a))
      }
    } catch { /* silent */ }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items/${itemId}/alerts/${alertId}`, {
        method: 'DELETE',
      })
      if (res.ok) setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch { /* silent */ }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', fontFamily: 'Courier New, monospace' }}>
      <div style={{ height: '100%', width: '100%', maxWidth: '600px', overflowY: 'auto', backgroundColor: bb.bg, color: bb.white, borderLeft: `1px solid ${bb.border2}` }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `2px solid ${bb.orange}`, padding: '16px 20px' }}>
          <div>
            <h2 style={{ fontSize: '19.2px', fontWeight: 'bold', color: bb.orange, letterSpacing: '2px' }}>{item?.symbol ?? 'ITEM DETAILS'}</h2>
            <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>{item?.underlyingSymbol ?? ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setTradeModalOpen(true)}
              style={{ border: `2px solid ${bb.orange}`, backgroundColor: 'rgba(255,102,0,0.12)', color: bb.orange, padding: '5px 14px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px', fontWeight: 'bold' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = bb.orange; e.currentTarget.style.color = '#000' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,102,0,0.12)'; e.currentTarget.style.color = bb.orange }}>
              TRADE
            </button>
            <button onClick={onClose}
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '4px 10px', fontSize: '16px', fontFamily: 'inherit', cursor: 'pointer', lineHeight: 1 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = bb.orange, e.currentTarget.style.color = bb.white)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bb.border2, e.currentTarget.style.color = bb.gray)}
              title="Chiudi pannello">
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {refreshing && <p style={{ fontSize: '13.2px', color: bb.amber, letterSpacing: '1px' }}>↻ REFRESHING LIVE PRICES...</p>}
          {loading && !refreshing && <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>LOADING...</p>}
          {error && <p style={{ fontSize: '13.2px', color: bb.red }}>▶ ERROR: {error.toUpperCase()}</p>}

          {item && (
            <>
              {/* Contract */}
              <section>
                <Label>CONTRACT</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13.2px' }}>
                  <MC label="SIDE"       value={item.optionSide ?? '-'} accent={item.optionSide === 'CALL' ? 'green' : item.optionSide === 'PUT' ? 'red' : undefined} />
                  <MC label="STRIKE"     value={item.strike ?? '-'} />
                  <MC label="DTE"        value={item.dte ?? '-'} />
                  <MC label="EXPIRATION" value={item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'} span />
                  <MC label="INSTRUMENT" value={item.instrumentType} />
                </div>
              </section>

              {/* Volatility */}
              <section>
                <Label>VOLATILITY</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13.2px' }}>
                  <MC label="IV CURRENT"  value={item.ivCurrent ?? '-'} />
                  <MC label="IV RANK"     value={item.ivRank ?? '-'} />
                  <MC label="IV PCTILE"   value={item.ivPercentile ?? '-'} />
                  <MC label="IV MOV. AVG" value={item.ivMovingAvg ?? '-'} />
                </div>
              </section>

              {/* Greeks */}
              <section>
                <Label>GREEKS</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '13.2px' }}>
                  <MC label="DELTA" value={item.delta ?? '-'} />
                  <MC label="GAMMA" value={item.gamma ?? '-'} />
                  <MC label="VEGA"  value={item.vega ?? '-'} />
                  <MC label="THETA" value={item.theta ?? '-'} />
                </div>
              </section>

              {/* CS Candidate Score */}
              {(() => {
                const spreadPct = (item.bid != null && item.ask != null && item.bid + item.ask > 0)
                  ? (item.ask - item.bid) / ((item.bid + item.ask) / 2) * 100
                  : null
                const csInput = {
                  delta: item.delta,
                  vega: item.vega,
                  dte: item.dte,
                  spread_pct: spreadPct,
                  open_interest: item.openInterest,
                }
                const score = computeCandidateScore(csInput)
                const why   = computeWhyPanel(csInput)
                return (
                  <section style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '16px' }}>
                    <Label>COILED STRATEGY CANDIDATE SCORE</Label>
                    {score != null ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '36px', fontWeight: 'bold', color: scoreColor(score) }}>{score}</span>
                          <span style={{ fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>/100</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {why.map((line, i) => (
                            <div key={i} style={{ fontSize: '12px', color: bb.white, paddingLeft: '10px', borderLeft: `2px solid ${bb.border2}`, letterSpacing: '0.3px' }}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#555', fontSize: '13px' }}>— Greeks non disponibili (IV mancante)</div>
                    )}
                  </section>
                )
              })()}

              {/* Market */}
              <section>
                <Label>MARKET</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13.2px' }}>
                  <MC label="BID"      value={item.bid ?? '-'} />
                  <MC label="ASK"      value={item.ask ?? '-'} />
                  <MC label="SPREAD"   value={item.bidAskSpread ?? '-'} />
                  <MC label="OI"       value={item.openInterest ?? '-'} />
                  <MC label="VOLUME"   value={item.volume ?? '-'} />
                </div>
              </section>

              {/* Notes */}
              <section style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '16px' }}>
                <Label>NOTES</Label>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '13.2px', color: bb.white, letterSpacing: '0.3px' }}>{item.notes || '—'}</p>
              </section>

              {/* Alerts */}
              <section style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '16px' }}>
                <Label>ALERTS</Label>

                {/* Coming soon notice */}
                <p style={{ marginBottom: '12px', fontSize: '10px', fontFamily: '"Space Mono", monospace', color: bb.orange, letterSpacing: '0.5px' }}>
                  COMING SOON — Alerts will be available in the next release
                </p>

                {/* Add alert form - DISABLED */}
                <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', opacity: 0.4, pointerEvents: 'none' }}>
                  <select
                    value={alertType}
                    onChange={e => setAlertType(e.target.value)}
                    disabled
                    style={{ flex: 1, backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'not-allowed' }}
                  >
                    {ALERT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    placeholder="THRESHOLD"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAlert()}
                    disabled
                    style={{ width: '120px', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'not-allowed' }}
                  />
                  <button
                    onClick={addAlert}
                    disabled
                    style={{
                      backgroundColor: bb.border2,
                      color: '#000', border: 'none', padding: '6px 16px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                      cursor: 'not-allowed'
                    }}>
                    ADD
                  </button>
                </div>

                {alertError && <p style={{ marginBottom: '12px', fontSize: '12px', color: bb.red }}>▶ {alertError.toUpperCase()}</p>}

                {/* Alert list */}
                {alerts.length === 0 ? (
                  <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>NO ALERTS YET</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {alerts.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${bb.border}`, backgroundColor: bb.panel, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={() => toggleAlert(a)}
                            style={{
                              height: '16px', width: '32px', backgroundColor: a.is_enabled ? bb.orange : bb.border2,
                              border: 'none', cursor: 'pointer'
                            }}
                            title={a.is_enabled ? 'DISABLE' : 'ENABLE'}
                          />
                          <span style={{ fontSize: '13.2px', color: bb.white }}>
                            {ALERT_TYPES.find(t => t.value === a.alert_type)?.label ?? a.alert_type.toUpperCase()}
                            {a.threshold_value != null && (
                              <span style={{ marginLeft: '4px', color: bb.gray }}>→ {a.threshold_value}</span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteAlert(a.id)}
                          style={{ padding: '2px 8px', fontSize: '12px', color: bb.gray, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.color = bb.red)}
                          onMouseLeave={e => (e.currentTarget.style.color = bb.gray)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>


      {/* Trade Modal — zIndex 100 sopra il drawer (50) */}
      <TradeModal
        item={item}
        open={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
      />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', color: bb.yellow }}>{children}</p>
}

type Accent = 'green' | 'red'
function MC({ label, value, accent, span }: { label: string; value: string | number; accent?: Accent; span?: boolean }) {
  const valueColor = accent === 'green' ? bb.green : accent === 'red' ? bb.red : bb.white
  return (
    <div style={{ border: `1px solid ${bb.border}`, backgroundColor: bb.panel, padding: '10px', gridColumn: span ? 'span 2' : undefined }}>
      <p style={{ marginBottom: '4px', fontSize: '13px', color: bb.gray, letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontWeight: 'bold', color: valueColor, fontSize: '14.4px' }}>{value}</p>
    </div>
  )
}
