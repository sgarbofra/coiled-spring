'use client'

import { useEffect, useState } from 'react'

export type AddItemPayload = {
  symbol: string
  underlyingSymbol: string
  instrumentType: 'OPTION' | 'STOCK' | 'ETF'
  optionSide: 'CALL' | 'PUT' | ''
  strike: string
  expirationDate: string
  dte: string
  premiumPaid: string
  currentPremium: string
  ivCurrent: string
  ivRank: string
  ivPercentile: string
  delta: string
  gamma: string
  vega: string
  theta: string
  openInterest: string
  volume: string
  bid: string
  ask: string
  bidAskSpread: string
  theoreticalPnl: string
  notes: string
}

const emptyForm: AddItemPayload = {
  symbol: '',
  underlyingSymbol: '',
  instrumentType: 'OPTION',
  optionSide: 'CALL',
  strike: '',
  expirationDate: '',
  dte: '',
  premiumPaid: '',
  currentPremium: '',
  ivCurrent: '',
  ivRank: '',
  ivPercentile: '',
  delta: '',
  gamma: '',
  vega: '',
  theta: '',
  openInterest: '',
  volume: '',
  bid: '',
  ask: '',
  bidAskSpread: '',
  theoreticalPnl: '',
  notes: '',
}

export default function AddItemModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: AddItemPayload) => Promise<void> | void
}) {
  const [form, setForm] = useState<AddItemPayload>(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
  }, [open])

  if (!open) return null

  const setField = (key: keyof AddItemPayload, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Add item</h2>
            <p className="text-sm text-slate-400">LEAPS, option chain and tracking fields</p>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {([
            ['symbol', 'Symbol'],
            ['underlyingSymbol', 'Underlying'],
            ['strike', 'Strike'],
            ['expirationDate', 'Expiration date'],
            ['dte', 'DTE'],
            ['premiumPaid', 'Premium paid'],
            ['currentPremium', 'Current premium'],
            ['ivCurrent', 'IV current'],
            ['ivRank', 'IV Rank'],
            ['ivPercentile', 'IV Percentile'],
            ['delta', 'Delta'],
            ['gamma', 'Gamma'],
            ['vega', 'Vega'],
            ['theta', 'Theta'],
            ['openInterest', 'Open interest'],
            ['volume', 'Volume'],
            ['bid', 'Bid'],
            ['ask', 'Ask'],
            ['bidAskSpread', 'Bid/ask spread'],
            ['theoreticalPnl', 'Theoretical P&L'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">{label}</span>
              <input
                value={form[key]}
                onChange={e => setField(key, e.target.value)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
              />
            </label>
          ))}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Instrument type</span>
            <select
              value={form.instrumentType}
              onChange={e =>
                setField(
                  'instrumentType',
                  e.target.value as AddItemPayload['instrumentType']
                )
              }
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <option value="OPTION">OPTION</option>
              <option value="STOCK">STOCK</option>
              <option value="ETF">ETF</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Option side</span>
            <select
              value={form.optionSide}
              onChange={e =>
                setField(
                  'optionSide',
                  e.target.value as AddItemPayload['optionSide']
                )
              }
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <option value="CALL">CALL</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-slate-400">Notes</span>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            className="min-h-28 rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
        </label>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => onSubmit(form)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium"
          >
            Save item
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