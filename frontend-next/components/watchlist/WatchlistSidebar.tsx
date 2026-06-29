'use client'

import { useEffect, useState } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type Watchlist = { id: string; name: string; isActive: boolean; createdAt?: string }

type Props = {
  userId: string
  activeWatchlistId?: string | null
  onSelectWatchlist: (w: Watchlist) => void
  onCreateWatchlist?: (w: Watchlist) => void
  onRenameWatchlist?: (w: Watchlist) => void
  onDeleteWatchlist?: (id: string) => void
  onActivateWatchlist?: (w: Watchlist) => void
}

export default function WatchlistSidebar({
  userId, activeWatchlistId, onSelectWatchlist, onCreateWatchlist,
  onRenameWatchlist, onDeleteWatchlist, onActivateWatchlist,
}: Props) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/watchlists')
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json.error || 'Failed')
        const wls: Watchlist[] = json.watchlists || []
        setWatchlists(wls)
        // Ripristina l'ultima watchlist visualizzata (localStorage ha priorità su isActive)
        let toSelect: Watchlist | undefined
        try {
          const lastId = localStorage.getItem('last_watchlist_id')
          toSelect = lastId ? wls.find(w => w.id === lastId) : undefined
        } catch {}
        if (!toSelect) toSelect = wls.find(w => w.isActive)
        if (toSelect) onSelectWatchlist(toSelect)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally { setLoading(false) }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Load only once on mount

  const createWatchlist = async () => {
    const trimmed = name.trim(); if (!trimmed) return
    setCreating(true)
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, userId }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed')
      setWatchlists(prev => [...prev, json.watchlist]); setName('')
      onCreateWatchlist?.(json.watchlist)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setCreating(false) }
  }

  const renameWatchlist = async (id: string) => {
    const current = watchlists.find(w => w.id === id)
    const n = window.prompt('New name', current?.name ?? ''); if (!n?.trim()) return
    try {
      const res = await fetch(`/api/watchlists/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n.trim() }) })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error)
      setWatchlists(prev => prev.map(w => w.id === id ? json.watchlist : w))
      onRenameWatchlist?.(json.watchlist)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
  }

  const deleteWatchlist = async (id: string) => {
    if (!window.confirm('DELETE watchlist?')) return
    try {
      const res = await fetch(`/api/watchlists/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error)
      setWatchlists(prev => prev.filter(w => w.id !== id)); onDeleteWatchlist?.(id)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
  }

  const activateWatchlist = async (w: Watchlist) => {
    try {
      const res = await fetch(`/api/watchlists/${w.id}/activate`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error)
      setWatchlists(prev => prev.map(x => ({ ...x, isActive: x.id === w.id })))
      try { localStorage.setItem('last_watchlist_id', w.id) } catch {}
      onActivateWatchlist?.({ ...w, isActive: true }); onSelectWatchlist({ ...w, isActive: true })
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
  }

  return (
    <aside style={{ backgroundColor: bb.bg, borderRight: `1px solid ${bb.border2}`, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Courier New, monospace', fontSize: '14.4px' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${bb.orange}`, padding: '8px 12px', backgroundColor: bb.surface }}>
        <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', fontWeight: 'bold' }}>WATCHLISTS</div>
        <div style={{ color: bb.gray, fontSize: '12px', marginTop: '2px' }}>LEAPS PORTFOLIO TRACKER</div>
      </div>

      {/* Create new */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${bb.border}` }}>
        <div style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px', marginBottom: '4px' }}>NEW WATCHLIST</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            placeholder="NAME..." value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createWatchlist()}
            style={{ flex: 1, backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '4px 6px', fontSize: '14.4px', fontFamily: 'inherit' }}
          />
          <button onClick={createWatchlist} disabled={creating}
            style={{ backgroundColor: bb.orange, color: '#000', border: 'none', padding: '4px 8px', fontFamily: 'inherit', fontSize: '13.2px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' }}>
            ADD
          </button>
        </div>
      </div>

      {error && <div style={{ color: bb.red, fontSize: '13.2px', padding: '6px 12px', borderBottom: `1px solid ${bb.border}` }}>▶ {error}</div>}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading ? (
          <div style={{ color: bb.gray, padding: '8px 12px', fontSize: '13.2px' }}>LOADING...</div>
        ) : watchlists.length === 0 ? (
          <div style={{ color: bb.gray, padding: '8px 12px', fontSize: '13.2px' }}>NO WATCHLISTS FOUND</div>
        ) : watchlists.map(w => {
          const isActive = activeWatchlistId ? w.id === activeWatchlistId : w.isActive
          return (
            <div key={w.id} style={{
              borderLeft: isActive ? `3px solid ${bb.orange}` : `3px solid transparent`,
              backgroundColor: isActive ? bb.panel : 'transparent',
              borderBottom: `1px solid ${bb.border}`,
              padding: '8px 12px',
            }}>
              <button onClick={() => { try { localStorage.setItem('last_watchlist_id', w.id) } catch {} onSelectWatchlist(w) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: isActive ? bb.orange : bb.white, fontSize: '14.4px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', letterSpacing: '1px', padding: 0, marginBottom: '6px' }}>
                {isActive ? '▶ ' : '  '}{w.name.toUpperCase()}{w.isActive ? ' [ACTIVE]' : ''}
              </button>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['ACT', 'REN', 'DEL'].map((action, i) => (
                  <button key={action} onClick={() => i === 0 ? activateWatchlist(w) : i === 1 ? renameWatchlist(w.id) : deleteWatchlist(w.id)}
                    style={{ border: `1px solid ${i === 2 ? bb.red : bb.border2}`, backgroundColor: 'transparent', color: i === 2 ? bb.red : bb.gray, padding: '1px 6px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
