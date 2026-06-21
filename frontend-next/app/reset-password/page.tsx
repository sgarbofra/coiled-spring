'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const bb = {
  bg: '#000000', surface: '#0a0a00', border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link')
    }
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || 'Reset failed')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Coiled Spring" style={{ height: '60px', display: 'inline-block' }} />
        </div>

        {/* Header */}
        <div style={{ borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px', marginBottom: '24px' }}>
          <div style={{ color: bb.orange, fontSize: '26.4px', fontWeight: 'bold', letterSpacing: '3px' }}>
            NEW PASSWORD
          </div>
          <div style={{ color: bb.amber, fontSize: '13.2px', letterSpacing: '2px', marginTop: '2px' }}>
            COILED SPRING TERMINAL
          </div>
        </div>

        {/* Form */}
        <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          {!success ? (
            <>
              <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
                RESET YOUR PASSWORD
              </div>

              <form onSubmit={submit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: bb.gray, fontSize: '13.2px', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                    NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ width: '100%', backgroundColor: '#0a0a00', border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '15.6px', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: bb.gray, fontSize: '13.2px', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ width: '100%', backgroundColor: '#0a0a00', border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '15.6px', fontFamily: 'inherit' }}
                  />
                </div>

                {error && (
                  <div style={{ color: bb.red, fontSize: '13.2px', marginBottom: '12px', border: `1px solid ${bb.red}`, padding: '6px 8px', backgroundColor: '#1a0000' }}>
                    ▶ ERROR: {error.toUpperCase()}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  style={{
                    width: '100%',
                    backgroundColor: (loading || !token) ? bb.border2 : bb.orange,
                    color: '#000000',
                    border: 'none',
                    padding: '8px',
                    fontSize: '15.6px',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'RESETTING...' : 'RESET PASSWORD →'}
                </button>
              </form>
            </>
          ) : (
            <div>
              <div style={{ color: bb.green, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
                ✓ PASSWORD RESET SUCCESSFUL
              </div>
              <p style={{ fontSize: '13.2px', color: bb.white, lineHeight: '1.6', marginBottom: '20px' }}>
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
          )}

          <div style={{ marginTop: '16px', borderTop: `1px solid ${bb.border}`, paddingTop: '12px', fontSize: '13.2px', color: bb.gray }}>
            <Link href="/login" style={{ color: bb.amber, textDecoration: 'none' }}>
              ← BACK TO LOGIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
