'use client'

/**
 * Bull Put Credit Spread — Paper Trading Dashboard
 * /credit-spread
 *
 * Mostra stato portfolio, posizioni aperte/chiuse e diary giornaliero.
 * Dati da /api/paper-trading/cs/*
 */

import { useCallback, useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'

// ── Design tokens ──────────────────────────────────────────────────────────────
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
}

// ── Types ──────────────────────────────────────────────────────────────────────
type CsStatus = {
  portfolio_id:           number
  portfolio_name:         string
  universe:               string[]
  initial_equity:         number
  equity_simulated:       number
  open_positions:         number
  total_realized_pnl:     number
  last_scan_date:         string | null
  last_scan_tickers_scanned: number | null
  last_scan_trades_opened:   number | null
  last_scan_trades_closed:   number | null
}

type CsPosition = {
  trade_id:         number
  ticker:           string
  expiration:       string | null
  short_strike:     number | null
  long_strike:      number | null
  spread_width:     number | null
  net_credit:       number
  quantity:         number
  max_profit:       number
  max_loss:         number
  current_value:    number | null
  unrealized_pnl:   number | null
  delta_at_entry:   number | null
  iv_at_entry:      number | null
  status:           string
  opened_at:        string | null
}

type DiaryEntry = {
  id:              number
  diary_date:      string
  tickers_scanned: number
  tickers_eligible: number
  trades_opened:   number
  trades_closed_sl: number
  trades_closed_tp: number
  trades_rolled:   number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt2   = (v: number | null) => v === null ? '—' : v.toFixed(2)
const fmtPct = (v: number | null) => v === null ? '—' : (v * 100).toFixed(1) + '%'
const fmtK   = (v: number) => {
  const sign = v >= 0 ? '+' : ''
  return `${sign}€${Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
const fmtMoney = (v: number) => {
  const sign = v >= 0 ? '+' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pnlColor(v: number | null): string {
  if (v === null) return C.muted
  return v >= 0 ? C.green : C.red
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? C.text, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.dim }}>{sub}</div>}
    </div>
  )
}

// ── Main content ───────────────────────────────────────────────────────────────
function CreditSpreadContent() {
  const [status,    setStatus]    = useState<CsStatus | null>(null)
  const [positions, setPositions] = useState<CsPosition[]>([])
  const [diary,     setDiary]     = useState<DiaryEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [tab,       setTab]       = useState<'positions' | 'diary' | 'guide'>('positions')
  const [posFilter, setPosFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [isMobile,  setIsMobile]  = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [sRes, dRes] = await Promise.all([
        fetch('/api/paper-trading/cs/status',  { credentials: 'include' }),
        fetch('/api/paper-trading/cs/diary?limit=30', { credentials: 'include' }),
      ])
      if (!sRes.ok) {
        const e = await sRes.json().catch(() => ({ detail: `HTTP ${sRes.status}` }))
        throw new Error(e.detail ?? `Status ${sRes.status}`)
      }
      const [sJson, dJson] = await Promise.all([sRes.json(), dRes.json()])
      setStatus(sJson)
      setDiary(Array.isArray(dJson) ? dJson : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPositions = useCallback(async (filter: 'open' | 'closed' | 'all') => {
    try {
      const res = await fetch(`/api/paper-trading/cs/positions?status_filter=${filter}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setPositions(Array.isArray(json) ? json : [])
    } catch { /* swallow */ }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (tab === 'positions') fetchPositions(posFilter)
  }, [tab, posFilter, fetchPositions])

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px', padding: '8px 14px', cursor: 'pointer',
    background: active ? C.accent : 'transparent',
    color: active ? '#0d1117' : C.muted,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 5,
  })

  const FILTER_STYLE = (active: boolean): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
    letterSpacing: '0.4px', padding: '3px 10px', cursor: 'pointer',
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentDim : 'transparent',
    color: active ? C.accent : C.muted,
    borderRadius: 4,
  })

  const equity      = status?.equity_simulated ?? 0
  const realized    = status?.total_realized_pnl ?? 0
  const initialEq   = status?.initial_equity ?? 25000
  const equityPct   = initialEq > 0 ? (equity / initialEq - 1) * 100 : 0

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
              BULL PUT CREDIT SPREAD
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '1px 6px',
            }}>PAPER</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            Automated 15-delta OTM put spread · 28–35 DTE · TP 50% · SL 3× credit · Updated daily 15:30 CET
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={TAB_STYLE(tab === 'positions')} onClick={() => setTab('positions')}>POSITIONS</button>
          <button style={TAB_STYLE(tab === 'diary')}     onClick={() => setTab('diary')}>DIARY</button>
          <button style={TAB_STYLE(tab === 'guide')}     onClick={() => setTab('guide')}>HOW IT WORKS</button>
          <button onClick={fetchAll} style={{
            background: 'transparent', color: C.accent, border: `1px solid ${C.border}`,
            padding: '5px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            borderRadius: 5, fontFamily: 'var(--font-mono)',
          }}>↺ REFRESH</button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Loading / Error ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.muted, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Caricamento portafoglio...
          </div>
        )}
        {error && !loading && (
          <div style={{
            background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8,
            padding: '16px 20px', color: C.red, fontSize: 13, marginBottom: 20,
          }}>
            ⚠ {error}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              Il portfolio viene creato automaticamente al primo scan (15:30 CET nei giorni di mercato).
            </div>
          </div>
        )}

        {!loading && !error && status && (
          <>
            {/* ── Stat cards ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
              gap: 12, marginBottom: 24,
            }}>
              <StatCard
                label="EQUITY SIMULATA"
                value={`€${equity.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                sub={`da €${initialEq.toLocaleString('it-IT')}`}
                color={equityPct >= 0 ? C.green : C.red}
              />
              <StatCard
                label="RENDIMENTO"
                value={`${equityPct >= 0 ? '+' : ''}${equityPct.toFixed(2)}%`}
                sub="dal capitale iniziale"
                color={equityPct >= 0 ? C.green : C.red}
              />
              <StatCard
                label="PNL REALIZZATO"
                value={fmtMoney(realized)}
                sub="operazioni chiuse"
                color={realized >= 0 ? C.green : C.red}
              />
              <StatCard
                label="POSIZIONI APERTE"
                value={String(status.open_positions)}
                sub={`su ${status.universe.length} ticker monitorati`}
              />
              <StatCard
                label="ULTIMO SCAN"
                value={fmtDate(status.last_scan_date)}
                sub={status.last_scan_tickers_scanned !== null
                  ? `${status.last_scan_tickers_scanned} scansionati · ${status.last_scan_trades_opened ?? 0} aperti · ${status.last_scan_trades_closed ?? 0} chiusi`
                  : 'Nessuno scan ancora eseguito'
                }
              />
            </div>

            {/* ══════════════════════════════════════
                TAB: POSITIONS
            ══════════════════════════════════════ */}
            {tab === 'positions' && (
              <>
                {/* Filter */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.muted, marginRight: 4, fontFamily: 'var(--font-mono)' }}>STATUS:</span>
                  {(['open', 'closed', 'all'] as const).map(f => (
                    <button key={f} style={FILTER_STYLE(posFilter === f)} onClick={() => setPosFilter(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>

                {positions.length === 0 ? (
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '40px 24px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 12 }}>📊</div>
                    <div style={{ fontSize: 14, color: C.muted }}>
                      {posFilter === 'open'
                        ? 'Nessuna posizione aperta al momento.'
                        : 'Nessuna posizione trovata.'}
                    </div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
                      Il sistema apre posizioni automaticamente ogni giorno alle 15:30 CET (lun–ven).
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: C.surface, borderBottom: `2px solid ${C.border}` }}>
                          {[
                            'TICKER', 'EXPIRY', 'SHORT K', 'LONG K', 'WIDTH',
                            'CREDITO', 'QTY', 'MAX PROF.', 'MAX LOSS',
                            'VAL. ATT.', 'UNREAL. PNL', 'DELTA', 'IV', 'STATUS', 'APERTO IL',
                          ].map(h => (
                            <th key={h} style={{
                              padding: '10px 12px', textAlign: 'left',
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                              color: C.muted, whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos, idx) => (
                          <tr key={pos.trade_id}
                            style={{
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)',
                              borderBottom: `1px solid ${C.border}`,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)')}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: C.accent, fontSize: 13 }}>
                              {pos.ticker}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.text, whiteSpace: 'nowrap' }}>
                              {pos.expiration ?? '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.red, fontWeight: 600 }}>
                              {pos.short_strike !== null ? `$${pos.short_strike}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.green, fontWeight: 600 }}>
                              {pos.long_strike !== null ? `$${pos.long_strike}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.muted }}>
                              {pos.spread_width !== null ? `$${pos.spread_width}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.green, fontWeight: 700 }}>
                              ${fmt2(pos.net_credit)}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.text }}>
                              {pos.quantity}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.green }}>
                              ${pos.max_profit.toFixed(0)}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.red }}>
                              -${pos.max_loss.toFixed(0)}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.muted }}>
                              {pos.current_value !== null ? `$${fmt2(pos.current_value)}` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: pos.unrealized_pnl !== null ? 700 : 400, color: pnlColor(pos.unrealized_pnl) }}>
                              {pos.unrealized_pnl !== null ? fmtMoney(pos.unrealized_pnl) : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.muted }}>
                              {pos.delta_at_entry !== null ? pos.delta_at_entry.toFixed(3) : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: C.muted }}>
                              {fmtPct(pos.iv_at_entry)}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: pos.status === 'open' ? C.green : C.dim,
                                border: `1px solid ${pos.status === 'open' ? C.green : C.border}`,
                                background: pos.status === 'open' ? C.greenBg : 'transparent',
                                borderRadius: 4, padding: '2px 7px', letterSpacing: '0.4px',
                              }}>
                                {pos.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: C.dim, whiteSpace: 'nowrap', fontSize: 11 }}>
                              {fmtDate(pos.opened_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════════════════════
                TAB: DIARY
            ══════════════════════════════════════ */}
            {tab === 'diary' && (
              diary.length === 0 ? (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '40px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>📓</div>
                  <div style={{ fontSize: 14, color: C.muted }}>Nessun diary ancora registrato.</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
                    Il primo diary verrà scritto al termine del primo scan automatico.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: C.surface, borderBottom: `2px solid ${C.border}` }}>
                        {[
                          'DATA', 'SCANSIONATI', 'ELIGIBLE', 'APERTI', 'CHIUSI (TP)', 'CHIUSI (SL)', 'ROLLATI',
                        ].map(h => (
                          <th key={h} style={{
                            padding: '10px 12px', textAlign: 'left',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: C.muted,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diary.map((entry, idx) => (
                        <tr key={entry.id}
                          style={{
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)',
                            borderBottom: `1px solid ${C.border}`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg-panel) 50%, transparent)')}
                        >
                          <td style={{ padding: '10px 12px', color: C.text, fontWeight: 600 }}>
                            {fmtDate(entry.diary_date)}
                          </td>
                          <td style={{ padding: '10px 12px', color: C.muted }}>
                            {entry.tickers_scanned}
                          </td>
                          <td style={{ padding: '10px 12px', color: entry.tickers_eligible > 0 ? C.accent : C.dim }}>
                            {entry.tickers_eligible}
                          </td>
                          <td style={{ padding: '10px 12px', color: entry.trades_opened > 0 ? C.green : C.dim }}>
                            {entry.trades_opened > 0 ? `+${entry.trades_opened}` : entry.trades_opened}
                          </td>
                          <td style={{ padding: '10px 12px', color: entry.trades_closed_tp > 0 ? C.green : C.dim }}>
                            {entry.trades_closed_tp > 0 ? `✓ ${entry.trades_closed_tp}` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: entry.trades_closed_sl > 0 ? C.red : C.dim }}>
                            {entry.trades_closed_sl > 0 ? `⚠ ${entry.trades_closed_sl}` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: entry.trades_rolled > 0 ? C.accent : C.dim }}>
                            {entry.trades_rolled > 0 ? `↻ ${entry.trades_rolled}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ══════════════════════════════════════
                TAB: HOW IT WORKS
            ══════════════════════════════════════ */}
            {tab === 'guide' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>

                {/* What is it */}
                <div style={{
                  background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-panel))',
                  border: `1px solid color-mix(in srgb, var(--accent) 35%, var(--border))`,
                  borderRadius: 8, padding: '20px 24px',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12 }}>
                    📋 Cos&apos;è questo portafoglio?
                  </div>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.8, margin: '0 0 12px' }}>
                    Un sistema di paper trading completamente automatizzato che sfrutta il{' '}
                    <strong style={{ color: C.accent }}>Variance Risk Premium</strong>: la volatilità implicita
                    (IV) eccede sistematicamente la volatilità realizzata del 3–5% annuo sugli ETF americani.
                    Vendere put OTM incassa questo premio strutturalmente.
                  </p>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: 0 }}>
                    Ogni giorno alle 15:30 CET (apertura mercato USA) il sistema scansiona 14 ETF, cerca la
                    put a delta ~15 con 28–35 giorni a scadenza, abbina una put $5 più bassa come protezione,
                    e apre lo spread se il credito è nel range 5–45% della larghezza.
                  </p>
                </div>

                {/* Strategy rules */}
                {[
                  {
                    title: '📌 STRUTTURA DELLO SPREAD',
                    items: [
                      { label: 'Gamba corta', value: 'PUT OTM a ~15 delta (≈82–90% win rate storico)' },
                      { label: 'Gamba lunga', value: 'PUT $5 più bassa, stessa scadenza (protezione del rischio)' },
                      { label: 'Scadenza', value: '28–35 giorni (zona ottimale di decadimento theta)' },
                      { label: 'Credito minimo', value: '5% della larghezza dello spread' },
                      { label: 'Credito massimo', value: '45% (spread troppo ATM = rischio eccessivo)' },
                    ],
                  },
                  {
                    title: '🎯 REGOLE DI GESTIONE',
                    items: [
                      { label: 'Take Profit', value: 'Chiudi quando il valore dello spread ≤ 50% del credito incassato (50% del profitto garantito)' },
                      { label: 'Stop Loss', value: 'Chiudi quando il valore dello spread ≥ 3× il credito (perdita = 2× il credito ricevuto)' },
                      { label: 'Scadenza naturale', value: 'Se scade OTM → spread vale 0 → profitto massimo' },
                      { label: 'Sizing', value: '10% max del capitale per posizione · max 1 spread per ticker' },
                    ],
                  },
                  {
                    title: '📊 FORMULA PNL',
                    items: [
                      { label: 'Ingresso', value: 'entry_price = credito netto incassato (es. $1.20)' },
                      { label: 'PNL chiusura', value: '(entry_price − close_value) × 100 × quantità' },
                      { label: 'Esempio TP', value: 'Credito $1.20 → close a $0.60 → PNL = (+$0.60) × 100 = +$60' },
                      { label: 'Esempio SL', value: 'Credito $1.20 → close a $3.60 → PNL = (−$2.40) × 100 = −$240' },
                      { label: 'Esempio scadenza', value: 'Spread scade ITM 0 → PNL = (+$1.20) × 100 = +$120' },
                    ],
                  },
                ].map(section => (
                  <div key={section.title} style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '16px 20px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 14, letterSpacing: '0.4px' }}>
                      {section.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {section.items.map(item => (
                        <div key={item.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: C.muted,
                            fontFamily: 'var(--font-mono)', minWidth: 150, flexShrink: 0,
                          }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Universe */}
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '16px 20px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 14, letterSpacing: '0.4px' }}>
                    🌍 UNIVERSO DI TRADING ({status.universe.length} ETF)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {status.universe.map(t => (
                      <span key={t} style={{
                        fontSize: 12, fontWeight: 700, color: C.accent,
                        background: C.accentDim, border: `1px solid ${C.accent}`,
                        borderRadius: 4, padding: '4px 10px', fontFamily: 'var(--font-mono)',
                      }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>
                    ETF con alta liquidità opzionistica, bid-ask tight e IV stabili.
                    Il sistema salta automaticamente i ticker con una posizione già aperta.
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{
                  background: 'color-mix(in srgb, var(--negative) 5%, var(--bg-panel))',
                  border: `1px solid color-mix(in srgb, var(--negative) 25%, var(--border))`,
                  borderRadius: 8, padding: '14px 20px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6 }}>⚠ DISCLAIMER</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                    Questo portafoglio è esclusivamente in <strong style={{ color: C.text }}>paper trading simulato</strong>.
                    Nessun capitale reale viene investito. I risultati passati non garantiscono performance future.
                    Le opzioni comportano rischio di perdita. Non costituisce consulenza finanziaria.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function CreditSpreadPage() {
  return (
    <ProtectedRoute>
      <CreditSpreadContent />
    </ProtectedRoute>
  )
}
