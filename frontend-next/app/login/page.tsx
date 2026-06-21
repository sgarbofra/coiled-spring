'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'

const bb = {
  bg: '#000000', surface: '#0a0a00', border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check for verified parameter
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified! You can now log in')
    }
  }, [searchParams])

  // FIX 1: Redirect se già autenticato
  useEffect(() => {
    if (!userLoading && user) {
      router.push('/scanner')
    }
  }, [user, userLoading, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Login failed')

      console.log('[LOGIN DEBUG] Login successful, token saved by server')

      // Check for redirect parameter
      const urlParams = new URLSearchParams(window.location.search)
      const redirect = urlParams.get('redirect')
      console.log('[LOGIN DEBUG] Redirecting to:', redirect || '/watchlists')

      window.location.href = redirect || '/watchlists'
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally { setLoading(false) }
  }

  // Mostra loading mentre controlla autenticazione
  if (userLoading) {
    return null
  }

  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '400px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#F97316', fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
            COILED SPRING TERMINAL
          </h1>
          <div style={{ color: '#FFE000', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '8px' }}>
            OPTION LEAPS ANALYTICS TOOL
          </div>
        </div>

        {/* Header Bloomberg-style */}
        <div style={{ borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px', marginBottom: '24px' }}>
        </div>

        {/* Login box */}
        <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
            USER AUTHENTICATION
          </div>

          {successMessage && (
            <div style={{ color: bb.green, fontSize: '13.2px', marginBottom: '20px', border: `1px solid ${bb.green}`, padding: '12px', backgroundColor: '#001a00', letterSpacing: '1px' }}>
              SUCCESS: {successMessage.toUpperCase()}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: bb.gray, fontSize: '13.2px', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                EMAIL
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', backgroundColor: '#0a0a00', border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '15.6px', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: bb.gray, fontSize: '13.2px', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                PASSWORD
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', backgroundColor: '#0a0a00', border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '15.6px', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: '6px', textAlign: 'right' }}>
                <Link
                  href="/forgot-password"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  style={{ color: bb.amber, fontSize: '12px', textDecoration: 'none', letterSpacing: '0.5px', cursor: 'pointer' }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div style={{ color: bb.red, fontSize: '13.2px', marginBottom: '12px', border: `1px solid ${bb.red}`, padding: '6px 8px', backgroundColor: '#1a0000' }}>
                ▶ ERROR: {error.toUpperCase()}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', backgroundColor: loading ? bb.border2 : bb.orange,
                color: '#000000', border: 'none', padding: '8px', fontSize: '15.6px',
                fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'AUTHENTICATING...' : '▶ LOGIN'}
            </button>
          </form>

          <div style={{ marginTop: '16px', borderTop: `1px solid ${bb.border}`, paddingTop: '12px', fontSize: '13.2px', color: bb.gray }}>
            NEW USER?{' '}
            <Link href="/register" style={{ color: bb.amber, textDecoration: 'none', cursor: 'pointer' }}>
              CREATE ACCOUNT ▶
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '12px', color: bb.gray, textAlign: 'center', letterSpacing: '1px' }}>
          COILED SPRING STRATEGY · LEAPS OPTIONS ANALYTICS
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
