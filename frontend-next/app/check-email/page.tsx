'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const bb = {
  bg: '#000000', surface: '#0a0a00', border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div style={{ backgroundColor: bb.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace' }}>
      <div style={{ width: '500px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Coiled Spring" style={{ height: '60px', display: 'inline-block' }} />
        </div>

        {/* Header */}
        <div style={{ borderBottom: `2px solid ${bb.orange}`, paddingBottom: '12px', marginBottom: '24px' }}>
          <div style={{ color: bb.orange, fontSize: '26.4px', fontWeight: 'bold', letterSpacing: '3px' }}>
            CHECK YOUR INBOX
          </div>
          <div style={{ color: bb.amber, fontSize: '13.2px', letterSpacing: '2px', marginTop: '2px' }}>
            COILED SPRING TERMINAL
          </div>
        </div>

        {/* Content */}
        <div style={{ border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '32px' }}>
          <div style={{ color: bb.yellow, fontSize: '13.2px', letterSpacing: '2px', marginBottom: '20px', borderBottom: `1px solid ${bb.border}`, paddingBottom: '8px' }}>
            VERIFICATION EMAIL SENT
          </div>

          <p style={{ fontSize: '14.4px', color: bb.white, lineHeight: '1.8', marginBottom: '20px' }}>
            We sent a verification link to:
          </p>

          <div style={{
            backgroundColor: '#0a0a00',
            border: `1px solid ${bb.orange}`,
            padding: '12px 16px',
            marginBottom: '24px',
            color: bb.orange,
            fontSize: '15.6px',
            fontWeight: 'bold',
            textAlign: 'center',
            letterSpacing: '1px'
          }}>
            {email}
          </div>

          <p style={{ fontSize: '14.4px', color: bb.white, lineHeight: '1.8', marginBottom: '20px' }}>
            Click the link in the email to activate your account and log in.
          </p>

          <div style={{
            backgroundColor: '#1a1a00',
            border: `1px solid ${bb.border2}`,
            padding: '16px',
            marginBottom: '24px',
            fontSize: '13.2px',
            color: bb.gray,
            lineHeight: '1.6'
          }}>
            <div style={{ color: bb.yellow, fontWeight: 'bold', marginBottom: '8px' }}>
              DIDN'T RECEIVE THE EMAIL?
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>Check your spam/junk folder</li>
              <li>Wait a few minutes and refresh your inbox</li>
              <li>Make sure you entered the correct email address</li>
            </ul>
          </div>

          <div style={{ marginTop: '24px', borderTop: `1px solid ${bb.border}`, paddingTop: '16px', fontSize: '13.2px', color: bb.gray, textAlign: 'center' }}>
            <Link href="/login" style={{ color: bb.amber, textDecoration: 'none', letterSpacing: '1px' }}>
              ← BACK TO LOGIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  )
}
