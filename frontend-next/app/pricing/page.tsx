'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type PlanKey = 'free' | 'pro' | 'pro_byok'

const PLANS: Record<PlanKey, {
  name: string
  price: string
  desc: string
  features: string[]
  badge: string
  bgColor: string
  ctaLabel: string
}> = {
  free: {
    name: 'FREE',
    price: '$0',
    desc: 'SCANNER ONLY',
    features: [
      'OPTIONS SCANNER',
      'LEAPS OPTIONS DISCOVERY',
      'BASIC GREEKS (DELTA, VEGA, THETA)',
      'IV RANK FILTERING',
      'NO AI CHAT',
      'NO PORTFOLIO TRACKING',
    ],
    badge: 'FREE',
    bgColor: bb.border2,
    ctaLabel: 'CURRENT PLAN',
  },
  pro: {
    name: 'PRO',
    price: '$29',
    desc: 'AI INCLUDED',
    features: [
      'EVERYTHING IN FREE',
      'COILED AI CHAT (50 QUERIES/DAY)',
      'OPTIONS SCANNER WITH AI',
      'REAL-TIME PORTFOLIO TRACKING',
      'WATCHLIST MANAGEMENT',
      'BROKER INTEGRATION (IBKR, TT)',
      'ANTHROPIC API PAID BY PLATFORM',
    ],
    badge: 'PRO',
    bgColor: '#003366',
    ctaLabel: 'SUBSCRIBE NOW',
  },
  pro_byok: {
    name: 'PRO BYOK',
    price: '$15',
    desc: 'BRING YOUR OWN KEY',
    features: [
      'EVERYTHING IN PRO',
      'UNLIMITED AI QUERIES',
      'USE YOUR ANTHROPIC API KEY',
      'LOWER MONTHLY COST',
      'SAME ADVANCED FEATURES',
      'BROKER INTEGRATIONS',
      'PORTFOLIO & WATCHLISTS',
    ],
    badge: 'BYOK',
    bgColor: '#005500',
    ctaLabel: 'SUBSCRIBE NOW',
  },
}

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (plan: PlanKey) => {
    if (plan === 'free') {
      router.push('/register')
      return
    }

    setLoading(plan)
    setError(null)

    try {
      console.log('[PRICING DEBUG] Creating checkout session for plan:', plan)

      // Call Next.js API route which will handle token from httpOnly cookie
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok) {
        const err = await res.json()
        // If 401, redirect to login
        if (res.status === 401) {
          console.log('[PRICING DEBUG] Unauthorized, redirecting to login')
          router.push('/login?redirect=/pricing')
          return
        }
        throw new Error(err.detail || 'Failed to create checkout session')
      }

      const data = await res.json()
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: bb.bg,
      color: bb.white,
      fontFamily: 'monospace',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '3rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          <img src="/logo.png" alt="Coiled Spring" style={{ height: '36px', display: 'block' }} />
          <div style={{ color: bb.gray, fontSize: '0.875rem' }}>
            PRICING & PLANS
          </div>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: bb.orange,
          marginBottom: '0.5rem',
          letterSpacing: '1px',
        }}>
          CHOOSE YOUR PLAN
        </h1>

        <p style={{
          color: bb.gray,
          fontSize: '1rem',
          maxWidth: '700px',
        }}>
          ANTIFRAGILE OPTIONS TRADING · LEAPS SCANNER · AI-POWERED ANALYSIS
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 2rem',
          background: bb.red,
          color: bb.white,
          padding: '1rem',
          border: `1px solid ${bb.border}`,
        }}>
          <strong>ERROR:</strong> {error}
        </div>
      )}

      {/* Pricing cards */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
      }}>
        {(Object.keys(PLANS) as PlanKey[]).map((planKey) => {
          const plan = PLANS[planKey]
          const isLoading = loading === planKey

          return (
            <div
              key={planKey}
              style={{
                background: bb.panel,
                border: `2px solid ${bb.border}`,
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: plan.bgColor,
                color: bb.white,
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
              }}>
                {plan.badge}
              </div>

              {/* Plan name */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: bb.orange,
                marginBottom: '0.5rem',
                letterSpacing: '1px',
              }}>
                {plan.name}
              </h2>

              {/* Price */}
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: bb.white,
                marginBottom: '0.25rem',
              }}>
                {plan.price}
                {planKey !== 'free' && (
                  <span style={{ fontSize: '1rem', color: bb.gray }}>/mo</span>
                )}
              </div>

              {/* Description */}
              <p style={{
                color: bb.gray,
                fontSize: '0.875rem',
                marginBottom: '2rem',
                letterSpacing: '0.5px',
              }}>
                {plan.desc}
              </p>

              {/* Features */}
              <div style={{
                flex: 1,
                marginBottom: '2rem',
              }}>
                {plan.features.map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                      color: bb.white,
                    }}
                  >
                    <span style={{ color: bb.green, flexShrink: 0 }}>▸</span>
                    <span style={{ letterSpacing: '0.3px' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(planKey)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: planKey === 'free' ? bb.border2 : plan.bgColor,
                  color: bb.white,
                  border: `1px solid ${bb.border}`,
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  letterSpacing: '1px',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = planKey === 'free' ? bb.border : bb.orange
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = planKey === 'free' ? bb.border2 : plan.bgColor
                  }
                }}
              >
                {isLoading ? 'LOADING...' : plan.ctaLabel}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '1200px',
        margin: '3rem auto 0',
        padding: '2rem',
        background: bb.panel,
        border: `1px solid ${bb.border}`,
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          color: bb.orange,
          marginBottom: '1rem',
          letterSpacing: '1px',
        }}>
          FREQUENTLY ASKED QUESTIONS
        </h3>

        <div style={{ color: bb.gray, fontSize: '0.875rem', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong style={{ color: bb.white }}>Q: WHAT IS BYOK?</strong><br />
            A: Bring Your Own Key. Use your own Anthropic API key for unlimited AI queries at a lower monthly cost.
          </p>

          <p style={{ marginBottom: '1rem' }}>
            <strong style={{ color: bb.white }}>Q: CAN I CANCEL ANYTIME?</strong><br />
            A: Yes. Cancel your subscription at any time from your account settings. No long-term contracts.
          </p>

          <p>
            <strong style={{ color: bb.white }}>Q: WHICH BROKERS ARE SUPPORTED?</strong><br />
            A: Interactive Brokers (IBKR) and Tastytrade. More coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
