'use client'

import { useEffect, useMemo, useState } from 'react'

type Alert = {
  id: string
  alertType: string
  field: string
  operator: string
  value: string | number | boolean | null
  isEnabled: boolean
}

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
  alerts?: Alert[]
  snapshots?: unknown[]
}

type Props = {
  watchlistId: string
  itemId: string
  open: boolean
  onClose: () => void
  onManageAlerts?: () => void
}

export default function ItemDetailsDrawer({
  watchlistId,
  itemId,
  open,
  onClose,
  onManageAlerts,
}: Props) {
  const [item, setItem] = useState<SavedInstrument | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/watchlists/${watchlistId}/items/${itemId}`
        )
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load item')
        setItem(json.item || null)
      } catch (e: any) {
        setError(e.message || 'Failed to load item')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, watchlistId, itemId])

  const pnlPct = useMemo(() => {
    if (item?.premiumPaid == null || item?.currentPremium == null) return null
    if (item.premiumPaid === 0) return null
    return ((item.currentPremium - item.premiumPaid) / item.premiumPaid) * 100
  }, [item])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-semibold">{item?.symbol ?? 'Item details'}</h2>
            <p className="text-sm text-gray-500">{item?.underlyingSymbol ?? ''}</p>
          </div>
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {item && (
            <>
              <section className="grid grid-cols-2 gap-3 text-sm">
                <MetaCard label="Instrument" value={item.instrumentType} />
                <MetaCard label="Side" value={item.optionSide ?? '-'} />
                <MetaCard label="Strike" value={item.strike ?? '-'} />
                <MetaCard
                  label="Expiration"
                  value={item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-'}
                />
                <MetaCard label="DTE" value={item.dte ?? '-'} />
                <MetaCard label="Theo P&L" value={item.theoreticalPnl ?? '-'} />
              </section>

              <section className="grid grid-cols-2 gap-3 text-sm">
                <MetaCard label="Premium paid" value={item.premiumPaid ?? '-'} />
                <MetaCard label="Current premium" value={item.currentPremium ?? '-'} />
                <MetaCard
                  label="P&L %"
                  value={pnlPct === null ? '-' : `${pnlPct.toFixed(2)}%`}
                />
                <MetaCard
                  label="Bid / Ask"
                  value={`${item.bid ?? '-'} / ${item.ask ?? '-'}`}
                />
                <MetaCard label="Spread" value={item.bidAskSpread ?? '-'} />
                <MetaCard
                  label="Open interest / Volume"
                  value={`${item.openInterest ?? '-'} / ${item.volume ?? '-'}`}
                />
              </section>

              <section className="grid grid-cols-2 gap-3 text-sm">
                <MetaCard label="IV current" value={item.ivCurrent ?? '-'} />
                <MetaCard label="IV Rank" value={item.ivRank ?? '-'} />
                <MetaCard label="IV Percentile" value={item.ivPercentile ?? '-'} />
                <MetaCard label="IV Moving Avg" value={item.ivMovingAvg ?? '-'} />
              </section>

              <section className="grid grid-cols-2 gap-3 text-sm">
                <MetaCard label="Delta" value={item.delta ?? '-'} />
                <MetaCard label="Gamma" value={item.gamma ?? '-'} />
                <MetaCard label="Vega" value={item.vega ?? '-'} />
                <MetaCard label="Theta" value={item.theta ?? '-'} />
              </section>

              <section className="rounded border p-3 text-sm">
                <p className="text-gray-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{item.notes ?? '-'}</p>
              </section>

              <section className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Alerts</p>
                  {onManageAlerts && (
                    <button
                      onClick={onManageAlerts}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Manage alerts
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {item.alerts?.length ? (
                    item.alerts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded border p-2">
                        <span className="text-sm">
                          {a.field} {a.operator} {String(a.value)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {a.isEnabled ? 'enabled' : 'disabled'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No alerts yet</p>
                  )}
                </div>
              </section>

              <section className="rounded border p-3 text-sm">
                <p className="text-gray-500">Snapshots</p>
                <p className="mt-1 text-sm text-gray-500">
                  {item.snapshots?.length ? `${item.snapshots.length} snapshot(s)` : 'No snapshots yet'}
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border p-3">
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}