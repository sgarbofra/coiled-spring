'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pwFocused, setPwFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified! You can now log in')
    }
    const oauthError = searchParams.get('error')
    if (oauthError === 'google_denied') setError('Google sign-in was cancelled')
    else if (oauthError) setError('Google sign-in failed — please try again')
  }, [searchParams])

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
      const urlParams = new URLSearchParams(window.location.search)
      const redirect = urlParams.get('redirect')
      window.location.href = redirect || '/watchlists'
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally { setLoading(false) }
  }

  if (userLoading) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        .login-input {
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
        .login-input:focus {
          border-color: #e87722;
        }
        .login-input::placeholder { color: #333; }
      `}</style>

      <div style={{ backgroundColor: c.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, padding: '2rem 1rem' }}>

        {/* Subtle grid background */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(232,119,34,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,119,34,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

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

          {/* Card */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderTop: `2px solid ${c.orange}`, padding: '2rem' }}>

            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.textMuted, letterSpacing: '2px' }}>USER AUTHENTICATION</span>
              <span style={{ fontFamily: mono, fontSize: '0.65rem', color: c.orange, letterSpacing: '1px' }}>v2.4</span>
            </div>

            {successMessage && (
              <div style={{ color: c.green, fontSize: '0.82rem', marginBottom: '1.25rem', border: `1px solid rgba(0,204,68,0.3)`, padding: '0.75rem 1rem', background: 'rgba(0,204,68,0.06)', fontFamily: mono, letterSpacing: '0.5px' }}>
                ✓ {successMessage}
              </div>
            )}

            {/* Google OAuth */}
            <a href="/api/auth/google"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                width: '100%', padding: '0.72rem', marginBottom: '1rem',
                background: 'transparent', border: `1px solid ${c.border2}`,
                color: c.textSecondary, fontFamily: mono, fontSize: '0.8rem',
                letterSpacing: '0.5px', textDecoration: 'none', borderRadius: '2px',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.orange; e.currentTarget.style.color = c.textPrimary }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border2; e.currentTarget.style.color = c.textSecondary }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: '1px', background: c.border }} />
              <span style={{ fontFamily: mono, fontSize: '0.62rem', color: c.textMuted, letterSpacing: '1px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: c.border }} />
            </div>

            <form onSubmit={submit}>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '6px' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="login-input"
                  placeholder="you@domain.com"
                />
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '6px' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="login-input"
                  placeholder="••••••••"
                />
              </div>

              <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                <Link href="/forgot-password" style={{ fontFamily: mono, color: c.textMuted, fontSize: '0.68rem', textDecoration: 'none', letterSpacing: '0.5px', transition: 'color 0.2s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = c.orange)}
                  onMouseLeave={e => (e.currentTarget.style.color = c.textMuted)}>
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div style={{ color: c.red, fontSize: '0.82rem', marginBottom: '1rem', border: `1px solid rgba(255,51,51,0.3)`, padding: '0.75rem 1rem', background: 'rgba(255,51,51,0.06)', fontFamily: mono, letterSpacing: '0.5px' }}>
                  ▶ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#1a1a1a' : c.orange,
                  color: loading ? c.textMuted : '#000000',
                  border: 'none',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  fontFamily: mono,
                  fontWeight: '700',
                  letterSpacing: '1.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  borderRadius: '2px',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = c.orangeHover }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = c.orange }}
              >
                {loading ? 'AUTHENTICATING...' : '▶ LOGIN'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: mono, fontSize: '0.68rem', color: c.textMuted, letterSpacing: '0.5px' }}>
                New user?
              </span>
              <Link href="/register" style={{ fontFamily: mono, fontSize: '0.68rem', color: c.orange, textDecoration: 'none', letterSpacing: '0.5px', transition: 'color 0.2s ease' }}
                onMouseEnter={e => (e.currentTarget.style.color = c.orangeHover)}
                onMouseLeave={e => (e.currentTarget.style.color = c.orange)}>
                Create account →
              </Link>
            </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
