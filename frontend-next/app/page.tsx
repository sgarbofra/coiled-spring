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
  bg: '#000000',
  surface: '#080808',
  border: '#1a1a0a',
  border2: '#2a2a10',
  orange: '#FF6600',
  orangeHover: '#FF8833',
  white: '#FFFFFF',
  gray: '#CCCCCC',
  darkGray: '#666666',
  green: '#00CC44',
  red: '#FF3333',
  dim: '#444444',
}

type TickerItem = { label: string; value: string; change?: string; positive?: boolean; dim?: boolean }
const TICKER_STATIC: TickerItem[] = [
  { label: 'SPY', value: '$535.42', change: '+0.48%', positive: true },
  { label: 'VIX', value: '14.85', change: '-1.03', positive: true },
  { label: 'QQQ', value: '$462.17', change: '+0.61%', positive: true },
  { label: '2Y RATE', value: '4.71%', dim: true },
  { label: '10Y RATE', value: '4.32%', dim: true },
  { label: 'MARKET', value: 'OPEN', positive: true },
]

export default function LandingPage() {
  const router = useRouter()
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [tutorialVideos, setTutorialVideos] = useState<YouTubeVideo[]>([])
  const [tutorialsLoading, setTutorialsLoading] = useState(true)
  const [documentaryVideos, setDocumentaryVideos] = useState<YouTubeVideo[]>([])
  const [documentariesLoading, setDocumentariesLoading] = useState(true)

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
        @media (max-width: 768px) {
          .hero-video { opacity: 0.65 !important; }
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
          .beta-badge { font-size: 0.75rem !important; padding: 0.35rem 0.75rem !important; }
        }
        @media (max-width: 480px) {
          .beta-badge { font-size: 0.72rem !important; }
          .hero-cta { flex-direction: column !important; align-items: center !important; }
          .hero-cta button, .hero-cta a { width: 100% !important; text-align: center !important; }
        }
        .nav-link {
          background: transparent;
          border: none;
          color: #CCCCCC;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover { color: #FF6600; }
        .step-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(255,102,0,0.15); }
        * { box-sizing: border-box; }
        img { max-width: 100%; }
      `}</style>

      <div style={{ minHeight: '100vh', background: colors.bg, color: colors.white, fontFamily: 'Space Mono, Courier New, monospace' }}>

        {/* ── NAVBAR ─────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${colors.border}`, padding: '1rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/logo.png" alt="Coiled Spring — LEAPS Options Scanner" style={{ height: '48px', width: 'auto' }} />
              <span className="navbar-logo-text" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.orange, fontFamily: 'Space Mono, monospace', letterSpacing: '2px' }}>
                COILED SPRING
              </span>
            </div>

            <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="nav-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
              <button className="nav-link" onClick={() => scrollToSection('tutorial-section')}>Tutorials</button>
              <button className="nav-link" onClick={() => scrollToSection('book')}>Book</button>
              <button className="nav-link" onClick={() => scrollToSection('academy')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Academy
                <span style={{ background: colors.orange, color: colors.bg, fontSize: '0.6rem', fontWeight: 'bold', letterSpacing: '0.5px', padding: '0.1rem 0.35rem', borderRadius: '2px', fontFamily: 'Space Mono, monospace', lineHeight: '1' }}>NEW</span>
              </button>
              <button className="nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
              <button
                onClick={() => router.push('/login')}
                style={{ background: 'transparent', border: `1px solid ${colors.orange}`, color: colors.orange, padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.color = colors.bg }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.orange }}
              >Login</button>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, border: 'none', color: colors.bg, padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >Sign Up Free</button>
            </div>
          </div>
        </nav>

        {/* ── MARKET TICKER BAR ────────────────────────────────────── */}
        <div className="ticker-bar" style={{ background: '#050505', borderBottom: `1px solid ${colors.border2}`, padding: '0.45rem 2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
            {TICKER_STATIC.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                <span style={{ color: colors.dim, fontWeight: 'bold' }}>{t.label}</span>
                <span style={{ color: t.dim ? colors.darkGray : colors.white, fontWeight: 'bold' }}>{t.value}</span>
                {t.change && (
                  <span style={{ color: t.positive ? colors.green : colors.red, fontSize: '0.75rem' }}>
                    {t.change}
                  </span>
                )}
                {t.label === 'MARKET' && (
                  <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: colors.green, boxShadow: `0 0 6px ${colors.green}`, marginLeft: '2px' }} />
                )}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: colors.dim, letterSpacing: '1px' }}>
              DATA DELAYED · 15 MIN
            </span>
          </div>
        </div>

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', borderBottom: `2px solid ${colors.border}`, padding: '3rem 2rem', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)', overflow: 'hidden' }}>
          <video autoPlay loop muted playsInline className="hero-video" style={{ position: 'absolute', top: '50%', left: '50%', minWidth: '100%', minHeight: '100%', width: 'auto', height: 'auto', transform: 'translate(-50%, calc(-50% + 2cm))', zIndex: 1, opacity: 0.80, objectFit: 'cover' }}>
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)', zIndex: 2 }} />

          <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
            <div className="beta-badge" style={{ display: 'inline-block', border: `1px solid ${colors.orange}`, color: colors.orange, padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '2rem', letterSpacing: '2px' }}>
              ● PUBLIC BETA — FREE ACCESS AVAILABLE
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 'bold', fontFamily: 'Space Mono, monospace', color: colors.orange, marginBottom: '1.5rem', letterSpacing: '1px', lineHeight: '1.25' }}>
              Cheap volatility doesn&apos;t<br />announce itself.<br />
              <span style={{ color: colors.white }}>We built a scanner that does.</span>
            </h1>

            <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', color: colors.gray, maxWidth: '720px', margin: '0 auto 1.5rem', lineHeight: '1.9', fontWeight: '400' }}>
              When implied volatility is historically low, long-dated options (LEAPS) become asymmetric instruments.
              Coiled Spring scans 3,500+ US underlyings to find exactly those moments — before they disappear.
            </p>

            <div className="hero-tags" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: colors.dim, letterSpacing: '1.5px' }}>
              {['IV RANK SCANNER', 'GREEKS', 'VOL SURFACE 3D', 'COILED AI', 'PORTFOLIO TRACKER'].map((tag, i) => (
                <span key={i} style={{ color: colors.dim }}>
                  {i > 0 && <span style={{ marginRight: '2rem', color: '#222' }}>|</span>}
                  {tag}
                </span>
              ))}
            </div>

            <div className="hero-cta" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '1.15rem 2.75rem', fontSize: '1.05rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', boxShadow: '0 4px 20px rgba(255,102,0,0.3)', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)' }}
              >Start Scanning Free →</button>

              <button
                onClick={() => scrollToSection('how-it-works')}
                style={{ background: 'transparent', color: colors.orange, border: `2px solid ${colors.orange}`, padding: '1.15rem 2.75rem', fontSize: '1.05rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.orange; (e.currentTarget as HTMLButtonElement).style.color = colors.bg }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = colors.orange }}
              >See How It Works</button>
            </div>
          </div>
        </section>

        {/* ── THE THESIS (3-panel logic) ───────────────────────────── */}
        <section style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ THE LOGIC</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace', lineHeight: '1.3' }}>
                Markets Are Cyclical.<br />Volatility Has Memory.
              </h2>
              <p style={{ color: colors.gray, fontSize: '1rem', maxWidth: '700px', margin: '1.5rem auto 0', lineHeight: '1.8' }}>
                Every major sell-off eventually ends. What follows is a slow, quiet compression of fear — and a window where long-dated options become historically cheap.
              </p>
            </div>

            <div className="thesis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', border: `1px solid ${colors.border}` }}>
              {[
                {
                  num: '01',
                  label: 'CRISIS STRIKES',
                  headline: 'Fear spikes. VIX explodes.',
                  body: 'Market crashes trigger panic. Implied volatility surges to 40, 60, 80. Options become expensive. This is the wrong time to buy convexity.',
                  color: '#FF3333',
                },
                {
                  num: '02',
                  label: 'VOLATILITY COMPRESSES',
                  headline: 'Markets recover. Fear is forgotten.',
                  body: 'Over months, VIX drifts back to 12–18. IV Rank falls below 20. Long-dated options become historically cheap — high leverage at low cost.',
                  color: colors.orange,
                },
                {
                  num: '03',
                  label: 'THE SCANNER FINDS IT',
                  headline: 'Low IV Rank = buy signal.',
                  body: 'Coiled Spring identifies underlyings where implied volatility is in the bottom quartile of its 12-month range. That\'s your entry window.',
                  color: '#00DD00',
                },
              ].map((panel, i) => (
                <div key={i} style={{ background: colors.bg, padding: '3rem 2.5rem', borderRight: i < 2 ? `1px solid ${colors.border}` : 'none' }}>
                  <div style={{ fontSize: '0.75rem', color: panel.color, fontWeight: 'bold', letterSpacing: '3px', marginBottom: '0.5rem', fontFamily: 'Space Mono, monospace' }}>
                    {panel.num} — {panel.label}
                  </div>
                  <div style={{ width: '40px', height: '3px', background: panel.color, marginBottom: '1.5rem' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.white, marginBottom: '1rem', lineHeight: '1.4', fontFamily: 'Space Mono, monospace' }}>
                    {panel.headline}
                  </h3>
                  <p style={{ color: colors.gray, lineHeight: '1.7', fontSize: '0.975rem' }}>
                    {panel.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE MARKET CONTEXT ──────────────────────────────────── */}
        <section style={{ borderBottom: `2px solid ${colors.border}`, padding: '5rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ CURRENT REGIME</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>
                Where Is Volatility Right Now?
              </h2>
              <p style={{ color: colors.gray, fontSize: '1rem', maxWidth: '600px', margin: '1rem auto 0', lineHeight: '1.6' }}>
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
        <section id="how-it-works" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ WORKFLOW</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>
                Find → Analyze → Track
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {[
                {
                  step: '01',
                  icon: <Search size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: 'Scan for Low IV Rank',
                  body: 'Filter 3,500+ US underlyings by IV Rank, Delta, DTE, and liquidity. The scanner surfaces options where implied volatility is historically compressed — the precise condition where buying convexity makes structural sense.',
                },
                {
                  step: '02',
                  icon: <BarChart2 size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: 'Deep-Dive on Opportunity',
                  body: 'Each candidate has a full Opportunity Analysis: IV history, volatility surface, Greeks, spread quality, and a CS Score composite signal. Coiled AI (powered by Claude) answers your specific questions about the contract.',
                },
                {
                  step: '03',
                  icon: <Bookmark size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: 'Save & Monitor Positions',
                  body: 'Add contracts to your Watchlist to track live Greeks and P&L evolution. Open positions feed into the Portfolio Tracker with payoff diagram, What-If simulator, and aggregate risk exposure view.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="step-card"
                  style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderTop: `3px solid ${colors.orange}`, padding: '2.5rem', borderRadius: '4px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,102,0,0.08)', border: `1px solid rgba(255,102,0,0.2)`, padding: '0.75rem', borderRadius: '6px' }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'Space Mono, monospace' }}>STEP {item.step}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.white, marginBottom: '1rem', fontFamily: 'Space Mono, monospace' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: colors.gray, lineHeight: '1.7', fontSize: '0.975rem' }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CS SCORE ─────────────────────────────────────────────── */}
        <section style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div className="cs-score-grid" style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ COMPOSITE SIGNAL</div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 'bold', color: colors.white, marginBottom: '1.5rem', fontFamily: 'Space Mono, monospace', lineHeight: '1.3' }}>
                The CS Score:<br />One Number That Matters
              </h2>
              <p style={{ color: colors.gray, lineHeight: '1.8', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
                Each scanned contract receives a CS Score from 0 to 100. It aggregates the five factors that determine whether a long option trade has structural edge:
              </p>
              <p style={{ color: colors.gray, lineHeight: '1.8', fontSize: '1.05rem' }}>
                A score above 70 means the setup is historically cheap, liquid, and well-positioned for a volatility expansion. Below 40 means the trade is too expensive or too illiquid to justify the risk.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { factor: 'IV Rank', weight: '35%', desc: 'How cheap vol is vs. its 12-month range', bar: 35 },
                { factor: 'Delta', weight: '20%', desc: 'Proximity to the 0.25–0.35 sweet spot', bar: 20 },
                { factor: 'DTE', weight: '20%', desc: 'Time buffer for the thesis to develop', bar: 20 },
                { factor: 'Bid-Ask Spread', weight: '15%', desc: 'Liquidity and execution quality', bar: 15 },
                { factor: 'Vega', weight: '10%', desc: 'Sensitivity to volatility expansion', bar: 10 },
              ].map((row, i) => (
                <div key={i} style={{ padding: '1rem 1.25rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: colors.white, fontSize: '0.95rem', fontFamily: 'Space Mono, monospace' }}>{row.factor}</span>
                    <span style={{ color: colors.orange, fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'Space Mono, monospace' }}>{row.weight}</span>
                  </div>
                  <div style={{ height: '3px', background: '#222', borderRadius: '2px', marginBottom: '0.5rem' }}>
                    <div style={{ height: '100%', width: `${row.bar * 2.5}%`, background: colors.orange, borderRadius: '2px' }} />
                  </div>
                  <p style={{ color: colors.darkGray, fontSize: '0.85rem', margin: 0 }}>{row.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ADDITIONAL TOOLS ─────────────────────────────────────── */}
        <section style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ PLATFORM</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>
                Everything in One Terminal
              </h2>
            </div>

            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[
                {
                  icon: <TrendingDown size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: '3D Volatility Surface',
                  body: 'Interactive vol surface for any US underlying. Spot term structure compression, skew shifts, and strike-level anomalies before they expand. Available in the Opportunity Analysis for every scanned contract.',
                  badge: null,
                },
                {
                  icon: <Bot size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: 'Coiled AI Assistant',
                  body: 'Claude-powered assistant trained on options theory, Greeks, and position management. Ask anything about a specific contract — payoff structure, risk parameters, IV interpretation. Answers in plain language.',
                  badge: 'PRO',
                },
                {
                  icon: <Shield size={28} color="#FF6600" strokeWidth={1.5} />,
                  title: 'Portfolio Risk View',
                  body: 'Aggregate Greeks across all open positions. What-If payoff simulator with Black-Scholes pricing. CAPM beta per underlying. Identify concentration risk and tail exposure before the market does.',
                  badge: 'COMING SOON',
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  style={{ position: 'relative', background: colors.surface, border: `1px solid ${colors.border}`, borderTop: `2px solid ${colors.orange}`, padding: '2rem', borderRadius: '4px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,102,0,0.15)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {feat.badge && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: feat.badge === 'PRO' ? colors.orange : '#333', color: feat.badge === 'PRO' ? colors.bg : colors.gray, fontSize: '0.65rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '2px', fontFamily: 'Space Mono, monospace', letterSpacing: '1px' }}>
                      {feat.badge}
                    </div>
                  )}
                  <div style={{ background: 'rgba(255,102,0,0.08)', border: '1px solid rgba(255,102,0,0.2)', padding: '0.75rem', borderRadius: '6px', width: 'fit-content', marginBottom: '1.25rem' }}>
                    {feat.icon}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: colors.white, marginBottom: '0.75rem', fontFamily: 'Space Mono, monospace' }}>{feat.title}</h3>
                  <p style={{ color: colors.gray, lineHeight: '1.7', fontSize: '0.95rem' }}>{feat.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TUTORIALS ────────────────────────────────────────────── */}
        <section id="tutorial-section" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ TUTORIALS</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>Learn the Platform</h2>
              <p style={{ color: colors.gray, marginTop: '1rem', fontSize: '1rem' }}>
                Step-by-step walkthroughs of every feature.{' '}
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none' }}>View full channel →</a>
              </p>
            </div>

            {tutorialsLoading ? (
              <div style={{ textAlign: 'center', color: colors.darkGray, padding: '3rem 0' }}>Loading videos...</div>
            ) : tutorialVideos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {tutorialVideos.map((video) => (
                  <a key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '6px', overflow: 'hidden', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.orange; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.border; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={video.thumbnail} alt={video.title} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,102,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '16px', marginLeft: '2px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <p style={{ color: colors.white, fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.4', margin: 0 }}>{video.title}</p>
                      <p style={{ color: colors.darkGray, fontSize: '0.8rem', marginTop: '0.4rem' }}>{new Date(video.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: colors.darkGray }}>
                <p>Tutorials coming soon.</p>
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none', fontSize: '0.95rem' }}>Subscribe for updates →</a>
              </div>
            )}
          </div>
        </section>

        {/* ── DOCUMENTARIES / MARKET HISTORY ───────────────────────── */}
        <section id="youtube-section" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ MARKET HISTORY</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>
                Study the Crashes
              </h2>
              <p style={{ color: colors.gray, marginTop: '1rem', fontSize: '1rem', maxWidth: '600px', margin: '1rem auto 0', lineHeight: '1.6' }}>
                Every major vol spike was preceded by a period of compression. Understanding the pattern is the first step to exploiting it.
              </p>
            </div>

            {documentariesLoading ? (
              <div style={{ textAlign: 'center', color: colors.darkGray, padding: '3rem 0' }}>Loading videos...</div>
            ) : documentaryVideos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {documentaryVideos.map((video) => (
                  <a key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '6px', overflow: 'hidden', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.orange; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.border; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={video.thumbnail} alt={video.title} style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,102,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: '16px', marginLeft: '2px' }}>▶</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <p style={{ color: colors.white, fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.4', margin: 0 }}>{video.title}</p>
                      <p style={{ color: colors.darkGray, fontSize: '0.8rem', marginTop: '0.4rem' }}>{new Date(video.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: colors.darkGray }}>
                <p>Documentary series coming soon.</p>
                <a href="https://youtube.com/@coiledspringapp" target="_blank" rel="noopener noreferrer" style={{ color: colors.orange, textDecoration: 'none', fontSize: '0.95rem' }}>Subscribe for updates →</a>
              </div>
            )}
          </div>
        </section>

        {/* ── BOOK ─────────────────────────────────────────────────── */}
        <section id="book" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="book-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '5rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <a href="https://www.amazon.com/dp/B0H59BH9SL" target="_blank" rel="noopener noreferrer">
                  <img src="/book.png" alt="Coiled Spring Book" style={{ width: '100%', maxWidth: '240px', borderRadius: '4px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', transition: 'transform 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'} />
                </a>
              </div>

              <div>
                <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ THE BOOK</div>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 'bold', color: colors.white, marginBottom: '1.5rem', fontFamily: 'Space Mono, monospace', lineHeight: '1.3' }}>
                  The Intellectual Foundation
                </h2>
                <p style={{ color: colors.gray, lineHeight: '1.8', fontSize: '1.05rem', marginBottom: '2rem' }}>
                  Written by a 20-year capital markets professional, the book explains the theory behind buying volatility when it&apos;s cheap — why financial crises are structurally predictable, why LEAPS options are the right instrument, and how to construct positions that benefit from market dislocations without requiring precise timing.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                  {[
                    'Why financial crises are predictable — and recurring',
                    'The asymmetry of long options vs. directional stock bets',
                    'How to read IV Rank and identify historically cheap volatility',
                    'Position sizing and portfolio construction for long vol',
                    'Case studies: 2008, 2020, 2022 — what happened and why',
                  ].map((point, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{ color: colors.orange, fontWeight: 'bold', flexShrink: 0, marginTop: '0.1rem' }}>→</span>
                      <span style={{ color: colors.gray, lineHeight: '1.5', fontSize: '0.975rem' }}>{point}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href="https://www.amazon.com/dp/B0H59CRSLN" target="_blank" rel="noopener noreferrer"
                    style={{ background: colors.orange, color: colors.bg, padding: '0.85rem 2rem', fontSize: '0.95rem', fontWeight: 'bold', letterSpacing: '1px', borderRadius: '4px', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.background = colors.orangeHover}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.background = colors.orange}>
                    Buy on Amazon (EN) →
                  </a>
                  <a href="https://www.amazon.com/dp/B0H59BH9SL" target="_blank" rel="noopener noreferrer"
                    style={{ background: 'transparent', color: colors.orange, border: `2px solid ${colors.orange}`, padding: '0.85rem 2rem', fontSize: '0.95rem', fontWeight: 'bold', letterSpacing: '1px', borderRadius: '4px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.2s ease' }}
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
        <section id="academy" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.bg }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ COILED SPRING ACADEMY</div>
                <span style={{ background: colors.orange, color: colors.bg, fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px', padding: '0.2rem 0.55rem', borderRadius: '2px', fontFamily: 'Space Mono, monospace' }}>COMING SOON</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 'bold', color: colors.white, marginBottom: '1rem', fontFamily: 'Space Mono, monospace' }}>
                Structured Options Education
              </h2>
              <p style={{ fontSize: '1.1rem', color: colors.gray, maxWidth: '650px', margin: '0 auto', lineHeight: '1.7' }}>
                A modular video course — from options fundamentals to advanced vol strategies. Complete each module, pass the quiz, unlock the next.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
              {[
                { title: 'Introduction to LEAPS Options', desc: 'What LEAPS are, why they differ from short-dated options, and when to use them.', free: true },
                { title: 'Implied Volatility & IV Rank', desc: 'How to read IV, calculate IV Rank, and identify historically compressed volatility windows.' },
                { title: 'The CS Score Explained', desc: 'The formula behind the Coiled Spring Score and how each component drives the final rating.' },
                { title: 'Scanning for Opportunities', desc: 'Using the terminal scanner with filters: DTE, Delta, IV Rank, and the CS Score threshold.' },
                { title: 'Position Sizing with Coiled AI', desc: 'Risk-based position sizing, portfolio allocation rules, and how to use the AI assistant.' },
                { title: 'Watchlist & Portfolio Management', desc: 'Building, tracking, and managing open positions through expiration.' },
              ].map((mod, idx) => (
                <div key={idx} style={{ background: colors.surface, border: `1px solid ${idx === 0 ? colors.orange : colors.border}`, borderRadius: '8px', padding: '1.75rem', position: 'relative', opacity: idx === 0 ? 1 : 0.65, transition: 'opacity 0.2s ease' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.opacity = idx === 0 ? '1' : '0.65'}>
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: idx === 0 ? '0.65rem' : '1rem', fontWeight: 'bold', color: idx === 0 ? colors.bg : colors.darkGray, background: idx === 0 ? colors.orange : 'transparent', padding: idx === 0 ? '0.2rem 0.5rem' : '0', borderRadius: '2px', fontFamily: 'Space Mono, monospace' }}>
                    {idx === 0 ? 'FREE PREVIEW' : '🔒'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: idx === 0 ? colors.orange : colors.darkGray, fontWeight: 'bold', letterSpacing: '2px', marginBottom: '0.75rem', fontFamily: 'Space Mono, monospace' }}>
                    MODULE {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: idx === 0 ? colors.white : colors.gray, marginBottom: '0.6rem', lineHeight: '1.4' }}>{mod.title}</h3>
                  <p style={{ color: colors.darkGray, fontSize: '0.875rem', lineHeight: '1.6' }}>{mod.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/register')}
                style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '1rem 2.5rem', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', boxShadow: '0 4px 16px rgba(255,102,0,0.3)', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >Register for Early Access →</button>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section id="faq" style={{ borderBottom: `2px solid ${colors.border}`, padding: '6rem 2rem', background: colors.surface }}>
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ FAQ</div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 'bold', color: colors.white, fontFamily: 'Space Mono, monospace' }}>
                Common Questions
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {faqs.map((faq, idx) => (
                <div key={idx} style={{ background: colors.bg, border: `1px solid ${faqOpen === idx ? colors.orange : colors.border}`, borderRadius: '4px', overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
                  <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                    style={{ width: '100%', padding: '1.5rem 2rem', background: 'transparent', border: 'none', color: colors.white, fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                    <span>{faq.question}</span>
                    <span style={{ color: colors.orange, fontSize: '1.25rem', transform: faqOpen === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: '1rem' }}>▼</span>
                  </button>
                  {faqOpen === idx && (
                    <div style={{ padding: '0 2rem 1.5rem 2rem', color: colors.gray, lineHeight: '1.8', fontSize: '1.02rem' }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────── */}
        <section style={{ borderBottom: `2px solid ${colors.border}`, padding: '7rem 2rem', textAlign: 'center', background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <div style={{ display: 'inline-block', border: `1px solid ${colors.border2}`, padding: '0.3rem 1rem', marginBottom: '2rem', fontSize: '0.75rem', color: colors.orange, fontWeight: 'bold', letterSpacing: '3px' }}>◈ GET STARTED</div>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 'bold', color: colors.white, marginBottom: '1.5rem', fontFamily: 'Space Mono, monospace', lineHeight: '1.2' }}>
              The next compression window<br />is already forming.
            </h2>
            <p style={{ fontSize: '1.15rem', color: colors.gray, marginBottom: '3rem', lineHeight: '1.7' }}>
              Free beta access. No credit card. Scan the full US options market in minutes.
            </p>
            <button
              onClick={() => router.push('/register')}
              style={{ background: colors.orange, color: colors.bg, border: 'none', padding: '1.25rem 3.5rem', fontSize: '1.15rem', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '4px', boxShadow: '0 4px 24px rgba(255,102,0,0.35)', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.orangeHover; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.orange; e.currentTarget.style.transform = 'translateY(0)' }}
            >Start Scanning Free →</button>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '4rem 2rem 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: colors.orange, marginBottom: '0.5rem', letterSpacing: '2px', fontFamily: 'Space Mono, monospace' }}>COILED SPRING</div>
            <p style={{ color: colors.gray, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Antifragile Options Trading</p>
            <p style={{ color: '#888888', fontSize: '13px', marginBottom: '2rem' }}>
              Three tools. One method. Built by a 20-year capital markets professional.
            </p>
            <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', fontSize: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {[{ label: 'Login', href: '/login' }, { label: 'Register', href: '/register' }].map((link) => (
                <a key={link.href} href={link.href} style={{ color: colors.gray, textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = colors.orange}
                  onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = colors.gray}>
                  {link.label}
                </a>
              ))}
            </div>
            <div style={{ color: colors.darkGray, fontSize: '0.85rem', paddingTop: '2rem', borderTop: '1px solid #1a1a0a' }}>
              <div style={{ marginBottom: '1rem' }}>2026 Coiled Spring. Built for traders who think in convexity.</div>
              <a href="mailto:info@coiledspring.app" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s ease' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = colors.orange}
                onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#999999'}>
                info@coiledspring.app
              </a>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
