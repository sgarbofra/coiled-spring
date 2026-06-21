'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const bb = {
  bg: '#000000', surface: '#0a0a00', border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setShowModal(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '400px' }}>
        {/* Logo */}
        <div style={{
          color: '#FF6B00',
          fontFamily: 'Courier New, monospace',
          fontSize: '22px',
          fontWeight: 'bold',
          letterSpacing: '3px',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          COILED SPRING TERMINAL
        </div>

        {/* Header */}
        <div style={{ borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px', marginBottom: '24px' }}>
          <div style={{ color: bb.orange, fontSize: '26.4px', fontWeight: 'bold', letterSpacing: '3px' }}>
            PASSWORD RESET
          </div>
        </div>

        {/* Form */}
        <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
            REQUEST RESET LINK
          </div>

          <form onSubmit={submit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: bb.gray, fontSize: '13.2px', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', backgroundColor: '#0a0a00', border: `1px solid ${bb.border2}`, color: bb.orange, padding: '6px 8px', fontSize: '15.6px', fontFamily: 'inherit' }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: bb.gray, lineHeight: '1.5' }}>
                    Enter your email address and we'll send you a link to reset your password.
                  </div>
                </div>

                {error && (
                  <div style={{ color: bb.red, fontSize: '13.2px', marginBottom: '12px', border: `1px solid ${bb.red}`, padding: '6px 8px', backgroundColor: '#1a0000' }}>
                    ▶ ERROR: {error.toUpperCase()}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: loading ? bb.border2 : bb.orange,
                    color: '#000000',
                    border: 'none',
                    padding: '8px',
                    fontSize: '15.6px',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'SENDING...' : 'SEND RESET LINK →'}
                </button>
              </form>

          <div style={{ marginTop: '16px', borderTop: `1px solid ${bb.border}`, paddingTop: '12px', fontSize: '13.2px', color: bb.gray }}>
            <Link href="/login" style={{ color: bb.amber, textDecoration: 'none' }}>
              ← BACK TO LOGIN
            </Link>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowModal(false)
            router.push('/login')
          }}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: `2px solid ${bb.orange}`,
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              fontFamily: 'Courier New, monospace',
            }}
            onClick={e => e.stopPropagation()} // Prevent closing when clicking modal content
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: `2px solid ${bb.orange}`,
            }}>
              <span style={{ fontSize: '32px' }}>✅</span>
              <h2 style={{
                margin: 0,
                color: bb.orange,
                fontSize: '24px',
                fontWeight: 'bold',
                letterSpacing: '2px',
              }}>
                EMAIL SENT!
              </h2>
            </div>

            {/* Content */}
            <div style={{
              color: bb.white,
              fontSize: '14px',
              lineHeight: '1.7',
              marginBottom: '24px',
            }}>
              <p style={{ marginBottom: '16px' }}>
                We've sent a password reset link to your email address.
              </p>
              <p style={{ marginBottom: '16px' }}>
                Please check your inbox (and spam folder) and click the link to reset your password.
              </p>
              <p style={{ margin: 0, color: bb.amber, fontWeight: 'bold' }}>
                The link expires in 1 hour.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowModal(false)
                router.push('/login')
              }}
              style={{
                width: '100%',
                backgroundColor: bb.orange,
                color: '#000000',
                border: 'none',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = bb.amber}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = bb.orange}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
