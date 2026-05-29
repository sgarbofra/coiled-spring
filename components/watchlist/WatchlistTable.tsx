'use client'

import { useMemo, useState } from 'react'

type SavedInstrument = {
  id: string
  symbol: string
  underlyingSymbol: string
  instrumentType: string
  optionSide: string | null
  strike: number | null
  expirationDate: string | null
  dte: number | null
  premiumPaid: number | null
  currentPremium: number | null
  ivCurrent: number | null
  ivRank: number | null
  ivPercentile: number | null
  ivMovingAvg: number | null
  delta: number | null
  gamma: number | null
  vega: number | null
  theta: number | null
  openInterest: number | null
  volume: number | null
  bid: number | null
  ask: number | null
  bidAskSpread: number | null
  theoreticalPnl: number | null
  notes: string | null
}

type Props = {
  items: SavedInstrument[]
  selectedIds?: string[]
  onSelectIds?: (ids: string[]) => void
  onOpenItem: (item: SavedInstrument) => void
}

type SortKey =
  | 'symbol'
  | 'underlyingSymbol'
  | 'expirationDate'
  | 'dte'
  | 'premiumPaid'
  | 'currentPremium'
  | 'ivRank'
  | 'delta'
  | 'theta'
  | 'bidAskSpread'
  | 'theoreticalPnl'

export default function WatchlistTable({
  items,
  selectedIds = [],
  onSelectIds,
  onOpenItem,
}: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortAsc, setSortAsc] = useState(true)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = !q
      ? items
      : items.filter((item) =>
          [
            item.symbol,
            item.underlyingSymbol,
            item.instrumentType,
            item.optionSide ?? '',
            String(item.strike ?? ''),
            String(item.expirationDate ?? ''),
            String(item.ivRank ?? ''),
            String(item.delta ?? ''),
            String(item.theta ?? ''),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )

    const sorted = [...base].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]

      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      }

      const na = Number(va)
      const nb = Number(vb)
      return sortAsc ? na - nb : nb - na
    })

    return sorted
  }, [items, query, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const toggleSelected = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    onSelectIds?.(next)
  }

  const selectAllVisible = () => {
    const visibleIds = filtered.map((x) => x.id)
    onSelectIds?.(visibleIds)
  }

  const clearSelection = () => {
    onSelectIds?.([])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-64 rounded border px-3 py-2 text-sm"
          placeholder="Search symbol, underlying, IV rank..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="rounded border px-3 py-2 text-sm" onClick={selectAllVisible}>
          Select visible
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={clearSelection}>
          Clear selection
        </button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-left">
              <Th label="" />
              <Th label="Symbol" onClick={() => toggleSort('symbol')} />
              <Th label="Underlying" onClick={() => toggleSort('underlyingSymbol')} />
              <Th label="Side" />
              <Th label="Strike" />
              <Th label="Exp." onClick={() => toggleSort('expirationDate')} />
              <Th label="DTE" onClick={() => toggleSort('dte')} />
              <Th label="Premium" onClick={() => toggleSort('premiumPaid')} />
              <Th label="Current" onClick={() => toggleSort('currentPremium')} />
              <Th label="IV Rank" onClick={() => toggleSort('ivRank')} />
              <Th label="Delta" onClick={() => toggleSort('delta')} />
              <Th label="Theta" onClick={() => toggleSort('theta')} />
              <Th label="Spread" onClick={() => toggleSort('bidAskSpread')} />
              <Th label="Theo P&L" onClick={() => toggleSort('theoreticalPnl')} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="p-4 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const selected = selectedIds.includes(item.id)
                return (
                  <tr
                    key={item.id}
                    className={`border-t hover:bg-gray-50 ${
                      selected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelected(item.id)}
                      />
                    </td>
                    <td className="p-3">
                      <button
                        className="font-medium text-blue-700 hover:underline"
                        onClick={() => onOpenItem(item)}
                      >
                        {item.symbol}
                      </button>
                    </td>
                    <td className="p-3">{item.underlyingSymbol}</td>
                    <td className="p-3">{item.optionSide ?? '-'}</td>
                    <td className="p-3">{item.strike ?? '-'}</td>
                    <td className="p-3">
                      {item.expirationDate
                        ? new Date(item.expirationDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-3">{item.dte ?? '-'}</td>
                    <td className="p-3">{fmt(item.premiumPaid)}</td>
                    <td className="p-3">{fmt(item.currentPremium)}</td>
                    <td className="p-3">{fmt(item.ivRank)}</td>
                    <td className="p-3">{fmt(item.delta)}</td>
                    <td className="p-3">{fmt(item.theta)}</td>
                    <td className="p-3">{fmt(item.bidAskSpread)}</td>
                    <td className="p-3">{fmt(item.theoreticalPnl)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
  return (
    <th className="cursor-default border-b px-3 py-2 font-medium text-gray-600">
      {onClick ? (
        <button className="hover:text-black" onClick={onClick}>
          {label}
        </button>
      ) : (
        label
      )}
    </th>
  )
}

function fmt(v: number | null) {
  return v == null ? '-' : Number(v).toFixed(2)
}