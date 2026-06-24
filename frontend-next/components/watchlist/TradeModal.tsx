'use client'

import React, { useEffect, useState, CSSProperties } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#888888',
}

type SavedInstrument = {
  id: string; symbol: string; underlyingSymbol: string; instrumentType: string
  optionSide: string | null; strike: number | null; expirationDate: string | null
  dte: number | null; premiumPaid: number | null; currentPremium: number | null
  ivCurrent: number | null; delta: number | null; gamma: number | null
  vega: number | null; theta: number | null
  bid: number | null; ask: number | null
}

type Portfolio = { id: number; name: string }

type TradeResult = {
  action: string           // 'opened' | 'closed' | 'partial_close' | 'close_and_reopen'
  message: string
  realized_pnl?: number | null
  open_trade?: { id: number; direction: string; quantity: number; entry_price: number }
  closed_trade?: { id: number; realized_pnl: number }
}

type Props = {
  item: SavedInstrument | null
  open: boolean
  onClose: () => void
}

const NEW_PORTFOLIO_VALUE = '__new__'

// ── Market hours check ────────────────────────────────────────────────────────
function isUSMarketOpen(): boolean {
  try {
    const now = new Date()
    const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
    const et = new Date(etStr)
    const day = et.getDay()           // 0 Sun, 6 Sat
    if (day === 0 || day === 6) return false
    const mins = et.getHours() * 60 + et.getMinutes()
    return mins >= 570 && mins < 960  // 9:30–16:00 ET
  } catch { return false }
}

function getETTimeString(): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' ET'
  } catch { return '' }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function TradeModal({ item, open, onClose }: Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)

  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [portfolioId, setPortfolioId] = useState<string>('')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TradeResult | null>(null)

  const marketOpen = isUSMarketOpen()
  const etTime = getETTimeString()

  // Aggiorna il prezzo suggerito in base alla direzione:
  // BUY (long) → ask;  SELL (short) → bid;  fallback → currentPremium → premiumPaid
  const suggestedPrice = (dir: 'long' | 'short') => {
    if (!item) return ''
    const bid = item.bid ?? 0
    const ask = item.ask ?? 0
    if (dir === 'long' && ask > 0)  return ask.toFixed(2)
    if (dir === 'short' && bid > 0) return bid.toFixed(2)
    // fallback quando bid/ask non disponibili (mercati chiusi)
    const fallback = item.currentPremium ?? item.premiumPaid ?? ''
    return fallback.toString()
  }

  // Aggiorna prezzo quando cambia item
  useEffect(() => {
    if (!item) return
    setPrice(suggestedPrice(direction))
  }, [item]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aggiorna prezzo quando cambia direzione
  const handleDirectionChange = (d: 'long' | 'short') => {
    setDirection(d)
    setPrice(suggestedPrice(d))
  }

  // Carica portafogli quando il modal si apre
  useEffect(() => {
    if (!open) {
      // Reset stato ad ogni apertura
      setDirection('long')
      setQuantity(1)
      setNotes('')
      setError(null)
      setResult(null)
      setNewPortfolioName('')
      return
    }
    const load = async () => {
      setLoadingPortfolios(true)
      try {
        const res = await fetch('/api/portfolio')
        const json = await res.json()
        if (json.ok) {
          setPortfolios(json.portfolios ?? [])
          if (json.portfolios?.length > 0) {
            setPortfolioId(String(json.portfolios[0].id))
          } else {
            setPortfolioId(NEW_PORTFOLIO_VALUE)
          }
        }
      } catch { /* silent */ }
      finally { setLoadingPortfolios(false) }
    }
    load()
  }, [open])

  const isNewPortfolio = portfolioId === NEW_PORTFOLIO_VALUE

  const handleSubmit = async () => {
    if (!item) return
    setError(null)
    setResult(null)

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) { setError('Prezzo non valido'); return }
    if (quantity < 1) { setError('Quantità non valida'); return }
    if (isNewPortfolio && !newPortfolioName.trim()) { setError('Inserisci il nome del portafoglio'); return }

    setSubmitting(true)
    try {
      let targetPortfolioId: number

      // Se richiesto, crea prima il portafoglio
      if (isNewPortfolio) {
        if (portfolios.length >= 3) {
          setError('Hai già 3 portafogli. Elimina uno prima di crearne un altro.')
          setSubmitting(false)
          return
        }
        const createRes = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newPortfolioName.trim() }),
        })
        const createJson = await createRes.json()
        if (!createJson.ok) {
          setError(createJson.error ?? 'Errore nella creazione del portafoglio')
          setSubmitting(false)
          return
        }
        targetPortfolioId = createJson.portfolio.id
        setPortfolios(prev => [...prev, createJson.portfolio])
        setPortfolioId(String(targetPortfolioId))
      } else {
        targetPortfolioId = parseInt(portfolioId, 10)
      }

      // Costruisci payload trade
      const expDate = item.expirationDate
        ? new Date(item.expirationDate).toISOString().split('T')[0]
        : ''

      const payload = {
        option_contract: {
          underlying: item.underlyingSymbol,
          option_type: (item.optionSide ?? 'call').toLowerCase(),
          expiration: expDate,
          strike: item.strike ?? 0,
          symbol_key: item.symbol,
        },
        direction,
        quantity,
        price: priceNum,
        notes: notes.trim() || null,
      }

      const tradeRes = await fetch(`/api/portfolio/${targetPortfolioId}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const tradeJson = await tradeRes.json()
      if (!tradeJson.ok) {
        setError(tradeJson.error ?? 'Errore nell\'inserimento del trade')
      } else {
        setResult(tradeJson.result)
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !item) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      fontFamily: 'Courier New, monospace',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px', backgroundColor: bb.bg,
        border: `1px solid ${bb.orange}`, color: bb.white,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `2px solid ${bb.orange}`, padding: '14px 18px',
        }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: bb.orange, letterSpacing: '2px' }}>
              INSERISCI TRADE
            </div>
            <div style={{ fontSize: '12px', color: bb.gray, letterSpacing: '1px', marginTop: '2px' }}>
              {item.symbol} · {item.underlyingSymbol} · {item.optionSide} · K{item.strike} · EXP {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}
            </div>
          </div>
          <button onClick={onClose}
            style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '4px 12px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = bb.orange; e.currentTarget.style.color = bb.white }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bb.border2; e.currentTarget.style.color = bb.gray }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {result ? (
            /* Risultato trade */
            <ResultPanel result={result} onClose={onClose} />
          ) : (
            <>
              {/* Banner mercati chiusi */}
              {!marketOpen && (
                <div style={{
                  backgroundColor: '#1a0a00', border: `1px solid ${bb.amber}`,
                  padding: '10px 14px', fontSize: '12px', color: bb.amber, letterSpacing: '0.5px', lineHeight: '1.6',
                }}>
                  ⚠ MERCATI USA CHIUSI ({etTime})<br />
                  <span style={{ color: bb.gray }}>
                    Il trading è possibile solo lun–ven 09:30–16:00 ET. Puoi registrare il trade ma il prezzo potrebbe non essere aggiornato.
                  </span>
                </div>
              )}

              {/* Direzione BUY / SELL */}
              <div>
                <Label>DIREZIONE</Label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['long', 'short'] as const).map(d => (
                    <button key={d} onClick={() => handleDirectionChange(d)}
                      style={{
                        flex: 1, padding: '10px', fontFamily: 'inherit', fontSize: '14px',
                        fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', border: '2px solid',
                        borderColor: direction === d ? (d === 'long' ? bb.green : bb.red) : bb.border2,
                        backgroundColor: direction === d ? (d === 'long' ? 'rgba(0,220,0,0.12)' : 'rgba(255,51,51,0.12)') : 'transparent',
                        color: direction === d ? (d === 'long' ? bb.green : bb.red) : bb.gray,
                      }}>
                      {d === 'long' ? '▲ BUY (LONG)' : '▼ SELL (SHORT)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantità e Prezzo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label>QUANTITÀ (contratti)</Label>
                  <input type="number" min={1} value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
                <div>
                  <Label>
                    {direction === 'long'
                      ? `PREZZO ASK${item.ask ? ` ($${item.ask.toFixed(2)})` : ''}`
                      : `PREZZO BID${item.bid ? ` ($${item.bid.toFixed(2)})` : ''}`}
                  </Label>
                  <input type="number" step="0.01" min="0.01" value={price}
                    onChange={e => setPrice(e.target.value)}
                    style={inputStyle} />
                </div>
              </div>

              {/* Portafoglio */}
              <div>
                <Label>PORTAFOGLIO</Label>
                {loadingPortfolios ? (
                  <div style={{ color: bb.gray, fontSize: '13px' }}>CARICAMENTO...</div>
                ) : (
                  <select value={portfolioId} onChange={e => setPortfolioId(e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}>
                    {portfolios.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                    {portfolios.length < 3 && (
                      <option value={NEW_PORTFOLIO_VALUE}>+ Crea nuovo portafoglio</option>
                    )}
                  </select>
                )}
              </div>

              {/* Nome nuovo portafoglio */}
              {isNewPortfolio && (
                <div>
                  <Label>NOME PORTAFOGLIO</Label>
                  <input type="text" placeholder="es. MAIN, HEDGE, SWING..."
                    value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)}
                    maxLength={50} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}

              {/* Note */}
              <div>
                <Label>NOTE (opzionale)</Label>
                <input type="text" placeholder="motivazione trade..."
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>

              {/* Riepilogo PNL indicativo */}
              <div style={{ fontSize: '12px', color: bb.gray, borderTop: `1px solid ${bb.border}`, paddingTop: '10px' }}>
                NOTIONAL: {quantity} × ${parseFloat(price || '0').toFixed(2)} × 100 ={' '}
                <span style={{ color: bb.amber }}>${(quantity * parseFloat(price || '0') * 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
              </div>

              {/* Errore */}
              {error && (
                <div style={{ color: bb.red, fontSize: '13px', letterSpacing: '0.5px' }}>
                  ▶ {error.toUpperCase()}
                </div>
              )}

              {/* Submit */}
              <button onClick={handleSubmit} disabled={submitting}
                style={{
                  width: '100%', padding: '12px', fontFamily: 'inherit', fontSize: '14px',
                  fontWeight: 'bold', letterSpacing: '2px', cursor: submitting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  backgroundColor: submitting ? bb.border2 : (direction === 'long' ? bb.green : bb.red),
                  color: '#000',
                }}>
                {submitting ? 'ELABORAZIONE...' : direction === 'long' ? '▲ CONFERMA BUY' : '▼ CONFERMA SELL'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultPanel({ result, onClose }: { result: TradeResult; onClose: () => void }) {
  const actionColor = {
    opened: bb.green,
    closed: bb.amber,
    partial_close: bb.amber,
    close_and_reopen: bb.yellow,
  }[result.action] ?? bb.white

  const pnl = result.realized_pnl ?? result.closed_trade?.realized_pnl
  const hasPnl = pnl != null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }}>
      <div style={{ textAlign: 'center', fontSize: '28px' }}>
        {result.action === 'opened' ? '✓' : result.action === 'closed' ? '⊠' : '⟳'}
      </div>
      <div style={{ textAlign: 'center', color: actionColor, fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>
        {{
          opened: 'POSIZIONE APERTA',
          closed: 'POSIZIONE CHIUSA',
          partial_close: 'CHIUSURA PARZIALE',
          close_and_reopen: 'INVERSIONE POSIZIONE',
        }[result.action] ?? result.action.toUpperCase()}
      </div>
      <div style={{ fontSize: '13px', color: bb.white, textAlign: 'center', lineHeight: '1.6' }}>
        {result.message}
      </div>
      {hasPnl && (
        <div style={{
          textAlign: 'center', fontSize: '22px', fontWeight: 'bold',
          color: (pnl ?? 0) >= 0 ? bb.green : bb.red,
        }}>
          PNL REALIZZATO: {(pnl ?? 0) >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}
        </div>
      )}
      {result.open_trade && (
        <div style={{ fontSize: '12px', color: bb.gray, textAlign: 'center' }}>
          Nuova posizione aperta: {result.open_trade.direction.toUpperCase()} ×{result.open_trade.quantity} @ ${result.open_trade.entry_price}
        </div>
      )}
      <button onClick={onClose}
        style={{
          marginTop: '8px', width: '100%', padding: '10px', fontFamily: 'inherit',
          fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer',
          border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.amber,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = bb.orange; e.currentTarget.style.color = bb.white }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = bb.border2; e.currentTarget.style.color = bb.amber }}>
        CHIUDI
      </button>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '5px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '2px', color: bb.yellow }}>
      {children}
    </div>
  )
}

const inputStyle: CSSProperties = {
  backgroundColor: '#0a0a00',
  border: `1px solid #333300`,
  color: '#FF6600',
  padding: '7px 10px',
  fontSize: '14px',
  fontFamily: 'Courier New, monospace',
  width: '100%',
  boxSizing: 'border-box',
}
