'use client'

import { useEffect, useState } from 'react'

const colors = {
  bg: '#000000',
  surface: '#0a0a0a',
  border: '#222200',
  orange: '#FF6600',
  orangeHover: '#FF8833',
  white: '#FFFFFF',
  gray: '#CCCCCC',
  darkGray: '#666666',
}

type VixDataPoint = {
  date: string
  close: number
}

export default function VixChart() {
  const [vixData, setVixData] = useState<VixDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentVix, setCurrentVix] = useState<number | null>(null)

  useEffect(() => {
    console.log('[VixChart] Component mounted, environment:', typeof window !== 'undefined' ? 'browser' : 'server')

    // Skip fetch during SSR
    if (typeof window === 'undefined') {
      console.log('[VixChart] Skipping fetch - SSR environment')
      return
    }

    console.log('[VixChart] Fetching VIX data from backend...')
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/public/vix-data`)
      .then(r => {
        console.log('[VixChart] Response status:', r.status, r.ok)
        if (!r.ok) throw new Error(`Failed to fetch VIX data: ${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(result => {
        console.log('[VixChart] Received result:', result)
        console.log('[VixChart] Result.data type:', typeof result.data, Array.isArray(result.data))
        console.log('[VixChart] Result.data length:', result.data?.length)

        // Log first 3 raw data points for debugging
        if (result.data && result.data.length > 0) {
          console.log('[VixChart] First 3 raw points:', result.data.slice(0, 3))
        }

        // Validate response structure
        if (!result || !result.data || !Array.isArray(result.data)) {
          console.error('[VixChart] Invalid response format:', result)
          throw new Error('Invalid response format: expected { data: [...] }')
        }

        if (result.data.length === 0) {
          console.warn('[VixChart] Backend returned empty data array')
          throw new Error('No VIX data available')
        }

        // Map and clean data - accept any numeric close value and non-empty date
        const mappedData = result.data.map((d: any, idx: number) => {
          const point = {
            date: String(d.date || ''),
            close: parseFloat(d.close)
          }

          // Debug first few points and any problematic ones
          if (idx < 3 || isNaN(point.close) || !point.date) {
            console.log(`[VixChart] Point ${idx}:`, {
              raw: d,
              mapped: point,
              closeIsNaN: isNaN(point.close),
              dateEmpty: !point.date
            })
          }

          return point
        })

        console.log('[VixChart] Mapped data length:', mappedData.length)

        // Simple filter: just check close is a valid number and date exists
        const cleanData = mappedData.filter((d: VixDataPoint) => {
          const isValid = !isNaN(d.close) && d.date.length > 0
          return isValid
        })

        console.log('[VixChart] Clean data length:', cleanData.length)
        if (cleanData.length > 0) {
          console.log('[VixChart] First point:', cleanData[0])
          console.log('[VixChart] Last point:', cleanData[cleanData.length - 1])
        } else {
          console.error('[VixChart] All data points filtered out - check data format')
          throw new Error('All data points were invalid')
        }

        setVixData(cleanData)
        if (cleanData.length > 0) {
          setCurrentVix(cleanData[cleanData.length - 1].close)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('[VixChart] Error fetching VIX data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          color: colors.gray,
          fontSize: '0.95rem',
        }}>
          Loading VIX data...
        </div>
      </div>
    )
  }

  if (error || vixData.length === 0) {
    return (
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          color: colors.darkGray,
          fontSize: '0.95rem',
        }}>
          Unable to load VIX data
        </div>
      </div>
    )
  }

  const maxVix = Math.max(...vixData.map(d => d.close))
  const minVix = Math.min(...vixData.map(d => d.close))
  const range = maxVix - minVix
  const padding = range * 0.1

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: `0 4px 16px rgba(255, 102, 0, 0.1)`,
    }}>
      {/* Header */}
      <div style={{
        background: colors.bg,
        padding: '1rem 1.5rem',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: '0.85rem',
          color: colors.orange,
          fontWeight: 'bold',
          letterSpacing: '1px',
          fontFamily: 'Space Mono, monospace',
        }}>
          LIVE VIX (VOLATILITY INDEX)
        </div>
        {currentVix !== null && (
          <div style={{
            fontSize: '1.5rem',
            color: colors.white,
            fontWeight: 'bold',
            fontFamily: 'Space Mono, monospace',
          }}>
            {currentVix.toFixed(2)}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{
        padding: '1.5rem',
        height: '300px',
        position: 'relative',
      }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 250"
          preserveAspectRatio="none"
          style={{
            display: 'block',
          }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <line
              key={percent}
              x1="0"
              x2="600"
              y1={250 - (percent * 2.5)}
              y2={250 - (percent * 2.5)}
              stroke={colors.border}
              strokeWidth="1"
            />
          ))}

          {/* VIX Line */}
          <polyline
            points={vixData.map((d, i) => {
              const x = (i / (vixData.length - 1)) * 600
              const normalizedValue = ((d.close - minVix + padding) / (range + 2 * padding)) * 250
              const y = 250 - normalizedValue
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke={colors.orange}
            strokeWidth="2"
          />

          {/* Area under line */}
          <polygon
            points={
              vixData.map((d, i) => {
                const x = (i / (vixData.length - 1)) * 600
                const normalizedValue = ((d.close - minVix + padding) / (range + 2 * padding)) * 250
                const y = 250 - normalizedValue
                return `${x},${y}`
              }).join(' ') + ' 600,250 0,250'
            }
            fill="url(#vixGradient)"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="vixGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.orange} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.orange} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: colors.darkGray,
      }}>
        <span>1-year trailing</span>
        <span>
          Range: {minVix.toFixed(2)} - {maxVix.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
