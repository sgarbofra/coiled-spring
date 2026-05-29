'use client'

import { useMemo, useState } from 'react'

type ScannerResult = {
  symbol: string
  underlyingSymbol: string
  instrumentType?: string
  optionSide?: string | null
  strike?: number | null
  expirationDate?: string | null
  dte?: number | null
  premiumPaid?: number | null
  currentPremium?: number | null
  ivCurrent?: number | null
  ivRank?: number | null
  ivPercentile?: number | null
  ivMovingAvg?: number | null
  delta?: number | null
  gamma?: number | null
  vega?: number | null
  theta?: number | null
  openInterest?: number | null
  volume?: number | null
  bid?: number | null
  ask?: number | null
  bidAskSpread?: number | null
  theoreticalPnl?: number | null
  notes?: string | null
}

type Props = {
  open: boolean
  watchlistId: string
  candidates: ScannerResult[]
  onClose: () => void
  onSaved?: () => void
}

export default function AddFromScannerModal({
  open,
  watchlistId,
  candidates,
  onClose,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCandidates = useMemo(
    () => candidates.filter((_, idx) => selected.includes(idx)),
    [candidates, selected]
  )

  const toggle = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    )
  }

  const saveSelected = async () => {
    if (!watchlistId || selectedCandidates.length === 0) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items/bulk-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedCandidates,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to save items')

      setSelected([])
      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save items')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Add from scanner</h2>
            <p className="text-sm text-slate-400">
              Select candidates to save into the active watchlist
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded border border-slate-700 px-3 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Select</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Underlying</th>
                <th className="px-3 py-2 text-left">Side</th>
                <th className="px-3 py-2 text-left">Strike</th>
                <th className="px-3 py-2 text-left">Exp.</th>
                <th className="px-3 py-2 text-left">IV Rank</th>
                <th className="px-3 py-2 text-left">Delta</th>
                <th className="px-3 py-2 text-left">Spread</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No scanner candidates available.
                  </td>
                </tr>
              ) : (
                candidates.map((c, idx) => {
                  const isSelected = selected.includes(idx)
                  return (
                    <tr key={`${c.symbol}-${idx}`} className={isSelected ? 'bg-slate-900' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(idx)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{c.symbol}</td>
                      <td className="px-3 py-2">{c.underlyingSymbol}</td>
                      <td className="px-3 py-2">{c.optionSide ?? '-'}</td>
                      <td className="px-3 py-2">{c.strike ?? '-'}</td>
                      <td className="px-3 py-2">
                        {c.expirationDate ? new Date(c.expirationDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2">{fmt(c.ivRank)}</td>
                      <td className="px-3 py-2">{fmt(c.delta)}</td>
                      <td className="px-3 py-2">{fmt(c.bidAskSpread)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <p className="text-sm text-slate-400">
            {selectedCandidates.length} selected
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setSelected([])}
              className="rounded border border-slate-700 px-3 py-2 text-sm"
            >
              Clear
            </button>
            <button
              onClick={saveSelected}
              disabled={saving || selectedCandidates.length === 0}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save selected'}
            </button>
          </div>
        </div>

        {error && (
          <div className="border-t border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function fmt(v: number | null | undefined) {
  return v == null ? '-' : Number(v).toFixed(2)
}