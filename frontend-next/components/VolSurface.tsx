'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
// Removed: import { useAiPanel } from '@/contexts/AiPanelContext' - AI panel no longer auto-opens
import { useUser } from '@/contexts/UserContext'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type VolData = {
  symbol: string
  current_price: number
  option_type: string
  x_strikes: number[]
  y_dtes: number[]
  z_iv: number[][]
  raw_points: { strike: number; dte: number; iv: number; option_type: string }[]
  n_raw: number
}

type OptionDetails = {
  strike: number
  dte: number
  iv: number
  underlying: string
  optionType: string
  currentPrice: number
}

type Watchlist = { id: string; name: string }

type Props = {
  symbol: string
  optionType?: string
}

export default function VolSurface({ symbol, optionType = 'call' }: Props) {
  const [data, setData] = useState<VolData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<OptionDetails | null>(null)
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('')
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)

  // Removed: triggerMessage and hasAi - AI panel no longer auto-opens

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    setData(null)

    fetch(`/api/scanner/vol-surface/${symbol}?option_type=otm`)
      .then(r => {
        console.log('[VOL-SURFACE] Response status:', r.status, r.ok)
        if (!r.ok) throw new Error('Surface loading error')
        return r.json()
      })
      .then(d => {
        console.log('[VOL-SURFACE] Data received:', d)
        console.log('[VOL-SURFACE] Data keys:', Object.keys(d))
        setData(d)
        // AI panel no longer opens automatically - user can ask Coiled AI about the surface manually
      })
      .catch(e => {
        console.error('[VOL-SURFACE] Error:', e)
        console.error('[VOL-SURFACE] Error stack:', e.stack)
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [symbol, optionType])

  // Load watchlists when modal opens
  useEffect(() => {
    if (selectedOption) {
      fetch('/api/watchlists')
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            setWatchlists(d.watchlists || [])
            const active = d.watchlists?.find((w: Watchlist) => w.isActive)
            if (active) setSelectedWatchlist(active.id)
          }
        })
        .catch(() => {})
    }
  }, [selectedOption])

  const handlePlotClick = useCallback((event: any) => {
    console.log('Plot clicked!', event)

    if (!event?.points?.[0] || !data) {
      console.log('No point data or surface data', { hasPoints: !!event?.points?.[0], hasData: !!data })
      return
    }

    const point = event.points[0]
    const clickedStrike = Number(point.x)
    const clickedDte = Number(point.y)
    const clickedIv = Number(point.z)

    // Trova il punto reale più vicino nel dataset raw_points
    let closestPoint = data.raw_points[0]
    let minDistance = Infinity

    for (const rawPoint of data.raw_points) {
      // Distanza euclidea normalizzata
      const strikeDistance = (rawPoint.strike - clickedStrike) / data.current_price
      const dteDistance = (rawPoint.dte - clickedDte) / 365
      const distance = Math.sqrt(strikeDistance * strikeDistance + dteDistance * dteDistance)

      if (distance < minDistance) {
        minDistance = distance
        closestPoint = rawPoint
      }
    }

    console.log('Closest real point found:', {
      strike: closestPoint.strike,
      dte: closestPoint.dte,
      iv: closestPoint.iv,
      optionType: closestPoint.option_type,
      underlyingPrice: data.current_price
    })

    // Fallback a 'call' se option_type non è definito
    const optionType = closestPoint.option_type || (closestPoint.strike >= data.current_price ? 'call' : 'put')

    setSelectedOption({
      strike: closestPoint.strike,
      dte: closestPoint.dte,
      iv: closestPoint.iv,
      underlying: data.symbol,
      optionType: optionType,  // Usa il tipo reale del punto (call o put)
      currentPrice: data.current_price,
    })
    setAddSuccess(false)
  }, [data])

  const addToWatchlist = async () => {
    if (!selectedOption || !selectedWatchlist) return

    setAddingToWatchlist(true)
    try {
      // Calcola expiration date approssimativa (oggi + DTE)
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + selectedOption.dte)

      const optionData = {
        symbol: `${selectedOption.underlying} ${expirationDate.toISOString().split('T')[0]} ${selectedOption.optionType[0]}${selectedOption.strike}`,
        underlyingSymbol: selectedOption.underlying,
        instrumentType: 'OPTION',
        optionSide: selectedOption.optionType.toUpperCase(),
        strike: selectedOption.strike,
        expirationDate: expirationDate.toISOString().split('T')[0],
        dte: selectedOption.dte,
        ivCurrent: selectedOption.iv,
      }

      const res = await fetch(`/api/watchlists/${selectedWatchlist}/items/bulk-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [optionData] }),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        setAddSuccess(true)
        setTimeout(() => {
          setSelectedOption(null)
          setAddSuccess(false)
        }, 2000)
      } else {
        throw new Error(json.error || 'Failed to add')
      }
    } catch (e) {
      console.error('Error adding to watchlist:', e)
    } finally {
      setAddingToWatchlist(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '48px', fontFamily: 'Courier New, monospace' }}>
        <span style={{ fontSize: '38.4px', color: bb.orange, animation: 'spin 1s linear infinite' }}>⟳</span>
        <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '1px' }}>
          BUILDING VOLATILITY SURFACE FOR <strong style={{ color: bb.white }}>{symbol}</strong>...
        </p>
        <p style={{ fontSize: '12px', color: bb.gray }}>
          DOWNLOADING ALL OPTION CHAINS AND INTERPOLATING TOTAL VARIANCE
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ border: `1px solid ${bb.red}`, backgroundColor: '#1a0000', padding: '12px 16px', fontSize: '13.2px', color: bb.red, fontFamily: 'Courier New, monospace' }}>
        ▶ ERROR: {error.toUpperCase()}
      </div>
    )
  }

  if (!data) return null

  const ivMin = Math.min(...data.z_iv.flat())
  const ivMax = Math.max(...data.z_iv.flat())
  const ivAvg = data.z_iv.flat().reduce((a, b) => a + b, 0) / data.z_iv.flat().length

  return (
    <>
      <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, fontFamily: 'Courier New, monospace' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${bb.orange}`, padding: '12px 16px' }}>
          <div>
            <h3 style={{ fontSize: '14.4px', fontWeight: 'bold', color: bb.yellow, letterSpacing: '2px' }}>
              VOLATILITY SURFACE — {data.symbol}
              <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'normal', color: bb.gray, letterSpacing: '1px' }}>
                {data.option_type === 'mixed' ? 'PUT IV (ITM) + CALL IV (OTM)' : data.option_type.toUpperCase()}
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: bb.gray, marginTop: '2px', letterSpacing: '0.5px' }}>
              CURRENT PRICE: <span style={{ color: bb.white }}>${data.current_price}</span>
              {' · '}
              {data.n_raw} RAW POINTS INTERPOLATED WITH TOTAL VARIANCE (CUBIC SPLINE)
              {' · '}
              <span style={{ color: bb.orange }}>CLICK ON SURFACE TO SEE OPTION DETAILS</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <Stat label="IV MIN" value={`${ivMin.toFixed(1)}%`} color={bb.green} />
            <Stat label="IV AVG" value={`${ivAvg.toFixed(1)}%`} color={bb.white} />
            <Stat label="IV MAX" value={`${ivMax.toFixed(1)}%`} color={bb.red} />
          </div>
        </div>

        {/* 3D Chart */}
        <div style={{ padding: '8px' }}>
          <Plot
            data={[
              {
                type: 'surface' as const,
                x: data.x_strikes,
                y: data.y_dtes,
                z: data.z_iv,
                colorscale: [
                  [0,    '#001a33'],
                  [0.2,  '#0066cc'],
                  [0.4,  '#00cccc'],
                  [0.55, '#66ff66'],
                  [0.7,  '#FFAA00'],
                  [0.85, '#FF6600'],
                  [1,    '#FF3333'],
                ],
                colorbar: {
                  title: { text: 'IV (%)', side: 'right' as const },
                  tickfont: { color: bb.white, size: 12 },
                  titlefont: { color: bb.white, size: 13 },
                  thickness: 15,
                },
                hovertemplate:
                  'STRIKE: $%{x:.2f}<br>' +
                  'DTE: %{y} DAYS<br>' +
                  'IV: %{z:.1f}%<br>' +
                  '<extra>CLICK FOR DETAILS</extra>',
                contours: {
                  z: {
                    show: true,
                    usecolormap: true,
                    highlightcolor: '#fff',
                    project: { z: true },
                  },
                },
                opacity: 0.92,
              } as never,
            ]}
            layout={{
              width: undefined,
              height: 520,
              autosize: true,
              paper_bgcolor: bb.bg,
              plot_bgcolor: bb.bg,
              margin: { l: 0, r: 60, t: 20, b: 0 },
              scene: {
                bgcolor: bb.bg,
                xaxis: {
                  title: { text: 'STRIKE PRICE ($)', font: { color: bb.white, size: 13 } },
                  tickfont: { color: bb.white, size: 11 },
                  gridcolor: bb.border2,
                  zerolinecolor: bb.white,
                  showline: true,
                  linecolor: bb.white,
                  linewidth: 2,
                },
                yaxis: {
                  title: { text: 'DTE (DAYS)', font: { color: bb.white, size: 13 } },
                  tickfont: { color: bb.white, size: 11 },
                  gridcolor: bb.border2,
                  zerolinecolor: bb.white,
                  showline: true,
                  linecolor: bb.white,
                  linewidth: 2,
                },
                zaxis: {
                  title: { text: 'IV (%)', font: { color: bb.white, size: 13 } },
                  tickfont: { color: bb.white, size: 11 },
                  gridcolor: bb.border2,
                  zerolinecolor: bb.white,
                  showline: true,
                  linecolor: bb.white,
                  linewidth: 2,
                },
                camera: {
                  eye: { x: 1.5, y: -1.5, z: 0.8 },
                },
              },
              font: { color: bb.white, family: 'Courier New, monospace' },
            } as never}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'] as never[],
              displaylogo: false,
              scrollZoom: true,
            }}
            style={{ width: '100%', cursor: 'pointer' }}
            useResizeHandler
            onClick={(event: any) => {
              console.log('onClick fired:', event)
              handlePlotClick(event)
            }}
            onClickAnnotation={(event: any) => {
              console.log('onClickAnnotation fired:', event)
              handlePlotClick(event)
            }}
            onSelected={(event: any) => {
              console.log('onSelected fired:', event)
              if (event?.points?.[0]) {
                handlePlotClick(event)
              }
            }}
            onInitialized={(figure: any, graphDiv: any) => {
              console.log('Plot initialized, attaching click listener')
              if (graphDiv) {
                graphDiv.on('plotly_click', (eventData: any) => {
                  console.log('plotly_click via onInitialized:', eventData)
                  handlePlotClick(eventData)
                })
              }
            }}
          />
        </div>

        {/* Legend */}
        <div style={{ borderTop: `1px solid ${bb.border}`, padding: '12px 16px' }}>
          <p style={{ fontSize: '12px', color: bb.gray, letterSpacing: '0.5px' }}>
            <span style={{ color: bb.green, fontWeight: 'bold' }}>BLUE</span> = COMPRESSED IV (IDEAL COILED SPRING ZONE) ·{' '}
            <span style={{ color: bb.red, fontWeight: 'bold' }}>RED</span> = HIGH IV (EXPENSIVE OPTIONS) ·{' '}
            INTERACT: ROTATE, ZOOM, HOVER FOR VALUES, <span style={{ color: bb.orange, fontWeight: 'bold' }}>CLICK TO ADD TO WATCHLIST</span>.
            TOTAL VARIANCE INTERPOLATION W = σ²×T (CUBIC SPLINE).
          </p>
        </div>
      </div>

      {/* Option Details Modal */}
      {selectedOption && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', fontFamily: 'Courier New, monospace' }}
          onClick={() => setSelectedOption(null)}>
          <div style={{ width: '100%', maxWidth: '500px', border: `2px solid ${bb.orange}`, backgroundColor: bb.bg, color: bb.white }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ borderBottom: `2px solid ${bb.orange}`, padding: '16px 20px' }}>
              <h3 style={{ fontSize: '16.8px', fontWeight: 'bold', color: bb.orange, letterSpacing: '2px', marginBottom: '4px' }}>
                OPTION DETAILS
              </h3>
              <p style={{ fontSize: '12px', color: bb.gray, letterSpacing: '1px' }}>
                {selectedOption.underlying} · {selectedOption.optionType.toUpperCase()}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <DetailBox
                  label="STRIKE PRICE"
                  value={`$${selectedOption.strike.toFixed(2)}`}
                  color={bb.orange}
                />
                <DetailBox
                  label="EXPIRATION DATE"
                  value={(() => {
                    const expDate = new Date()
                    expDate.setDate(expDate.getDate() + Math.round(selectedOption.dte))
                    return expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  })()}
                />
                <DetailBox label="DTE (DAYS)" value={`${Math.round(selectedOption.dte)}`} />
                <DetailBox
                  label="IMPLIED VOL"
                  value={`${selectedOption.iv.toFixed(1)}%`}
                  color={selectedOption.iv < 25 ? bb.green : selectedOption.iv > 40 ? bb.red : bb.amber}
                />
                <DetailBox
                  label="UNDERLYING PRICE"
                  value={`$${selectedOption.currentPrice.toFixed(2)}`}
                />
                <DetailBox
                  label="MONEYNESS"
                  value={selectedOption.strike > selectedOption.currentPrice ? 'OTM' : selectedOption.strike < selectedOption.currentPrice ? 'ITM' : 'ATM'}
                  color={selectedOption.strike > selectedOption.currentPrice ? bb.amber : bb.green}
                />
                <DetailBox
                  label="DISTANCE FROM ATM"
                  value={`${((selectedOption.strike / selectedOption.currentPrice - 1) * 100).toFixed(1)}%`}
                  color={(selectedOption.strike / selectedOption.currentPrice - 1) > 0 ? bb.amber : bb.white}
                />
              </div>

              {addSuccess && (
                <div style={{ border: `1px solid ${bb.green}`, backgroundColor: '#001a00', padding: '12px', fontSize: '12px', color: bb.green, textAlign: 'center', letterSpacing: '1px' }}>
                  ✓ SUCCESSFULLY ADDED TO WATCHLIST
                </div>
              )}

              {/* Watchlist Selection */}
              <div style={{ borderTop: `1px solid ${bb.border}`, paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '10.8px', color: bb.gray, marginBottom: '8px', letterSpacing: '1px' }}>
                  SELECT WATCHLIST
                </label>
                <select
                  value={selectedWatchlist}
                  onChange={e => setSelectedWatchlist(e.target.value)}
                  style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '8px 12px', fontSize: '13.2px', fontFamily: 'inherit', marginBottom: '12px' }}>
                  <option value="">— SELECT WATCHLIST —</option>
                  {watchlists.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedOption(null)}
                    style={{ flex: 1, border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '10px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer' }}>
                    CANCEL
                  </button>
                  <button
                    onClick={addToWatchlist}
                    disabled={!selectedWatchlist || addingToWatchlist || addSuccess}
                    style={{
                      flex: 1,
                      backgroundColor: (!selectedWatchlist || addingToWatchlist || addSuccess) ? bb.border2 : bb.orange,
                      color: '#000',
                      border: 'none',
                      padding: '10px',
                      fontSize: '13.2px',
                      fontFamily: 'inherit',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      cursor: (!selectedWatchlist || addingToWatchlist || addSuccess) ? 'not-allowed' : 'pointer'
                    }}>
                    {addingToWatchlist ? 'ADDING...' : addSuccess ? '✓ ADDED' : '+ ADD TO WATCHLIST'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: bb.gray, fontSize: '10.8px', letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontWeight: 'bold', color, fontSize: '13.2px' }}>{value}</p>
    </div>
  )
}

function DetailBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: `1px solid ${bb.border}`, backgroundColor: bb.panel, padding: '12px' }}>
      <p style={{ fontSize: '10.8px', color: bb.gray, letterSpacing: '1px', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '14.4px', fontWeight: 'bold', color: color || bb.white }}>{value}</p>
    </div>
  )
}
