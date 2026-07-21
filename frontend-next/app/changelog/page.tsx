'use client'

import { useRouter } from 'next/navigation'

const colors = {
  bg: '#0c0e12',
  surface: '#111318',
  surface2: '#161922',
  border: '#1e2330',
  border2: '#252a35',
  orange: '#e87722',
  white: '#f0f2f5',
  gray: '#8b94a3',
  darkGray: '#4a5260',
  green: '#4ade80',
  dim: '#3a4050',
}

const mono = "'JetBrains Mono', 'Courier New', monospace"
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

type Entry = {
  date: string
  version: string
  versionLabel?: string
  headline: string
  body: string[]
  tag?: 'launch' | 'feature' | 'fix' | 'infra' | 'design'
}

const TAG_COLORS: Record<string, string> = {
  launch:  '#4ade80',
  feature: '#e87722',
  fix:     '#f87171',
  infra:   '#60a5fa',
  design:  '#a78bfa',
}

const TAG_LABELS: Record<string, string> = {
  launch:  'LAUNCH',
  feature: 'FEATURE',
  fix:     'BUGFIX',
  infra:   'INFRA',
  design:  'DESIGN',
}

const ENTRIES: Entry[] = [
  {
    date: 'February 3, 2026',
    version: 'v1.0',
    headline: 'We go live.',
    tag: 'launch',
    body: [
      "First version is up. Nothing fancy — a rough scanner, a portfolio tracker, a watchlist. But it works. I spent the last few weeks wrestling with yfinance and its quirks, and at some point I decided that something 80% done is better than nothing. I called it Coiled Spring Terminal. The name stuck: a compressed spring, ready to snap. Exactly what I look for in options.",
    ],
  },
  {
    date: 'February – June 2026',
    version: 'v1.1 – v1.6',
    headline: 'Months of quiet work.',
    tag: 'feature',
    body: [
      "No changelog, no announcements. Just building. Added the Risk Panel, then the Opportunity Analysis page with a full volatility surface, then a 20-day Historical Volatility overlay on the price chart. Every week something new, often broken, then fixed. Nobody was using it yet and I didn't care much — I was building the tool I wished I already had.",
    ],
  },
  {
    date: 'July 1, 2026',
    version: 'v1.7',
    headline: 'Portfolio Payoff Diagram.',
    tag: 'feature',
    body: [
      "First real deployment of the month. Finished the Payoff Diagram in the portfolio view: you can now see exactly what happens to your position if the underlying moves ±20%. I built it with Black-Scholes in TypeScript — no backend call, pure client-side. Plotly handles the chart.",
      "The trickiest part was the three-tier IV estimate: live market first, yfinance as fallback, then entry IV as last resort. The multi-underlying CAPM beta slipped in almost by accident, but it turned out to be genuinely useful.",
    ],
  },
  {
    date: 'July 7, 2026',
    version: 'v1.8',
    headline: 'Coiled AI lands on Opportunity Analysis.',
    tag: 'feature',
    body: [
      "Integrated Claude Haiku into the Opportunity Analysis page. Now when you open a contract, the AI writes four sentences explaining why it might be worth looking at — educational, no financial advice, just context.",
      "Also added personal notes with auto-save. You write, leave, come back and they're still there. Small thing. Missed it every single session.",
    ],
  },
  {
    date: 'July 10, 2026',
    version: 'v1.9',
    headline: 'IV Rank is here. Give it a few weeks to ripen.',
    tag: 'feature',
    body: [
      "IV Rank. Been thinking about this for a while. Built a daily cron that runs at 18:00 UTC and saves an ATM IV snapshot for ~524 tickers across four DTE buckets. The data accumulates day by day and over time you get a real historical percentile.",
      "With a few days of data the rank isn't reliable yet, but in a few months it'll be one of the most useful columns in the scanner. Added it as an IVR column in the Scanner and as a collapsible historical table on the Opportunity page.",
    ],
  },
  {
    date: 'July 13, 2026',
    version: 'v2.0',
    headline: 'Compare Contracts side by side.',
    tag: 'feature',
    body: [
      "You can now select 2 or 3 options from the Scanner and compare them on a dedicated page. The system highlights the best cell for each metric: lowest spread, highest OI, delta closest to 0.30, and so on.",
      "Used sessionStorage to pass the contracts across — no server roundtrip, no URL bloat. Simple, works great.",
    ],
  },
  {
    date: 'July 15, 2026',
    version: 'v2.1',
    headline: 'Analysis button everywhere.',
    tag: 'feature',
    body: [
      "Small but high-impact: added the 📊 Analysis button directly inside the Watchlist and Portfolio tables. Before, you had to go back to the Scanner, search the ticker, and then open Opportunity Analysis. Now it's one click from wherever you are.",
      "Also fixed a silent bug on the CLOSE button in Portfolio that was triggering both the drawer and the close action at the same time. Nobody noticed. It was bothering me.",
    ],
  },
  {
    date: 'July 16, 2026',
    version: 'v2.2',
    headline: 'New face, new panel.',
    tag: 'design',
    body: [
      "The landing page was still the placeholder I threw together in five minutes back in February. Rebuilt it from scratch with a Bloomberg terminal aesthetic: JetBrains Mono, a static ticker bar at the top, new hero copy, a CS Score breakdown section. Feels like a real product now.",
      "On the same day, shipped the HV Rank Panel inside Opportunity Analysis — a color-coded gauge showing whether historical volatility is compressed, average, or elevated. VOL COMPRESSED in green means optimal window for buying LEAPS.",
    ],
  },
  {
    date: 'July 17, 2026',
    version: 'v2.3',
    headline: 'Scanner grows to 1,136 tickers.',
    tag: 'feature',
    body: [
      "Expanded the scanner universe from ~150 to 1,136 underlying assets: full S&P 500, S&P MidCap 400, sector and thematic ETFs, plus a curated list of high-volume speculative names.",
      "For illiquid options — no bid, no ask — added a visual stale price indicator: orange LAST badge, amber mid cell. So you know at a glance that the number you're seeing is the last traded price, not a live mid. Better than false precision.",
      "The Asset Class dropdown is now dynamic, loaded from the API, with live ticker counts per category.",
    ],
  },
  {
    date: 'July 18, 2026',
    version: 'v2.4',
    headline: 'Night / Day mode. And a Railway bug killed.',
    tag: 'infra',
    body: [
      "Migrated 28+ components from hardcoded Bloomberg-black hex values to CSS custom properties. Toggle in the navbar, preference saved in localStorage, smooth 0.25s transition. The trickiest part: Plotly doesn't resolve CSS variables, so I had to use a MutationObserver that recolors the chart every time you switch themes.",
      "Also fixed a nasty bug in the IV snapshot cron: Railway assigns ports dynamically via $PORT and I had 8080 hardcoded. The cron was trying to call itself on the wrong port and failing silently for days.",
      "While I was in market_data.py, reworked the yfinance session strategy for the snapshot job: down from 4 sessions per ticker to 1, sequential loop instead of thread pool, 1.5s sleep between tickers. No more rate limit errors on universes over 300 tickers.",
    ],
  },
  {
    date: 'July 21, 2026',
    version: 'v2.5',
    headline: 'Academy remembers where you left off. Portfolio prices fixed. Chat in class.',
    tag: 'feature',
    body: [
      "Three things shipped today.",
      "First: the Academy video now remembers your position. Come back to the lesson and it picks up exactly where you stopped, with a Resume badge showing the timestamp. Saves every 10 seconds while playing, and once more when you close the tab. Small detail, meaningful if you're actually studying.",
      "Second: added an inline chat panel in the Academy page — a ✋ Raise your hand button that opens a tutor-mode Coiled AI session with the current lesson's context already injected. Responses are capped at 150 words to keep you focused. The global AI panel disappears on /academy routes so it doesn't compete with the inline one.",
      "Third: fixed a bug that was making all price columns show '–' in the Portfolio. Root cause: yfinance sometimes returns a slightly different expiry date than what's stored (e.g. 2027-06-18 instead of 2027-06-17) and the old code threw a silent KeyError and returned nothing. Now it finds the closest available expiry within 14 days and logs every step to Railway under the [OPTPRICE] prefix, so any future failure is instantly diagnosable.",
    ],
  },
]

export default function ChangelogPage() {
  const router = useRouter()

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: sans, color: colors.white }}>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: colors.bg,
        zIndex: 100,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.orange,
            fontFamily: mono,
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '2px',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          COILED SPRING
        </button>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', color: colors.gray, fontFamily: mono, fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '1px' }}
          >
            LOGIN
          </button>
          <button
            onClick={() => router.push('/register')}
            style={{
              background: colors.orange,
              border: 'none',
              color: '#000',
              fontFamily: mono,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.4rem 1rem',
              letterSpacing: '1px',
            }}
          >
            GET ACCESS
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '5rem 2rem 2rem' }}>
        <div style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.orange, letterSpacing: '3px', marginBottom: '1rem' }}>
          ◈ BUILD LOG
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
          Ship log.
        </h1>
        <p style={{ color: colors.gray, fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '580px', margin: 0 }}>
          Every release, in plain language. What changed, why it changed, what broke first.
        </p>
        <div style={{ marginTop: '2.5rem', width: '48px', height: '2px', background: colors.orange }} />
      </div>

      {/* Entries */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 2rem 6rem' }}>
        {ENTRIES.slice().reverse().map((entry, i) => {
          const tagColor = entry.tag ? TAG_COLORS[entry.tag] : colors.gray
          const tagLabel = entry.tag ? TAG_LABELS[entry.tag] : ''
          return (
            <article
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '0 2.5rem',
                borderTop: `1px solid ${colors.border}`,
                padding: '2.5rem 0',
              }}
            >
              {/* Left column */}
              <div style={{ paddingTop: '0.15rem' }}>
                <div style={{
                  fontFamily: mono,
                  fontSize: '0.7rem',
                  color: colors.darkGray,
                  letterSpacing: '1px',
                  marginBottom: '0.6rem',
                  lineHeight: 1.5,
                }}>
                  {entry.date}
                </div>
                <div style={{
                  display: 'inline-block',
                  fontFamily: mono,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: colors.orange,
                  background: 'rgba(232,119,34,0.1)',
                  border: `1px solid rgba(232,119,34,0.3)`,
                  padding: '0.2rem 0.5rem',
                  letterSpacing: '1px',
                  marginBottom: '0.5rem',
                }}>
                  {entry.version}
                </div>
                {entry.tag && (
                  <div style={{
                    display: 'block',
                    fontFamily: mono,
                    fontSize: '0.65rem',
                    color: tagColor,
                    letterSpacing: '1.5px',
                    marginTop: '0.3rem',
                    opacity: 0.85,
                  }}>
                    {tagLabel}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div>
                <h2 style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: colors.white,
                  margin: '0 0 1rem',
                  lineHeight: 1.3,
                  letterSpacing: '-0.2px',
                }}>
                  {entry.headline}
                </h2>
                {entry.body.map((paragraph, j) => (
                  <p key={j} style={{
                    color: colors.gray,
                    fontSize: '0.95rem',
                    lineHeight: 1.75,
                    margin: '0 0 0.9rem',
                  }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          )
        })}

        {/* End marker */}
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{ width: '8px', height: '8px', background: colors.orange, borderRadius: '50%' }} />
          <span style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.darkGray, letterSpacing: '1px' }}>
            LIVE — UPDATED WITH EVERY RELEASE
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <span style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.darkGray }}>
          © 2026 Coiled Spring. Built for traders who think in convexity.
        </span>
        <a
          href="mailto:info@coiledspring.app"
          style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.darkGray, textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.orange)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.darkGray)}
        >
          info@coiledspring.app
        </a>
      </footer>

    </div>
  )
}
