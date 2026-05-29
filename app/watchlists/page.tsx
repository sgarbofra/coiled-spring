'use client'

import { useEffect, useMemo, useState } from 'react'
import WatchlistSidebar from '@/components/watchlist/WatchlistSidebar'
import WatchlistTable from '@/components/watchlist/WatchlistTable'
import ItemDetailsDrawer from '@/components/watchlist/ItemDetailsDrawer'
import AddFromScannerModal from '@/components/watchlist/AddFromScannerModal'

type Watchlist = {
  id: string
  name: string
  isActive: boolean
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
}

type ScannerCandidate = {
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

export default function WatchlistsPage() {
  const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null)
  const [items, setItems] = useState<SavedInstrument[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const scannerCandidates: ScannerCandidate[] = useMemo(
    () => [
      {
        symbol: 'AAPL 2027-01-15 C200',
        underlyingSymbol: 'AAPL',
        instrumentType: 'OPTION',
        optionSide: 'CALL',
        strike: 200,
        expirationDate: '2027-01-15',
        dte: 230,
        premiumPaid: 12.4,
        currentPremium: 12.4,
        ivCurrent: 24.1,
        ivRank: 18,
        ivPercentile: 22,
        ivMovingAvg: 23.7,
        delta: 0.41,
        gamma: 0.05,
        vega: 0.28,
        theta: -0.01,
        openInterest: 4210,
        volume: 880,
        bid: 12.1,
        ask: 12.7,
        bidAskSpread: 0.6,
        theoreticalPnl: 0,
        notes: 'Mock scanner candidate',
      },
      {
        symbol: 'QQQ 2027-06-18 C500',
        underlyingSymbol: 'QQQ',
        instrumentType: 'OPTION',
        optionSide: 'CALL',
        strike: 500,
        expirationDate: '2027-06-18',
        dte: 350,
        premiumPaid: 18.2,
        currentPremium: 18.2,
        ivCurrent: 19.5,
        ivRank: 12,
        ivPercentile: 15,
        ivMovingAvg: 20.1,
        delta: 0.36,
        gamma: 0.04,
        vega: 0.31,
        theta: -0.01,
        openInterest: 5320,
        volume: 1040,
        bid: 18.0,
        ask: 18.4,
        bidAskSpread: 0.4,
        theoreticalPnl: 0,
        notes: 'Mock scanner candidate',
      },
    ],
    []
  )

  const activeWatchlistId = activeWatchlist?.id ?? null

  const loadItems = async (watchlistId: string) => {
    try {
      setLoadingItems(true)
      setError(null)

      const res = await fetch(`/api/watchlists/${watchlistId}/items`)
      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load items')
      }

      setItems(data.items || [])
    } catch (e: any) {
      setItems([])
      setError(e.message || 'Unexpected error')
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    if (activeWatchlistId) {
      loadItems(activeWatchlistId)
    } else {
      setItems([])
      setSelectedIds([])
      setDrawerItemId(null)
    }
  }, [activeWatchlistId])

  const refreshItems = async () => {
    if (!activeWatchlistId) return
    await loadItems(activeWatchlistId)
  }

  const handleSelectWatchlist = (watchlist: Watchlist) => {
    setActiveWatchlist(watchlist)
    setSelectedIds([])
    setDrawerItemId(null)
  }

  const handleCreateWatchlist = (watchlist: Watchlist) => {
    setActiveWatchlist(watchlist)
    setSelectedIds([])
    setDrawerItemId(null)
  }

  const handleDeleteWatchlist = (watchlistId: string) => {
    if (activeWatchlistId === watchlistId) {
      setActiveWatchlist(null)
      setItems([])
      setSelectedIds([])
      setDrawerItemId(null)
    }
  }

  const addSelected = async () => {
    setScannerOpen(true)
  }

  const removeSelected = async () => {
    if (!activeWatchlistId || selectedIds.length === 0) return

    const res = await fetch(
      `/api/watchlists/${activeWatchlistId}/items/bulk-delete`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selectedIds }),
      }
    )

    const data = await res.json()
    if (res.ok && data.ok) {
      setSelectedIds([])
      await refreshItems()
    } else {
      setError(data.error || 'Failed to remove selected items')
    }
  }

  const moveSelected = async () => {
    if (!activeWatchlistId || selectedIds.length === 0) return

    const targetWatchlistId = window.prompt('Target watchlist id')
    if (!targetWatchlistId?.trim()) return

    const res = await fetch(`/api/watchlists/${activeWatchlistId}/items/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemIds: selectedIds,
        targetWatchlistId: targetWatchlistId.trim(),
      }),
    })

    const data = await res.json()
    if (res.ok && data.ok) {
      setSelectedIds([])
      await refreshItems()
    } else {
      setError(data.error || 'Failed to move selected items')
    }
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="w-80 shrink-0 border-r border-slate-800 bg-slate-950">
        <WatchlistSidebar
          userId="demo-user"
          activeWatchlistId={activeWatchlistId}
          onSelectWatchlist={handleSelectWatchlist}
          onCreateWatchlist={handleCreateWatchlist}
          onRenameWatchlist={(watchlist) => {
            if (activeWatchlistId === watchlist.id) setActiveWatchlist(watchlist)
          }}
          onDeleteWatchlist={handleDeleteWatchlist}
          onActivateWatchlist={handleSelectWatchlist}
        />
      </div>

      <main className="min-w-0 flex-1 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {activeWatchlist?.name ?? 'Watchlists'}
            </h1>
            <p className="text-sm text-slate-400">
              {loadingItems
                ? 'Loading items...'
                : activeWatchlist
                  ? `${items.length} saved instrument(s) • ${selectedCount} selected`
                  : 'Select a watchlist to begin'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={addSelected}
              disabled={!activeWatchlistId}
              className="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
            >
              Add from scanner
            </button>
            <button
              onClick={removeSelected}
              disabled={!activeWatchlistId || selectedIds.length === 0}
              className="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
            >
              Remove selected
            </button>
            <button
              onClick={moveSelected}
              disabled={!activeWatchlistId || selectedIds.length === 0}
              className="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
            >
              Move selected
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="h-[calc(100vh-8rem)] min-h-0 rounded-lg border border-slate-800 bg-slate-900">
          {activeWatchlist ? (
            <WatchlistTable
              items={items}
              selectedIds={selectedIds}
              onSelectIds={setSelectedIds}
              onOpenItem={(item) => setDrawerItemId(item.id)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Create or select a watchlist from the sidebar
            </div>
          )}
        </div>
      </main>

      {activeWatchlist && drawerItemId && (
        <ItemDetailsDrawer
          watchlistId={activeWatchlist.id}
          itemId={drawerItemId}
          open={true}
          onClose={() => setDrawerItemId(null)}
        />
      )}

      {activeWatchlist && (
        <AddFromScannerModal
          open={scannerOpen}
          watchlistId={activeWatchlist.id}
          candidates={scannerCandidates}
          onClose={() => setScannerOpen(false)}
          onSaved={refreshItems}
        />
      )}
    </div>
  )
}