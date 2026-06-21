'use client'

import { useMemo, useState } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
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

type SortKey = 'symbol' | 'underlyingSymbol' | 'expirationDate' | 'dte' | 'premiumPaid' |
  'currentPremium' | 'ivCurrent' | 'delta' | 'theta' | 'vega' | 'bidAskSpread'

type Props = {
  items: SavedInstrument[]; selectedIds?: string[]
  onSelectIds?: (ids: string[]) => void; onOpenItem: (item: SavedInstrument) => void
}

export default function WatchlistTable({ items, selectedIds = [], onSelectIds, onOpenItem }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q ? items : items.filter(item =>
      [item.symbol, item.underlyingSymbol, item.optionSide ?? '', String(item.strike ?? '')]
        .join(' ').toLowerCase().includes(q)
    )
    return [...base].sort((a, b) => {
      const va = a[sortKey]; const vb = b[sortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1; if (vb == null) return -1
      if (typeof va === 'string' && typeof vb === 'string')
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va)
    })
  }, [items, query, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }
  const toggle = (id: string) => onSelectIds?.(
    selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
  )

  return (
    <div style={{ backgroundColor: bb.bg, height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', fontFamily: 'Courier New, monospace', fontSize: '14.4px' }}>
      {/* Toolbar */}
      <div style={{ borderBottom: `1px solid ${bb.border2}`, paddingBottom: '10px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
        <input
          placeholder="SEARCH SYMBOL, UNDERLYING..." value={query} onChange={e => setQuery(e.target.value)}
          style={{ flex: '1 1 250px', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 8px', fontSize: '14.4px', fontFamily: 'inherit', letterSpacing: '0.5px' }}
        />
        <button onClick={() => onSelectIds?.(filtered.map(x => x.id))}
          style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.amber, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
          SELECT ALL
        </button>
        <button onClick={() => onSelectIds?.([])}
          style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
          CLEAR
        </button>
        <div style={{ color: bb.gray, fontSize: '13.2px', marginLeft: 'auto' }}>
          {filtered.length} POSITION{filtered.length !== 1 ? 'S' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${bb.border2}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.2px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: bb.surface, color: bb.yellow, borderBottom: `1px solid ${bb.orange}` }}>
            <tr style={{ textAlign: 'left' }}>
              <Th label="" />
              <Th label="SYMBOL" onClick={() => toggleSort('symbol')} />
              <Th label="UNDERLYING" onClick={() => toggleSort('underlyingSymbol')} />
              <Th label="SIDE" />
              <Th label="STRIKE" />
              <Th label="EXP" onClick={() => toggleSort('expirationDate')} />
              <Th label="DTE" onClick={() => toggleSort('dte')} />
              <Th label="PREMIUM" onClick={() => toggleSort('premiumPaid')} />
              <Th label="IV %" onClick={() => toggleSort('ivCurrent')} />
              <Th label="DELTA" onClick={() => toggleSort('delta')} />
              <Th label="THETA" onClick={() => toggleSort('theta')} />
              <Th label="VEGA" onClick={() => toggleSort('vega')} />
            </tr>
          </thead>
          <tbody style={{ backgroundColor: bb.bg }}>
            {filtered.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: bb.gray, fontSize: '13.2px', letterSpacing: '1px' }}>NO ITEMS FOUND</td></tr>
            ) : filtered.map(item => {
              const isSelected = selectedIds.includes(item.id)
              const dte = item.dte ?? 999
              const isExpired = dte <= 0
              const isExpiringSoon = dte > 0 && dte < 30
              const rowOpacity = (isExpired || isExpiringSoon) ? 0.5 : 1
              const textColor = (isExpired || isExpiringSoon) ? '#666666' : bb.white

              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${bb.border}`, backgroundColor: isSelected ? bb.panel : 'transparent', opacity: rowOpacity }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = bb.surface }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(item.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => onOpenItem(item)} style={{ background: 'none', border: 'none', color: (isExpired || isExpiringSoon) ? '#666666' : bb.orange, fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.5px' }}
                      onMouseEnter={e => (e.target as HTMLElement).style.textDecoration = 'underline'}
                      onMouseLeave={e => (e.target as HTMLElement).style.textDecoration = 'none'}>
                      {item.symbol}
                    </button>
                    {isExpired && <span style={{ fontSize: '10px', padding: '2px 4px', backgroundColor: '#333333', color: '#999999', borderRadius: '2px', letterSpacing: '0.5px' }}>EXPIRED</span>}
                    {isExpiringSoon && <span style={{ fontSize: '10px', padding: '2px 4px', backgroundColor: '#332200', color: '#FFAA00', borderRadius: '2px', letterSpacing: '0.5px' }}>EXPIRES SOON</span>}
                  </td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{item.underlyingSymbol}</td>
                  <td style={{ padding: '6px 8px', color: (isExpired || isExpiringSoon) ? '#666666' : bb.amber }}>{item.optionSide ?? '-'}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{item.strike ?? '-'}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{item.dte ?? '-'}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{fmt(item.premiumPaid)}</td>
                  <td style={{ padding: '6px 8px', color: (isExpired || isExpiringSoon) ? '#666666' : bb.amber }}>{item.ivCurrent ? `${Number(item.ivCurrent).toFixed(1)}%` : '-'}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{fmt(item.delta)}</td>
                  <td style={{ padding: '6px 8px', color: textColor }}>{fmt(item.theta)}</td>
                  <td style={{ padding: '6px 8px', color: (isExpired || isExpiringSoon) ? '#666666' : bb.orange }}>{item.vega != null ? Number(item.vega).toFixed(3) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <th style={{ borderBottom: `1px solid ${bb.border2}`, padding: '6px 8px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>
      {onClick ? (
        <button onClick={onClick} style={{ background: 'none', border: 'none', color: bb.yellow, fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', cursor: 'pointer', letterSpacing: 'inherit' }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = bb.orange}
          onMouseLeave={e => (e.target as HTMLElement).style.color = bb.yellow}>
          {label} ▴
        </button>
      ) : label}
    </th>
  )
}

function fmt(v: number | null) { return v == null ? '-' : Number(v).toFixed(2) }
function pnlColor(v: number | null) {
  if (v == null) return bb.gray
  return v >= 0 ? bb.green : bb.red
}
