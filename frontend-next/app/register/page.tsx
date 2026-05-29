'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BrokerKey = 'ibkr' | 'tastytrade'

const BROKERS = [
  {
    key: 'ibkr' as BrokerKey,
    name: 'Interactive Brokers',
    description: 'Connessione locale via TWS o IB Gateway.',
    badge: 'IBKR',
  },
  {
    key: 'tastytrade' as BrokerKey,
    name: 'tastytrade',
    description: 'Connessione via API REST ufficiale tastytrade.',
    badge: 'TT',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  // Step 2
  const [selected, setSelected] = useState<BrokerKey | null>(null)
  const [ibkrHost, setIbkrHost] = useState('127.0.0.1')
  const [ibkrPort, setIbkrPort] = useState('7497')
  const [ibkrClientId, setIbkrClientId] = useState('1')
  const [ibkrAccount, setIbkrAccount] = useState('')
  const [ttUsername, setTtUsername] = useState('')
  const [ttPassword, setTtPassword] = useState('')
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Step 1: register ────────────────────────────────────────────────────────
  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) { setStep1Error('Le password non coincidono'); return }
    if (password.length < 6) { setStep1Error('Password minimo 6 caratteri'); return }
    setRegistering(true); setStep1Error(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Registration failed')
      setStep(2)
    } catch (e: unknown) {
      setStep1Error(e instanceof Error ? e.message : 'Registration failed')
    } finally { setRegistering(false) }
  }

  // ── Step 2: broker ──────────────────────────────────────────────────────────
  const canSaveBroker = () => {
    if (!selected) return false
    if (selected === 'ibkr') return ibkrHost.trim() && ibkrPort.trim()
    if (selected === 'tastytrade') return ttUsername.trim() && ttPassword.trim()
    return false
  }

  const submitStep2 = async () => {
    if (!selected || !canSaveBroker()) return
    setSaving(true); setStep2Error(null)
    const config =
      selected === 'ibkr'
        ? { host: ibkrHost.trim(), port: Number(ibkrPort), client_id: Number(ibkrClientId), account: ibkrAccount.trim() || null }
        : { username: ttUsername.trim(), password: ttPassword }
    try {
      const res = await fetch('/api/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker: selected, config }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save broker')
      router.push('/watchlists')
      router.refresh()
    } catch (e: unknown) {
      setStep2Error(e instanceof Error ? e.message : 'Error saving broker')
    } finally { setSaving(false) }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="mb-8 flex items-center gap-3">
          <StepDot n={1} active={step === 1} done={step > 1} />
          <div className="h-px flex-1 bg-slate-700" />
          <StepDot n={2} active={step === 2} done={false} />
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="mb-1 text-2xl font-semibold">Crea il tuo account</h1>
              <p className="text-sm text-slate-400">
                Già registrato?{' '}
                <a href="/login" className="text-indigo-400 hover:text-indigo-300">Accedi</a>
              </p>
            </div>

            <form onSubmit={submitStep1} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-400">Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-400">Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-400">Conferma password</span>
                <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </label>

              {step1Error && <p className="text-sm text-red-400">{step1Error}</p>}

              <button type="submit" disabled={registering}
                className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50">
                {registering ? 'Creazione account…' : 'Continua →'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <div className="mb-8">
              <h1 className="mb-1 text-2xl font-semibold">Scegli il tuo broker</h1>
              <p className="text-sm text-slate-400">
                Potrai cambiarlo in qualsiasi momento dalle impostazioni.
              </p>
            </div>

            {/* Broker cards */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              {BROKERS.map(b => (
                <button key={b.key} onClick={() => setSelected(b.key)}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selected === b.key
                      ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/30'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                      selected === b.key ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>{b.badge}</div>
                    <span className="font-semibold text-sm">{b.name}</span>
                    {selected === b.key && (
                      <span className="ml-auto text-indigo-400">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{b.description}</p>
                </button>
              ))}
            </div>

            {/* IBKR config */}
            {selected === 'ibkr' && (
              <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h2 className="mb-1 text-sm font-semibold">Connessione TWS / IB Gateway</h2>
                <p className="mb-4 text-xs text-slate-400">
                  Assicurati che TWS o IB Gateway sia aperto con le API socket abilitate.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Host</span>
                    <input value={ibkrHost} onChange={e => setIbkrHost(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Porta</span>
                    <input value={ibkrPort} onChange={e => setIbkrPort(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                    <span className="text-xs text-slate-500">paper: 7497 · live: 7496</span>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Client ID</span>
                    <input value={ibkrClientId} onChange={e => setIbkrClientId(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Account (opzionale)</span>
                    <input value={ibkrAccount} onChange={e => setIbkrAccount(e.target.value)}
                      placeholder="DU123456"
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm placeholder-slate-600 focus:border-indigo-500 focus:outline-none" />
                  </label>
                </div>
              </div>
            )}

            {/* TastyTrade config */}
            {selected === 'tastytrade' && (
              <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h2 className="mb-1 text-sm font-semibold">Credenziali tastytrade</h2>
                <p className="mb-4 text-xs text-slate-400">La password viene usata solo per ottenere il session token e non viene salvata.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Username</span>
                    <input value={ttUsername} onChange={e => setTtUsername(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Password</span>
                    <input type="password" value={ttPassword} onChange={e => setTtPassword(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </label>
                </div>
              </div>
            )}

            {step2Error && <p className="mb-4 text-sm text-red-400">{step2Error}</p>}

            <div className="flex items-center justify-between">
              <button onClick={() => { router.push('/watchlists'); router.refresh() }}
                className="text-sm text-slate-500 hover:text-slate-300">
                Salta per ora →
              </button>
              <button onClick={submitStep2} disabled={!canSaveBroker() || saving}
                className="rounded-xl bg-indigo-600 px-8 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-40">
                {saving ? 'Salvataggio…' : 'Completa registrazione'}
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
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
      done ? 'bg-emerald-600 text-white' :
      active ? 'bg-indigo-600 text-white' :
      'bg-slate-800 text-slate-500'
    }`}>
      {done ? '✓' : n}
    </div>
  )
}
