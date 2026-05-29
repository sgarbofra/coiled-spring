'use client'

import { useEffect, useState } from 'react'

export type InstrumentItem = {
  id: string
  symbol: string
  underlyingSymbol: string
  instrumentType: string
  optionSide?: string | null
  ivCurrent?: number | null
  ivRank?: number | null
  ivPercentile?: number | null
  ivMovingAvg?: number | null
  delta?: number | null
  gamma?: number | null
  vega?: number | null
  theta?: number | null
  bid?: number | null
  ask?: number | null
  bidAskSpread?: number | null
  theoreticalPnl?: number | null
  notes?: string | null
}

export default function InstrumentDrawer({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean
  item: InstrumentItem | null
  onClose: () => void
  onSave: (updated: Partial<InstrumentItem>) => Promise<void> | void
}) {
  const [form, setForm] = useState<Partial<InstrumentItem>>({})

  useEffect(() => {
    setForm(item ?? {})
  }, [item])

  if (!open || !item) return null

  const update = (key: keyof InstrumentItem, value: string) =>
    setForm(prev => ({
      ...prev,
      [key]: value === '' ? null : isNaN(Number(value)) ? value : Number(value),
    }))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{item.symbol}</h2>
            <p className="text-sm text-slate-400">{item.underlyingSymbol}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            'ivCurrent',
            'ivRank',
            'ivPercentile',
            'ivMovingAvg',
            'delta',
            'gamma',
            'vega',
            'theta',
            'bid',
            'ask',
            'bidAskSpread',
            'theoreticalPnl',
          ] as const).map(key => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">{key}</span>
              <input
                value={String((form as any)[key] ?? '')}
                onChange={e => update(key, e.target.value)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none"
              />
            </label>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-slate-400">Notes</span>
          <textarea
            value={String(form.notes ?? '')}
            onChange={e =>
              setForm(prev => ({ ...prev, notes: e.target.value }))
            }
            className="min-h-32 rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none"
          />
        </label>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onSave(form)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium"
          >
            Save changes
          </button>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}