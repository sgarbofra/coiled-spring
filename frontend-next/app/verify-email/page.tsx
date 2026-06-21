'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const bb = {
  bg: '#000000', surface: '#0a0a00', border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link')
      setLoading(false)
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
        })

        const data = await res.json()

        if (!res.ok || !data.ok) {
          throw new Error(data.detail || data.error || 'Verification failed')
        }

        setSuccess(true)
        setMessage(data.message || 'Email verified successfully')

        // Redirect to login with verified parameter after 2 seconds
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 2000)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Verification failed')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [token, router])

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
            EMAIL VERIFICATION
          </div>
          <div style={{ color: bb.amber, fontSize: '13.2px', letterSpacing: '2px', marginTop: '2px' }}>
            COILED SPRING TERMINAL
          </div>
        </div>

        {/* Content */}
        <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '24px' }}>
          {loading ? (
            <>
              <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
                VERIFYING YOUR EMAIL...
              </div>
              <p style={{ fontSize: '13.2px', color: bb.white, lineHeight: '1.6', textAlign: 'center' }}>
                Please wait while we verify your email address.
              </p>
            </>
          ) : success ? (
            <>
              <div style={{ color: bb.green, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
                ✓ EMAIL VERIFIED
              </div>
              <p style={{ fontSize: '13.2px', color: bb.white, lineHeight: '1.6', marginBottom: '20px' }}>
                {message}
              </p>
              <p style={{ fontSize: '13.2px', color: bb.gray, lineHeight: '1.6' }}>
                Redirecting to login...
              </p>
            </>
          ) : (
            <>
              <div style={{ color: bb.red, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
                ✗ VERIFICATION FAILED
              </div>
              <div style={{ color: bb.red, fontSize: '13.2px', marginBottom: '20px', border: `1px solid ${bb.red}`, padding: '8px', backgroundColor: '#1a0000' }}>
                ▶ ERROR: {error?.toUpperCase()}
              </div>
              <p style={{ fontSize: '13.2px', color: bb.white, lineHeight: '1.6' }}>
                The verification link may be invalid or expired. Please contact support if the problem persists.
              </p>
            </>
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
