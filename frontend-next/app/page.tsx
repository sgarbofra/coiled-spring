'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingDown, Bot, BarChart2, Bookmark, Shield } from 'lucide-react'
import VixChart from '@/components/landing/VixChart'
import MarketMovers from '@/components/landing/MarketMovers'

type YouTubeVideo = {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
}

const colors = {
  bg: '#0c0e12',
  surface: '#111318',
  surface2: '#161922',
  border: '#1e2330',
  border2: '#2a2a2a',
  orange: '#e87722',
  orangeHover: '#d4651a',
  white: '#f0f2f5',
  gray: '#8b94a3',
  darkGray: '#5a6270',
  green: '#4ade80',
  red: '#f87171',
  dim: '#444444',
}

const mono = "'JetBrains Mono', 'Courier New', monospace"
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

type TickerItem = { label: string; value: string; change?: string; positive?: boolean; dim?: boolean }
const TICKER_STATIC: TickerItem[] = [
  { label: 'SPY', value: '$535.42', change: '+0.48%', positive: true },
  { label: 'VIX', value: '14.85', change: '-1.03', positive: true },
  { label: 'QQQ', value: '$462.17', change: '+0.61%', positive: true },
  { label: '2Y RATE', value: '4.71%', dim: true },
  { label: '10Y RATE', value: '4.32%', dim: true },
  { label: 'MARKET', value: 'OPEN', positive: true },
]

const SCANNER_MOCK = [
  { ticker: 'SPY',  strike: '540C', dte: '421', ivr: '12', delta: '0.28', cs: '91', csColor: '#4ade80' },
  { ticker: 'AAPL', strike: '195C', dte: '389', ivr: '18', delta: '0.32', cs: '87', csColor: '#4ade80' },
  { ticker: 'TSLA', strike: '260C', dte: '350', ivr: '22', delta: '0.25', cs: '83', csColor: '#4ade80' },
  { ticker: 'NVDA', strike: '900C', dte: '421', ivr: '09', delta: '0.30', cs: '79', csColor: colors.orange },
  { ticker: 'QQQ',  strike: '475C', dte: '389', ivr: '15', delta: '0.35', cs: '76', csColor: colors.orange },
]

export default function LandingPage() {
  const router = useRouter()
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [tutorialVideos, setTutorialVideos] = useState<YouTubeVideo[]>([])
  const [tutorialsLoading, setTutorialsLoading] = useState(true)
  const [documentaryVideos, setDocumentaryVideos] = useState<YouTubeVideo[]>([])
  const [documentariesLoading, setDocumentariesLoading] = useState(true)
  const [scanCount, setScanCount] = useState(1198)

  useEffect(() => {
    fetch('/api/youtube-tutorials')
      .then(res => res.json())
      .then(data => { if (data.ok && data.videos) setTutorialVideos(data.videos) })
      .catch(() => {})
      .finally(() => setTutorialsLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/youtube-documentaries')
      .then(res => res.json())
      .then(data => { if (data.ok && data.videos) setDocumentaryVideos(data.videos) })
      .catch(() => {})
      .finally(() => setDocumentariesLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setScanCount(n => n + Math.floor(Math.random() * 3 + 1)), 2600)
    return () => clearInterval(id)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) element.scrollIntoView({ behavior: 'smooth' })
  }

  const faqs = [
    {
      question: "What is IV Rank and why does it matter?",
      answer: "IV Rank measures where current implied volatility sits relative to its 12-month historical range. A low IV Rank means options are historically cheap — the ideal condition for buying long-dated options because you pay less for the same leverage."
    },
    {
      question: "What stocks can I scan?",
      answer: "Any US stock or ETF with listed options. Type any ticker in the scanner search field. The platform covers 3,500+ US underlyings."
    },
    {
      question: "What filters should I use to find LEAPS candidates?",
      answer: "Start with DTE between 300 and 750, Delta between 0.15 and 0.40, and IV Rank below 25. These parameters identify long-dated options with high convexity and historically low cost. Narrow by spread and open interest for liquidity."
    },
    {
      question: "Is the data real-time?",
      answer: "Options data is delayed. The platform is designed for position research and strategy analysis, not intraday execution. For LEAPS with 1–2 year horizons, delayed data is sufficient for identifying entry windows."
    },
    {
      question: "Why does Coiled Spring only cover US options?",
      answer: "US options markets are the most liquid in the world — tighter bid-ask spreads, deeper open interest across strikes and expirations, and more reliable pricing. Reliable execution on entry and exit depends on liquidity. We chose depth over breadth."
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        * { box-sizing: border-box; }
        img { max-width: 100%; }
        body { font-family: ${sans}; background: #0c0e12; }

        /* monospace tabular numerics */
        .cs-mono, [data-mono] {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum" 1;
        }

        /* section separators */
        section { border-top: 1px solid #1e2330; }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #4ade80; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #4ade80; }
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        .blink { animation: blink-cursor 1s step-end infinite; }

        .nav-link {
          background: transparent;
          border: none;
          color: #8b94a3;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          font-family: ${sans};
          transition: color 0.2s ease;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }
        .nav-link:hover { color: #e87722; }

        .step-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(232,119,34,0.15); }

        .feature-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(232,119,34,0.15); }

        .faq-answer {
          overflow: hidden;
          transition: max-height 0.35s ease, padding 0.35s ease;
        }

        .scanner-row:hover { background: rgba(232,119,34,0.06) !important; }

        @media (max-width: 900px) {
          .hero-inner { flex-direction: column !important; text-align: center !important; }
          .hero-mockup { display: none !important; }
          .hero-text { max-width: 100% !important; }
          .hero-tags { justify-content: center !important; }
          .hero-cta { justify-content: center !important; }
        }
        @media (max-width: 768px) {
          .hero-video { opacity: 0.55 !important; }
          .navbar-logo-text { display: none; }
          .nav-links { display: none !important; }
          .nav-cta { gap: 0.5rem !important; }
          .widgets-grid { grid-template-columns: 1fr !important; }
          .thesis-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .book-grid { grid-template-columns: 1fr !important; }
          .cs-score-grid { grid-template-columns: 1fr !important; }
          .hero-tags { display: none !important; }
          .ticker-bar { display: none !important; }
          .beta-badge { font-size: 0.72rem !important; padding: 0.3rem 0.75rem !important; }
        }
        @media (max-width: 480px) {
          .hero-cta { flex-direction: column !important; align-items: center !important; }
          .hero-cta button, .hero-cta a { width: 100% !important; text-align: center !important; }
        }

        /* ── Academy 3+2 grid ── */
        .academy-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.1rem; }
        .academy-card { grid-column: span 2; }
        .academy-card-wide { grid-column: span 3; }
        .course-works-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
        @media (max-width: 900px) {
          .academy-grid { grid-template-columns: 1fr !important; }
          .academy-card, .academy-card-wide { grid-column: span 1 !important; }
          .course-works-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .course-works-grid { grid-template-columns: 1fr !important; }
        }

        /* visual polish */
        .feature-card {
          background: #111318;
          border-radius: 10px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important;
        }
        .feature-card:hover {
          border-color: rgba(232,119,34,0.4) !important;
          box-shadow: 0 12px 48px rgba(232,119,34,0.22) !important;
          transform: translateY(-2px) !important;
        }
        @keyframes mockup-glow {
          0%,100% { box-shadow: 0 0 90px rgba(232,119,34,0.32),0 0 0 1px rgba(232,119,34,0.22),0 24px 60px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 130px rgba(232,119,34,0.46),0 0 0 1px rgba(232,119,34,0.32),0 24px 60px rgba(0,0,0,0.5); }
        }
        .hero-mockup > div:first-child { animation: mockup-glow 5s ease-in-out infinite; }
      `}</style>

      <div style={{ minHeight: '100vh', background: colors.bg, color: colors.white, fontFamily: sans }}>

        {/* ── NAVBAR ─────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.97)', borderBottom: `1px solid ${colors.border}`, padding: '0.875rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/logo.png" alt="Coiled Spring — LEAPS Options Scanner" style={{ height: '44px', width: 'auto' }} />
              <span className="navbar-logo-text" style={{ fontSize: '1.1rem', fontWeight: '700', color: colors.orange, fontFamily: mono, letterSpacing: '2px' }}>
                COILED SPRING
              </span>
            </div>

            <div className="nav-links" style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
              <button className="nav-link" onClick={() => scrollToSection('how-it-works')}>How it works</button>
              <button className="nav-link" onClick={() => scrollToSection('tutorial-section')}>Tutorials</button>
              <button className="nav-link" onClick={() => scrollToSection('book')}>Book</button>
              <button className="nav-link" onClick={() => scrollToSection('academy')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Academy
                <span style={{ background: colors.orange, color: colors.bg, fontSize: '0.58rem', fontWeight: '700', letterSpacing: '0.5px', padding: '0.1rem 0.35rem', borderRadius: '2px', fontFamily: mono }}>NEW</span>
              </button>
              <button className="nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
              <button
                onClick={() => router.push('/login')}
                style={{ background: 'transparent', border: `1px solid ${colors.orange}`, color: colors.orange, padding: '0.45rem 1.1rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease', letterSpacing: '0.3px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.color = colors.bg }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.orange }}
              >Login</button>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, border: 'none', color: colors.bg, padding: '0.45rem 1.1rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'background 0.2s ease', letterSpacing: '0.3px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >Start free →</button>
            </div>
          </div>
        </nav>

        {/* ── MARKET TICKER BAR ────────────────────────────────────── */}
        <div className="ticker-bar" style={{ background: '#050505', borderBottom: `1px solid ${colors.border}`, padding: '0.4rem 2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {TICKER_STATIC.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.73rem', letterSpacing: '0.5px', fontFamily: mono }}>
                <span style={{ color: colors.dim, fontWeight: '700' }}>{t.label}</span>
                <span style={{ color: t.dim ? colors.darkGray : colors.white, fontWeight: '500' }}>{t.value}</span>
                {t.change && (
                  <span style={{ color: t.positive ? colors.green : colors.red, fontSize: '0.7rem' }}>
                    {t.change}
                  </span>
                )}
                {t.label === 'MARKET' && (
                  <span className="pulse-dot" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: colors.green, marginLeft: '2px' }} />
                )}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#333', letterSpacing: '1px', fontFamily: mono }}>
              DATA DELAYED · 15 MIN
            </span>
          </div>
        </div>

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', borderBottom: `1px solid ${colors.border}`, padding: '5rem 2rem', minHeight: '92vh', display: 'flex', alignItems: 'center', background: '#0c0e12', overflow: 'hidden' }}>
          <video autoPlay loop muted playsInline className="hero-video" style={{ position: 'absolute', top: '50%', left: '50%', minWidth: '100%', minHeight: '100%', width: 'auto', height: 'auto', transform: 'translate(-50%, calc(-50% + 2cm))', zIndex: 1, opacity: 0.55, objectFit: 'cover' }}>
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)', zIndex: 2 }} />

          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 3 }}>
            <div className="hero-inner" style={{ display: 'flex', alignItems: 'center', gap: '5rem' }}>

              {/* Left: copy */}
              <div className="hero-text" style={{ flex: '1', minWidth: 0 }}>
                <div className="beta-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${colors.orange}`, color: colors.orange, padding: '0.3rem 0.9rem', fontSize: '0.72rem', fontWeight: '700', marginBottom: '2rem', letterSpacing: '2px', fontFamily: mono }}>
                  <span className="pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: colors.orange }} />
                  PUBLIC BETA — FREE ACCESS
                </div>

                <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: '700', fontFamily: mono, color: colors.white, marginBottom: '1.25rem', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                  Cheap volatility doesn&apos;t<br />
                  <span style={{ color: colors.orange }}>announce itself.</span><br />
                  We built a scanner that does.
                </h1>

                <p style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)', color: '#a0a8b4', maxWidth: '540px', marginBottom: '2rem', lineHeight: '1.85', fontWeight: '400' }}>
                  When implied volatility is historically low, long-dated options (LEAPS) become asymmetric instruments.
                  Coiled Spring scans 3,500+ US underlyings to find exactly those moments.
                </p>

                <div className="hero-tags" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.25rem', flexWrap: 'wrap', fontSize: '0.68rem', color: '#3a3a3a', letterSpacing: '1.5px', fontFamily: mono }}>
                  {['IV RANK SCANNER', 'GREEKS', 'VOL SURFACE 3D', 'COILED AI', 'PORTFOLIO TRACKER'].map((tag, i) => (
                    <span key={i} style={{ color: '#3a3a3a' }}>
                      {i > 0 && <span style={{ marginRight: '1.5rem' }}>·</span>}
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="hero-cta" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push('/register')}
                    style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '0.95rem 2.25rem', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)' }}
                  >Start scanning free →</button>

                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    style={{ background: 'transparent', color: '#a0a8b4', border: `1px solid #2a2a2a`, padding: '0.95rem 2.25rem', fontSize: '0.95rem', fontWeight: '500', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.orange; (e.currentTarget as HTMLButtonElement).style.color = colors.orange }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#a0a8b4' }}
                  >See how it works</button>
                </div>
              </div>

              {/* Right: terminal mockup */}
              <div className="hero-mockup" style={{ flexShrink: 0, width: '480px' }}>
                <div style={{ background: '#080a0e', border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: `0 0 90px rgba(232,119,34,0.32), 0 0 0 1px rgba(232,119,34,0.22), 0 24px 60px rgba(0,0,0,0.5)` }}>
                  {/* Terminal header bar */}
                  <div style={{ background: '#0f1117', borderBottom: `1px solid ${colors.border}`, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a2a' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a2a' }} />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a2a2a' }} />
                    </div>
                    <span style={{ fontFamily: mono, fontSize: '0.68rem', color: '#444', letterSpacing: '1px' }}>COILED SCANNER v2.4</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: colors.green }} />
                      <span style={{ fontFamily: mono, fontSize: '0.65rem', color: colors.green, letterSpacing: '1px' }}>LIVE</span>
                    </div>
                  </div>

                  {/* Table header */}
                  <div style={{ padding: '0.5rem 1rem 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '64px 68px 52px 52px 52px 72px', gap: 0, borderBottom: `1px solid ${colors.border}`, paddingBottom: '0.4rem' }}>
                      {['TICKER', 'STRIKE', 'DTE', 'IVR', 'DELTA', 'CS SCORE'].map((h) => (
                        <span key={h} style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444', letterSpacing: '0.8px', fontWeight: '700' }}>{h}</span>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  <div style={{ padding: '0.25rem 0 0.5rem' }}>
                    {SCANNER_MOCK.map((row, i) => (
                      <div key={i} className="scanner-row" style={{ display: 'grid', gridTemplateColumns: '64px 68px 52px 52px 52px 72px', gap: 0, padding: '0.45rem 1rem', transition: 'background 0.15s ease', cursor: 'default' }}>
                        <span style={{ fontFamily: mono, fontSize: '0.78rem', color: colors.orange, fontWeight: '700' }}>{row.ticker}</span>
                        <span style={{ fontFamily: mono, fontSize: '0.78rem', color: '#8b94a3' }}>{row.strike}</span>
                        <span style={{ fontFamily: mono, fontSize: '0.78rem', color: colors.white }}>{row.dte}</span>
                        <span style={{ fontFamily: mono, fontSize: '0.78rem', color: row.ivr <= '15' ? colors.green : '#ffaa00' }}>{row.ivr}</span>
                        <span style={{ fontFamily: mono, fontSize: '0.78rem', color: '#8b94a3' }}>{row.delta}</span>
                        <span style={{ fontFamily: mono, fontSize: '0.85rem', color: row.csColor, fontWeight: '700' }}>{row.cs}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: `1px solid ${colors.border}`, padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#333' }}>3,521 UNDERLYINGS SCANNED</span>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: colors.dim }}>
                      {'> _'}<span className="blink">|</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── THE THESIS (3-panel logic) ───────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ THE LOGIC</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.25' }}>
                Markets are cyclical.<br />Volatility has memory.
              </h2>
              <p style={{ color: '#8b94a3', fontSize: '1rem', maxWidth: '640px', margin: '1.5rem auto 0', lineHeight: '1.85' }}>
                Every major sell-off eventually ends. What follows is a slow compression of fear — and a window where long-dated options become historically cheap.
              </p>
            </div>

            {/* Vertical timeline */}
            <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', paddingLeft: '2.5rem' }}>
              {/* Gradient line */}
              <div style={{ position: 'absolute', left: '11px', top: '14px', bottom: '14px', width: '2px', background: 'linear-gradient(to bottom, #f87171 0%, #e87722 48%, #4ade80 100%)', opacity: 0.55 }} />
              {[
                { num: '01', label: 'CRISIS STRIKES',        headline: 'Fear spikes. VIX explodes.',
                  body: 'Market crashes trigger panic. Implied volatility surges to 40, 60, 80. Options become expensive. This is the wrong time to buy convexity.',
                  color: '#f87171' },
                { num: '02', label: 'VOLATILITY COMPRESSES', headline: 'Markets recover. Fear is forgotten.',
                  body: 'Over months, VIX drifts back to 12–18. IV Rank falls below 20. Long-dated options become historically cheap — high leverage at low cost.',
                  color: colors.orange },
                { num: '03', label: 'THE SCANNER FINDS IT',  headline: 'Low IV Rank = entry window.',
                  body: 'Coiled Spring identifies underlyings where implied volatility is in the bottom quartile of its 12-month range. That’s your signal.',
                  color: '#4ade80' },
              ].map((item, i) => (
                <div key={i} style={{ position: 'relative', paddingBottom: i < 2 ? '3rem' : '0' }}>
                  {/* Dot */}
                  <div style={{ position: 'absolute', left: '-2.5rem', top: '3px', width: '24px', height: '24px', borderRadius: '50%', background: item.color, border: `2px solid ${colors.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <span style={{ fontSize: '0.52rem', fontWeight: '800', fontFamily: mono, color: colors.bg }}>{item.num}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: item.color, fontWeight: '700', letterSpacing: '2.5px', marginBottom: '0.35rem', fontFamily: mono }}>{item.label}</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: colors.white, marginBottom: '0.65rem', lineHeight: '1.4', fontFamily: mono }}>{item.headline}</h3>
                    <p style={{ color: '#8b94a3', lineHeight: '1.8', fontSize: '0.92rem', margin: 0 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE MARKET CONTEXT ──────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${colors.border}`, padding: '5rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ CURRENT REGIME</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>
                Where is volatility right now?
              </h2>
              <p style={{ color: '#8b94a3', fontSize: '0.95rem', maxWidth: '560px', margin: '1rem auto 0', lineHeight: '1.7' }}>
                Live VIX and market data — check the current volatility regime before scanning for opportunities.
              </p>
            </div>
            <div className="widgets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%' }}>
              <VixChart />
              <MarketMovers />
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
        <section id="how-it-works" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ WORKFLOW</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>
                Find → Analyze → Track
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {[
                {
                  step: '01',
                  icon: <Search size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: 'Scan for low IV Rank',
                  body: 'Filter 3,500+ US underlyings by IV Rank, Delta, DTE, and liquidity. The scanner surfaces options where implied volatility is historically compressed — the precise condition where buying convexity makes structural sense.',
                },
                {
                  step: '02',
                  icon: <BarChart2 size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: 'Deep-dive on opportunity',
                  body: 'Each candidate has a full Opportunity Analysis: IV history, volatility surface, Greeks, spread quality, and a CS Score composite signal. Coiled AI answers your specific questions about the contract.',
                },
                {
                  step: '03',
                  icon: <Bookmark size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: 'Save & monitor positions',
                  body: 'Add contracts to your Watchlist to track live Greeks and P&L evolution. Open positions feed into the Portfolio Tracker with payoff diagram, What-If simulator, and aggregate risk exposure view.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="step-card"
                  style={{ background: '#111318', border: `1px solid ${colors.border}`, borderTop: `2px solid ${colors.orange}`, padding: '2.25rem', borderRadius: '10px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(232,119,34,0.08)', border: `1px solid rgba(232,119,34,0.18)`, padding: '0.65rem', borderRadius: '5px' }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: colors.orange, fontWeight: '700', letterSpacing: '2.5px', fontFamily: mono }}>STEP {item.step}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: colors.white, marginBottom: '0.875rem', fontFamily: mono, lineHeight: '1.35' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: '#8b94a3', lineHeight: '1.8', fontSize: '0.92rem' }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CS SCORE ─────────────────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div className="cs-score-grid" style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.25rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ COMPOSITE SIGNAL</div>
              <svg viewBox="0 0 240 160" width="220" height="147" xmlns="http://www.w3.org/2000/svg">
                <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#1e2330" strokeWidth="16" strokeLinecap="round"/>
                <path d="M 20 120 A 100 100 0 0 1 197 57" fill="none" stroke="#e87722" strokeWidth="16" strokeLinecap="round"/>
                <text x="120" y="110" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="52" fontWeight="700" fill="#e87722">78</text>
                <text x="120" y="130" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#555">/100</text>
                <text x="120" y="150" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill="#4ade80" letterSpacing="2">STRUCTURAL EDGE</text>
                <text x="18" y="140" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#3a3a3a">0</text>
                <text x="222" y="140" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#3a3a3a">100</text>
              </svg>
              <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: '700', color: colors.white, marginBottom: '0.75rem', fontFamily: mono, lineHeight: '1.25', marginTop: '1rem' }}>
                The CS Score:<br />one number that matters
              </h2>
              <p style={{ color: '#8b94a3', lineHeight: '1.75', fontSize: '0.92rem', marginBottom: '0.75rem' }}>
                Each contract gets a score 0–100. Above 70: cheap vol, liquid, positioned for expansion.
              </p>
              <p style={{ color: '#555', lineHeight: '1.7', fontSize: '0.8rem', fontStyle: 'italic', borderLeft: `2px solid ${colors.border2}`, paddingLeft: '0.75rem', textAlign: 'left' }}>
                Buyers only. No meaning for short premium strategies.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { factor: 'IV Rank', weight: '35%', desc: 'How cheap vol is vs. its 12-month range', bar: 35 },
                { factor: 'Delta', weight: '20%', desc: 'Proximity to the 0.25–0.35 sweet spot', bar: 20 },
                { factor: 'DTE', weight: '20%', desc: 'Time buffer for the thesis to develop', bar: 20 },
                { factor: 'Bid-Ask Spread', weight: '15%', desc: 'Liquidity and execution quality', bar: 15 },
                { factor: 'Vega', weight: '10%', desc: 'Sensitivity to volatility expansion', bar: 10 },
              ].map((row, i) => (
                <div key={i} style={{ padding: '0.875rem 1.1rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '600', color: colors.white, fontSize: '0.875rem', fontFamily: mono }}>{row.factor}</span>
                    <span style={{ color: colors.orange, fontSize: '0.78rem', fontWeight: '700', fontFamily: mono }}>{row.weight}</span>
                  </div>
                  <div style={{ height: '2px', background: '#1a1a1a', borderRadius: '1px', marginBottom: '0.4rem' }}>
                    <div style={{ height: '100%', width: `${row.bar * 2.5}%`, background: colors.orange, borderRadius: '1px' }} />
                  </div>
                  <p style={{ color: '#555', fontSize: '0.8rem', margin: 0 }}>{row.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ADDITIONAL TOOLS ─────────────────────────────────────── */}
        <section style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ PLATFORM</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>
                Everything in one terminal
              </h2>
            </div>

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
              {[
                {
                  icon: <TrendingDown size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: '3D Volatility Surface',
                  body: 'Interactive vol surface for any US underlying. Spot term structure compression, skew shifts, and strike-level anomalies before they expand.',
                  badge: null,
                },
                {
                  icon: <Bot size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: 'Coiled AI Assistant',
                  body: 'Claude-powered assistant trained on options theory, Greeks, and position management. Ask anything about a specific contract in plain language.',
                  badge: 'PRO',
                },
                {
                  icon: <Shield size={26} color={colors.orange} strokeWidth={1.5} />,
                  title: 'Portfolio Risk View',
                  body: 'Aggregate Greeks across all open positions. What-If payoff simulator with Black-Scholes pricing. CAPM beta per underlying. Tail exposure at a glance.',
                  badge: 'COMING SOON',
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  className="feature-card"
                  style={{ position: 'relative', background: '#111318', border: `1px solid ${colors.border}`, borderTop: `2px solid ${colors.orange}`, padding: '2rem', borderRadius: '10px' }}
                >
                  {feat.badge && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: feat.badge === 'PRO' ? colors.orange : '#1a1a1a', color: feat.badge === 'PRO' ? colors.bg : '#666', fontSize: '0.6rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: mono, letterSpacing: '1px' }}>
                      {feat.badge}
                    </div>
                  )}
                  <div style={{ background: 'rgba(232,119,34,0.08)', border: '1px solid rgba(232,119,34,0.18)', padding: '0.65rem', borderRadius: '5px', width: 'fit-content', marginBottom: '1.1rem' }}>
                    {feat.icon}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: colors.white, marginBottom: '0.7rem', fontFamily: mono, lineHeight: '1.3' }}>{feat.title}</h3>
                  <p style={{ color: '#8b94a3', lineHeight: '1.8', fontSize: '0.9rem' }}>{feat.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TUTORIALS ────────────────────────────────────────────── */}
        <section id="tutorial-section" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ TUTORIALS</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>Learn the platform</h2>
              <p style={{ color: '#8b94a3', marginTop: '1rem', fontSize: '0.95rem' }}>
                Step-by-step walkthroughs of every feature.{' '}
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none' }}>Full channel →</a>
              </p>
            </div>

            {tutorialsLoading ? (
              <div style={{ textAlign: 'center', color: colors.darkGray, padding: '3rem 0', fontFamily: mono, fontSize: '0.85rem' }}>Loading videos...</div>
            ) : tutorialVideos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {tutorialVideos.map((video) => (
                  <a key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '5px', overflow: 'hidden', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.orange; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.border; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={video.thumbnail} alt={video.title} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(232,119,34,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '15px', marginLeft: '2px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '0.875rem' }}>
                      <p style={{ color: colors.white, fontWeight: '600', fontSize: '0.875rem', lineHeight: '1.4', margin: 0 }}>{video.title}</p>
                      <p style={{ color: colors.darkGray, fontSize: '0.78rem', marginTop: '0.4rem' }}>{new Date(video.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: colors.darkGray }}>
                <p>Tutorials coming soon.</p>
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none', fontSize: '0.9rem' }}>Subscribe for updates →</a>
              </div>
            )}
          </div>
        </section>

        {/* ── DOCUMENTARIES / MARKET HISTORY ───────────────────────── */}
        <section id="youtube-section" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ MARKET HISTORY</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>
                Study the crashes
              </h2>
              <p style={{ color: '#8b94a3', fontSize: '0.95rem', maxWidth: '560px', margin: '1rem auto 0', lineHeight: '1.7' }}>
                Every major vol spike was preceded by a period of compression. Understanding the pattern is the first step to exploiting it.
              </p>
            </div>

            {documentariesLoading ? (
              <div style={{ textAlign: 'center', color: colors.darkGray, padding: '3rem 0', fontFamily: mono, fontSize: '0.85rem' }}>Loading videos...</div>
            ) : documentaryVideos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {documentaryVideos.map((video) => (
                  <a key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '5px', overflow: 'hidden', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.orange; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.border; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={video.thumbnail} alt={video.title} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(232,119,34,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '15px', marginLeft: '2px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '0.875rem' }}>
                      <p style={{ color: colors.white, fontWeight: '600', fontSize: '0.875rem', lineHeight: '1.4', margin: 0 }}>{video.title}</p>
                      <p style={{ color: colors.darkGray, fontSize: '0.78rem', marginTop: '0.4rem' }}>{new Date(video.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: colors.darkGray }}>
                <p>Documentary series coming soon.</p>
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none', fontSize: '0.9rem' }}>Subscribe for updates →</a>
              </div>
            )}
          </div>
        </section>

        {/* ── BOOK ─────────────────────────────────────────────────── */}
        <section id="book" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="book-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '5rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <a href="https://www.amazon.com/dp/B0H59BH9SL" target="_blank" rel="noopener noreferrer">
                  <img src="/book.png" alt="Coiled Spring Book" style={{ width: '100%', maxWidth: '220px', borderRadius: '4px', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', transition: 'transform 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                </a>
              </div>

              <div>
                <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ THE BOOK</div>
                <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: '700', color: colors.white, marginBottom: '1.5rem', fontFamily: mono, lineHeight: '1.25' }}>
                  The intellectual foundation
                </h2>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '1rem', marginBottom: '2rem' }}>
                  Written by a 20-year capital markets professional, the book explains the theory behind buying volatility when it&apos;s cheap — why financial crises are structurally predictable, why LEAPS options are the right instrument, and how to construct positions that benefit from market dislocations without requiring precise timing.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2.25rem' }}>
                  {[
                    'Why financial crises are predictable — and recurring',
                    'The asymmetry of long options vs. directional stock bets',
                    'How to read IV Rank and identify historically cheap volatility',
                    'Position sizing and portfolio construction for long vol',
                    'Case studies: 2008, 2020, 2022 — what happened and why',
                  ].map((point, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <span style={{ color: colors.orange, fontWeight: '700', flexShrink: 0, marginTop: '0.1rem', fontFamily: mono }}>→</span>
                      <span style={{ color: '#8b94a3', lineHeight: '1.6', fontSize: '0.92rem' }}>{point}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href="https://www.amazon.com/dp/B0H59CRSLN" target="_blank" rel="noopener noreferrer"
                    style={{ background: colors.orange, color: colors.bg, padding: '0.75rem 1.75rem', fontSize: '0.875rem', fontWeight: '700', letterSpacing: '0.5px', borderRadius: '3px', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.background = colors.orangeHover}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.background = colors.orange}>
                    Buy on Amazon (EN) →
                  </a>
                  <a href="https://www.amazon.com/dp/B0H59BH9SL" target="_blank" rel="noopener noreferrer"
                    style={{ background: 'transparent', color: colors.orange, border: `1px solid ${colors.orange}`, padding: '0.75rem 1.75rem', fontSize: '0.875rem', fontWeight: '600', letterSpacing: '0.5px', borderRadius: '3px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = colors.orange; (e.currentTarget as HTMLAnchorElement).style.color = colors.bg }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = colors.orange }}>
                    Versione Italiana →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ACADEMY ──────────────────────────────────────────────── */}
        <section id="academy" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ COILED SPRING ACADEMY</div>
                <span style={{ background: colors.orange, color: colors.bg, fontSize: '0.6rem', fontWeight: '700', letterSpacing: '1px', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: mono }}>COMING SOON</span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, marginBottom: '1rem', fontFamily: mono }}>
                Structured options education
              </h2>
              <p style={{ fontSize: '1rem', color: '#8b94a3', maxWidth: '600px', margin: '0 auto', lineHeight: '1.75' }}>
                A modular video course — from options fundamentals to advanced vol strategies. Complete each module, pass the quiz, unlock the next.
              </p>
            </div>

{/* ── MODULE GRID 3+2 ── */}
            {(() => {
              const modules: { title: string; free: boolean; placeholder: boolean; bullets: string[] }[] = [
                {
                  title: 'Foundations of Options and Pricing',
                  free: true,
                  placeholder: false,
                  bullets: [
                    'What an option is: rights vs. obligations, calls vs. puts',
                    'Strike price, expiration, intrinsic value and time value',
                    'How theoretical pricing models estimate fair value (Black-Scholes assumptions)',
                    'The first Greeks: Delta and Gamma',
                    'Basic strategies: covered call, protective put, vertical spread',
                  ],
                },
                {
                  title: 'Volatility, Theoretical Value and Market Conditions',
                  free: false,
                  placeholder: false,
                  bullets: [
                    'Historical volatility vs. implied volatility, and how each is estimated',
                    'Vega and Theta, and how Gamma interacts with them',
                    'Reading a volatility term structure and skew',
                    'Advanced risk: Gamma scalping, volatility mean reversion',
                    'How changing market conditions reprice an option in real time',
                  ],
                },
                {
                  title: 'Spread Construction and Relative Value',
                  free: false,
                  placeholder: false,
                  bullets: [
                    'Building vertical spreads (bull/bear, debit/credit) and vol spreads (straddle, strangle)',
                    'Ratio spreads and backspreads: when to use them and their tail risk',
                    'Dollar-Delta equalization to compare instruments across different markets',
                    'Evaluating relative value across strikes and expirations accounting for skew',
                    'Final checklist before entering a multi-leg spread (payoff, Greeks, margin, liquidity)',
                  ],
                },
                {
                  title: 'Module 04 — Coming Soon',
                  free: false,
                  placeholder: true,
                  bullets: [],
                },
                {
                  title: 'Module 05 — Coming Soon',
                  free: false,
                  placeholder: true,
                  bullets: [],
                },
              ]
              return (
                <div className="academy-grid" style={{ marginBottom: '3rem' }}>
                  {modules.map((mod, idx) => (
                    <div
                      key={idx}
                      className={idx < 3 ? 'academy-card' : 'academy-card-wide'}
                      style={{
                        background: mod.placeholder ? 'transparent' : colors.surface,
                        border: `1px solid ${mod.free ? colors.orange : mod.placeholder ? '#1a1a1a' : colors.border}`,
                        borderRadius: '5px',
                        padding: '1.5rem',
                        position: 'relative',
                        opacity: mod.free ? 1 : mod.placeholder ? 0.3 : 0.65,
                        transition: 'opacity 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onMouseEnter={(e) => { if (!mod.placeholder) (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = mod.free ? '1' : mod.placeholder ? '0.3' : '0.65' }}
                    >
                      {/* badge */}
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        {mod.free ? (
                          <span style={{ fontSize: '0.6rem', fontWeight: '700', color: colors.bg, background: colors.orange, padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: mono, letterSpacing: '0.5px' }}>FREE PREVIEW</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: mod.placeholder ? '#222' : '#444' }}>🔒</span>
                        )}
                      </div>
                      {/* label */}
                      <div style={{ fontSize: '0.62rem', color: mod.free ? colors.orange : mod.placeholder ? '#2a2a2a' : '#444', fontWeight: '700', letterSpacing: '2px', marginBottom: '0.5rem', fontFamily: mono }}>
                        {'MODULE ' + String(idx + 1).padStart(2, '0')}
                      </div>
                      {/* title */}
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: mod.free ? colors.white : mod.placeholder ? '#2a2a2a' : '#8b94a3', marginBottom: mod.bullets.length > 0 ? '0.85rem' : '0', lineHeight: '1.4', paddingRight: '4rem' }}>
                        {mod.title}
                      </h3>
                      {/* bullets */}
                      {mod.bullets.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.6rem', color: mod.free ? colors.orange : '#555', fontWeight: '700', letterSpacing: '2px', marginBottom: '0.45rem', fontFamily: mono }}>
                            {"WHAT YOU'LL LEARN"}
                          </div>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {mod.bullets.map((b, bi) => (
                              <li key={bi} style={{ fontSize: '0.79rem', color: mod.free ? '#aab0ba' : '#606870', lineHeight: '1.55', display: 'flex', gap: '0.5rem' }}>
                                <span style={{ color: mod.free ? colors.orange : '#555', flexShrink: 0, marginTop: '0.05rem' }}>{'>'}</span>
                                {b}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* ── HOW THE COURSE WORKS ── */}
            <div style={{ marginBottom: '3.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>{'◈ HOW THE COURSE WORKS'}</div>
              </div>
              <div className="course-works-grid">
                {[
                  { icon: '▶', label: 'Learn at your own pace', desc: 'Video lessons and readings structured in progressive modules — no deadlines, no pressure.' },
                  { icon: '🔓', label: 'Unlock module by module', desc: 'Each module unlocks after you complete the previous one and pass a short quiz.' },
                  { icon: '◈', label: 'Ask Coiled AI', desc: 'Every module comes with an AI assistant to answer your questions in context, in real time.' },
                  { icon: '⌘', label: 'Apply in the terminal', desc: 'Every concept links directly to a live feature inside the Coiled Spring terminal.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '5px', padding: '1.25rem 1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>{item.icon}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: colors.white, fontFamily: mono, letterSpacing: '0.3px', lineHeight: '1.35' }}>{item.label}</div>
                    <p style={{ fontSize: '0.79rem', color: '#606870', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '0.875rem 2.25rem', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >{'Register for early access →'}</button>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section id="faq" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ FAQ</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono }}>
                Common questions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {faqs.map((faq, idx) => (
                <div key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                    style={{ width: '100%', padding: '1.35rem 0', background: 'transparent', border: 'none', color: faqOpen === idx ? colors.orange : colors.white, fontSize: '1rem', fontWeight: '600', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: sans, transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => { if (faqOpen !== idx) (e.currentTarget as HTMLButtonElement).style.color = '#d0d8e4' }}
                    onMouseLeave={(e) => { if (faqOpen !== idx) (e.currentTarget as HTMLButtonElement).style.color = colors.white }}>
                    <span style={{ paddingRight: '2rem' }}>{faq.question}</span>
                    <span style={{ color: colors.orange, fontSize: '1rem', transform: faqOpen === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease', flexShrink: 0 }}>▼</span>
                  </button>
                  <div className="faq-answer" style={{ maxHeight: faqOpen === idx ? '300px' : '0', paddingBottom: faqOpen === idx ? '1.35rem' : '0' }}>
                    <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.95rem', margin: 0 }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────── */}
        <section style={{ padding: '8rem 2rem', textAlign: 'center', background: '#0c0e12', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ GET STARTED</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', border: `1px solid #1e2330`, background: '#050505', padding: '0.28rem 0.9rem', borderRadius: '3px' }}>
                <span className="pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: colors.green }} />
                <span style={{ fontFamily: mono, fontSize: '0.68rem', color: colors.green, letterSpacing: '0.5px' }}>
                  {scanCount.toLocaleString()} scans today
                </span>
              </div>
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3rem)', fontWeight: '700', color: colors.white, marginBottom: '1.25rem', fontFamily: mono, lineHeight: '1.2' }}>
              The next compression window<br />is already forming.
            </h2>
            <p style={{ fontSize: '1rem', color: '#8b94a3', marginBottom: '2.5rem', lineHeight: '1.75' }}>
              Free beta access. No credit card. Scan the full US options market in minutes.
            </p>
            <button
              onClick={() => router.push('/register')}
              style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '1.1rem 3rem', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease', boxShadow: '0 0 30px rgba(232,119,34,0.42)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(232,119,34,0.6)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(232,119,34,0.42)' }}
            >Start scanning free →</button>
            <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#333', fontFamily: mono, letterSpacing: '0.5px' }}>
              Free tier · No credit card · Cancel anytime
            </p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#555', fontFamily: mono }}>1,200+ traders already scanning</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '4rem 2rem 2.5rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', paddingBottom: '2.5rem', borderBottom: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: colors.orange, marginBottom: '0.4rem', letterSpacing: '2px', fontFamily: mono }}>COILED SPRING</div>
                <p style={{ color: '#555', fontSize: '0.85rem', margin: 0 }}>Antifragile Options Trading</p>
              </div>
              <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                {[{ label: 'Login', href: '/login' }, { label: 'Register', href: '/register' }].map((link) => (
                  <a key={link.href} href={link.href} style={{ color: '#555', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = colors.orange}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#555'}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div style={{ paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ color: '#333', fontSize: '0.8rem', fontFamily: mono }}>© 2026 Coiled Spring. Built for traders who think in convexity.</span>
              <a href="mailto:info@coiledspring.app" style={{ color: '#444', textDecoration: 'none', fontSize: '0.8rem', fontFamily: mono, transition: 'color 0.2s ease' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = colors.orange}
                onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#444'}>
                info@coiledspring.app
              </a>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
