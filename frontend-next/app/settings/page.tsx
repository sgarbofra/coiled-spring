'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type BrokerKey = 'ibkr' | 'tastytrade'

const BROKERS = [
  { key: 'ibkr' as BrokerKey, name: 'Interactive Brokers', badge: 'IBKR' },
  { key: 'tastytrade' as BrokerKey, name: 'tastytrade', badge: 'TT' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [current, setCurrent] = useState<{ broker: string; config: Record<string, unknown> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<BrokerKey | null>(null)

  // IBKR fields
  const [ibkrHost, setIbkrHost] = useState('127.0.0.1')
  const [ibkrPort, setIbkrPort] = useState('7497')
  const [ibkrClientId, setIbkrClientId] = useState('1')
  const [ibkrAccount, setIbkrAccount] = useState('')

  // TastyTrade fields
  const [ttUsername, setTtUsername] = useState('')
  const [ttPassword, setTtPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/broker')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.broker) {
          setCurrent(d.broker)
          setSelected(d.broker.broker as BrokerKey)
          const cfg = d.broker.config as Record<string, unknown>
          if (d.broker.broker === 'ibkr') {
            setIbkrHost((cfg.host as string) || '127.0.0.1')
            setIbkrPort(String(cfg.port || 7497))
            setIbkrClientId(String(cfg.client_id || 1))
            setIbkrAccount((cfg.account as string) || '')
          } else if (d.broker.broker === 'tastytrade') {
            setTtUsername((cfg.username as string) || '')
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const canSave = () => {
    if (!selected) return false
    if (selected === 'ibkr') return ibkrHost.trim() && ibkrPort.trim()
    if (selected === 'tastytrade') return ttUsername.trim() && ttPassword.trim()
    return false
  }

  const save = async () => {
    if (!selected || !canSave()) return
    setSaving(true); setError(null); setSuccess(false)
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
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed')
      setCurrent(data.broker)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving broker')
    } finally { setSaving(false) }
  }

  const brokerLabel = (key: string) => BROKERS.find(b => b.key === key)?.name ?? key

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => router.push('/watchlists')}
            className="text-slate-500 hover:text-slate-300">← Watchlists</button>
          <h1 className="text-2xl font-semibold">Impostazioni</h1>
        </div>

        {/* Broker section */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Broker</h2>
              <p className="text-sm text-slate-400">Il broker a cui l'app si collega per dati e greche</p>
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm hover:border-slate-500">
                Cambia
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Caricamento…</p>
          ) : !editing ? (
            // Current broker display
            current ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold">
                  {BROKERS.find(b => b.key === current.broker)?.badge ?? '?'}
                </div>
                <div>
                  <p className="font-medium">{brokerLabel(current.broker)}</p>
                  {current.broker === 'ibkr' && (
                    <p className="text-xs text-slate-400">
                      {(current.config.host as string)}:{(current.config.port as number)} · Client {(current.config.client_id as number)}
                    </p>
                  )}
                  {current.broker === 'tastytrade' && (
                    <p className="text-xs text-slate-400">{current.config.username as string}</p>
                  )}
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Configurato
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-500">
                Nessun broker configurato.{' '}
                <button onClick={() => setEditing(true)} className="text-indigo-400 hover:text-indigo-300">Configura ora</button>
              </div>
            )
          ) : (
            // Edit form
            <div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {BROKERS.map(b => (
                  <button key={b.key} onClick={() => setSelected(b.key)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected === b.key
                        ? 'border-indigo-500 bg-slate-800 ring-2 ring-indigo-500/30'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                        selected === b.key ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>{b.badge}</div>
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selected === 'ibkr' && (
                <div className="mb-4 grid grid-cols-2 gap-3">
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
              )}

              {selected === 'tastytrade' && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Username</span>
                    <input value={ttUsername} onChange={e => setTtUsername(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-400">Password</span>
                    <input type="password" value={ttPassword} onChange={e => setTtPassword(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                    <span className="text-xs text-slate-500">Non viene salvata</span>
                  </label>
                </div>
              )}

              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setError(null) }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500">
                  Annulla
                </button>
                <button onClick={save} disabled={!canSave() || saving}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40">
                  {saving ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          )}

          {success && (
            <p className="mt-3 text-sm text-emerald-400">✓ Broker aggiornato</p>
          )}
        </section>

        {/* Logout */}
        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="mb-1 font-semibold">Account</h2>
          <p className="mb-4 text-sm text-slate-400">Esci dall'applicazione</p>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-red-400 hover:border-red-800 hover:bg-red-950"
          >
            Logout
          </button>
        </section>

      </div>
    </div>
  )
}
