'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

type PlanKey = 'free' | 'pro' | 'pro_byok'
type BrokerKey = 'ibkr' | 'tastytrade'

const PLAN_LABELS: Record<PlanKey, { name: string; desc: string; badge: string; bgColor: string }> = {
  free:     { name: 'FREE',     desc: 'OPTIONS SCANNER, NO AI',        badge: 'FREE', bgColor: bb.border2 },
  pro:      { name: 'PRO',      desc: 'AI INCLUDED · 50 QUERIES/DAY',         badge: 'PRO',  bgColor: '#003366' },
  pro_byok: { name: 'PRO BYOK', desc: 'AI WITH YOUR KEY · UNLIMITED',      badge: 'BYOK', bgColor: '#005500' },
}

const BROKERS = [
  { key: 'ibkr' as BrokerKey, name: 'INTERACTIVE BROKERS', badge: 'IBKR' },
  { key: 'tastytrade' as BrokerKey, name: 'TASTYTRADE', badge: 'TT' },
]

export default function SettingsPage() {
  const router = useRouter()

  const [currentPlan, setCurrentPlan] = useState<PlanKey>('free')
  const [editingPlan, setEditingPlan] = useState(false)
  const [newPlan, setNewPlan] = useState<PlanKey>('free')
  const [byokKey, setByokKey] = useState('')
  const [hasAiKey, setHasAiKey] = useState(false)
  const [aiQueriesLeft, setAiQueriesLeft] = useState<number | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planSuccess, setPlanSuccess] = useState(false)

  const [current, setCurrent] = useState<{ broker: string; config: Record<string, unknown> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<BrokerKey | null>(null)

  const [ibkrHost, setIbkrHost] = useState('127.0.0.1')
  const [ibkrPort, setIbkrPort] = useState('7497')
  const [ibkrClientId, setIbkrClientId] = useState('1')
  const [ibkrAccount, setIbkrAccount] = useState('')

  const [ttUsername, setTtUsername] = useState('')
  const [ttPassword, setTtPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.plan) { setCurrentPlan(d.plan as PlanKey); setNewPlan(d.plan as PlanKey) }
        if (d.has_ai_key) setHasAiKey(true)
        if (d.ai_queries_today !== undefined && d.plan === 'pro') {
          setAiQueriesLeft(50 - d.ai_queries_today)
        }
      }).catch(() => {})

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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <ProtectedRoute>
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', padding: '40px 24px', color: bb.white, fontFamily: 'Courier New, monospace' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px' }}>
          <button onClick={() => router.push('/watchlists')}
            style={{ background: 'none', border: 'none', color: bb.gray, fontSize: '13.2px', cursor: 'pointer', letterSpacing: '1px' }}>
            ← WATCHLISTS
          </button>
          <h1 style={{ color: bb.orange, fontSize: '21.6px', fontWeight: 'bold', letterSpacing: '2px' }}>SETTINGS</h1>
        </div>

        {/* Beta Banner */}
        <div style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#1a0d00',
          border: `2px solid ${bb.orange}`,
          borderRadius: '4px'
        }}>
          <div style={{
            color: bb.orange,
            fontSize: '14.4px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            marginBottom: '8px',
            fontFamily: 'Space Mono, monospace'
          }}>
            🚀 BETA ACCESS — ALL FEATURES UNLOCKED
          </div>
          <div style={{
            color: bb.gray,
            fontSize: '13.2px',
            lineHeight: '1.6',
            marginBottom: '12px'
          }}>
            During the public beta, all users have complimentary access to PRO features.
            Plan selection and billing will be enabled after the beta period ends.
          </div>
          <div style={{
            color: bb.green,
            fontSize: '12px',
            fontFamily: 'Space Mono, monospace',
            letterSpacing: '1px'
          }}>
            Current plan: PRO (Beta — complimentary access)
          </div>
        </div>

        {/* Plan Section */}
        <section style={{ marginBottom: '24px', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: bb.yellow, fontSize: '14.4px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '4px' }}>PLAN</h2>
              <p style={{ fontSize: '12px', color: bb.gray, letterSpacing: '0.5px' }}>MANAGE YOUR PLAN AND AI ACCESS</p>
            </div>
            {!editingPlan && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  disabled={true}
                  style={{
                    border: `1px solid ${bb.border2}`,
                    backgroundColor: 'transparent',
                    color: bb.amber,
                    padding: '4px 12px',
                    fontSize: '13.2px',
                    fontFamily: 'inherit',
                    cursor: 'not-allowed',
                    letterSpacing: '1px',
                    opacity: 0.4
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                    if (tooltip) tooltip.style.display = 'block'
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                    if (tooltip) tooltip.style.display = 'none'
                  }}>
                  CHANGE
                </button>
                <div style={{
                  display: 'none',
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#000',
                  border: `1px solid ${bb.orange}`,
                  borderRadius: '4px',
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  zIndex: 100,
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px',
                  color: '#ccc'
                }}>
                  Available after beta
                </div>
              </div>
            )}
          </div>

          {!editingPlan ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${bb.border}`, backgroundColor: bb.panel, padding: '12px 16px' }}>
                <span style={{ backgroundColor: PLAN_LABELS[currentPlan].bgColor, color: bb.white, padding: '2px 8px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  {PLAN_LABELS[currentPlan].badge}
                </span>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '14.4px', color: bb.white, letterSpacing: '1px' }}>{PLAN_LABELS[currentPlan].name}</p>
                  <p style={{ fontSize: '12px', color: bb.gray }}>{PLAN_LABELS[currentPlan].desc}</p>
                </div>
                {currentPlan === 'pro' && aiQueriesLeft !== null && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: bb.amber, letterSpacing: '0.5px' }}>{aiQueriesLeft} AI QUERIES LEFT TODAY</span>
                )}
                {currentPlan === 'pro_byok' && (
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: hasAiKey ? bb.green : bb.red, letterSpacing: '0.5px' }}>{hasAiKey ? '✓ API KEY CONFIGURED' : '⚠ API KEY MISSING'}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {(Object.keys(PLAN_LABELS) as PlanKey[]).map(p => (
                  <button key={p} onClick={() => setNewPlan(p)}
                    style={{
                      border: newPlan === p ? `2px solid ${bb.orange}` : `1px solid ${bb.border2}`,
                      backgroundColor: newPlan === p ? bb.surface : bb.panel,
                      padding: '12px', textAlign: 'left', cursor: 'pointer'
                    }}>
                    <span style={{ backgroundColor: PLAN_LABELS[p].bgColor, color: bb.white, padding: '2px 6px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', display: 'inline-block', marginBottom: '8px' }}>{PLAN_LABELS[p].badge}</span>
                    <p style={{ fontSize: '13.2px', fontWeight: 'bold', color: bb.white, letterSpacing: '1px', marginBottom: '4px' }}>{PLAN_LABELS[p].name}</p>
                    <p style={{ fontSize: '13px', color: bb.gray }}>{PLAN_LABELS[p].desc}</p>
                  </button>
                ))}
              </div>

              {newPlan === 'pro_byok' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: bb.gray, marginBottom: '4px', letterSpacing: '1px' }}>ANTHROPIC API KEY</label>
                  <input type="password" value={byokKey} onChange={e => setByokKey(e.target.value)}
                    placeholder={hasAiKey ? '••••••• (LEAVE EMPTY TO KEEP CURRENT)' : 'sk-ant-api03-...'}
                    style={{ width: '100%', backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '8px 10px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                </div>
              )}

              {planError && <p style={{ marginBottom: '12px', fontSize: '13.2px', color: bb.red }}>▶ ERROR: {planError.toUpperCase()}</p>}
              {planSuccess && <p style={{ marginBottom: '12px', fontSize: '13.2px', color: bb.green }}>✓ PLAN UPDATED</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setEditingPlan(false); setPlanError(null) }}
                  style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '6px 12px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
                  CANCEL
                </button>
                <button disabled={planSaving} onClick={async () => {
                  if (newPlan === 'pro_byok' && !byokKey.trim() && !hasAiKey) {
                    setPlanError('ENTER YOUR ANTHROPIC API KEY'); return
                  }
                  setPlanSaving(true); setPlanError(null); setPlanSuccess(false)
                  try {
                    const res = await fetch('/api/auth/plan', {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ plan: newPlan, ai_api_key: newPlan === 'pro_byok' && byokKey.trim() ? byokKey.trim() : null }),
                    })
                    const data = await res.json()
                    if (!res.ok || !data.ok) throw new Error(data.error || 'Error')
                    setCurrentPlan(newPlan); setEditingPlan(false); setPlanSuccess(true)
                    if (newPlan === 'pro_byok' && byokKey.trim()) setHasAiKey(true)
                    setTimeout(() => setPlanSuccess(false), 3000)
                  } catch (e: unknown) {
                    setPlanError(e instanceof Error ? e.message : 'ERROR')
                  } finally { setPlanSaving(false) }
                }}
                  style={{
                    backgroundColor: planSaving ? bb.border2 : bb.orange, color: '#000', border: 'none',
                    padding: '6px 24px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                    cursor: planSaving ? 'not-allowed' : 'pointer'
                  }}>
                  {planSaving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Broker Section */}
        <section style={{ marginBottom: '24px', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: bb.yellow, fontSize: '14.4px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '4px' }}>BROKER</h2>
              <p style={{ fontSize: '12px', color: bb.gray, letterSpacing: '0.5px' }}>BROKER CONNECTION FOR DATA AND GREEKS</p>
            </div>
            {!editing && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  disabled={true}
                  style={{
                    border: `1px solid ${bb.border2}`,
                    backgroundColor: 'transparent',
                    color: bb.amber,
                    padding: '4px 12px',
                    fontSize: '13.2px',
                    fontFamily: 'inherit',
                    cursor: 'not-allowed',
                    letterSpacing: '1px',
                    opacity: 0.4
                  }}
                  onMouseEnter={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                    if (tooltip) tooltip.style.display = 'block'
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                    if (tooltip) tooltip.style.display = 'none'
                  }}>
                  CHANGE
                </button>
                <div style={{
                  display: 'none',
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#000',
                  border: `1px solid ${bb.orange}`,
                  borderRadius: '4px',
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  zIndex: 100,
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px',
                  color: '#ccc'
                }}>
                  Available after beta
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <p style={{ fontSize: '13.2px', color: bb.gray }}>LOADING...</p>
          ) : !editing ? (
            current ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${bb.border}`, backgroundColor: bb.panel, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px', backgroundColor: bb.orange, color: '#000', fontSize: '12px', fontWeight: 'bold' }}>
                  {BROKERS.find(b => b.key === current.broker)?.badge ?? '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '13.2px', color: bb.white, letterSpacing: '1px' }}>{brokerLabel(current.broker)}</p>
                  {current.broker === 'ibkr' && (
                    <p style={{ fontSize: '12px', color: bb.gray }}>
                      {(current.config.host as string)}:{(current.config.port as number)} · CLIENT {(current.config.client_id as number)}
                    </p>
                  )}
                  {current.broker === 'tastytrade' && (
                    <p style={{ fontSize: '12px', color: bb.gray }}>{current.config.username as string}</p>
                  )}
                </div>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: bb.green, letterSpacing: '1px' }}>
                  <span style={{ height: '6px', width: '6px', backgroundColor: bb.green }} />
                  CONFIGURED
                </span>
              </div>
            ) : (
              <div style={{ border: `1px dashed ${bb.border2}`, padding: '24px 16px', textAlign: 'center', fontSize: '13.2px', color: bb.gray }}>
                NO BROKER CONFIGURED.{' '}
                <span style={{ color: '#666', opacity: 0.6, fontFamily: 'inherit', fontSize: 'inherit' }}>(Available after beta)</span>
              </div>
            )
          ) : (
            <div>
              <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {BROKERS.map(b => (
                  <button key={b.key} onClick={() => setSelected(b.key)}
                    style={{
                      border: selected === b.key ? `2px solid ${bb.orange}` : `1px solid ${bb.border2}`,
                      backgroundColor: selected === b.key ? bb.surface : bb.panel,
                      padding: '16px', textAlign: 'left', cursor: 'pointer'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '28px', width: '28px',
                        backgroundColor: selected === b.key ? bb.orange : bb.border2,
                        color: selected === b.key ? '#000' : bb.gray,
                        fontSize: '12px', fontWeight: 'bold'
                      }}>{b.badge}</div>
                      <span style={{ fontSize: '13.2px', fontWeight: 'bold', color: bb.white, letterSpacing: '1px' }}>{b.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selected === 'ibkr' && (
                <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>HOST</span>
                    <input value={ibkrHost} onChange={e => setIbkrHost(e.target.value)}
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>PORT</span>
                    <input value={ibkrPort} onChange={e => setIbkrPort(e.target.value)}
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '13px', color: bb.gray }}>PAPER: 7497 · LIVE: 7496</span>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>CLIENT ID</span>
                    <input value={ibkrClientId} onChange={e => setIbkrClientId(e.target.value)}
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>ACCOUNT (OPTIONAL)</span>
                    <input value={ibkrAccount} onChange={e => setIbkrAccount(e.target.value)}
                      placeholder="DU123456"
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                  </label>
                </div>
              )}

              {selected === 'tastytrade' && (
                <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>USERNAME</span>
                    <input value={ttUsername} onChange={e => setTtUsername(e.target.value)}
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13.2px' }}>
                    <span style={{ color: bb.gray, fontSize: '12px', letterSpacing: '1px' }}>PASSWORD</span>
                    <input type="password" value={ttPassword} onChange={e => setTtPassword(e.target.value)}
                      style={{ backgroundColor: bb.panel, border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '13.2px', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '13px', color: bb.gray }}>NOT SAVED</span>
                  </label>
                </div>
              )}

              {error && <p style={{ marginBottom: '12px', fontSize: '13.2px', color: bb.red }}>▶ ERROR: {error.toUpperCase()}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setEditing(false); setError(null) }}
                  style={{ border: `1px solid ${bb.border2}`, backgroundColor: 'transparent', color: bb.gray, padding: '6px 12px', fontSize: '13.2px', fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px' }}>
                  CANCEL
                </button>
                <button onClick={save} disabled={!canSave() || saving}
                  style={{
                    backgroundColor: (!canSave() || saving) ? bb.border2 : bb.orange, color: '#000', border: 'none',
                    padding: '6px 24px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px',
                    cursor: (!canSave() || saving) ? 'not-allowed' : 'pointer'
                  }}>
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
            </div>
          )}

          {success && (
            <p style={{ marginTop: '12px', fontSize: '13.2px', color: bb.green }}>✓ BROKER UPDATED</p>
          )}
        </section>

        {/* Account Actions */}
        <section style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          <h2 style={{ color: bb.yellow, fontSize: '14.4px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '4px' }}>ACCOUNT</h2>
          <p style={{ fontSize: '12px', color: bb.gray, marginBottom: '16px', letterSpacing: '0.5px' }}>LOGOUT OR DELETE YOUR ACCOUNT</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Logout Button */}
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  credentials: 'include',
                })
                localStorage.clear()
                window.location.href = '/'
              }}
              style={{
                border: `1px solid ${bb.border2}`,
                backgroundColor: 'transparent',
                color: bb.white,
                padding: '8px 16px',
                fontSize: '13.2px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '1px',
                width: 'fit-content'
              }}
            >
              LOGOUT
            </button>

            {/* Delete Account Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                border: `1px solid #FF4444`,
                backgroundColor: 'transparent',
                color: '#FF4444',
                padding: '8px 16px',
                fontSize: '13.2px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '1px',
                width: 'fit-content'
              }}
            >
              DELETE ACCOUNT
            </button>
          </div>
        </section>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}>
            <div style={{
              backgroundColor: bb.surface,
              border: `2px solid #FF4444`,
              padding: '32px',
              maxWidth: '500px',
              width: '100%'
            }}>
              <h3 style={{
                color: '#FF4444',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                marginBottom: '16px',
                fontFamily: 'Space Mono, monospace'
              }}>
                ⚠ DELETE ACCOUNT
              </h3>

              <p style={{
                color: bb.white,
                fontSize: '14.4px',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                This action is permanent. All your data will be deleted including watchlists, broker settings, and scan history.
              </p>

              <p style={{
                color: bb.gray,
                fontSize: '13.2px',
                marginBottom: '12px',
                letterSpacing: '1px'
              }}>
                Type <span style={{ color: '#FF4444', fontWeight: 'bold' }}>DELETE</span> to confirm:
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: bb.panel,
                  border: `1px solid ${bb.border2}`,
                  color: bb.orange,
                  padding: '10px 12px',
                  fontSize: '14.4px',
                  fontFamily: 'inherit',
                  marginBottom: '24px',
                  letterSpacing: '2px'
                }}
              />

              {deleteError && (
                <p style={{
                  color: '#FF4444',
                  fontSize: '13.2px',
                  marginBottom: '16px'
                }}>
                  ▶ ERROR: {deleteError.toUpperCase()}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                    setDeleteError(null)
                  }}
                  disabled={deleting}
                  style={{
                    border: `1px solid ${bb.border2}`,
                    backgroundColor: 'transparent',
                    color: bb.white,
                    padding: '8px 20px',
                    fontSize: '13.2px',
                    fontFamily: 'inherit',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    letterSpacing: '1px',
                    opacity: deleting ? 0.5 : 1
                  }}
                >
                  CANCEL
                </button>

                <button
                  onClick={async () => {
                    if (deleteConfirmText !== 'DELETE') {
                      setDeleteError('You must type DELETE to confirm')
                      return
                    }

                    setDeleting(true)
                    setDeleteError(null)

                    console.log('[DELETE ACCOUNT] Calling DELETE /api/auth/me')

                    let deleteSuccess = false

                    try {
                      const res = await fetch('/api/auth/me', {
                        method: 'DELETE',
                        credentials: 'include'
                      })

                      console.log('[DELETE ACCOUNT] Response status:', res.status, res.ok)

                      if (!res.ok && res.status !== 401) {
                        // Try to parse error message (ignore 401 - user might already be deleted)
                        try {
                          const data = await res.json()
                          throw new Error(data.detail || 'Failed to delete account')
                        } catch {
                          throw new Error('Failed to delete account')
                        }
                      }

                      // Account deleted successfully (or 401 if already deleted)
                      deleteSuccess = true
                    } catch (e: unknown) {
                      setDeleteError(e instanceof Error ? e.message : 'Failed to delete account')
                      setDeleting(false)
                      return
                    }

                    // Always logout to clear cookie, even if delete returned 401
                    try {
                      console.log('[DELETE ACCOUNT] Calling logout to clear cookie')
                      await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                      })
                      console.log('[DELETE ACCOUNT] Cookie cleared')
                    } catch (logoutErr) {
                      console.warn('[DELETE ACCOUNT] Logout failed (ignoring):', logoutErr)
                      // Continue anyway - the account is deleted
                    }

                    // Clear local storage and hard reload
                    localStorage.clear()
                    console.log('[DELETE ACCOUNT] Redirecting to home')
                    window.location.href = '/'
                  }}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  style={{
                    border: 'none',
                    backgroundColor: deleteConfirmText === 'DELETE' && !deleting ? '#FF4444' : bb.border2,
                    color: deleteConfirmText === 'DELETE' && !deleting ? '#000' : bb.gray,
                    padding: '8px 24px',
                    fontSize: '13.2px',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                    letterSpacing: '1px'
                  }}
                >
                  {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </ProtectedRoute>
  )
}
