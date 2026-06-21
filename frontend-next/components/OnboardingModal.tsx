'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const bb = {
  bg: '#000000',
  surface: '#111100',
  border: '#FF6B00',
  orange: '#FF6B00',
  amber: '#FFAA00',
  white: '#CCCCCC',
  gray: '#FFFFFF',
}

export default function OnboardingModal() {
  const [show, setShow] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if onboarding was already completed
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('onboarding_completed')
      if (!completed || completed !== 'true') {
        setShow(true)
      }
    }
  }, [])

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_completed', 'true')
    }
    setShow(false)
    router.push('/scanner')
  }

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'Courier New, monospace',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: bb.surface,
          border: `2px solid ${bb.border}`,
          maxWidth: '600px',
          width: '100%',
          padding: '32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2
            style={{
              color: bb.orange,
              fontSize: '24px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '8px',
            }}
          >
            WELCOME TO COILED SPRING
          </h2>
          <p
            style={{
              color: bb.white,
              fontSize: '14.4px',
              letterSpacing: '0.5px',
            }}
          >
            Your antifragile options terminal is ready.
          </p>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: '32px' }}>
          {/* Step 1 */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  backgroundColor: bb.orange,
                  color: bb.bg,
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                STEP 1
              </span>
              <span
                style={{
                  color: bb.orange,
                  fontSize: '16.8px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                SCAN
              </span>
            </div>
            <p
              style={{
                color: bb.white,
                fontSize: '13.2px',
                lineHeight: '1.6',
                paddingLeft: '20px',
              }}
            >
              Go to Scanner → select an asset class and ticker → Run Scanner to
              find LEAPS with compressed volatility.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  backgroundColor: bb.orange,
                  color: bb.bg,
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                STEP 2
              </span>
              <span
                style={{
                  color: bb.orange,
                  fontSize: '16.8px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                ANALYZE
              </span>
            </div>
            <p
              style={{
                color: bb.white,
                fontSize: '13.2px',
                lineHeight: '1.6',
                paddingLeft: '20px',
              }}
            >
              Check Delta (0.20-0.45), IV Rank (&lt;30 ideal), and the
              Volatility Surface 3D to confirm compression.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  backgroundColor: bb.orange,
                  color: bb.bg,
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                STEP 3
              </span>
              <span
                style={{
                  color: bb.orange,
                  fontSize: '16.8px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                ACT
              </span>
            </div>
            <p
              style={{
                color: bb.white,
                fontSize: '13.2px',
                lineHeight: '1.6',
                paddingLeft: '20px',
              }}
            >
              Add the best contracts to your Watchlist and size your position
              with conviction.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: bb.orange,
              color: bb.bg,
              border: 'none',
              padding: '12px 32px',
              fontSize: '14.4px',
              fontFamily: 'inherit',
              fontWeight: 'bold',
              letterSpacing: '1px',
              cursor: 'pointer',
              width: '100%',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = bb.amber)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = bb.orange)
            }
          >
            START TRADING →
          </button>
        </div>
      </div>
    </div>
  )
}
