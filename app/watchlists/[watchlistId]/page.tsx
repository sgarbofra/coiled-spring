'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import InstrumentDrawer, { type InstrumentItem } from '@/components/InstrumentDrawer'
import AddItemModal, { type AddItemPayload } from '@/components/AddItemModal'

type Watchlist = { id: string; name: string; isActive: boolean }

type Item = InstrumentItem

export default function WatchlistDetailPage() {
  const params = useParams<{ watchlistId: string }>()
  const router = useRouter()
  const watchlistId = params?.watchlistId

  const [watchlist, setWatchlist] = useState<Watchlist | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<keyof Item>('ivRank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const title = useMemo(() => watchlist?.name ?? 'Watchlist', [watchlist])

  const load = async () => {
    if (!watchlistId) return
    try {
      setLoading(true)
      setError(null)
      const [wlRes, itemsRes] = await Promise.all([
        fetch(`/api/watchlists/${watchlistId}`),
        fetch(`/api/watchlists/${watchlistId}/items`),
      ])
      const wlData = await wlRes.json()
      const itemsData = await itemsRes.json()
      if (!wlRes.ok || !wlData.ok) throw new Error(wlData.error || 'Failed to load watchlist')
      if (!itemsRes.ok || !itemsData.ok) throw new Error(itemsData.error || 'Failed to load items')
      setWatchlist(wlData.watchlist)
      setItems(itemsData.items || [])
      setSelectedIds([])
    } catch (e: any) {
      setError(e.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [watchlistId])

  const filteredSortedItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter(item =>
      !q ||
      [item.symbol, item.underlyingSymbol, item.instrumentType, item.optionSide, item.notes]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const aVal = typeof av === 'number' ? av : av == null ? null : String(av)
      const bVal = typeof bv === 'number' ? bv : bv == null ? null : String(bv)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDir === 'asc' ? 1 : -1
      if (bVal == null) return sortDir === 'asc' ? -1 : 1
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [items, query, sortKey, sortDir])

  const renameWatchlist = async () => {
    const nextName = window.prompt('New watchlist name', watchlist?.name ?? '')
    if (!nextName || !watchlistId) return
    const res = await fetch(`/api/watchlists/${watchlistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nextName }),
    })
    const data = await res.json()
    if (res.ok && data.ok) setWatchlist(data.watchlist)
  }

  const deleteWatchlist = async () => {
    if (!watchlistId) return
    if (!window.confirm('Delete this watchlist?')) return
    const res = await fetch(`/api/watchlists/${watchlistId}`, { method: 'DELETE' })
    if (res.ok) router.push('/watchlists')
  }

  const submitAdd = async (payload: AddItemPayload) => {
    if (!watchlistId) return
    const body = {
      symbol: payload.symbol,
      underlyingSymbol: payload.underlyingSymbol,
      instrumentType: payload.instrumentType,
      optionSide: payload.optionSide || null,
      strike: payload.strike ? Number(payload.strike) : null,
      expirationDate: payload.expirationDate || null,
      dte: payload.dte ? Number(payload.dte) : null,
      premiumPaid: payload.premiumPaid ? Number(payload.premiumPaid) : null,
      currentPremium: payload.currentPremium ? Number(payload.currentPremium) : null,
      ivCurrent: payload.ivCurrent ? Number(payload.ivCurrent) : null,
      ivRank: payload.ivRank ? Number(payload.ivRank) : null,
      ivPercentile: payload.ivPercentile ? Number(payload.ivPercentile) : null,
      delta: payload.delta ? Number(payload.delta) : null,
      gamma: payload.gamma ? Number(payload.gamma) : null,
      vega: payload.vega ? Number(payload.vega) : null,
      theta: payload.theta ? Number(payload.theta) : null,
      openInterest: payload.openInterest ? Number(payload.openInterest) : null,
      volume: payload.volume ? Number(payload.volume) : null,
      bid: payload.bid ? Number(payload.bid) : null,
      ask: payload.ask ? Number(payload.ask) : null,
      bidAskSpread: payload.bidAskSpread ? Number(payload.bidAskSpread) : null,
      theoreticalPnl: payload.theoreticalPnl ? Number(payload.theoreticalPnl) : null,
      notes: payload.notes,
    }
    const res = await fetch(`/api/watchlists/${watchlistId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setAddModalOpen(false)
      setStatusMsg('Item added')
      await load()
      setTimeout(() => setStatusMsg(null), 1800)
    }
  }

  const patchSelectedItems = async (patch: Partial<Item>) => {
    if (!watchlistId || selectedIds.length === 0) return
    await Promise.all(
      selectedIds.map(itemId =>
        fetch(`/api/watchlists/${watchlistId}/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
      )
    )
    await load()
  }

  const removeSelected = async () => {
    if (!watchlistId || selectedIds.length === 0) return
    await Promise.all(
      selectedIds.map(itemId =>
        fetch(`/api/watchlists/${watchlistId}/items/${itemId}`, { method: 'DELETE' })
      )
    )
    setStatusMsg('Selected removed')
    await load()
    setTimeout(() => setStatusMsg(null), 1800)
  }

  const moveSelected = async () => {
    if (!watchlistId || selectedIds.length === 0) return
    const target = window.prompt('Target watchlist id')
    if (!target) return
    await fetch(`/api/watchlists/${watchlistId}/items/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: selectedIds, toWatchlistId: target }),
    })
    setStatusMsg('Selected moved')
    await load()
    setTimeout(() => setStatusMsg(null), 1800)
  }

  const bulkRemove = async () => {
    if (!watchlistId || selectedIds.length === 0) return
    await fetch(`/api/watchlists/${watchlistId}/items/bulk-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    })
    setStatusMsg('Bulk removed')
    await load()
    setTimeout(() => setStatusMsg(null), 1800)
  }

  const toggleSelected = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const openDrawer = (item: Item) => { setActiveItem(item); setDrawerOpen(true) }
  const saveDrawer = async (updated: Partial<Item>) => {
    if (!watchlistId || !activeItem) return
    const res = await fetch(`/api/watchlists/${watchlistId}/items/${activeItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      setDrawerOpen(false)
      setActiveItem(null)
      setStatusMsg('Item saved')
      await load()
      setTimeout(() => setStatusMsg(null), 1800)
    }
  }

  const topPick = async () => {
    await patchSelectedItems({ notes: 'Top pick' })
    setStatusMsg('Marked as top pick')
    setTimeout(() => setStatusMsg(null), 1800)
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-400">Saved instruments and portfolio signals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={renameWatchlist} className="rounded border border-slate-700 px-3 py-2 text-sm">Rename</button>
          <button onClick={deleteWatchlist} className="rounded border border-slate-700 px-3 py-2 text-sm">Delete</button>
        </div>
      </div>

      {statusMsg ? (
        <div className="mb-4 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          {statusMsg}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium"
        >
          Add item
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter table"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            setSortKey('ivRank')
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
          }}
          className="rounded border border-slate-700 px-3 py-2 text-sm"
        >
          Sort IV Rank
        </button>
        <button
          onClick={() => {
            setSortKey('theoreticalPnl')
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
          }}
          className="rounded border border-slate-700 px-3 py-2 text-sm"
        >
          Sort P&L
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={removeSelected} className="rounded border border-slate-700 px-3 py-2 text-sm">Remove selected</button>
        <button onClick={moveSelected} className="rounded border border-slate-700 px-3 py-2 text-sm">Move to another watchlist</button>
        <button onClick={bulkRemove} className="rounded border border-slate-700 px-3 py-2 text-sm">Bulk remove</button>
        <button onClick={topPick} className="rounded border border-slate-700 px-3 py-2 text-sm">Mark top pick</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Sel</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Underlying</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">IV</th>
              <th className="px-4 py-3 text-left">IV Rank</th>
              <th className="px-4 py-3 text-left">Delta</th>
              <th className="px-4 py-3 text-left">Vega</th>
              <th className="px-4 py-3 text-left">Theta</th>
              <th className="px-4 py-3 text-left">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {filteredSortedItems.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={10}>
                  No items match current filters.
                </td>
              </tr>
            ) : (
              filteredSortedItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-900">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelected(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-left underline underline-offset-2"
                      onClick={() => openDrawer(item)}
                    >
                      {item.symbol}
                    </button>
                  </td>
                  <td className="px-4 py-3">{item.underlyingSymbol}</td>
                  <td className="px-4 py-3">{item.instrumentType}</td>
                  <td className="px-4 py-3">{item.ivCurrent ?? '-'}</td>
                  <td className="px-4 py-3">{item.ivRank ?? '-'}</td>
                  <td className="px-4 py-3">{item.delta ?? '-'}</td>
                  <td className="px-4 py-3">{item.vega ?? '-'}</td>
                  <td className="px-4 py-3">{item.theta ?? '-'}</td>
                  <td className="px-4 py-3">{item.theoreticalPnl ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InstrumentDrawer
        open={drawerOpen}
        item={activeItem}
        onClose={() => {
          setDrawerOpen(false)
          setActiveItem(null)
        }}
        onSave={saveDrawer}
      />
      <AddItemModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={submitAdd} />
    </div>
  )
}