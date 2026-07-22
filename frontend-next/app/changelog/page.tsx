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
    headline: 'I press deploy and immediately regret it.',
    tag: 'launch',
    body: [
      "There's a moment, right after you push to production for the first time, where you stare at the screen and think: what have I done. That was this morning.",
      "It's live. It's rough. The scanner pulls options data via yfinance which is, to be charitable, a library held together with duct tape and prayers to the Yahoo Finance API. The portfolio tracker works if you don't look at it too hard. The watchlist is basically a glorified text file. But it runs. I can open it, scan for a 30-delta put on SPY, and it gives me an answer in under three seconds. For a tool I built for myself, that's already more than I had yesterday.",
      "I called it Coiled Spring Terminal. A coiled spring stores energy invisibly — tight, compressed, waiting. That's the kind of setup I look for in options: low IV, compressed price, something about to move. The name felt right. Also I couldn't think of anything else.",
    ],
  },
  {
    date: 'February – June 2026',
    version: 'v1.1 – v1.6',
    headline: 'Five months of building in silence. Nobody watching. Exactly how I like it.',
    tag: 'feature',
    body: [
      "No release notes during this period. No announcements. No users, technically. Just me, opening the terminal every morning before the market opens, using it, noticing what was missing, closing my laptop, opening VS Code, and adding whatever I'd just been wishing for.",
      "In April I added the Risk Panel — a little module that flags when spread is too wide, when OI is too thin, when DTE is dangerously short. In May I built the Opportunity Analysis page, which pulls a full volatility surface and lets me stare at skew the way a sommelier stares at a glass of wine. In June I added a 20-day Historical Volatility overlay on the price chart. I'd been manually calculating HV in a spreadsheet for two years. That spreadsheet is now retired.",
      "Nothing dramatic happened. I just built the tool I'd always wanted. It got better every week. Some weeks it got worse first, then better.",
    ],
  },
  {
    date: 'July 1, 2026',
    version: 'v1.7',
    headline: 'I implement Black-Scholes in TypeScript at midnight and somehow it works.',
    tag: 'feature',
    body: [
      "The thing I kept wanting, every time I looked at my portfolio, was a simple answer to a simple question: if this stock drops 10% tomorrow, what does my position look like? Not in my head. On a chart. With actual numbers.",
      "So I built the Payoff Diagram. Client-side Black-Scholes in TypeScript — no server call, just the browser doing math. Plotly renders the curve. You get a clear picture of your breakeven, your max profit, your max pain. The ±20% range covers almost anything that isn't an earnings catastrophe.",
      "The annoying part was the IV input. When you're computing theoretical values for a position you already hold, what IV do you use? I settled on a three-tier fallback: try to get live market IV first, then yfinance historical if live fails, then the IV I entered when I opened the trade. It's imperfect but it's honest. And I snuck in a CAPM-based portfolio beta calculation while I was in there, because why not.",
    ],
  },
  {
    date: 'July 7, 2026',
    version: 'v1.8',
    headline: 'I give the terminal a voice. It\'s more useful than I expected and slightly uncanny.',
    tag: 'feature',
    body: [
      "I've been staring at the Opportunity Analysis page and thinking: what would a good mentor say about this contract right now? Not a buy or sell recommendation — I'm not looking for that, and nobody should trust an API for that anyway. Just a bit of context. Why this strike. Why this DTE. What the Greeks are telling me.",
      "So I plugged Claude Haiku in. Four sentences, triggered when you open a contract. It reads the delta, the vega, the IV rank, the spread, and writes something useful. Not always profound. Sometimes obvious. But it makes me slow down and think before I click, which is the whole point.",
      "On the same day I added personal notes with auto-save. You type something next to a ticker — 'watching for breakout above 180', 'waiting for IV to compress' — and it's there when you come back. I'd been keeping these notes in a separate notebook. A physical one. With a pen. The 21st century has finally reached my workflow.",
    ],
  },
  {
    date: 'July 10, 2026',
    version: 'v1.9',
    headline: 'IV Rank. The feature that needs time to become useful. I\'m planting a tree.',
    tag: 'feature',
    body: [
      "IV Rank is one of those things every options trader talks about and almost nobody has clean data for — at least not for free, at least not in real time, at least not neatly integrated into the thing you're already using.",
      "I built a cron job that fires at 18:00 UTC every day and takes a snapshot of ATM implied volatility for about 524 tickers, across four DTE buckets. Each snapshot gets stored. Day by day, the historical window grows. When you have 252 days of data, you have a proper annual percentile. Right now, with a week of data, the number is more or less decorative.",
      "But I'm planting a tree. In six months this will be one of the most useful columns in the scanner — the one that tells you whether you're paying cheap or expensive for options on this particular name. Today I just added the IVR column in the scanner and a small historical table on the Opportunity page. It says 'not enough data' for most tickers. That's fine. Give it time.",
    ],
  },
  {
    date: 'July 13, 2026',
    version: 'v2.0',
    headline: 'Finally I can stop alt-tabbing between browser tabs like an animal.',
    tag: 'feature',
    body: [
      "My workflow before today: run the scanner, find an interesting contract, open it in tab 1. Find another interesting contract, open it in tab 2. Manually compare the two tabs by moving my head left and right like I'm watching a very slow tennis match. Repeat until I pick one or give up.",
      "That's done. You can now select 2 or 3 contracts directly from the scanner table and open a dedicated compare page. The system highlights the best cell per metric: tightest spread, highest open interest, delta closest to 0.30. Green cell wins. Red cell is trying its best.",
      "The data moves across pages via sessionStorage — no server round-trip, no bloated URL with encoded JSON. Just a small payload, a router.push, and a table that knows what to do. It's v2.0 because this felt like a step change in how I actually use the thing.",
    ],
  },
  {
    date: 'July 15, 2026',
    version: 'v2.1',
    headline: 'I add a button that saves me approximately forty-five seconds per session. Worth it.',
    tag: 'feature',
    body: [
      "Here's a small thing that was quietly driving me insane: if I was looking at my watchlist and wanted to pull up Opportunity Analysis on a ticker, I had to go back to the scanner, type the ticker, wait for the scan, then click through. Four steps. Every single time.",
      "I added a 📊 button directly in the Watchlist and Portfolio tables. One click. Done. I know this sounds trivial. But the minor frictions in a workflow are exactly what kill a tool — you start avoiding features because they cost you too many steps, and eventually you go back to the spreadsheet.",
      "Also squashed a ghost bug in the Portfolio CLOSE button: it was firing two events simultaneously, closing the position AND opening the detail drawer at the same time. The net result was visual chaos for about 200 milliseconds. Nobody mentioned it. It was haunting me.",
    ],
  },
  {
    date: 'July 16, 2026',
    version: 'v2.2',
    headline: 'The landing page gets a face. HV gets a gauge. Both on the same day because apparently I had energy.',
    tag: 'design',
    body: [
      "The landing page I launched with in February was — let me be honest — an embarrassment. White background, generic hero text, some bullet points. It looked like a project I'd submitted for a web design course in 2009. I'd been avoiding fixing it because fixing it meant admitting I had users to impress.",
      "So I rebuilt it. Bloomberg terminal aesthetic: JetBrains Mono everywhere, deep black background (#0c0e12, if you care), a live ticker tape scrolling across the top, a proper CS Score breakdown section so people understand what they're looking at. It now looks like the tool it actually is.",
      "On the same afternoon I shipped the HV Rank Panel in Opportunity Analysis — a color-coded gauge that tells you whether historical volatility is compressed, average, or elevated versus the past year. VOL COMPRESSED in green is the signal I wait for before sizing into a LEAPS position. Now I don't have to compute it in my head.",
    ],
  },
  {
    date: 'July 17, 2026',
    version: 'v2.3',
    headline: '150 tickers was a starting point. 1,136 is closer to a universe.',
    tag: 'feature',
    body: [
      "The scanner launched with about 150 names. S&P 500 blue chips, a handful of ETFs. Enough to prove the concept. Not enough to actually work as a daily driver — I kept finding myself thinking 'I want to scan semiconductors' or 'what does the MidCap 400 look like right now' and coming up empty.",
      "Expanded it: full S&P 500, full S&P MidCap 400, sector ETFs, thematic ETFs, and a curated batch of high-volume speculative names that options traders actually care about. Total: 1,136 underlyings. The scanner now covers something like 85% of listed options volume in the US.",
      "Also added a stale price indicator for illiquid contracts: when there's no live bid/ask, the mid cell turns amber and a small LAST badge appears in orange. It's a reminder that you're looking at the last traded price, not a current market. I'd rather show the honest uncertainty than project false confidence.",
    ],
  },
  {
    date: 'July 18, 2026',
    version: 'v2.4',
    headline: 'Dark mode, light mode, and a cron job that was lying to me for a month.',
    tag: 'infra',
    body: [
      "I added a day/night toggle. Yes, the terminal started in night mode and night mode is correct, but some people use these things in an office with windows and I'm not going to argue with natural light.",
      "The implementation was more annoying than expected. I migrated 28+ components from hardcoded hex values to CSS custom properties — the kind of refactor that sounds like two hours and takes two days. The especially cursed part: Plotly (the charting library) doesn't resolve CSS variables at paint time, so theme changes don't update the charts. I had to wire a MutationObserver that watches for the day-mode class on the body and repaints every chart whenever it appears. Functional. Somewhat horrifying.",
      "While shipping that, I discovered the IV snapshot cron had been silently failing for weeks. Railway doesn't expose a fixed port — it assigns one dynamically via the $PORT environment variable. I had 8080 hardcoded in the health-check callback. The cron job was calling the wrong port, getting a connection refused, and logging nothing. Classic. Fixed in one line. The data gap is permanent but at least it'll actually accumulate now.",
    ],
  },
  {
    date: 'July 21, 2026',
    version: 'v2.5',
    headline: 'The Academy gets a memory. My portfolio gets its prices back. The AI becomes a tutor.',
    tag: 'feature',
    body: [
      "Three things in one day — which either means I was very productive or very avoidant of something else.",
      "The Academy module now saves your video position. This sounds like a minor convenience feature, and it is, but I was watching a 35-minute lesson on gamma scalping and had to restart it three times because life kept interrupting. The player now saves every 10 seconds and shows a small Resume badge when you return. That badge is genuinely satisfying to click.",
      "I also added a ✋ Raise your hand button in the Academy — it opens an inline Coiled AI chat panel pre-loaded with the current lesson's context. You can ask why delta changes faster near expiry, or what the relationship between vega and DTE looks like for a specific strike, and get an actual answer scoped to the lesson you're watching. Responses are capped at 150 words to keep it educational rather than distracting. The global AI panel hides itself on academy pages so you're not juggling two chat interfaces.",
      "The portfolio bug was less fun. All the price columns were showing dashes for days and I couldn't figure out why. Turned out yfinance was returning expiry dates that were off by one day — 2027-06-18 instead of 2027-06-17 — and my code was doing an exact key lookup that silently failed. Added a 14-day fuzzy match and dense logging under the [OPTPRICE] prefix in Railway. Prices are back. Future debugging will be easier.",
    ],
  },
  {
    date: 'July 22, 2026',
    version: 'v2.6',
    headline: 'I wanted to paste the scanner into Excel. Now I don\'t have to.',
    tag: 'feature',
    body: [
      "This one started, as most of my features do, with a specific moment of low-grade annoyance. I'd just run a scan on high-IV biotech names before an FDA catalyst, found six or seven interesting contracts, and wanted to pull them into a spreadsheet to do some position sizing math. My solution was to manually type the numbers into Excel like it was 1987.",
      "So: Export CSV button. It appears in the top-right corner above the results table, but only when there are actually results to export — no ghost button sitting there doing nothing. Click it and you get a file named coiledspring_YYYY-MM-DD.csv, with every column that matters: all the Greeks, the CS Candidate Score, the four WHY ratings, the Risk Flags. Everything computed client-side, no backend call, instant download.",
      "I also made sure the CSV is actually valid — proper RFC 4180 escaping for cells with commas or quotes, which matters when a Risk Flag label contains something like 'Spread > 20%, OI low'. The Blob URL is revoked immediately after the click so it doesn't linger in memory. Small thing. I care about small things.",
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
          A trader builds his own terminal.
        </h1>
        <p style={{ color: colors.gray, fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '580px', margin: 0 }}>
          This is what it looked like from the inside. Every release, in plain language — what I was missing, what I built, what broke, what surprised me.
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
                  fontSize: '0.85rem',
                  color: colors.white,
                  letterSpacing: '0.5px',
                  marginBottom: '0.6rem',
                  lineHeight: 1.5,
                  fontWeight: 600,
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
