'use client'

import { useEffect, useState } from 'react'
import { getCompanyNames, getCompanyName } from '@/lib/companyNames'

interface MarketMover {
  ticker: string
  name: string
  price: number
  change_percent: number  // Backend returns 'change_percent', not 'change_pct'
  volume?: number | null
}

interface MarketMoversData {
  gainers: MarketMover[]
  losers: MarketMover[]
}

export default function MarketMovers() {
  const [data, setData] = useState<MarketMoversData | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyNamesLoaded, setCompanyNamesLoaded] = useState(false)

  useEffect(() => {
    // Load company names from SEC
    getCompanyNames().then(() => {
      setCompanyNamesLoaded(true)
    })

    // Load market movers data
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/public/market-movers`)
      .then(res => res.json())
      .then(data => {
        console.log('[MarketMovers] Received data:', data)
        if (data.gainers?.[0]) {
          console.log('[MarketMovers] First gainer sample:', data.gainers[0])
        }
        setData(data)
      })
      .catch(err => {
        console.error('[MarketMovers] Fetch error:', err)
        setData({ gainers: [], losers: [] })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #222200',
        borderRadius: '8px',
        padding: '1.5rem',
        fontFamily: 'Space Mono, monospace',
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#666', textAlign: 'center' }}>
          Loading market data...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid #222200',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(255, 102, 0, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#000000',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #222200',
      }}>
        <div style={{
          fontSize: '0.85rem',
          color: '#FF6600',
          fontWeight: 'bold',
          letterSpacing: '1px',
          fontFamily: 'Space Mono, monospace',
        }}>
          MARKET MOVERS
        </div>
      </div>

      {/* Single Column */}
      <div style={{
        padding: '1rem 1.5rem',
        flex: 1,
        overflowY: 'auto',
      }}>
        {/* Gainers */}
        <div style={{ color: '#00DD00', fontSize: '0.7rem', marginBottom: '0.4rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ▲ TOP GAINERS
        </div>
        {data?.gainers.slice(0, 5).map((mover) => {
          const companyName = getCompanyName(mover.ticker)
          return (
            <div key={mover.ticker} style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid #1a1a1a', gap: '0.5rem', minWidth: 0 }}>
              <span style={{ color: '#FF6600', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                {mover.ticker}
              </span>
              <span style={{ color: '#555', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {companyName}
              </span>
              <span style={{ color: '#00DD00', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, minWidth: '62px', textAlign: 'right' }}>
                +{(mover.change_percent ?? 0).toFixed(2)}%
              </span>
            </div>
          )
        })}

        {/* Losers */}
        <div style={{ color: '#FF4444', fontSize: '0.7rem', marginTop: '0.9rem', marginBottom: '0.4rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ▼ TOP LOSERS
        </div>
        {data?.losers.slice(0, 5).map((mover, idx) => {
          const companyName = getCompanyName(mover.ticker)
          return (
            <div key={mover.ticker} style={{ display: 'flex', alignItems: 'center', padding: '0.3rem 0', borderBottom: idx < 4 ? '1px solid #1a1a1a' : 'none', gap: '0.5rem', minWidth: 0 }}>
              <span style={{ color: '#FF6600', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                {mover.ticker}
              </span>
              <span style={{ color: '#555', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {companyName}
              </span>
              <span style={{ color: '#FF4444', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, minWidth: '62px', textAlign: 'right' }}>
                {(mover.change_percent ?? 0).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
