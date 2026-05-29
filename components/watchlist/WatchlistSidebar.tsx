'use client'

import { useEffect, useState } from 'react'

type Watchlist = {
  id: string
  name: string
  isActive: boolean
  createdAt?: string
}

type Props = {
  userId: string
  activeWatchlistId?: string | null
  onSelectWatchlist: (watchlist: Watchlist) => void
  onCreateWatchlist?: (watchlist: Watchlist) => void
  onRenameWatchlist?: (watchlist: Watchlist) => void
  onDeleteWatchlist?: (watchlistId: string) => void
  onActivateWatchlist?: (watchlist: Watchlist) => void
}

export default function WatchlistSidebar({
  userId,
  activeWatchlistId,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onActivateWatchlist,
}: Props) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/watchlists')
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load watchlists')
        setWatchlists(json.watchlists || [])

        const active = (json.watchlists || []).find((w: Watchlist) => w.isActive)
        if (active) onSelectWatchlist(active)
      } catch (e: any) {
        setError(e.message || 'Failed to load watchlists')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [onSelectWatchlist])

  const createWatchlist = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, userId }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to create watchlist')

      setWatchlists((prev) => [...prev, json.watchlist])
      setName('')
      onCreateWatchlist?.(json.watchlist)
    } catch (e: any) {
      setError(e.message || 'Failed to create watchlist')
    } finally {
      setCreating(false)
    }
  }

  const renameWatchlist = async (watchlistId: string) => {
    const current = watchlists.find((w) => w.id === watchlistId)
    const nextName = window.prompt('New watchlist name', current?.name ?? '')
    if (!nextName?.trim()) return

    try {
      const res = await fetch(`/api/watchlists/${watchlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to rename watchlist')

      setWatchlists((prev) =>
        prev.map((w) => (w.id === watchlistId ? json.watchlist : w))
      )
      onRenameWatchlist?.(json.watchlist)
    } catch (e: any) {
      setError(e.message || 'Failed to rename watchlist')
    }
  }

  const deleteWatchlist = async (watchlistId: string) => {
    if (!window.confirm('Delete this watchlist?')) return

    try {
      const res = await fetch(`/api/watchlists/${watchlistId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to delete watchlist')

      setWatchlists((prev) => prev.filter((w) => w.id !== watchlistId))
      onDeleteWatchlist?.(watchlistId)
    } catch (e: any) {
      setError(e.message || 'Failed to delete watchlist')
    }
  }

  const activateWatchlist = async (watchlist: Watchlist) => {
    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}/activate`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to activate watchlist')

      setWatchlists((prev) =>
        prev.map((w) => ({
          ...w,
          isActive: w.id === watchlist.id,
        }))
      )
      onActivateWatchlist?.({ ...watchlist, isActive: true })
      onSelectWatchlist({ ...watchlist, isActive: true })
    } catch (e: any) {
      setError(e.message || 'Failed to activate watchlist')
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Watchlists</h2>
        <p className="text-sm text-gray-500">Manage saved scans and portfolio views</p>
      </div>

      <div className="mb-4 space-y-2">
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="New watchlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={createWatchlist}
          disabled={creating}
        >
          Create watchlist
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {watchlists.length === 0 ? (
            <p className="text-sm text-gray-500">No watchlists yet</p>
          ) : (
            watchlists.map((w) => {
              const active = activeWatchlistId ? w.id === activeWatchlistId : w.isActive
              return (
                <div
                  key={w.id}
                  className={`rounded border p-3 text-sm ${
                    active ? 'border-black bg-gray-100' : 'border-gray-200'
                  }`}
                >
                  <button
                    className="mb-2 block w-full text-left font-medium"
                    onClick={() => onSelectWatchlist(w)}
                  >
                    {w.name}
                    {w.isActive ? ' • active' : ''}
                  </button>

                  <div className="flex gap-2">
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => activateWatchlist(w)}
                    >
                      Set active
                    </button>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => renameWatchlist(w.id)}
                    >
                      Rename
                    </button>
                    <button
                      className="rounded border px-2 py-1 text-xs text-red-600"
                      onClick={() => deleteWatchlist(w.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </aside>
  )
}