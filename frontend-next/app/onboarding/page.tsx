'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BrokerKey = 'ibkr' | 'tastytrade'

const BROKERS: { key: BrokerKey; name: string; description: string; badge: string }[] = [
  {
    key: 'ibkr',
    name: 'Interactive Brokers',
    description: 'Connessione locale via TWS o IB Gateway. Richiede TWS / IB Gateway aperto sul tuo computer.',
    badge: 'IBKR',
  },
  {
    key: 'tastytrade',
    name: 'tastytrade',
    description: 'Connessione via API REST ufficiale tastytrade. Accesso diretto con le tue credenziali.',
    badge: 'TT',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<BrokerKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // IBKR fields
  const [ibkrHost, setIbkrHost] = useState('127.0.0.1')
  const [ibkrPort, setIbkrPort] = useState('7497')
  const [ibkrClientId, setIbkrClientId] = useState('1')
  const [ibkrAccount, setIbkrAccount] = useState('')

  // TastyTrade fields
  const [ttUsername, setTtUsername] = useState('')
  const [ttPassword, setTtPassword] = useState('')

  const canSubmit = () => {
    if (!selected) return false
    if (selected === 'ibkr') return ibkrHost.trim() && ibkrPort.trim()
    if (selected === 'tastytrade') return ttUsername.trim() && ttPassword.trim()
    return false
  }

  const submit = async () => {
    if (!selected || !canSubmit()) return
    setSaving(true)
    setError(null)

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
      setError(e instanceof Error ? e.message : 'Error saving broker')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-semibold">Collega il tuo broker</h1>
          <p className="text-slate-400">
            Scegli il broker con cui operi. Potrai cambiarlo in qualsiasi momento dalle impostazioni.
          </p>
        </div>

        {/* Broker cards */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          {BROKERS.map(b => (
            <button
              key={b.key}
              onClick={() => setSelected(b.key)}
              className={`rounded-2xl border p-6 text-left transition-all ${
                selected === b.key
                  ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/30'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                  selected === b.key ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {b.badge}
                </div>
                <span className="font-semibold">{b.name}</span>
                {selected === b.key && (
                  <span className="ml-auto text-indigo-400">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">{b.description}</p>
            </button>
          ))}
        </div>

        {/* Config form */}
        {selected === 'ibkr' && (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-1 font-semibold">Connessione TWS / IB Gateway</h2>
            <p className="mb-5 text-sm text-slate-400">
              Assicurati che TWS o IB Gateway sia aperto e che le API socket siano abilitate
              (Configure → API → Settings → Enable ActiveX and Socket Clients).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Host</span>
                <input value={ibkrHost} onChange={e => setIbkrHost(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Porta</span>
                <input value={ibkrPort} onChange={e => setIbkrPort(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
                <span className="text-xs text-slate-500">TWS paper: 7497 · TWS live: 7496 · Gateway: 4001</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Client ID</span>
                <input value={ibkrClientId} onChange={e => setIbkrClientId(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Account (opzionale)</span>
                <input value={ibkrAccount} onChange={e => setIbkrAccount(e.target.value)}
                  placeholder="DU123456"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 placeholder-slate-600 focus:border-indigo-500 focus:outline-none" />
              </label>
            </div>
          </div>
        )}

        {selected === 'tastytrade' && (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-1 font-semibold">Credenziali tastytrade</h2>
            <p className="mb-5 text-sm text-slate-400">
              Le credenziali vengono usate per ottenere un session token. La password non viene salvata.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Username</span>
                <input value={ttUsername} onChange={e => setTtUsername(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Password</span>
                <input type="password" value={ttPassword} onChange={e => setTtPassword(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 focus:border-indigo-500 focus:outline-none" />
              </label>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/watchlists')}
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            Salta per ora →
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit() || saving}
            className="rounded-xl bg-indigo-600 px-8 py-3 font-medium hover:bg-indigo-500 disabled:opacity-40"
          >
            {saving ? 'Connessione…' : 'Connetti broker'}
          </button>
        </div>

      </div>
    </div>
  )
}
