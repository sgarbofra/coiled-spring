'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type PlanKey = 'free' | 'pro' | 'pro_byok'
type BrokerKey = 'ibkr' | 'tastytrade'

const PLANS = [
  {
    key: 'free' as PlanKey, name: 'FREE', price: '€0 / MONTH', badge: 'FREE', bgColor: bb.border2,
    features: ['SCANNER LEAPS (MARKET DATA)', 'WATCHLIST (MAX 2)', 'PORTFOLIO TRACKER', 'NO AI'],
    ai: false,
  },
  {
    key: 'pro' as PlanKey, name: 'PRO', price: '€12 / MONTH', badge: 'PRO', bgColor: '#003366',
    features: ['SCANNER LEAPS (MARKET DATA)', 'UNLIMITED WATCHLISTS', 'PORTFOLIO TRACKER', 'COILED AI (50 QUERIES/DAY)', 'BROKER CONNECTION (IBKR/TT)'],
    ai: true,
  },
  {
    key: 'pro_byok' as PlanKey, name: 'PRO BYOK', price: '€6 / MONTH', badge: 'BYOK', bgColor: '#005500',
    features: ['ALL PRO FEATURES', 'UNLIMITED AI (YOUR ANTHROPIC KEY)', 'NO DAILY LIMIT'],
    ai: true, byok: true,
  },
]

const BROKERS = [
  { key: 'ibkr' as BrokerKey, name: 'INTERACTIVE BROKERS', description: 'Connection via TWS or IB Gateway', badge: 'IBKR' },
  { key: 'tastytrade' as BrokerKey, name: 'TASTYTRADE', description: 'Connection via official REST API', badge: 'TT' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [step, setStep] = useState<1 | 2>(1)

  // FIX 1: Redirect se già autenticato
  useEffect(() => {
    if (!userLoading && user) {
      router.push('/scanner')
    }
  }, [user, userLoading, router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  const [plan, setPlan] = useState<PlanKey>('pro')
  const [byokKey, setByokKey] = useState('')
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const [broker, setBroker] = useState<BrokerKey | null>(null)
  const [ibkrHost, setIbkrHost] = useState('127.0.0.1')
  const [ibkrPort, setIbkrPort] = useState('7497')
  const [ibkrClientId, setIbkrClientId] = useState('1')
  const [ibkrAccount, setIbkrAccount] = useState('')
  const [ttUsername, setTtUsername] = useState('')
  const [ttPassword, setTtPassword] = useState('')
  const [step3Error, setStep3Error] = useState<string | null>(null)
  const [savingBroker, setSavingBroker] = useState(false)

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) { setStep1Error('PASSWORDS DO NOT MATCH'); return }
    if (password.length < 6) { setStep1Error('PASSWORD MINIMUM 6 CHARACTERS'); return }
    setRegistering(true); setStep1Error(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, plan: 'free' }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Registration failed')

      // Registration successful - redirect to check email page
      console.log('[REGISTER DEBUG] Registration successful, redirecting to check-email')
      router.push(`/check-email?email=${encodeURIComponent(email)}`)
    } catch (e: unknown) {
      setStep1Error(e instanceof Error ? e.message.toUpperCase() : 'REGISTRATION FAILED')
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
      // Registrazione completata, redirect a watchlists
      window.location.href = '/watchlists'
    } catch (e: unknown) {
      setStep2Error(e instanceof Error ? e.message.toUpperCase() : 'ERROR')
    } finally { setSavingPlan(false) }
  }

  const canSaveBroker = () => {
    if (!broker) return false
    if (broker === 'ibkr') return ibkrHost.trim() && ibkrPort.trim()
    return ttUsername.trim() && ttPassword.trim()
  }

  const submitBroker = async () => {
    if (!broker || !canSaveBroker()) return
    setSavingBroker(true); setStep3Error(null)
    const config = broker === 'ibkr'
      ? { host: ibkrHost.trim(), port: Number(ibkrPort), client_id: Number(ibkrClientId), account: ibkrAccount.trim() || null }
      : { username: ttUsername.trim(), password: ttPassword }
    try {
      const res = await fetch('/api/broker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker, config }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Broker save error')
      window.location.href = '/watchlists'
    } catch (e: unknown) {
      setStep3Error(e instanceof Error ? e.message.toUpperCase() : 'ERROR')
    } finally { setSavingBroker(false) }
  }

  // Mostra loading mentre controlla autenticazione
  if (userLoading) {
    return null
  }

  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', color: bb.white, fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '100%', maxWidth: '800px' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest uppercase"
              style={{ color: '#F97316', fontFamily: 'monospace' }}>
            Coiled Spring Terminal
          </h1>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {[1, 2, 3].map((n, i) => (
            <div key={n} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '12px' }}>
              <StepDot n={n} active={step === n} done={step > n} />
              {i < 2 && <div style={{ height: '1px', flex: 1, backgroundColor: step > n ? bb.orange : bb.border2 }} />}
            </div>
          ))}
        </div>

        {/* Step 1: Account */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ color: bb.orange, fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>CREATE YOUR ACCOUNT</h1>
              <p style={{ fontSize: '13.2px', color: bb.gray, letterSpacing: '0.5px' }}>
                ALREADY REGISTERED?{' '}
                <a href="/login" style={{ color: bb.amber, textDecoration: 'none' }}>LOGIN</a>
              </p>
            </div>
            <form onSubmit={submitStep1} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: bb.gray, letterSpacing: '1px' }}>EMAIL</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '8px 10px', fontSize: '14.4px', fontFamily: 'inherit', outline: 'none' }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: bb.gray, letterSpacing: '1px' }}>PASSWORD</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '8px 10px', fontSize: '14.4px', fontFamily: 'inherit', outline: 'none' }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: bb.gray, letterSpacing: '1px' }}>CONFIRM PASSWORD</span>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                  style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '8px 10px', fontSize: '14.4px', fontFamily: 'inherit', outline: 'none' }} />
              </label>
              {step1Error && <p style={{ fontSize: '13.2px', color: bb.red }}>▶ ERROR: {step1Error}</p>}
              <button type="submit" disabled={registering}
                style={{ width: '100%', backgroundColor: registering ? bb.border2 : bb.orange, color: '#000', border: 'none', padding: '10px', fontSize: '14.4px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px', cursor: registering ? 'not-allowed' : 'pointer' }}>
                {registering ? 'CREATING ACCOUNT...' : 'CONTINUE ▶'}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Plan */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <h1 style={{ color: bb.orange, fontSize: '28px', fontWeight: 'bold', letterSpacing: '3px', marginBottom: '12px' }}>
                BETA ACCESS — ALL FEATURES INCLUDED
              </h1>
              <p style={{ fontSize: '15px', color: bb.gray, letterSpacing: '0.5px' }}>
                Free during beta. No credit card required.
              </p>
            </div>

            <div style={{
              marginBottom: '32px',
              border: `2px solid ${bb.border2}`,
              backgroundColor: bb.panel,
              padding: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px auto'
            }}>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ fontSize: '15px', color: bb.white, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff41', fontSize: '18px', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                  <span><strong style={{ color: bb.orange }}>LEAPS SCANNER</strong> — scan 4,000+ US stocks for asymmetric setups</span>
                </li>
                <li style={{ fontSize: '15px', color: bb.white, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff41', fontSize: '18px', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                  <span><strong style={{ color: bb.orange }}>WATCHLIST</strong> — track your selected tickers</span>
                </li>
                <li style={{ fontSize: '15px', color: bb.white, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff41', fontSize: '18px', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                  <span><strong style={{ color: bb.orange }}>SURFACE</strong> — multi-factor screening dashboard</span>
                </li>
                <li style={{ fontSize: '15px', color: bb.white, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff41', fontSize: '18px', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                  <span><strong style={{ color: bb.orange }}>COILED AI</strong> — AI-powered market analysis (50 queries/day)</span>
                </li>
              </ul>
            </div>

            {step2Error && <p style={{ marginBottom: '12px', fontSize: '13.2px', color: bb.red }}>▶ ERROR: {step2Error}</p>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)}
                style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '8px 16px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
                ← BACK
              </button>
              <button onClick={submitStep2} disabled={savingPlan}
                style={{ flex: 1, backgroundColor: savingPlan ? bb.border2 : bb.orange, color: '#000', border: 'none', padding: '8px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px', cursor: savingPlan ? 'not-allowed' : 'pointer' }}>
                {savingPlan ? 'SAVING...' : 'COMPLETE REGISTRATION'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '32px', width: '32px', flexShrink: 0,
      backgroundColor: done ? bb.green : active ? bb.orange : bb.border2,
      color: done || active ? '#000' : bb.gray,
      fontSize: '13.2px', fontWeight: 'bold'
    }}>
      {done ? '✓' : n}
    </div>
  )
}
