'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'

export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const [isMobile, setIsMobile] = useState(false)
  const [time, setTime] = useState('')
  const [isDayMode, setIsDayMode] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Theme — init from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'night'
    if (saved === 'day') {
      document.body.classList.add('day-mode')
      setIsDayMode(true)
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDayMode
    setIsDayMode(next)
    if (next) {
      document.body.classList.add('day-mode')
      localStorage.setItem('theme', 'day')
    } else {
      document.body.classList.remove('day-mode')
      localStorage.setItem('theme', 'night')
    }
  }

  const links = [
    { href: '/dashboard',    label: isMobile ? '⌂' : 'DASHBOARD' },
    { href: '/scanner',      label: 'SCANNER' },
    { href: '/hv-screener',  label: isMobile ? 'HV' : 'HV SCREENER' },
    { href: '/watchlists',   label: 'WATCHLIST' },
    { href: '/portfolio',    label: 'PORTFOLIO' },
    { href: '/etf-calendar',  label: isMobile ? 'ETF' : 'ETF CAL' },
    { href: '/sp500-calendar', label: isMobile ? 'S&P' : 'S&P CAL' },
    { href: '/academy',      label: 'ACADEMY' },
    { href: '/settings',     label: 'SETTINGS' },
  ]

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      localStorage.clear()
      window.location.href = '/'
    } catch {
      localStorage.clear()
      window.location.href = '/'
    }
  }

  return (
    <nav style={{
      backgroundColor: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      fontFamily: 'var(--font-sans)',
      fontSize: '13px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }} className="flex items-center px-3 gap-0">
      {/* Logo */}
      <div style={{ paddingRight: '12px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img src="/logo.png" alt="Coiled Spring" style={{ height: isMobile ? '32px' : '48px', width: 'auto', display: 'block' }} />
      </div>

      {/* Nav tabs — underline style */}
      <div className="flex items-stretch gap-0" style={{ alignSelf: 'stretch', overflowX: 'auto', flexShrink: 1 }}>
        {links.map(l => {
          const active = path.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-tab${active ? ' active' : ''}`}
              style={{ fontSize: isMobile ? '10px' : undefined, padding: isMobile ? '8px 8px' : undefined, whiteSpace: 'nowrap' }}
            >
              {l.label}
            </Link>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      {user && (
        <div className="flex items-center gap-2" style={{ fontSize: '12px', flexShrink: 0 }}>
          {/* Plan badge */}
          <span style={{
            background: user.plan === 'pro_byok' ? 'rgba(74,222,128,0.12)' :
                        user.plan === 'pro' ? 'rgba(37,99,235,0.12)' : 'var(--bg-hover)',
            color: user.plan === 'pro_byok' ? 'var(--positive)' :
                   user.plan === 'pro' ? '#60a5fa' : 'var(--text-secondary)',
            padding: '2px 8px',
            border: `1px solid ${user.plan === 'pro_byok' ? 'rgba(74,222,128,0.3)' : user.plan === 'pro' ? 'rgba(37,99,235,0.3)' : 'var(--border)'}`,
            borderRadius: '4px',
            fontWeight: '600',
            fontSize: '10px',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-mono)',
          }}>
            {user.plan === 'pro_byok' ? 'BYOK' : user.plan.toUpperCase()}
          </span>

          {/* Email */}
          {!isMobile && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{user.email}</span>
          )}

          {/* Upgrade */}
          {user.plan === 'free' && (
            <button onClick={() => router.push('/pricing')} style={{
              background: 'var(--accent)', color: 'var(--bg-primary)',
              border: 'none', padding: '3px 8px', fontSize: '10px', fontWeight: '600',
              letterSpacing: '0.3px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
              borderRadius: '4px', flexShrink: 0,
            }}>
              {isMobile ? '▲' : 'UPGRADE'}
            </button>
          )}

          {/* Logout */}
          <button onClick={handleLogout} style={{
            background: 'transparent', color: 'var(--accent)',
            border: '1px solid var(--border)', padding: '3px 8px',
            fontSize: '10px', fontWeight: '500', letterSpacing: '0.3px',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', borderRadius: '4px', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
            {isMobile ? '✕' : 'LOGOUT'}
          </button>

          {/* Clock */}
          {!isMobile && (
            <span style={{
              color: 'var(--accent)', borderLeft: '1px solid var(--border)',
              paddingLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px',
              fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>
              {time}
            </span>
          )}

          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title={isDayMode ? 'Switch to Night' : 'Switch to Day'}>
            {isDayMode ? '☀️' : '🌙'}
          </button>
        </div>
      )}
    </nav>
  )
}
