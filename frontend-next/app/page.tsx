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
  surface: '#0a0a0a',
  border: '#222200',
  orange: '#FF6600',
  orangeHover: '#FF8833',
  white: '#FFFFFF',
  gray: '#CCCCCC',
  darkGray: '#666666',
}

export default function LandingPage() {
  const router = useRouter()
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [tutorialVideos, setTutorialVideos] = useState<YouTubeVideo[]>([])
  const [tutorialsLoading, setTutorialsLoading] = useState(true)
  const [documentaryVideos, setDocumentaryVideos] = useState<YouTubeVideo[]>([])
  const [documentariesLoading, setDocumentariesLoading] = useState(true)

  // Fetch YouTube tutorials
  useEffect(() => {
    fetch('/api/youtube-tutorials')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.videos) {
          setTutorialVideos(data.videos)
        }
      })
      .catch(() => {
        // Silent fail - show coming soon fallback
      })
      .finally(() => setTutorialsLoading(false))
  }, [])

  // Fetch YouTube documentaries
  useEffect(() => {
    fetch('/api/youtube-documentaries')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.videos) {
          setDocumentaryVideos(data.videos)
        }
      })
      .catch(() => {
        // Silent fail - show coming soon fallback
      })
      .finally(() => setDocumentariesLoading(false))
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const faqs = [
    {
      question: "What is Coiled Spring?",
      answer: "A scanner and analysis tool designed to identify LEAPS options opportunities when implied volatility is historically compressed."
    },
    {
      question: "What is IV Rank and why does it matter?",
      answer: "IV Rank measures where current implied volatility sits relative to its 12-month range. A low IV Rank means options are historically cheap — the ideal entry condition for the Coiled Spring Strategy."
    },
    {
      question: "How is IV calculated in the scanner?",
      answer: "When implied volatility isn't provided by the data feed, the scanner calculates it using the Black-Scholes model from the option's mid price."
    },
    {
      question: "What stocks can I scan?",
      answer: "Any US stock or ETF with listed options. Type any ticker in the scanner search field."
    },
    {
      question: "What do Delta, Vega, Theta and DTE mean in the scanner results?",
      answer: "Delta measures directional exposure, Vega measures sensitivity to IV changes, Theta is the daily time decay cost, and DTE is the number of days until expiration."
    },
    {
      question: "Why does the scanner show a ▲ symbol next to some IV values?",
      answer: "The ▲ symbol means the IV was calculated by the platform using Black-Scholes, not provided directly by the data feed."
    },
    {
      question: "What filters should I use to find LEAPS candidates?",
      answer: "Start with DTE between 300 and 750, Delta between 0.15 and 0.40, and no strike filters. Then narrow by IV or spread if needed."
    },
    {
      question: "What is the Watchlist for?",
      answer: "To save tickers you want to monitor over time and track how their IV and price evolve."
    },
    {
      question: "Is the data real-time?",
      answer: "Options data is delayed. The platform is designed for position research and strategy analysis, not for intraday execution."
    },
    {
      question: "What is the VIX chart on the homepage?",
      answer: "It shows the S&P 500 implied volatility index over the past 12 months, giving you a quick read on the current market volatility regime."
    },
    {
      question: "Why does Coiled Spring only cover US options?",
      answer: "US options markets are the most liquid and mature in the world. Higher trading volumes mean tighter bid-ask spreads, deeper open interest across strikes and expirations, and more reliable pricing — all critical factors when building LEAPS positions designed to be held for 12 to 24 months. Reliable execution on entry and exit depends on liquidity. We chose depth over breadth."
    },
  ]

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .hero-video {
            opacity: 0.65 !important;
          }
          .navbar-logo-text {
            display: none;
          }
          .widgets-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .beta-badge {
            font-size: 0.75rem !important;
            padding: 0.4rem 0.8rem !important;
          }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.white,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        {/* STICKY NAVBAR */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${colors.border}`,
          padding: '1rem 2rem',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
            flexWrap: 'wrap',
          }}>
            {/* Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img
                src="/logo.png"
                alt="Coiled Spring"
                style={{
                  height: '48px',
                  width: 'auto',
                }}
              />
              <span className="navbar-logo-text" style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: colors.orange,
                fontFamily: 'Space Mono, monospace',
                letterSpacing: '2px',
              }}>
                COILED SPRING
              </span>
            </div>

            {/* Nav Links */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={() => scrollToSection('book')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.gray,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
              >
                Book
              </button>
              <button
                onClick={() => scrollToSection('tutorial-section')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.gray,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
              >
                Tutorial
              </button>
              <button
                onClick={() => scrollToSection('youtube-section')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.gray,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
              >
                YouTube
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.gray,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
              >
                FAQ
              </button>
              <button
                onClick={() => router.push('/login')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.orange}`,
                  color: colors.orange,
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.orange
                  e.currentTarget.style.color = colors.bg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = colors.orange
                }}
              >
                Login
              </button>
              <button
                onClick={() => router.push('/register')}
                style={{
                  background: colors.orange,
                  border: 'none',
                  color: colors.bg,
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
              >
                Sign Up
              </button>
            </div>
          </div>
        </nav>
      {/* HERO SECTION */}
      <section style={{
        position: 'relative',
        borderBottom: `2px solid ${colors.border}`,
        padding: '3rem 2rem',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
        overflow: 'hidden',
      }}>
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            transform: 'translate(-50%, calc(-50% + 2cm))',
            zIndex: 1,
            opacity: 0.80,
            objectFit: 'cover',
          }}
          className="hero-video"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>

        {/* Overlay gradient for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          zIndex: 2,
        }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
          {/* Beta Badge */}
          <div className="beta-badge" style={{
            display: 'inline-block',
            background: 'rgba(255, 102, 0, 0.1)',
            border: `1px solid ${colors.orange}`,
            color: colors.orange,
            padding: '0.5rem 1rem',
            borderRadius: '24px',
            fontSize: '0.9rem',
            fontWeight: '600',
            marginBottom: '1rem',
            letterSpacing: '0.5px',
          }}>
            🚀 Public Beta — Free Access Available
          </div>

          {/* Tagline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 'bold',
            fontFamily: 'Space Mono, monospace',
            color: colors.orange,
            marginBottom: '1rem',
            letterSpacing: '1px',
            lineHeight: '1.2',
          }}>
            Financial Crises Create Opportunity.<br />
            The Question Is Whether You&apos;re Ready.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
            color: colors.gray,
            maxWidth: '800px',
            margin: '0 auto 2rem',
            lineHeight: '1.6',
            fontWeight: '400',
          }}>
            Coiled Spring combines market history, options analytics,
            and AI to help you analyze markets, find opportunities,
            and trade with conviction.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => router.push('/register')}
              style={{
                background: colors.orange,
                color: colors.bg,
                border: 'none',
                padding: '1.15rem 2.75rem',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: '4px',
                boxShadow: `0 4px 20px rgba(255, 102, 0, 0.3)`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.orangeHover
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 6px 28px rgba(255, 102, 0, 0.4)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.orange
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 4px 20px rgba(255, 102, 0, 0.3)`
              }}
            >
              Get Free Beta Access →
            </button>

            <a
              href="https://www.amazon.com/dp/B0H59BH9SL"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'transparent',
                color: colors.orange,
                border: `2px solid ${colors.orange}`,
                padding: '1.15rem 2.75rem',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.orange
                e.currentTarget.style.color = colors.bg
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = colors.orange
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Read the Book
            </a>
          </div>
        </div>
      </section>

      {/* NARRATIVE TEXT */}
      {/* PROBLEM/SOLUTION SECTION */}
      <section style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '5rem 2rem',
        background: colors.surface,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Text Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start', marginBottom: '3rem' }}>
            {/* Problem Column */}
            <div>
              <div style={{
                fontSize: '0.85rem',
                color: colors.orange,
                fontWeight: 'bold',
                letterSpacing: '2px',
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                THE PROBLEM
              </div>
              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: 'bold',
                color: colors.white,
                marginBottom: '1.5rem',
                fontFamily: 'Space Mono, monospace',
                lineHeight: '1.3',
              }}>
                Volatility compression is invisible to most traders
              </h2>
              <p style={{
                color: colors.gray,
                lineHeight: '1.8',
                fontSize: '1.05rem',
              }}>
                Traditional platforms show you IV, but not <strong style={{ color: colors.white }}>IV Rank</strong>.
                You can't see when volatility is historically compressed — the exact moment when long-dated
                options offer maximum convexity.
              </p>
            </div>

            {/* Solution Column */}
            <div>
              <div style={{
                fontSize: '0.85rem',
                color: colors.orange,
                fontWeight: 'bold',
                letterSpacing: '2px',
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                THE SOLUTION
              </div>
              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: 'bold',
                color: colors.white,
                marginBottom: '1.5rem',
                fontFamily: 'Space Mono, monospace',
                lineHeight: '1.3',
              }}>
                Scan, visualize, act
              </h2>
              <p style={{
                color: colors.gray,
                lineHeight: '1.8',
                fontSize: '1.05rem',
              }}>
                Coiled Spring scans over 3,500 US underlyings for <strong style={{ color: colors.white }}>LEAPS
                with IV Rank {'<'} 20</strong>. Visualize the volatility surface in 3D. Get AI-powered position
                sizing. Execute with conviction.
              </p>
            </div>
          </div>

          {/* Widgets Grid - Full Width */}
          <div
            className="widgets-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              width: '100%',
            }}
          >
            <VixChart />
            <MarketMovers />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: colors.orange,
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              FEATURES
            </div>
            <h2 style={{
              fontSize: '2.75rem',
              fontWeight: 'bold',
              color: colors.white,
              fontFamily: 'Space Mono, monospace',
            }}>
              Built for Antifragile Traders
            </h2>
          </div>

          {/* Three-step flow */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto 1fr auto',
            alignItems: 'center',
            gap: '0',
            maxWidth: '900px',
            margin: '0 auto 5rem',
            padding: '3rem 2rem',
            background: 'rgba(255, 102, 0, 0.03)',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
          }}
          className="three-step-container">
            {/* Step 1 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '0.5rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                ① READ THE BOOK
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: colors.gray,
                lineHeight: '1.5',
              }}>
                Learn the Coiled Spring method
              </div>
            </div>

            {/* Arrow 1 */}
            <div style={{
              color: '#FF6600',
              fontSize: '24px',
              textAlign: 'center',
              padding: '0 1rem',
            }}>
              <span className="arrow-desktop">→</span>
              <span className="arrow-mobile">↓</span>
            </div>

            {/* Step 2 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '0.5rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                ② STUDY THE CRASHES
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: colors.gray,
                lineHeight: '1.5',
              }}>
                Watch how crises created opportunities
              </div>
            </div>

            {/* Arrow 2 */}
            <div style={{
              color: '#FF6600',
              fontSize: '24px',
              textAlign: 'center',
              padding: '0 1rem',
            }}>
              <span className="arrow-desktop">→</span>
              <span className="arrow-mobile">↓</span>
            </div>

            {/* Step 3 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '0.5rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                ③ USE THE TERMINAL
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: colors.gray,
                lineHeight: '1.5',
              }}>
                Scan 3,500+ options in real time
              </div>
            </div>
          </div>

          {/* CSS for mobile arrows */}
          <style jsx>{`
            .arrow-mobile {
              display: none;
            }
            .arrow-desktop {
              display: inline;
            }
            @media (max-width: 768px) {
              .three-step-container {
                grid-template-columns: 1fr !important;
              }
              .arrow-mobile {
                display: inline;
              }
              .arrow-desktop {
                display: none;
              }
            }
          `}</style>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
          }}>
            {/* Feature 1 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                marginBottom: '1rem',
              }}>
                <Search size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                LEAPS Scanner
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Filter by Delta, IV Rank, DTE, and liquidity. Find coiled springs across thousands of underlyings in real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                marginBottom: '1rem',
              }}>
                <TrendingDown size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Volatility Surface 3D
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Interactive 3D volatility surface. Spot skew, term structure, and compression patterns before they expand.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                marginBottom: '1rem',
              }}>
                <Bot size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Coiled AI
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Claude-powered assistant trained on options theory, Greeks, and portfolio construction. Ask anything, get actionable answers.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              {/* COMING SOON Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#FF6600',
                color: '#000',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'Space Mono, monospace',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '1px',
              }}>
                COMING SOON
              </div>
              <div style={{
                marginBottom: '1rem',
              }}>
                <BarChart2 size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Portfolio Tracker
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Connect your broker. Track P&L, Greeks exposure, and tail risk in real-time. PRO plan only.
              </p>
            </div>

            {/* Feature 5 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                marginBottom: '1rem',
              }}>
                <Bookmark size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Smart Watchlists
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Save your setups. Get alerts when IV Rank drops below your threshold or Greeks shift meaningfully.
              </p>
            </div>

            {/* Feature 6 */}
            <div style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: `3px solid ${colors.orange}`,
              padding: '2.5rem',
              borderRadius: '4px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              {/* COMING SOON Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#FF6600',
                color: '#000',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'Space Mono, monospace',
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '1px',
              }}>
                COMING SOON
              </div>
              <div style={{
                marginBottom: '1rem',
              }}>
                <Shield size={32} color="#FF6600" strokeWidth={1.5} />
              </div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Tail Risk Dashboard
              </div>
              <p style={{
                color: colors.gray,
                lineHeight: '1.7',
                fontSize: '1rem',
              }}>
                Visualize your portfolio's exposure to black swan events. Position-level stress testing included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
        background: colors.surface,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: colors.orange,
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              HOW IT WORKS
            </div>
            <h2 style={{
              fontSize: '2.75rem',
              fontWeight: 'bold',
              color: colors.white,
              fontFamily: 'Space Mono, monospace',
            }}>
              Three Steps to Antifragility
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
          }}>
            {/* Step 1 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: colors.orange,
                color: colors.bg,
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.25rem',
                fontWeight: 'bold',
                margin: '0 auto 1.5rem',
                fontFamily: 'Space Mono, monospace',
                boxShadow: `0 4px 20px rgba(255, 102, 0, 0.3)`,
              }}>
                1
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                SCAN
              </div>
              <p style={{
                color: colors.gray,
                fontSize: '1.05rem',
                lineHeight: '1.7',
              }}>
                Use the LEAPS scanner to find options with compressed IV (IV Rank {'<'} 20) and high delta.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: colors.orange,
                color: colors.bg,
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.25rem',
                fontWeight: 'bold',
                margin: '0 auto 1.5rem',
                fontFamily: 'Space Mono, monospace',
                boxShadow: `0 4px 20px rgba(255, 102, 0, 0.3)`,
              }}>
                2
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                ANALYZE
              </div>
              <p style={{
                color: colors.gray,
                fontSize: '1.05rem',
                lineHeight: '1.7',
              }}>
                Visualize the 3D volatility surface. Ask Coiled AI for position sizing and risk assessment.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: colors.orange,
                color: colors.bg,
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.25rem',
                fontWeight: 'bold',
                margin: '0 auto 1.5rem',
                fontFamily: 'Space Mono, monospace',
                boxShadow: `0 4px 20px rgba(255, 102, 0, 0.3)`,
              }}>
                3
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.orange,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                ACT
              </div>
              <p style={{
                color: colors.gray,
                fontSize: '1.05rem',
                lineHeight: '1.7',
              }}>
                Execute with conviction. Add to your watchlist and track performance in the portfolio dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TUTORIALS SECTION */}
      <section id="tutorial-section" style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: colors.orange,
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              LEARN THE PLATFORM
            </div>
            <h2 style={{
              fontSize: '2.75rem',
              fontWeight: 'bold',
              color: colors.white,
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              Platform Tutorials
            </h2>
            <p style={{
              fontSize: '1.15rem',
              color: colors.gray,
              maxWidth: '700px',
              margin: '0 auto',
            }}>
              Quick guides on using the scanner, watchlists, and AI to find LEAPS opportunities.
            </p>
          </div>

          {/* Videos Grid */}
          {tutorialsLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                  }} />
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{
                      height: '1.2rem',
                      background: colors.border,
                      marginBottom: '0.75rem',
                      borderRadius: '4px',
                    }} />
                    <div style={{
                      height: '0.85rem',
                      background: colors.border,
                      width: '60%',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : tutorialVideos.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}>
              {tutorialVideos.map((video) => (
                <div
                  key={video.videoId}
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundImage: `url(${video.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      color: colors.white,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      ▶
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: colors.white,
                      marginBottom: '0.75rem',
                      lineHeight: '1.4',
                    }}>
                      {video.title}
                    </h3>
                    <p style={{
                      color: colors.gray,
                      fontSize: '0.85rem',
                    }}>
                      {new Date(video.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1.5rem',
              }}>
                🎥
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.white,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                COMING SOON
              </h3>
              <p style={{
                color: colors.gray,
                fontSize: '1rem',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: '1.6',
              }}>
                Platform tutorial videos are coming soon. Learn how to use the scanner, build watchlists, and leverage the AI assistant.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* DOCUMENTARIES SECTION */}
      <section id="youtube-section" style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
        background: colors.surface,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: colors.orange,
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              WATCH & LEARN
            </div>
            <h2 style={{
              fontSize: '2.75rem',
              fontWeight: 'bold',
              color: colors.white,
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              Coiled Spring Channel
            </h2>
            <p style={{
              fontSize: '1.15rem',
              color: colors.gray,
              maxWidth: '700px',
              margin: '0 auto',
            }}>
              Documentaries on financial crises, volatility analysis, and antifragile strategies.
            </p>
          </div>

          {/* Videos Grid */}
          {documentariesLoading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                  }} />
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{
                      height: '1.2rem',
                      background: colors.border,
                      marginBottom: '0.75rem',
                      borderRadius: '4px',
                    }} />
                    <div style={{
                      height: '0.85rem',
                      background: colors.border,
                      width: '60%',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : documentaryVideos.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}>
              {documentaryVideos.map((video) => (
                <div
                  key={video.videoId}
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 8px 32px rgba(255, 102, 0, 0.15)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundImage: `url(${video.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      color: colors.white,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      ▶
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: colors.white,
                      marginBottom: '0.75rem',
                      lineHeight: '1.4',
                    }}>
                      {video.title}
                    </h3>
                    <p style={{
                      color: colors.gray,
                      fontSize: '0.85rem',
                    }}>
                      {new Date(video.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '1.5rem',
              }}>
                🎬
              </div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.white,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                COMING SOON
              </h3>
              <p style={{
                color: colors.gray,
                fontSize: '1rem',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: '1.6',
              }}>
                Short documentaries on historical financial crises coming soon. Learn from past volatility spikes and market dislocations.
              </p>
            </div>
          )}

          {/* Subscribe CTA */}
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button
              onClick={() => window.open('https://youtube.com/@coiledspringapp', '_blank')}
              style={{
                background: colors.orange,
                color: colors.bg,
                border: 'none',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: '4px',
                boxShadow: `0 4px 16px rgba(255, 102, 0, 0.3)`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
              onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
            >
              Subscribe on YouTube →
            </button>
          </div>
        </div>
      </section>

      {/* BOOK SECTION */}
      <section id="book" style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
        background: colors.surface,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
          }}>
            {/* Left Column - Book Cover */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
            }}>
              <img
                src="/book.png"
                alt="Coiled Spring Strategy Book Cover"
                style={{
                  width: '100%',
                  maxWidth: '350px',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(255, 102, 0, 0.2)',
                }}
              />
            </div>

            {/* Right Column - Content */}
            <div>
              <div style={{
                fontSize: '0.85rem',
                color: colors.orange,
                fontWeight: 'bold',
                letterSpacing: '2px',
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                READ THE BOOK
              </div>
              <h2 style={{
                fontSize: '2.75rem',
                fontWeight: 'bold',
                color: colors.white,
                marginBottom: '1rem',
                fontFamily: 'Space Mono, monospace',
              }}>
                Coiled Spring Strategy
              </h2>
              <p style={{
                fontSize: '1.15rem',
                color: colors.gray,
                marginBottom: '2.5rem',
                lineHeight: '1.6',
              }}>
                The complete guide to building antifragile portfolios with long-dated options and compressed volatility.
              </p>

              {/* Bullet points list */}
              <div style={{
                marginBottom: '3rem',
              }}>
                {/* Bullet 1 */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: colors.orange, fontSize: '1rem', marginTop: '0.15rem' }}>●</span>
                  <div>
                    <span style={{ color: colors.orange, fontWeight: 'bold', fontSize: '1rem' }}>The Philosophy</span>
                    <span style={{ color: colors.gray, fontSize: '1rem' }}> — Why most traders lose in volatility and how to flip the game.</span>
                  </div>
                </div>

                {/* Bullet 2 */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: colors.orange, fontSize: '1rem', marginTop: '0.15rem' }}>●</span>
                  <div>
                    <span style={{ color: colors.orange, fontWeight: 'bold', fontSize: '1rem' }}>Finding the Spring</span>
                    <span style={{ color: colors.gray, fontSize: '1rem' }}> — IV Rank, percentile compression, and recognizing coiled market moves.</span>
                  </div>
                </div>

                {/* Bullet 3 */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: colors.orange, fontSize: '1rem', marginTop: '0.15rem' }}>●</span>
                  <div>
                    <span style={{ color: colors.orange, fontWeight: 'bold', fontSize: '1rem' }}>Building the Position</span>
                    <span style={{ color: colors.gray, fontSize: '1rem' }}> — Strike selection, expiry, sizing, liquidity checks, and the pre-entry checklist.</span>
                  </div>
                </div>

                {/* Bullet 4 */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: colors.orange, fontSize: '1rem', marginTop: '0.15rem' }}>●</span>
                  <div>
                    <span style={{ color: colors.orange, fontWeight: 'bold', fontSize: '1rem' }}>Monetizing the Spring</span>
                    <span style={{ color: colors.gray, fontSize: '1rem' }}> — When to take profit and what volatility crush can do to a winning position.</span>
                  </div>
                </div>

                {/* Bullet 5 */}
                <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: colors.orange, fontSize: '1rem', marginTop: '0.15rem' }}>●</span>
                  <div>
                    <span style={{ color: colors.orange, fontWeight: 'bold', fontSize: '1rem' }}>History as a Test</span>
                    <span style={{ color: colors.gray, fontSize: '1rem' }}> — From 1929 to Covid-19, the strategy applied to the biggest market events.</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.open('https://www.amazon.com/dp/B0H59CRSLN', '_blank')}
                  style={{
                    background: colors.orange,
                    color: colors.bg,
                    border: 'none',
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderRadius: '4px',
                    boxShadow: `0 4px 16px rgba(255, 102, 0, 0.3)`,
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.orangeHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = colors.orange}
                >
                  Understand the Method →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '6rem 2rem',
        background: colors.surface,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: colors.orange,
              fontWeight: 'bold',
              letterSpacing: '2px',
              marginBottom: '1rem',
              fontFamily: 'Space Mono, monospace',
            }}>
              FAQ
            </div>
            <h2 style={{
              fontSize: '2.75rem',
              fontWeight: 'bold',
              color: colors.white,
              fontFamily: 'Space Mono, monospace',
            }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: colors.bg,
                  border: `1px solid ${faqOpen === idx ? colors.orange : colors.border}`,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.5rem 2rem',
                    background: 'transparent',
                    border: 'none',
                    color: colors.white,
                    fontSize: '1.15rem',
                    fontWeight: 'bold',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{faq.question}</span>
                  <span style={{
                    color: colors.orange,
                    fontSize: '1.5rem',
                    transform: faqOpen === idx ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease',
                  }}>
                    ▼
                  </span>
                </button>
                {faqOpen === idx && (
                  <div style={{
                    padding: '0 2rem 1.5rem 2rem',
                    color: colors.gray,
                    lineHeight: '1.8',
                    fontSize: '1.05rem',
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{
        borderBottom: `2px solid ${colors.border}`,
        padding: '5rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: colors.white,
            marginBottom: '1.5rem',
            fontFamily: 'Space Mono, monospace',
            lineHeight: '1.2',
          }}>
            Ready to find your next coiled spring?
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: colors.gray,
            marginBottom: '3rem',
            lineHeight: '1.7',
          }}>
            Join traders who profit from volatility compression. Start scanning for free.
          </p>
          <button
            onClick={() => router.push('/register')}
            style={{
              background: colors.orange,
              color: colors.bg,
              border: 'none',
              padding: '1.15rem 3rem',
              fontSize: '1.15rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderRadius: '4px',
              boxShadow: `0 4px 20px rgba(255, 102, 0, 0.3)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.orangeHover
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.orange
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get Free Beta Access →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '4rem 2rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colors.orange,
            marginBottom: '0.5rem',
            letterSpacing: '2px',
            fontFamily: 'Space Mono, monospace',
          }}>
            COILED SPRING
          </div>

          <p style={{
            color: colors.gray,
            fontSize: '0.95rem',
            marginBottom: '1rem',
          }}>
            Antifragile Options Trading
          </p>

          <p style={{
            color: '#888888',
            fontSize: '13px',
            fontFamily: 'Space Mono, monospace',
            marginBottom: '2rem',
          }}>
            Three tools. One method. Built by a 20-year capital markets professional.
          </p>

          <div style={{
            display: 'flex',
            gap: '2.5rem',
            justifyContent: 'center',
            fontSize: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}>
            <a
              href="/login"
              style={{
                color: colors.gray,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
            >
              Login
            </a>
            <a
              href="/register"
              style={{
                color: colors.gray,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.gray}
            >
              Register
            </a>
          </div>

          <div style={{
            color: colors.darkGray,
            fontSize: '0.85rem',
            paddingTop: '2rem',
            borderTop: `1px solid ${colors.border}`,
          }}>
            <div style={{ marginBottom: '1rem' }}>
              © 2026 Coiled Spring. Built for traders who think in convexity.
            </div>
            <div>
              <a
                href="mailto:info@coiledspring.app"
                style={{
                  color: '#999999',
                  textDecoration: 'none',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.orange}
                onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
              >
                info@coiledspring.app
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}
