'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BarChart2, Bookmark } from 'lucide-react'
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
        .cs-mono,
        [data-mono],
        .ticker-bar .price,
        .ticker-bar .change,
        .scanner-mock .data-cell,
        .scanner-mock .score-value,
        .counter-number {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum" 1;
        }

        /* CTA button arrow animation */
        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cta-button .arrow {
          display: inline-block;
          transition: transform 0.2s ease;
        }
        .cta-button:hover .arrow {
          transform: translateX(4px);
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
          .feature-showcase-row { grid-template-columns: 1fr !important; }
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
              <button className="nav-link" onClick={() => router.push('/glossary')}>Glossary</button>
              <button className="nav-link" onClick={() => router.push('/changelog')}>Ship Log</button>
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
                <span className="cs-mono price" style={{ color: t.dim ? colors.darkGray : colors.white, fontWeight: '500' }}>{t.value}</span>
                {t.change && (
                  <span className="cs-mono change" style={{ color: t.positive ? colors.green : colors.red, fontSize: '0.7rem' }}>
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
                  >
              <span>Start scanning free </span>
              <span className="btn-arrow" style={{ display: 'inline-block', transition: 'transform 0.2s ease' }}>→</span>
            </button>

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
                        <span className="cs-mono data-cell" style={{ fontFamily: mono, fontSize: '0.78rem', color: '#8b94a3' }}>{row.strike}</span>
                        <span className="cs-mono data-cell" style={{ fontFamily: mono, fontSize: '0.78rem', color: colors.white }}>{row.dte}</span>
                        <span className="cs-mono data-cell" style={{ fontFamily: mono, fontSize: '0.78rem', color: row.ivr <= '15' ? colors.green : '#ffaa00' }}>{row.ivr}</span>
                        <span className="cs-mono data-cell" style={{ fontFamily: mono, fontSize: '0.78rem', color: '#8b94a3' }}>{row.delta}</span>
                        <span className="cs-mono score-value" style={{ fontFamily: mono, fontSize: '0.85rem', color: row.csColor, fontWeight: '700' }}>{row.cs}</span>
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

        {/* ── FEATURE SHOWCASE ─────────────────────────────────────── */}
        <section id="features" style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', padding: '6rem 0 3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ INSIDE THE TERMINAL</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono, marginBottom: '1rem' }}>
                What&apos;s waiting on the other side.
              </h2>
              <p style={{ color: '#8b94a3', fontSize: '1rem', maxWidth: '580px', margin: '0 auto', lineHeight: '1.8' }}>
                Five tools, one workflow. Here&apos;s exactly what you&apos;ll find the moment you log in.
              </p>
            </div>

            {/* ── F1: SCANNER — text left, mockup right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>01 — LEAPS SCANNER</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  3,500+ underlyings.<br />Filtered to your edge.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  Set your IV Rank ceiling, delta range, and DTE window. The scanner surfaces every candidate sorted by CS Score — highest structural quality first, noise last.
                </p>
                {['Filter by IVR, Delta, DTE, Spread%, Open Interest', 'CS Score 0–100: structural quality per contract', 'Full Greeks for every result: Δ Γ Θ V', 'One click → full Opportunity Analysis'].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
              {/* Mockup */}
              <div style={{ background: '#080a0e', border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 0 40px rgba(232,119,34,0.15)' }}>
                <div style={{ background: '#0f1117', borderBottom: `1px solid ${colors.border}`, padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>{[0,1,2].map(i => <div key={i} style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#2a2a2a' }} />)}</div>
                  <span style={{ fontFamily: mono, fontSize: '0.62rem', color: '#444', letterSpacing: '1px' }}>CS SCANNER — LEAPS MODE</span>
                  <span style={{ fontFamily: mono, fontSize: '0.58rem', color: '#333' }}>5 results</span>
                </div>
                <div style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['IVR < 25', 'Δ 0.25–0.40', 'DTE 300–750', 'OI > 200'].map((f,i) => (
                    <span key={i} style={{ fontFamily: mono, fontSize: '0.57rem', color: colors.orange, border: `1px solid rgba(232,119,34,0.3)`, background: 'rgba(232,119,34,0.06)', padding: '0.12rem 0.4rem' }}>{f}</span>
                  ))}
                </div>
                <div style={{ padding: '0.4rem 1rem', display: 'grid', gridTemplateColumns: '52px 60px 44px 44px 44px 56px', borderBottom: `1px solid ${colors.border}` }}>
                  {['TICKER','STRIKE','DTE','IVR','DELTA','SCORE'].map(h => (
                    <span key={h} style={{ fontFamily: mono, fontSize: '0.54rem', color: '#444', letterSpacing: '0.8px', fontWeight: '700' }}>{h}</span>
                  ))}
                </div>
                {[
                  { ticker:'SPY',  strike:'540C', dte:'421', ivr:'12', delta:'0.28', cs:'91', col:'#4ade80' },
                  { ticker:'AAPL', strike:'195C', dte:'389', ivr:'18', delta:'0.32', cs:'87', col:'#4ade80' },
                  { ticker:'TSLA', strike:'260C', dte:'350', ivr:'22', delta:'0.25', cs:'83', col:'#4ade80' },
                  { ticker:'NVDA', strike:'900C', dte:'421', ivr:'09', delta:'0.30', cs:'79', col:colors.orange },
                  { ticker:'QQQ',  strike:'475C', dte:'389', ivr:'15', delta:'0.35', cs:'76', col:colors.orange },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 60px 44px 44px 44px 56px', padding: '0.4rem 1rem', borderBottom: i < 4 ? `1px solid rgba(30,35,48,0.4)` : 'none' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.72rem', color: colors.orange, fontWeight: '700' }}>{row.ticker}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.72rem', color: '#8b94a3' }}>{row.strike}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.72rem', color: colors.white }}>{row.dte}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.72rem', color: Number(row.ivr) < 15 ? colors.green : colors.orange }}>{row.ivr}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.72rem', color: '#8b94a3' }}>{row.delta}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.78rem', color: row.col, fontWeight: '700' }}>{row.cs}</span>
                  </div>
                ))}
                <div style={{ padding: '0.4rem 1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: mono, fontSize: '0.54rem', color: '#333' }}>3,521 SCANNED</span>
                  <span style={{ fontFamily: mono, fontSize: '0.54rem', color: '#333' }}>SORTED BY CS SCORE ↓</span>
                </div>
              </div>
            </div>

            {/* ── F2: VOL SURFACE — mockup left, text right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              {/* Mockup — real surface screenshot */}
              <div style={{ border: `1px solid ${colors.border2}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 60px rgba(232,119,34,0.15), 0 0 0 1px rgba(232,119,34,0.08)' }}>
                {/* Terminal header bar */}
                <div style={{ background: '#0a0c10', borderBottom: `1px solid ${colors.border}`, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[colors.orange, '#333', '#333'].map((c, i) => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c, opacity: i === 0 ? 0.7 : 1 }} />)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: colors.orange, fontWeight: '700', letterSpacing: '2px' }}>VOLATILITY SURFACE</span>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#555' }}>—</span>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#8b94a3', letterSpacing: '1px' }}>QQQ · PUT IV (ITM) + CALL IV (OTM)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', background: colors.orange, color: '#000', padding: '2px 7px', fontWeight: '700', letterSpacing: '1px' }}>IV %</span>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#555', padding: '2px 7px', border: `1px solid #222`, letterSpacing: '1px' }}>CS SCORE</span>
                  </div>
                </div>
                {/* Screenshot */}
                <div style={{ position: 'relative', background: '#080a0e', lineHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/surface.png"
                    alt="QQQ Volatility Surface — Strike × DTE 3D view"
                    style={{ width: '100%', display: 'block', opacity: 0.95 }}
                  />
                  {/* Bottom fade + legend bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem 0.85rem', background: 'linear-gradient(to top, rgba(8,10,14,0.96) 60%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#4a90d9', letterSpacing: '1px' }}>BLUE = COMPRESSED IV</span>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#f87171', letterSpacing: '1px' }}>RED = HIGH IV (OTM SHORT-DATED)</span>
                  </div>
                </div>
                {/* Footer stat bar */}
                <div style={{ background: '#0a0c10', borderTop: `1px solid ${colors.border}`, padding: '0.45rem 1rem', display: 'flex', gap: '1.5rem' }}>
                  {[['IV MIN', '12.2%', '#4a90d9'], ['IV AVG', '31.9%', '#8b94a3'], ['IV MAX', '123.4%', '#f87171']].map(([lbl, val, col]) => (
                    <div key={lbl} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#555', letterSpacing: '1px' }}>{lbl}</span>
                      <span style={{ fontFamily: mono, fontSize: '0.65rem', color: col, fontWeight: '700' }}>{val}</span>
                    </div>
                  ))}
                  <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: '0.55rem', color: colors.orange, letterSpacing: '1px' }}>CLICK SURFACE TO ADD TO WATCHLIST →</span>
                </div>
              </div>
              {/* Text */}
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>02 — VOLATILITY SURFACE</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  See where the market<br />prices fear.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  An interactive volatility surface for any US underlying. Spot term structure compression, skew shifts, and strike-level anomalies before they expand into your P&L.
                </p>
                {['Full strike × expiry matrix for any ticker', 'Color-coded: green = cheap IV, red = expensive', 'Skew visible at a glance — no spreadsheet needed', 'Identify the cheapest expiration for your thesis'].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── F3: WHY PANEL — text left, mockup right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>03 — OPPORTUNITY ANALYSIS</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  CS Score + WHY Panel.<br />A number and its reason.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  Every contract scores 0–100. The WHY Panel explains each dimension so you understand why a setup qualifies — not just that it does.
                </p>
                {['Delta Rating: proximity to 0.30 optimal range', 'Liquidity Rating: spread% and open interest quality', 'DTE Rating: time buffer and gamma risk assessment', 'Vega Rating: vol sensitivity relative to cost', 'Coiled AI answers your questions in plain language'].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
              {/* Mockup */}
              <div style={{ background: '#080a0e', border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 0 40px rgba(232,119,34,0.12)' }}>
                <div style={{ background: '#0f1117', borderBottom: `1px solid ${colors.border}`, padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>{[0,1,2].map(i => <div key={i} style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#2a2a2a' }} />)}</div>
                  <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444', letterSpacing: '1px' }}>OPPORTUNITY ANALYSIS — SPY 540C</span>
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.875rem', padding: '0.75rem', background: '#0f1117', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: mono, fontSize: '2.2rem', fontWeight: '700', color: colors.orange, lineHeight: 1 }}>91</div>
                      <div style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555', letterSpacing: '1px' }}>/100</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: '0.58rem', color: '#4ade80', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '0.2rem' }}>STRUCTURAL EDGE</div>
                      <div style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.white }}>SPY Jan 2027 540C</div>
                      <div style={{ fontFamily: mono, fontSize: '0.62rem', color: '#555' }}>DTE 421 · Δ 0.28 · IVR 12</div>
                    </div>
                  </div>
                  {[
                    { label:'DELTA RATING',   value:'Excellent', detail:'Δ 0.28 — ideal proximity to 0.30 target', color:'#4ade80' },
                    { label:'LIQUIDITY',      value:'Good',      detail:'Spread 1.8% · OI 4,820 contracts',       color:'#4ade80' },
                    { label:'DTE RATING',     value:'Excellent', detail:'421 days — long runway, low gamma risk',   color:'#4ade80' },
                    { label:'VEGA RATING',    value:'Strong',    detail:'Vega 0.42 · premium $8.70 per share',    color:colors.orange },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.45rem 0', borderBottom: i < 3 ? `1px solid rgba(30,35,48,0.6)` : 'none' }}>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: '0.52rem', color: '#444', letterSpacing: '1.5px', fontWeight: '700', marginBottom: '0.15rem' }}>{row.label}</div>
                        <div style={{ fontFamily: mono, fontSize: '0.62rem', color: '#606870' }}>{row.detail}</div>
                      </div>
                      <span style={{ fontFamily: mono, fontSize: '0.63rem', color: row.color, fontWeight: '700', flexShrink: 0, marginLeft: '0.5rem' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── F4: PORTFOLIO — mockup left, text right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              {/* Mockup */}
              <div style={{ background: '#080a0e', border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 0 40px rgba(232,119,34,0.12)' }}>
                <div style={{ background: '#0f1117', borderBottom: `1px solid ${colors.border}`, padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>{[0,1,2].map(i => <div key={i} style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#2a2a2a' }} />)}</div>
                  <span style={{ fontFamily: mono, fontSize: '0.62rem', color: '#444', letterSpacing: '1px' }}>PORTFOLIO TRACKER</span>
                  <span style={{ fontFamily: mono, fontSize: '0.58rem', color: colors.green }}>4 POSITIONS</span>
                </div>
                <div style={{ padding: '0.4rem 0.875rem', display: 'grid', gridTemplateColumns: '50px 54px 58px 64px 50px', borderBottom: `1px solid ${colors.border}` }}>
                  {['TICKER','STRIKE','ENTRY','P&L','Θ BURN'].map(h => (
                    <span key={h} style={{ fontFamily: mono, fontSize: '0.52rem', color: '#444', letterSpacing: '0.8px', fontWeight: '700' }}>{h}</span>
                  ))}
                </div>
                {[
                  { ticker:'SPY',  strike:'540C', entry:'$8.70',  pnl:'+$2,340', pos:true,  burn:'34%' },
                  { ticker:'AAPL', strike:'195C', entry:'$5.20',  pnl:'+$890',   pos:true,  burn:'18%' },
                  { ticker:'TSLA', strike:'260C', entry:'$9.40',  pnl:'-$1,150', pos:false, burn:'8%'  },
                  { ticker:'NVDA', strike:'900C', entry:'$12.30', pnl:'+$4,680', pos:true,  burn:'52%' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 54px 58px 64px 50px', padding: '0.42rem 0.875rem', borderBottom: i < 3 ? `1px solid rgba(30,35,48,0.5)` : 'none' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.orange, fontWeight: '700' }}>{row.ticker}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: '#8b94a3' }}>{row.strike}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: '#555' }}>{row.entry}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: row.pos ? colors.green : '#f87171', fontWeight: '600' }}>{row.pnl}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: '#555' }}>{row.burn}</span>
                  </div>
                ))}
                <div style={{ padding: '0.45rem 0.875rem', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: mono, fontSize: '0.58rem', color: '#555' }}>TOTAL P&L</span>
                  <span style={{ fontFamily: mono, fontSize: '0.62rem', color: colors.green, fontWeight: '700' }}>+$6,760</span>
                </div>
              </div>
              {/* Text */}
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>04 — PORTFOLIO TRACKER</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  Open it. Track it.<br />Know when to close.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  Every open position tracked in real time. P&L, Greeks, theta burned percentage — the data to decide whether to hold, roll, or close, without opening a spreadsheet.
                </p>
                {['Unrealized P&L per contract and aggregate total', 'Theta Burned % — how much time value has decayed', 'Live Delta and Vega per position', 'Payoff diagram at expiration for each contract', 'What-If simulator: P&L at any underlying price'].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── F5: HV SCREENER — text left, mockup right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>05 — HV SCREENER</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  1,136 tickers.<br />Sorted by compression.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  Historical volatility screener across the full universe. Find tickers where realized vol is at multi-month lows — the setup that precedes the most asymmetric LEAPS entries.
                </p>
                {['1,136 US underlyings updated daily', '20-day and 60-day HV vs. 52-week range', 'HV Rank: where today sits in its annual band', 'Sort by compression to surface the coiled springs', 'Complements IV Rank for the full volatility picture'].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
              {/* Mockup */}
              <div style={{ background: '#080a0e', border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 0 40px rgba(232,119,34,0.12)' }}>
                <div style={{ background: '#0f1117', borderBottom: `1px solid ${colors.border}`, padding: '0.55rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>{[0,1,2].map(i => <div key={i} style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#2a2a2a' }} />)}</div>
                  <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#444', letterSpacing: '1px' }}>HV SCREENER — HV RANK ↑</span>
                </div>
                <div style={{ padding: '0.4rem 0.875rem', display: 'grid', gridTemplateColumns: '52px 44px 44px 96px 48px', borderBottom: `1px solid ${colors.border}` }}>
                  {['TICKER','20D HV','60D HV','HV RANK','COMP'].map(h => (
                    <span key={h} style={{ fontFamily: mono, fontSize: '0.52rem', color: '#444', letterSpacing: '0.8px', fontWeight: '700' }}>{h}</span>
                  ))}
                </div>
                {[
                  { ticker:'MSFT', hv20:'11.2', hv60:'14.8', rank:4,  comp:'-24%' },
                  { ticker:'AMZN', hv20:'15.4', hv60:'19.1', rank:7,  comp:'-19%' },
                  { ticker:'GOOG', hv20:'13.8', hv60:'17.2', rank:9,  comp:'-18%' },
                  { ticker:'META', hv20:'18.1', hv60:'22.4', rank:11, comp:'-15%' },
                  { ticker:'NFLX', hv20:'22.5', hv60:'26.1', rank:14, comp:'-12%' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 44px 44px 96px 48px', padding: '0.42rem 0.875rem', borderBottom: i < 4 ? `1px solid rgba(30,35,48,0.5)` : 'none' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.orange, fontWeight: '700' }}>{row.ticker}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.green }}>{row.hv20}</span>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: '#555' }}>{row.hv60}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ flex: 1, height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
                        <div style={{ width: `${row.rank * 7}%`, height: '100%', background: colors.green, borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: '0.6rem', color: colors.green, flexShrink: 0 }}>{row.rank}%</span>
                    </div>
                    <span style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.green, fontWeight: '600' }}>{row.comp}</span>
                  </div>
                ))}
                <div style={{ padding: '0.4rem 0.875rem', borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontFamily: mono, fontSize: '0.52rem', color: '#333' }}>1,136 TICKERS · UPDATED DAILY</span>
                </div>
              </div>
            </div>

            {/* ── F6: PORTFOLIO + WHAT-IF — mockup left, text right ── */}
            <div className="feature-showcase-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', padding: '4rem 0', borderTop: `1px solid ${colors.border}` }}>
              {/* Mockup — whatif screenshot */}
              <div style={{ border: `1px solid ${colors.border2}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 60px rgba(232,119,34,0.12), 0 0 0 1px rgba(232,119,34,0.06)' }}>
                {/* Terminal header */}
                <div style={{ background: '#0a0c10', borderBottom: `1px solid ${colors.border}`, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[colors.orange, '#333', '#333'].map((c, i) => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c, opacity: i === 0 ? 0.7 : 1 }} />)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: colors.orange, fontWeight: '700', letterSpacing: '2px' }}>PORTFOLIO</span>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#555' }}>—</span>
                    <span style={{ fontFamily: mono, fontSize: '0.6rem', color: '#8b94a3', letterSpacing: '1px' }}>CS Spread Strategy · 2 open positions</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['POSITIONS', 'GREEKS', 'WHAT-IF'].map((tab, i) => (
                      <span key={tab} style={{ fontFamily: mono, fontSize: '0.52rem', padding: '2px 7px', letterSpacing: '1px', ...(i === 2 ? { color: '#000', background: colors.orange, fontWeight: '700' } : { color: '#555', border: `1px solid #222` }) }}>{tab}</span>
                    ))}
                  </div>
                </div>
                {/* Screenshot */}
                <div style={{ position: 'relative', background: '#080a0e', lineHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/whatif.png"
                    alt="Portfolio Payoff Diagram — What-If Simulator"
                    style={{ width: '100%', display: 'block', opacity: 0.95 }}
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem 0.85rem', background: 'linear-gradient(to top, rgba(8,10,14,0.96) 60%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', color: '#8b94a3', letterSpacing: '1px' }}>BLACK-SCHOLES · LIVE IV</span>
                    <span style={{ fontFamily: mono, fontSize: '0.55rem', color: colors.orange, letterSpacing: '1px' }}>TODAY → +365d P&amp;L CURVES</span>
                  </div>
                </div>
                {/* Position pills */}
                <div style={{ background: '#0a0c10', borderTop: `1px solid ${colors.border}`, padding: '0.45rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: mono, fontSize: '0.55rem', color: colors.orange, letterSpacing: '1px' }}>QQQ CALL 815 LONG · IV 22.9%</span>
                  <span style={{ color: '#333', fontFamily: mono, fontSize: '0.55rem' }}>|</span>
                  <span style={{ fontFamily: mono, fontSize: '0.55rem', color: colors.orange, letterSpacing: '1px' }}>QQQ PUT 750 LONG · IV 30.0%</span>
                  <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: '0.55rem', color: '#555', letterSpacing: '1px' }}>IV SHIFT: ±50% SLIDER</span>
                </div>
              </div>
              {/* Text */}
              <div>
                <div style={{ fontSize: '0.62rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono, marginBottom: '1rem' }}>06 — PORTFOLIO & WHAT-IF</div>
                <h3 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.65rem)', fontWeight: '700', color: colors.white, fontFamily: mono, lineHeight: '1.3', marginBottom: '1rem' }}>
                  Track positions.<br />Stress-test scenarios.
                </h3>
                <p style={{ color: '#8b94a3', lineHeight: '1.85', fontSize: '0.93rem', marginBottom: '1.5rem' }}>
                  Paper-trade any options strategy and run What-If analysis before committing real capital. The Payoff Diagram shows your full P&amp;L curve across strike moves and time horizons — powered by live Black-Scholes with real implied volatility.
                </p>
                {[
                  'Paper trading: test any strategy with no real money at risk',
                  'Payoff Diagram: Today / +7d / +30d / +90d / +365d P&L curves',
                  'IV Shift slider: stress-test vol collapse or vol spike scenarios',
                  'Greeks dashboard: portfolio-level Delta, Gamma, Vega, Theta',
                  'Position history: track entries, exits, and realized P&L over time',
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.45rem' }}>
                    <span style={{ color: colors.orange, fontFamily: mono, fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                    <span style={{ color: '#8b94a3', fontSize: '0.88rem', lineHeight: '1.6' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section CTA */}
            <div style={{ textAlign: 'center', padding: '3rem 0 5rem', borderTop: `1px solid ${colors.border}` }}>
              <p style={{ color: '#8b94a3', marginBottom: '1.5rem', fontSize: '0.95rem' }}>All of this. Free tier. No credit card required.</p>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '0.95rem 2.5rem', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease', boxShadow: '0 0 25px rgba(232,119,34,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Explore the terminal free →
              </button>
            </div>

          </div>
        </section>

        {/* ── USER MANUAL ──────────────────────────────────────────── */}
        <section id="user-manual" style={{ borderBottom: `1px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.28rem 1rem', marginBottom: '1.5rem', fontSize: '0.68rem', color: colors.orange, fontWeight: '700', letterSpacing: '3px', fontFamily: mono }}>◈ USER GUIDE</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '700', color: colors.white, fontFamily: mono, marginBottom: '1rem' }}>Terminal User Guide v3.0</h2>
              <p style={{ color: '#8b94a3', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 2rem' }}>
                Il manuale completo del terminale. Workflow, moduli, CS Score, Volatility Surface, Portfolio e What-If — tutto in un documento.
              </p>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href="/user-manual-v3.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: colors.orange, color: colors.bg, padding: '0.75rem 1.75rem', fontSize: '0.875rem', fontWeight: '700', letterSpacing: '0.5px', textDecoration: 'none', fontFamily: sans, borderRadius: '3px', transition: 'all 0.2s ease', boxShadow: '0 0 20px rgba(232,119,34,0.25)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = colors.orangeHover; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = colors.orange; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
                >
                  ↗ Apri nel browser
                </a>
                <a
                  href="/user-manual-v3.pdf"
                  download="Coiled_Spring_UserGuide_v3.pdf"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: colors.white, padding: '0.75rem 1.75rem', fontSize: '0.875rem', fontWeight: '700', letterSpacing: '0.5px', textDecoration: 'none', fontFamily: sans, borderRadius: '3px', border: `1px solid ${colors.border2}`, transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.orange; (e.currentTarget as HTMLAnchorElement).style.color = colors.orange }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.border2; (e.currentTarget as HTMLAnchorElement).style.color = colors.white }}
                >
                  ↓ Scarica PDF
                </a>
              </div>
            </div>

            {/* PDF inline viewer */}
            <div style={{ border: `1px solid ${colors.border2}`, borderRadius: '6px', overflow: 'hidden', boxShadow: '0 0 40px rgba(232,119,34,0.08)' }}>
              {/* Terminal header bar */}
              <div style={{ background: '#080a0e', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors.orange, display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                <span style={{ marginLeft: '0.75rem', fontSize: '0.72rem', color: colors.darkGray, fontFamily: mono, letterSpacing: '1px' }}>COILED SPRING — USER GUIDE v3.0</span>
              </div>
              {/* iframe */}
              <iframe
                src="/user-manual-v3.pdf"
                style={{ width: '100%', height: '780px', border: 'none', display: 'block', background: '#0D1117' }}
                title="Coiled Spring Terminal User Guide v3.0"
              />
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
                <span style={{ background: colors.green, color: colors.bg, fontSize: '0.6rem', fontWeight: '700', letterSpacing: '1px', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: mono }}>NOW LIVE</span>
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

            <div style={{ textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/register')}
                style={{ background: 'transparent', color: colors.orange, border: `1px solid ${colors.orange}`, padding: '0.875rem 2.25rem', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,119,34,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >{'Create free account'}</button>
              <button
                onClick={() => router.push('/academy')}
                style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '0.875rem 2.25rem', fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >{'Start Module 1 — Free →'}</button>
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
                <span className="cs-mono counter-number" style={{ fontFamily: mono, fontSize: '0.68rem', color: colors.green, letterSpacing: '0.5px' }}>
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
              className="cta-button"
              style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '1.1rem 3rem', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: sans, borderRadius: '3px', transition: 'background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease', boxShadow: '0 0 30px rgba(232,119,34,0.42)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(232,119,34,0.6)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(232,119,34,0.42)' }}
            >
              Start scanning free <span className="arrow">→</span>
            </button>
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
                {[{ label: 'Glossary', href: '/glossary' }, { label: 'Ship Log', href: '/changelog' }, { label: 'Login', href: '/login' }, { label: 'Register', href: '/register' }].map((link) => (
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
