'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import OnboardingModal from '@/components/OnboardingModal'
import WatchlistSidebar from '@/components/watchlist/WatchlistSidebar'
import WatchlistTable from '@/components/watchlist/WatchlistTable'
import ItemDetailsDrawer from '@/components/watchlist/ItemDetailsDrawer'
import AddFromScannerModal from '@/components/watchlist/AddFromScannerModal'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type Watchlist = { id: string; name: string; isActive: boolean }
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
type ScannerCandidate = Partial<SavedInstrument> & { symbol: string; underlyingSymbol: string }

const MOCK_CANDIDATES: ScannerCandidate[] = [
  { symbol: 'AAPL 2027-01-15 C200', underlyingSymbol: 'AAPL', optionSide: 'CALL', strike: 200,
    expirationDate: '2027-01-15', dte: 595, premiumPaid: 12.4, ivCurrent: 24.1, ivRank: 18,
    delta: 0.41, gamma: 0.05, vega: 0.28, theta: -0.01, bid: 12.1, ask: 12.7 },
  { symbol: 'QQQ 2027-06-18 C500', underlyingSymbol: 'QQQ', optionSide: 'CALL', strike: 500,
    expirationDate: '2027-06-18', dte: 750, premiumPaid: 18.2, ivCurrent: 19.5, ivRank: 12,
    delta: 0.36, gamma: 0.04, vega: 0.31, theta: -0.01, bid: 18.0, ask: 18.4 },
]

export default function WatchlistsPage() {
  const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null)
  const [items, setItems] = useState<SavedInstrument[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const activeWatchlistId = activeWatchlist?.id ?? null

  useEffect(() => {
    const loadData = async () => {
      if (!activeWatchlistId) {
        setItems([])
        setSelectedIds([])
        setDrawerItemId(null)
        return
      }

      setLoadingItems(true)
      setError(null)
      try {
        const res = await fetch(`/api/watchlists/${activeWatchlistId}/items`)
        const data = await res.json()
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load items')
        setItems(data.items || [])

        // Auto-refresh prezzi e greche quando apri la watchlist
        if (data.items && data.items.length > 0) {
          setRefreshing(true)
          try {
            const refreshRes = await fetch(`/api/watchlists/${activeWatchlistId}/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            })
            const refreshData = await refreshRes.json()
            if (refreshRes.ok && refreshData.ok) {
              // Reload items con dati aggiornati
              const reloadRes = await fetch(`/api/watchlists/${activeWatchlistId}/items`)
              const reloadData = await reloadRes.json()
              if (reloadData.ok) setItems(reloadData.items || [])
            }
          } catch (refreshError) {
            // Silent fail - mostra i dati anche se il refresh fallisce
            console.warn('Auto-refresh failed:', refreshError)
          } finally {
            setRefreshing(false)
          }
        }
      } catch (e: unknown) {
        setItems([])
        setError(e instanceof Error ? e.message : 'Unexpected error')
      } finally {
        setLoadingItems(false)
      }
    }

    loadData()
  }, [activeWatchlistId])

  const refreshPrices = async () => {
    if (!activeWatchlistId) return

    setRefreshing(true)
    setError(null)
    try {
      const refreshRes = await fetch(`/api/watchlists/${activeWatchlistId}/refresh`, {
        method: 'POST',
      })
      const refreshData = await refreshRes.json()
      if (!refreshRes.ok || !refreshData.ok) {
        console.warn('Refresh failed:', refreshData.error)
      }

      // Reload items
      const res = await fetch(`/api/watchlists/${activeWatchlistId}/items`)
      const data = await res.json()
      if (res.ok && data.ok) {
        setItems(data.items || [])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  const refreshItems = refreshPrices

  const removeSelected = async () => {
    if (!activeWatchlistId || selectedIds.length === 0) return
    const res = await fetch(`/api/watchlists/${activeWatchlistId}/items/bulk-delete`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: selectedIds }),
    })
    const data = await res.json()
    if (res.ok && data.ok) { setSelectedIds([]); await refreshItems() }
    else setError(data.error || 'Failed to remove items')
  }

  const moveSelected = async () => {
    if (!activeWatchlistId || selectedIds.length === 0) return
    const targetId = window.prompt('Target watchlist ID')
    if (!targetId?.trim()) return
    const res = await fetch(`/api/watchlists/${activeWatchlistId}/items/move`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: selectedIds, targetWatchlistId: targetId.trim() }),
    })
    const data = await res.json()
    if (res.ok && data.ok) { setSelectedIds([]); await refreshItems() }
    else setError(data.error || 'Failed to move items')
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds])

  return (
    <ProtectedRoute>
    <>
      <OnboardingModal />
      <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '300px', flexShrink: 0 }}>
        <WatchlistSidebar
          userId="demo-user"
          activeWatchlistId={activeWatchlistId}
          onSelectWatchlist={wl => { setActiveWatchlist(wl); setSelectedIds([]); setDrawerItemId(null) }}
          onCreateWatchlist={wl => { setActiveWatchlist(wl); setSelectedIds([]); setDrawerItemId(null) }}
          onRenameWatchlist={wl => { if (activeWatchlistId === wl.id) setActiveWatchlist(wl) }}
          onDeleteWatchlist={id => { if (activeWatchlistId === id) { setActiveWatchlist(null); setItems([]) } }}
          onActivateWatchlist={wl => { setActiveWatchlist(wl); setSelectedIds([]); setDrawerItemId(null) }}
        />
      </div>

      <main style={{ flex: 1, minWidth: 0, padding: '16px' }}>
        {/* Header */}
        <div style={{ borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1 style={{ color: bb.orange, fontSize: '21.6px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '4px' }}>
              {activeWatchlist?.name.toUpperCase() ?? 'WATCHLISTS'}
            </h1>
            <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>
              {loadingItems ? 'LOADING...' : activeWatchlist
                ? `${items.length} INSTRUMENT(S) · ${selectedCount} SELECTED`
                : 'SELECT A WATCHLIST TO BEGIN'}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={refreshPrices}
              disabled={!activeWatchlistId || refreshing}
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: activeWatchlistId ? bb.green : bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: (activeWatchlistId && !refreshing) ? 'pointer' : 'not-allowed', letterSpacing: '1px', opacity: (activeWatchlistId && !refreshing) ? 1 : 0.4 }}>
              {refreshing ? '⟳ REFRESHING...' : '⟳ REFRESH PRICES'}
            </button>
            <button onClick={() => setScannerOpen(true)} disabled={!activeWatchlistId}
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: activeWatchlistId ? bb.amber : bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: activeWatchlistId ? 'pointer' : 'not-allowed', letterSpacing: '1px', opacity: activeWatchlistId ? 1 : 0.4 }}>
              ADD FROM SCANNER
            </button>
            <button onClick={removeSelected} disabled={!activeWatchlistId || selectedIds.length === 0}
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: (activeWatchlistId && selectedIds.length > 0) ? bb.red : bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: (activeWatchlistId && selectedIds.length > 0) ? 'pointer' : 'not-allowed', letterSpacing: '1px', opacity: (activeWatchlistId && selectedIds.length > 0) ? 1 : 0.4 }}>
              REMOVE SELECTED
            </button>
            <button onClick={moveSelected} disabled={!activeWatchlistId || selectedIds.length === 0}
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: (activeWatchlistId && selectedIds.length > 0) ? bb.amber : bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', cursor: (activeWatchlistId && selectedIds.length > 0) ? 'pointer' : 'not-allowed', letterSpacing: '1px', opacity: (activeWatchlistId && selectedIds.length > 0) ? 1 : 0.4 }}>
              MOVE SELECTED
            </button>
            <Link href="/settings"
              style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '4px 10px', fontSize: '13.2px', fontFamily: 'inherit', textDecoration: 'none', letterSpacing: '1px', display: 'inline-block' }}>
              ⚙ SETTINGS
            </Link>
          </div>
        </div>

        {error && <div style={{ marginBottom: '16px', border: `1px solid ${bb.red}`, backgroundColor: '#1a0000', padding: '12px 16px', fontSize: '13.2px', color: bb.red, letterSpacing: '0.5px' }}>▶ ERROR: {error.toUpperCase()}</div>}

        <div style={{ height: 'calc(100vh - 150px)', minHeight: 0, border: `1px solid ${bb.border2}`, backgroundColor: bb.bg }}>
          {activeWatchlist ? (
            <WatchlistTable items={items} selectedIds={selectedIds} onSelectIds={setSelectedIds}
              onOpenItem={item => setDrawerItemId(item.id)} />
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>
              CREATE OR SELECT A WATCHLIST FROM THE SIDEBAR
            </div>
          )}
        </div>
      </main>

      {activeWatchlist && drawerItemId && (
        <ItemDetailsDrawer watchlistId={activeWatchlist.id} itemId={drawerItemId}
          open={true} onClose={() => setDrawerItemId(null)} />
      )}

      {activeWatchlist && (
        <AddFromScannerModal open={scannerOpen} watchlistId={activeWatchlist.id}
          candidates={MOCK_CANDIDATES} onClose={() => setScannerOpen(false)} onSaved={refreshItems} />
      )}
      </div>
    </>
    </ProtectedRoute>
  )
}
