'use client'

import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

const bb = {
  bg: '#000000', surface: '#0a0a00', panel: '#111100',
  border: '#222200', border2: '#333300',
  orange: '#FF6600', amber: '#FFAA00', yellow: '#FFE000',
  green: '#00DD00', red: '#FF3333', white: '#CCCCCC', gray: '#FFFFFF',
}

export default function PortfolioPage() {
  const { user, loading } = useUser()

  if (loading) return null

  return (
    <ProtectedRoute>
      {!user || user.plan === 'free' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace' }}>
          <div style={{ maxWidth: '500px' }}>
            <div style={{ fontSize: '57.6px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ color: bb.orange, fontSize: '21.6px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>PORTFOLIO NOT AVAILABLE</h2>
            <p style={{ fontSize: '13.2px', color: bb.gray, marginBottom: '24px', letterSpacing: '0.5px' }}>
              PORTFOLIO IS AVAILABLE ON PRO AND PRO BYOK PLANS WITH A CONNECTED BROKER.
            </p>
            <Link href="/settings"
              style={{ display: 'inline-block', backgroundColor: bb.orange, color: '#000', padding: '10px 24px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px', textDecoration: 'none' }}>
              UPGRADE PLAN ▶
            </Link>
          </div>
        </div>
      ) : !user.has_broker ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace' }}>
          <div style={{ maxWidth: '500px' }}>
            <div style={{ fontSize: '57.6px', marginBottom: '16px' }}>🔗</div>
            <h2 style={{ color: bb.orange, fontSize: '21.6px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>CONNECT YOUR BROKER</h2>
            <p style={{ fontSize: '13.2px', color: bb.gray, marginBottom: '12px', letterSpacing: '0.5px' }}>
              PORTFOLIO READS POSITIONS DIRECTLY FROM YOUR BROKER ACCOUNT (IBKR OR TASTYTRADE) AND SHOWS ONLY OPEN OPTIONS.
            </p>
            <p style={{ fontSize: '12px', color: bb.gray, marginBottom: '24px' }}>
              SUPPORTED BROKERS: INTERACTIVE BROKERS (IBKR), TASTYTRADE
            </p>
            <Link href="/settings"
              style={{ display: 'inline-block', backgroundColor: bb.orange, color: '#000', padding: '10px 24px', fontSize: '13.2px', fontFamily: 'inherit', fontWeight: 'bold', letterSpacing: '1px', textDecoration: 'none' }}>
              CONFIGURE BROKER ▶
            </Link>
          </div>
        </div>
      ) : (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px', textAlign: 'center', backgroundColor: bb.bg, color: bb.white, fontFamily: 'Courier New, monospace' }}>
      <div style={{ maxWidth: '600px' }}>
        <div style={{ fontSize: '57.6px', marginBottom: '16px' }}>🚧</div>
        <h2 style={{ color: bb.orange, fontSize: '21.6px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>BROKER INTEGRATION IN DEVELOPMENT</h2>
        <p style={{ fontSize: '13.2px', color: bb.gray, marginBottom: '16px', letterSpacing: '0.5px' }}>
          THE PORTFOLIO MODULE WILL READ YOUR OPTION POSITIONS DIRECTLY FROM{' '}
          <span style={{ color: bb.amber, fontWeight: 'bold' }}>
            {user.has_broker ? 'YOUR CONNECTED BROKER' : 'IBKR / TASTYTRADE'}
          </span>{' '}
          AND DISPLAY P&L, UPDATED GREEKS AND MANAGEMENT SIGNALS (CRITICAL DTE, IV CRUSH, ETC.).
        </p>
        <div style={{ marginBottom: '24px', border: `1px solid ${bb.border2}`, backgroundColor: bb.surface, padding: '16px', textAlign: 'left', fontSize: '13.2px' }}>
          <p style={{ fontWeight: 'bold', color: bb.yellow, marginBottom: '8px', fontSize: '12px', letterSpacing: '1px' }}>WHAT WILL BE INCLUDED:</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: bb.gray, listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: bb.green }}>✓</span> OPTIONS POSITIONS FROM BROKER (FILTERED FROM STOCKS/BONDS)</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: bb.green }}>✓</span> LIVE P&L WITH BROKER PRICES</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: bb.green }}>✓</span> UPDATED GREEKS (DELTA, VEGA, THETA, GAMMA)</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: bb.green }}>✓</span> CRITICAL DTE ALERT (&lt; 90 DAYS)</li>
            <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: bb.green }}>✓</span> ROLL / CLOSE SIGNALS BASED ON COILED SPRING STRATEGY</li>
          </ul>
        </div>
        <p style={{ fontSize: '12px', color: bb.gray, letterSpacing: '1px' }}>AVAILABLE IN NEXT UPDATE</p>
      </div>
    </div>
      )}
    </ProtectedRoute>
  )
}
