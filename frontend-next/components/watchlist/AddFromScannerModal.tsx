'use client'

import { useMemo, useState } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type ScannerResult = {
  symbol: string; underlyingSymbol: string; instrumentType?: string
  optionSide?: string | null; strike?: number | null; expirationDate?: string | null
  dte?: number | null; premiumPaid?: number | null; currentPremium?: number | null
  ivCurrent?: number | null; ivRank?: number | null; ivPercentile?: number | null
  ivMovingAvg?: number | null; delta?: number | null; gamma?: number | null
  vega?: number | null; theta?: number | null; openInterest?: number | null
  volume?: number | null; bid?: number | null; ask?: number | null
  bidAskSpread?: number | null; theoreticalPnl?: number | null; notes?: string | null
}

type Props = { open: boolean; watchlistId: string; candidates: ScannerResult[]; onClose: () => void; onSaved?: () => void }

export default function AddFromScannerModal({ open, watchlistId, candidates, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCandidates = useMemo(() => candidates.filter((_, idx) => selected.includes(idx)), [candidates, selected])
  const toggle = (idx: number) => setSelected(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx])

  const saveSelected = async () => {
    if (!watchlistId || selectedCandidates.length === 0) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items/bulk-add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedCandidates }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to save items')
      setSelected([]); onSaved?.(); onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save items') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '16px', fontFamily: 'Courier New, monospace' }}>
      <div style={{ maxHeight: '85vh', width: '100%', maxWidth: '1200px', overflow: 'hidden', border: `1px solid ${bb.border2}`, backgroundColor: bb.bg, color: bb.white }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${bb.orange}`, padding: '12px 16px' }}>
          <div>
            <h2 style={{ fontSize: '16.8px', fontWeight: 'bold', color: bb.orange, letterSpacing: '2px' }}>ADD FROM SCANNER</h2>
            <p style={{ fontSize: '12px', color: bb.gray, marginTop: '2px', letterSpacing: '0.5px' }}>SELECT CANDIDATES TO SAVE INTO ACTIVE WATCHLIST</p>
          </div>
          <button onClick={onClose} style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '4px 12px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = bb.orange, e.currentTarget.style.color = bb.white)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = bb.border2, e.currentTarget.style.color = bb.gray)}>
            CLOSE
          </button>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13.2px', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: bb.surface, color: bb.yellow, borderBottom: `1px solid ${bb.orange}` }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>SELECT</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>SYMBOL</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>UNDERLYING</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>SIDE</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>STRIKE</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>EXP</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>IV RANK</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>DELTA</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>SPREAD</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: bb.gray, fontSize: '13.2px', letterSpacing: '1px' }}>NO SCANNER CANDIDATES AVAILABLE.</td></tr>
              ) : candidates.map((c, idx) => {
                const isSelected = selected.includes(idx)
                return (
                  <tr key={`${c.symbol}-${idx}`} style={{ borderBottom: `1px solid ${bb.border}`, backgroundColor: isSelected ? bb.panel : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = bb.surface }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <td style={{ padding: '8px 12px' }}><input type="checkbox" checked={isSelected} onChange={() => toggle(idx)} style={{ cursor: 'pointer' }} /></td>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: bb.orange }}>{c.symbol}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{c.underlyingSymbol}</td>
                    <td style={{ padding: '8px 12px', color: bb.amber }}>{c.optionSide ?? '-'}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{c.strike ?? '-'}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{c.expirationDate ? new Date(c.expirationDate).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{fmt(c.ivRank)}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{fmt(c.delta)}</td>
                    <td style={{ padding: '8px 12px', color: bb.white }}>{fmt(c.bidAskSpread)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${bb.border2}`, padding: '12px 16px' }}>
          <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>{selectedCandidates.length} SELECTED</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setSelected([])} style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '6px 12px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = bb.orange, e.currentTarget.style.color = bb.white)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bb.border2, e.currentTarget.style.color = bb.gray)}>
              CLEAR
            </button>
            <button onClick={saveSelected} disabled={saving || selectedCandidates.length === 0}
              style={{
                backgroundColor: (saving || selectedCandidates.length === 0) ? bb.border2 : bb.orange,
                color: '#000', border: 'none', padding: '6px 16px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                cursor: (saving || selectedCandidates.length === 0) ? 'not-allowed' : 'pointer'
              }}>
              {saving ? 'SAVING...' : 'SAVE SELECTED'}
            </button>
          </div>
        </div>

        {error && <div style={{ borderTop: `1px solid ${bb.red}`, backgroundColor: '#1a0000', padding: '12px 16px', fontSize: '13.2px', color: bb.red }}>▶ ERROR: {error.toUpperCase()}</div>}
      </div>
    </div>
  )
}

function fmt(v: number | null | undefined) { return v == null ? '-' : Number(v).toFixed(2) }
