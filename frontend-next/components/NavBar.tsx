'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const { user } = useUser()

  const isPro = user?.plan === 'pro' || user?.plan === 'pro_byok'
  const hasBroker = user?.has_broker ?? false

  const links = [
    { href: '/watchlists', label: 'WATCHLIST' },
    { href: '/scanner',    label: 'SCANNER' },
    { href: '/portfolio',  label: 'PORTFOLIO' },
    { href: '/settings',   label: 'SETTINGS' },
  ]

  const now = new Date()
  const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const handleLogout = async () => {
    try {
      // Call backend to delete httpOnly cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Clear all localStorage
      localStorage.clear()

      // Force hard reload to clear React state
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Force hard reload even if logout fails
      localStorage.clear()
      window.location.href = '/'
    }
  }

  return (
    <nav style={{
      backgroundColor: '#000000',
      borderBottom: '1px solid #FF6600',
      fontFamily: 'Courier New, monospace',
      fontSize: '14.4px',
    }} className="flex items-center gap-0 px-2 py-1">
      {/* Logo Bloomberg-style */}
      <div style={{ borderRight: '1px solid #333300', paddingRight: '12px', marginRight: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logo.png" alt="Coiled Spring" style={{ height: '56px', width: 'auto', display: 'block' }} />
        <span style={{ color: '#FFAA00', fontSize: '12px' }}>TERMINAL</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-0">
        {links.filter(l => l.show !== false).map(l => {
          const active = path.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href} style={{
              color: active ? '#000000' : '#FFAA00',
              backgroundColor: active ? '#FF6600' : 'transparent',
              padding: '2px 10px',
              borderRight: '1px solid #222200',
              fontWeight: active ? 'bold' : 'normal',
              letterSpacing: '1px',
              fontSize: '13.2px',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = '#FF6600' }}
            onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = '#FFAA00' }}
            >
              {l.label}
            </Link>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side — user info */}
      {user && (
        <div className="flex items-center gap-3" style={{ fontSize: '13.2px' }}>
          {/* User info column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            {/* Email and plan badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FFFFFF' }}>{user.email}</span>
              <span style={{
                backgroundColor: user.plan === 'pro_byok' ? '#005500' :
                                 user.plan === 'pro' ? '#003366' : '#222200',
                color: user.plan === 'pro_byok' ? '#00DD00' :
                       user.plan === 'pro' ? '#00CCCC' : '#FFFFFF',
                padding: '1px 6px',
                border: `1px solid ${user.plan === 'pro_byok' ? '#00DD00' : user.plan === 'pro' ? '#00CCCC' : '#333300'}`,
                fontWeight: 'bold',
                fontSize: '12px',
                letterSpacing: '1px',
              }}>
                {user.plan === 'pro_byok' ? 'BYOK' : user.plan.toUpperCase()}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Upgrade button (only for FREE plan) */}
              {user.plan === 'free' && (
                <button
                  onClick={() => router.push('/pricing')}
                  style={{
                    backgroundColor: '#FF6B00',
                    color: '#000000',
                    border: 'none',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderRadius: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FF8833')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF6B00')}
                >
                  UPGRADE
                </button>
              )}

              {/* Logout button (always visible) */}
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: 'transparent',
                  color: '#FF6600',
                  border: '1px solid #FF6600',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '2px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF6600'
                  e.currentTarget.style.color = '#000000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#FF6600'
                }}
              >
                LOGOUT
              </button>
            </div>
          </div>

          {/* Time display */}
          <span style={{ color: '#FF6600', borderLeft: '1px solid #222200', paddingLeft: '8px' }}>
            {timeStr}
          </span>
        </div>
      )}
    </nav>
  )
}
