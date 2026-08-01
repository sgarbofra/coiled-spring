'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

const c = {
  bg: '#000000',
  card: '#080a0e',
  border: '#1c1c1c',
  border2: '#2a2a2a',
  orange: '#e87722',
  orangeHover: '#d4651a',
  green: '#00CC44',
  red: '#FF3333',
  textPrimary: '#f0f2f5',
  textSecondary: '#8892a0',
  textMuted: '#444',
}

const mono = "'JetBrains Mono', 'Courier New', monospace"
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

type PlanKey = 'free' | 'pro' | 'pro_byok'
type BrokerKey = 'ibkr' | 'tastytrade'

const BETA_FEATURES = [
  { label: 'LEAPS Scanner', desc: 'Scan 4,000+ US stocks for asymmetric setups' },
  { label: 'Watchlist', desc: 'Track your selected tickers and monitor Greeks' },
  { label: 'Vol Surface 3D', desc: 'Multi-factor volatility screening dashboard' },
  { label: 'Coiled AI', desc: 'AI-powered market analysis — 50 queries/day' },
  { label: 'HV Screener', desc: 'Historical volatility rank across all 1,000+ tickers' },
  { label: 'Portfolio Tracker', desc: 'P&L, payoff diagram, and What-If simulator' },
]

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '32px', height: '32px', flexShrink: 0, borderRadius: '2px',
      background: done ? c.green : active ? c.orange : '#1a1a1a',
      border: `1px solid ${done ? c.green : active ? c.orange : c.border}`,
      color: done || active ? '#000' : c.textMuted,
      fontSize: '0.72rem', fontWeight: '700', fontFamily: mono,
      transition: 'all 0.3s ease',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    if (!userLoading && user) {
      router.push('/scanner')
    }
  }, [user, userLoading, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privacyAccepted) { setStep1Error('You must accept the Privacy Policy to register'); return }
    if (password !== password2) { setStep1Error('Passwords do not match'); return }
    if (password.length < 6) { setStep1Error('Password must be at least 6 characters'); return }
    setRegistering(true); setStep1Error(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, plan: 'free', privacy_accepted: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Registration failed')
      router.push(`/check-email?email=${encodeURIComponent(email)}`)
    } catch (e: unknown) {
      setStep1Error(e instanceof Error ? e.message : 'Registration failed')
    } finally { setRegistering(false) }
  }

  const submitStep2 = async () => {
    setSavingPlan(true); setStep2Error(null)
    try {
      const res = await fetch('/api/auth/plan', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', ai_api_key: null }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Plan update error')
      window.location.href = '/watchlists'
    } catch (e: unknown) {
      setStep2Error(e instanceof Error ? e.message : 'Error')
    } finally { setSavingPlan(false) }
  }

  if (userLoading) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .reg-input {
          width: 100%;
          background: #050608;
          border: 1px solid #1c1c1c;
          color: #f0f2f5;
          padding: 10px 12px;
          font-size: 0.9rem;
          font-family: ${mono};
          outline: none;
          transition: border-color 0.2s ease;
          border-radius: 2px;
        }
        .reg-input:focus { border-color: #e87722; }
        .reg-input::placeholder { color: #333; }
        .feature-row:hover { background: rgba(232,119,34,0.04) !important; }
      `}</style>

      <div style={{ backgroundColor: c.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', fontFamily: sans }}>

        {/* Subtle grid */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(232,119,34,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,119,34,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: step === 2 ? '620px' : '460px', position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: c.green, animation: 'pulse-dot 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.green, letterSpacing: '2px' }}>TERMINAL ONLINE</span>
            </div>
            <div style={{ fontFamily: mono, fontSize: '1.35rem', fontWeight: '700', color: c.orange, letterSpacing: '2px' }}>
              COILED SPRING
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.62rem', color: c.textMuted, letterSpacing: '3px', marginTop: '4px' }}>
              LEAPS OPTIONS ANALYTICS
            </div>
          </div>

          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem' }}>
            {[
              { n: 1, label: 'Account' },
              { n: 2, label: 'Access' },
            ].map(({ n, label }, i) => (
              <div key={n} style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <StepDot n={n} active={step === n} done={step > n} />
                  <span style={{ fontFamily: mono, fontSize: '0.65rem', color: step === n ? c.orange : step > n ? c.green : c.textMuted, letterSpacing: '1px' }}>
                    {label}
                  </span>
                </div>
                {i < 1 && (
                  <div style={{ flex: 1, height: '1px', background: step > n ? c.orange : c.border, margin: '0 12px', transition: 'background 0.3s ease' }} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderTop: `2px solid ${c.orange}`, padding: '2rem' }}>

            {/* ── STEP 1: Account creation ── */}
            {step === 1 && (
              <>
                <div style={{ marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted, letterSpacing: '2px' }}>CREATE ACCOUNT</span>
                  <a href="/login" style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted, textDecoration: 'none', letterSpacing: '0.5px', transition: 'color 0.2s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.color = c.orange)}
                    onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}>
                    Already registered? Login →
                  </a>
                </div>

                {/* Privacy consent checkbox — obbligatorio per entrambi i metodi di registrazione */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  marginBottom: '1.25rem', padding: '0.875rem',
                  border: `1px solid ${privacyAccepted ? c.green : c.border}`,
                  borderRadius: '2px',
                  background: privacyAccepted ? 'rgba(0,204,68,0.04)' : 'rgba(255,255,255,0.01)',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                  cursor: 'pointer',
                }} onClick={() => setPrivacyAccepted(v => !v)}>
                  <div style={{
                    width: '16px', height: '16px', flexShrink: 0, marginTop: '1px',
                    border: `1px solid ${privacyAccepted ? c.green : c.border2}`,
                    borderRadius: '2px', background: privacyAccepted ? c.green : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    {privacyAccepted && <span style={{ color: '#000', fontSize: '10px', fontWeight: '700', lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: mono, fontSize: '0.72rem', color: c.textSecondary, lineHeight: '1.5', userSelect: 'none' }}>
                    I accept the{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer"
                      style={{ color: c.orange, textDecoration: 'none' }}
                      onClick={e => e.stopPropagation()}>Privacy Policy</a>
                    {' '}and consent to the processing of my personal data in accordance with GDPR.
                  </span>
                </div>

                {/* Google OAuth */}
                <a
                  href={privacyAccepted ? '/api/auth/google' : '#'}
                  onClick={e => { if (!privacyAccepted) { e.preventDefault(); setStep1Error('You must accept the Privacy Policy before continuing with Google') } }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    width: '100%', padding: '0.72rem', marginBottom: '0.25rem',
                    background: 'transparent',
                    border: `1px solid ${privacyAccepted ? c.border2 : '#111'}`,
                    color: privacyAccepted ? c.textSecondary : '#333',
                    fontFamily: mono, fontSize: '0.8rem',
                    letterSpacing: '0.5px', textDecoration: 'none', borderRadius: '2px',
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                    cursor: privacyAccepted ? 'pointer' : 'not-allowed',
                    opacity: privacyAccepted ? 1 : 0.45,
                  }}
                  onMouseEnter={e => { if (privacyAccepted) { e.currentTarget.style.borderColor = c.orange; e.currentTarget.style.color = c.textPrimary } }}
                  onMouseLeave={e => { if (privacyAccepted) { e.currentTarget.style.borderColor = c.border2; e.currentTarget.style.color = c.textSecondary } }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: c.border }} />
                  <span style={{ fontFamily: mono, fontSize: '0.62rem', color: c.textMuted, letterSpacing: '1px' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: c.border }} />
                </div>

                <form onSubmit={submitStep1} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '6px' }}>EMAIL</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="reg-input" placeholder="you@domain.com" />
                  </div>
                  <div>
                    <label style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '6px' }}>PASSWORD</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                      className="reg-input" placeholder="Min. 6 characters" />
                  </div>
                  <div>
                    <label style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '6px' }}>CONFIRM PASSWORD</label>
                    <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                      className="reg-input" placeholder="Repeat password" />
                  </div>

                  {step1Error && (
                    <div style={{ color: c.red, fontSize: '0.82rem', border: `1px solid rgba(255,51,51,0.3)`, padding: '0.75rem 1rem', background: 'rgba(255,51,51,0.06)', fontFamily: mono, letterSpacing: '0.5px' }}>
                      ▶ {step1Error}
                    </div>
                  )}

                  <button type="submit" disabled={registering}
                    style={{
                      width: '100%', background: registering ? '#1a1a1a' : c.orange,
                      color: registering ? c.textMuted : '#000', border: 'none',
                      padding: '0.75rem', fontSize: '0.85rem', fontFamily: mono,
                      fontWeight: '700', letterSpacing: '1.5px',
                      cursor: registering ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease', borderRadius: '2px',
                    }}
                    onMouseEnter={e => { if (!registering) e.currentTarget.style.background = c.orangeHover }}
                    onMouseLeave={e => { if (!registering) e.currentTarget.style.background = c.orange }}>
                    {registering ? 'CREATING ACCOUNT...' : 'CONTINUE →'}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: Beta access ── */}
            {step === 2 && (
              <>
                <div style={{ marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: `1px solid ${c.border}` }}>
                  <div style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted, letterSpacing: '2px', marginBottom: '0.5rem' }}>BETA ACCESS</div>
                  <h2 style={{ fontFamily: mono, fontSize: '1.1rem', fontWeight: '700', color: c.textPrimary }}>All features included — free during beta</h2>
                  <p style={{ fontSize: '0.85rem', color: c.textSecondary, marginTop: '0.4rem' }}>No credit card required.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '1.75rem', border: `1px solid ${c.border}` }}>
                  {BETA_FEATURES.map((f, i) => (
                    <div key={i} className="feature-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1rem', borderBottom: i < BETA_FEATURES.length - 1 ? `1px solid ${c.border}` : 'none', transition: 'background 0.15s ease' }}>
                      <span style={{ color: c.green, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <div>
                        <span style={{ fontFamily: mono, fontSize: '0.75rem', color: c.orange, fontWeight: '700', letterSpacing: '0.5px' }}>{f.label}</span>
                        <span style={{ fontFamily: sans, fontSize: '0.82rem', color: c.textSecondary, marginLeft: '0.5rem' }}>— {f.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {step2Error && (
                  <div style={{ color: c.red, fontSize: '0.82rem', marginBottom: '1rem', border: `1px solid rgba(255,51,51,0.3)`, padding: '0.75rem 1rem', background: 'rgba(255,51,51,0.06)', fontFamily: mono }}>
                    ▶ {step2Error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setStep(1)}
                    style={{ border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, padding: '0.75rem 1.1rem', fontSize: '0.82rem', fontFamily: mono, cursor: 'pointer', letterSpacing: '0.5px', borderRadius: '2px', transition: 'border-color 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = c.orange}
                    onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
                    ← Back
                  </button>
                  <button onClick={submitStep2} disabled={savingPlan}
                    style={{ flex: 1, background: savingPlan ? '#1a1a1a' : c.orange, color: savingPlan ? c.textMuted : '#000', border: 'none', padding: '0.75rem', fontSize: '0.85rem', fontFamily: mono, fontWeight: '700', letterSpacing: '1.5px', cursor: savingPlan ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease', borderRadius: '2px' }}
                    onMouseEnter={e => { if (!savingPlan) e.currentTarget.style.background = c.orangeHover }}
                    onMouseLeave={e => { if (!savingPlan) e.currentTarget.style.background = c.orange }}>
                    {savingPlan ? 'ACTIVATING...' : '▶ COMPLETE REGISTRATION'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontFamily: mono, fontSize: '0.62rem', color: '#222', letterSpacing: '1px' }}>
            COILED SPRING STRATEGY · LEAPS OPTIONS ANALYTICS
          </div>
        </div>
      </div>
    </>
  )
}
