'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'

// ── Palette terminale ─────────────────────────────────────────────────────────
const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#888888',
  redBg: '#1a0000', orangeBg: '#1a0800', greenBg: '#001a00',
}

// ── Tipi ──────────────────────────────────────────────────────────────────────
type HVRow = {
  ticker: string
  company_name: string | null
  hv30: number | null
  hv_rank: number | null
  hv_percentile: number | null
  hv_52w_high: number | null
  hv_52w_low: number | null
  computed_at: string | null
}

type SortKey = 'ticker' | 'hv30' | 'hv_rank' | 'hv_percentile' | 'hv_52w_high' | 'hv_52w_low'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────
function hvRankColor(rank: number | null): string {
  if (rank === null) return bb.gray
  if (rank >= 80) return bb.red
  if (rank >= 50) return bb.amber
  return bb.green
}

function hvRankBg(rank: number | null): string {
  if (rank === null) return 'transparent'
  if (rank >= 80) return bb.redBg
  if (rank >= 50) return bb.orangeBg
  return bb.greenBg
}

function fmt(v: number | null, decimals = 1): string {
  return v === null ? '—' : v.toFixed(decimals)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const PAGE_SIZE = 50

// ── Componente principale ─────────────────────────────────────────────────────
function HVScreenerContent() {
  const router = useRouter()

  // Dati
  const [allData, setAllData] = useState<HVRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)

  // Filtri (client-side per reattività immediata)
  const [search, setSearch] = useState('')
  const [hvRankMin, setHvRankMin] = useState('')
  const [hvRankMax, setHvRankMax] = useState('')
  const [hvPctMin, setHvPctMin] = useState('')
  const [hvPctMax, setHvPctMax] = useState('')
  const [hv30Min, setHv30Min] = useState('')
  const [hv30Max, setHv30Max] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('hv_rank')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Paginazione
  const [page, setPage] = useState(1)

  // ── Fetch dati ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/hv-screener?sort_by=${sortKey}&sort_dir=${sortDir}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setAllData(json.data ?? [])
      setComputedAt(json.computed_at ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }, [sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset pagina sui filtri
  useEffect(() => { setPage(1) }, [search, hvRankMin, hvRankMax, hvPctMin, hvPctMax, hv30Min, hv30Max])

  // ── Filtering client-side ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allData.filter(row => {
      if (search && !row.ticker.includes(search.toUpperCase())) return false
      if (hvRankMin !== '' && (row.hv_rank ?? 0) < parseFloat(hvRankMin)) return false
      if (hvRankMax !== '' && (row.hv_rank ?? 0) > parseFloat(hvRankMax)) return false
      if (hvPctMin !== '' && (row.hv_percentile ?? 0) < parseFloat(hvPctMin)) return false
      if (hvPctMax !== '' && (row.hv_percentile ?? 0) > parseFloat(hvPctMax)) return false
      if (hv30Min !== '' && (row.hv30 ?? 0) < parseFloat(hv30Min)) return false
      if (hv30Max !== '' && (row.hv30 ?? 0) > parseFloat(hv30Max)) return false
      return true
    })
  }, [allData, search, hvRankMin, hvRankMax, hvPctMin, hvPctMax, hv30Min, hv30Max])

  // ── Client-side sort ────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number)
    })
  }, [filtered, sortKey, sortDir])

  // Paginazione
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Sort click ──────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' ⇅'
    return sortDir === 'desc' ? ' ▼' : ' ▲'
  }

  // ── Clear filtri ────────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch('')
    setHvRankMin(''); setHvRankMax('')
    setHvPctMin(''); setHvPctMax('')
    setHv30Min(''); setHv30Max('')
    setPage(1)
  }

  const hasFilters = search || hvRankMin || hvRankMax || hvPctMin || hvPctMax || hv30Min || hv30Max

  // ── Style helpers ────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    backgroundColor: bb.panel,
    border: `1px solid ${bb.border2}`,
    color: bb.white,
    fontFamily: 'Courier New, monospace',
    fontSize: '12px',
    padding: '3px 6px',
    width: '64px',
  }

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '6px 10px',
    textAlign: key === 'ticker' ? 'left' : 'right',
    color: sortKey === key ? bb.orange : bb.amber,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${bb.border}`,
    fontSize: '11px',
    letterSpacing: '0.5px',
    userSelect: 'none',
  })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', fontFamily: 'Courier New, monospace', color: bb.white }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${bb.orange}`,
        padding: '10px 16px',
        backgroundColor: bb.surface,
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ color: bb.orange, fontWeight: 'bold', fontSize: '15px', letterSpacing: '2px' }}>
            HV SCREENER
          </span>
          <span style={{ color: bb.gray, fontSize: '11px', marginLeft: '10px' }}>
            Historical Volatility — all underlyings
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {computedAt && (
          <span style={{ color: bb.gray, fontSize: '10px' }}>
            Updated: {fmtDate(computedAt)}
          </span>
        )}
        <button
          onClick={fetchData}
          style={{
            backgroundColor: 'transparent', color: bb.amber,
            border: `1px solid ${bb.border2}`, padding: '3px 10px',
            fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = bb.orange)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = bb.border2)}
        >
          ↺ REFRESH
        </button>
      </div>

      {/* Legenda colori */}
      <div style={{
        padding: '6px 16px', backgroundColor: bb.panel,
        borderBottom: `1px solid ${bb.border}`,
        display: 'flex', gap: '16px', fontSize: '10px', flexWrap: 'wrap',
      }}>
        <span style={{ color: bb.gray }}>HV RANK:</span>
        <span style={{ color: bb.red }}>● ≥ 80 HIGH</span>
        <span style={{ color: bb.amber }}>● 50–79 MED</span>
        <span style={{ color: bb.green }}>● &lt; 50 LOW</span>
        <span style={{ color: bb.gray, marginLeft: '16px', fontSize: '9px' }}>
          HV Rank = where current volatility sits within the 52-week range (0=historical low, 100=historical high)
        </span>
      </div>

      {/* Filtri */}
      <div style={{
        padding: '10px 16px', backgroundColor: bb.surface,
        borderBottom: `1px solid ${bb.border}`,
        display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: bb.gray, fontSize: '11px' }}>TICKER</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="AAPL..."
            style={{ ...inputStyle, width: '80px', textTransform: 'uppercase' }}
          />
        </div>

        {/* HV30 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: bb.gray, fontSize: '11px' }}>HV30%</span>
          <input value={hv30Min} onChange={e => setHv30Min(e.target.value)} placeholder="min" style={inputStyle} />
          <span style={{ color: bb.gray }}>–</span>
          <input value={hv30Max} onChange={e => setHv30Max(e.target.value)} placeholder="max" style={inputStyle} />
        </div>

        {/* HV Rank */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: bb.gray, fontSize: '11px' }}>HV RANK</span>
          <input value={hvRankMin} onChange={e => setHvRankMin(e.target.value)} placeholder="min" style={inputStyle} />
          <span style={{ color: bb.gray }}>–</span>
          <input value={hvRankMax} onChange={e => setHvRankMax(e.target.value)} placeholder="max" style={inputStyle} />
        </div>

        {/* HV Percentile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: bb.gray, fontSize: '11px' }}>HV PCT</span>
          <input value={hvPctMin} onChange={e => setHvPctMin(e.target.value)} placeholder="min" style={inputStyle} />
          <span style={{ color: bb.gray }}>–</span>
          <input value={hvPctMax} onChange={e => setHvPctMax(e.target.value)} placeholder="max" style={inputStyle} />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              backgroundColor: 'transparent', color: bb.red,
              border: `1px solid ${bb.red}`, padding: '3px 8px',
              fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✕ RESET
          </button>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ color: bb.gray, fontSize: '11px' }}>
          {loading ? 'Loading...' : `${filtered.length} tickers`}
          {hasFilters && allData.length > 0 && ` / ${allData.length} total`}
        </span>
      </div>

      {/* Errore */}
      {error && (
        <div style={{ padding: '20px 16px', color: bb.red, fontSize: '13px' }}>
          ⚠ {error}
          {error.includes('empty') || error.includes('data') ? (
            <div style={{ color: bb.gray, fontSize: '11px', marginTop: '8px' }}>
              The daily job (17:00 UTC) will populate the table on the next run.
              For local testing, trigger the refresh manually via the backend.
            </div>
          ) : null}
        </div>
      )}

      {/* Tabella */}
      {!error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '12.5px', tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: bb.panel }}>
                <th style={thStyle('ticker')} onClick={() => handleSort('ticker')}>
                  TICKER{sortIcon('ticker')}
                </th>
                <th style={{ ...thStyle('ticker'), textAlign: 'left', cursor: 'default', color: bb.gray }}>
                  NOME
                </th>
                <th style={thStyle('hv30')} onClick={() => handleSort('hv30')}>
                  HV 30D %{sortIcon('hv30')}
                </th>
                <th style={thStyle('hv_rank')} onClick={() => handleSort('hv_rank')}>
                  HV RANK{sortIcon('hv_rank')}
                </th>
                <th style={thStyle('hv_percentile')} onClick={() => handleSort('hv_percentile')}>
                  HV PCT{sortIcon('hv_percentile')}
                </th>
                <th style={thStyle('hv_52w_high')} onClick={() => handleSort('hv_52w_high')}>
                  52W MAX{sortIcon('hv_52w_high')}
                </th>
                <th style={thStyle('hv_52w_low')} onClick={() => handleSort('hv_52w_low')}>
                  52W MIN{sortIcon('hv_52w_low')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: bb.gray }}>
                    Loading HV data...
                  </td>
                </tr>
              )}
              {!loading && pageData.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: bb.gray }}>
                    {allData.length === 0
                      ? 'No data available — the daily job has not run yet.'
                      : 'No tickers match the current filters.'}
                  </td>
                </tr>
              )}
              {!loading && pageData.map((row, i) => {
                const rankColor = hvRankColor(row.hv_rank)
                const rankBg = hvRankBg(row.hv_rank)
                const isEven = i % 2 === 0
                return (
                  <tr
                    key={row.ticker}
                    style={{
                      backgroundColor: isEven ? bb.bg : bb.surface,
                      borderBottom: `1px solid ${bb.border}`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0d0d00')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? bb.bg : bb.surface)}
                    onClick={() => router.push(`/scanner/opportunity/${row.ticker}`)}
                    title={`Open ${row.ticker} analysis`}
                  >
                    {/* Ticker */}
                    <td style={{ padding: '6px 10px', color: bb.amber, fontWeight: 'bold', letterSpacing: '0.5px' }}>
                      {row.ticker}
                    </td>
                    {/* Nome */}
                    <td style={{ padding: '6px 10px', color: bb.gray, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.company_name ?? ''}
                    </td>
                    {/* HV30 */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: bb.white }}>
                      {fmt(row.hv30)}%
                    </td>
                    {/* HV Rank */}
                    <td style={{ padding: '4px 10px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: rankBg,
                        color: rankColor,
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        border: `1px solid ${rankColor}`,
                        minWidth: '44px',
                        textAlign: 'center',
                        fontSize: '12px',
                      }}>
                        {fmt(row.hv_rank)}
                      </span>
                    </td>
                    {/* HV Percentile */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: hvRankColor(row.hv_percentile) }}>
                      {fmt(row.hv_percentile)}%
                    </td>
                    {/* 52w High */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: bb.red, fontSize: '11px' }}>
                      {fmt(row.hv_52w_high)}%
                    </td>
                    {/* 52w Low */}
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: bb.green, fontSize: '11px' }}>
                      {fmt(row.hv_52w_low)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginazione */}
      {!loading && !error && totalPages > 1 && (
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${bb.border}`,
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: bb.surface, fontSize: '12px',
        }}>
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            style={{
              backgroundColor: 'transparent', color: page === 1 ? bb.gray : bb.amber,
              border: `1px solid ${page === 1 ? bb.border : bb.border2}`,
              padding: '2px 8px', cursor: page === 1 ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: '11px',
            }}
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              backgroundColor: 'transparent', color: page === 1 ? bb.gray : bb.amber,
              border: `1px solid ${page === 1 ? bb.border : bb.border2}`,
              padding: '2px 8px', cursor: page === 1 ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: '11px',
            }}
          >‹</button>

          <span style={{ color: bb.gray, padding: '0 8px' }}>
            Page {page} / {totalPages} — {sorted.length} tickers
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              backgroundColor: 'transparent', color: page === totalPages ? bb.gray : bb.amber,
              border: `1px solid ${page === totalPages ? bb.border : bb.border2}`,
              padding: '2px 8px', cursor: page === totalPages ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: '11px',
            }}
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            style={{
              backgroundColor: 'transparent', color: page === totalPages ? bb.gray : bb.amber,
              border: `1px solid ${page === totalPages ? bb.border : bb.border2}`,
              padding: '2px 8px', cursor: page === totalPages ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: '11px',
            }}
          >»</button>

          {/* Jump to page */}
          <span style={{ color: bb.gray, marginLeft: '8px', fontSize: '11px' }}>Go to:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={page}
            key={page}
            onBlur={e => {
              const v = parseInt(e.target.value)
              if (!isNaN(v)) setPage(Math.max(1, Math.min(totalPages, v)))
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const v = parseInt((e.target as HTMLInputElement).value)
                if (!isNaN(v)) setPage(Math.max(1, Math.min(totalPages, v)))
              }
            }}
            style={{
              ...{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.white },
              fontFamily: 'inherit', fontSize: '11px', padding: '2px 4px', width: '44px',
            }}
          />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px 16px', color: bb.gray, fontSize: '10px', borderTop: `1px solid ${bb.border}` }}>
        HV computed from daily closing prices (log returns, 30-day window, annualized ×√252).
        Data updated once daily after US market close (17:00 UTC).
        Click any ticker to open its Opportunity analysis.
      </div>
    </div>
  )
}

// ── Export con ProtectedRoute ─────────────────────────────────────────────────
export default function HVScreenerPage() {
  return (
    <ProtectedRoute>
      <HVScreenerContent />
    </ProtectedRoute>
  )
}
                                                                                            