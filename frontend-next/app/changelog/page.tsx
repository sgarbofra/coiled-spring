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
    date: 'August 3, 2026',
    version: 'v3.2',
    headline: 'Every morning you open the terminal, it now tells you where you stand.',
    tag: 'feature',
    body: [
      "Until today, logging in landed you on the Scanner. Useful if you already knew what to look for. Less useful if you hadn't checked markets in three days and needed orientation first.",
      "The Command Center (DASHBOARD) is a new page that loads every time you log in. At the top: VIX, live — with a volatility regime label (Compressed / Normal / Elevated / Spike) and a plain-language description of what the current reading means for LEAPS buyers. A grade from A+ to F. If VIX is below 15, you see it immediately.",
      "Below that: a radar of the seven most compressed tickers in the HV Screener, sorted by HV Rank ascending. Click any ticker and you land directly in the Scanner filtered for that underlying. Compression streak of five or more days is marked with a flag — that's the sniper signal.",
      "To the right: a live snapshot of your portfolio. Total P&L (unrealized + realized), open positions, winners, losers, win rate bar. If you have no portfolio, a single button takes you to create one.",
      "At the bottom: five navigation cards — Scanner, Watchlist, Portfolio, HV Screener, AI — because a good command center tells you where everything is.",
      "Both login paths (email and Google OAuth) now redirect to /dashboard after authentication. The DASHBOARD tab is the first item in the navigation bar.",
    ],
  },
  {
    date: 'August 1, 2026',
    version: 'v3.1',
    headline: 'Google registration now sends a welcome email. And we ask before we collect your data.',
    tag: 'fix',
    body: [
      "Two things were missing from registration and neither was obvious unless you looked for them.",
      "The first: if you signed up with Google, you never received a welcome email. Email/password users got one after verifying their address. Google users got nothing — not because the email logic was wrong, but because the Google OAuth endpoint was simply missing a BackgroundTasks parameter. One import and two lines of code later, new Google registrants now receive the same welcome email as everyone else.",
      "The second: the registration form had no privacy consent checkbox. Most apps ask before they collect your personal data — we weren't. There is now a mandatory checkbox above the Google button and the email form. Unchecking it disables the Google button (with a visual dimming) and blocks the email form submission with an inline error. The consent timestamp is stored in the database for audit purposes. The backend also validates the field independently — a direct API call without consent accepted is rejected with HTTP 422.",
      "The checkbox links to a Privacy Policy. So we wrote one. The /privacy page is a full GDPR-compliant document (Regulation 2016/679): data controller, legal basis per Article 6, data retention schedule, list of processors with their jurisdictions and transfer safeguards, all eight rights of the data subject with contact instructions, security measures, breach notification procedure, and cookie disclosure. The short version: we collect only what is necessary, we don't sell or track anything, and you can ask us to delete your account and all associated data at any time.",
      "Three fixes, one release. The terminal now treats your data as seriously as it treats your options positions.",
    ],
  },
  {
    date: 'July 30, 2026',
    version: 'v3.0',
    headline: 'The scanner now explains itself. And stops lying about why it found nothing.',
    tag: 'feature',
    body: [
      "The HV LONG PUT LEAPS portfolio had a problem: every day it showed zero open positions, and nowhere explained why. Was there a bug? Were conditions genuinely not met? Was the filter too strict? You had to know where to look in the code to understand what was happening. That's not a terminal — that's a black box.",
      "So I built the REPORT tab. Click it inside any portfolio and you get a full diagnostic: the exact sniper conditions the scanner runs daily (HV Rank below 20%, triple compression HV20 < HV60 < HV252, depth ratio HV20 ≤ HV252 × 0.65, compression streak active for at least 5 consecutive days), how many tickers are passing all four today, and — if the count is zero — the ten nearest misses ranked by how many conditions they fail, with a checkmark or cross next to each condition so you can see exactly what's blocking them.",
      "This required a second fix: the HV Screener API was only returning HV30 and HV Rank. Triple compression needs HV20, HV60, and HV252. Depth needs HV20 and HV252. Streak needs the compression_streak counter. All four were already being calculated and stored in the database every day at 16:30 UTC — they just weren't being sent to the frontend. A two-line schema change fixes that. No migration needed. The data was always there.",
      "While I was in the paper trading scanner, I found a third bug: the option selection logic picked the highest CS Score correctly, but on ties it kept the first option encountered (ascending by expiration date, then by strike) rather than the one with the highest vega. The rule was clear — CS Score first, vega as tiebreaker — but the code was just `if cs > best_cs`, no second condition. Fixed with one line. The scanner now correctly prefers maximum sensitivity to volatility expansion when two contracts score identically.",
      "Three changes, one release. The terminal is more honest now.",
    ],
  },
  {
    date: 'July 29, 2026',
    version: 'v2.9',
    headline: 'I start measuring time. How much does it cost to borrow tomorrow\'s volatility?',
    tag: 'feature',
    body: [
      "Here's a question that kept nagging at me: if IV on SPY is at 18%, is the 30-day option expensive relative to the 60-day? You can eyeball the term structure, but eyeballing is not analysis. I wanted a number. Something I could compare across ETFs, across time, and actually act on.",
      "The answer is the call calendar credit percentage. Take the ATM call at 60 days out, take the ATM call at 30 days out, subtract, divide by spot. That's how much the market charges you for an extra 30 days of optionality, normalized so you can compare SPY to GLD to TLT without the dollar difference muddying the picture. I call it credit_30v60_pct.",
      "I built the ETF Calendar Monitor around this metric. Fifteen ETFs — four equity broad (SPY, QQQ, IWM, DIA), five sector (XLF, XLE, XLK, XLV, XLU), six macro (GLD, TLT, SLV, EEM, EFA, HYG). Every day at 17:30 CET, a cron job fetches ATM call prices for each ticker, interpolates them at synthetic constant maturities of 30, 60, and 90 days using a VIX-style linear weighting, and stores the credit percentages in the database. The interpolation minimizes yfinance API calls by selecting only the 3-4 real expirations that straddle each target DTE — about 15 calls per ETF instead of fetching all available strikes.",
      "The real signal comes after history accumulates. Once I have at least 20 observations I can compute a z-score: how many standard deviations today's calendar credit sits above or below its 52-week mean. Above +1.5σ is RICH — the time spread is expensive, historically speaking. Below -1.5σ is CHEAP. Between ±0.5σ is FAIR. The thresholds are the same logic as the VIX's relationship to realized vol, just applied to the term structure instead of the level.",
      "The new CALENDAR page in the terminal shows all 15 ETFs in a sortable table. It launches today with a prominent disclaimer: data collection started now, z-score signals need 20 days minimum, the full 52-week baseline takes about a year of daily snapshots. I'm being honest about what I have. The credit% columns are useful from day one — they tell you which ETF has the richest time spread today in absolute terms, cross-asset. The badges (RICH / WATCH / FAIR / CHEAP) will earn their credibility over time.",
      "I'm planting another tree.",
    ],
  },
  {
    date: 'July 28, 2026',
    version: 'v2.8',
    headline: 'One delisted stock breaks everything. I fix it properly. Then at 2 AM an idea wakes me up.',
    tag: 'infra',
    body: [
      "AAN. Aaron's Holdings. A company that got split up, reorganized, and eventually delisted — a quiet corporate death that nobody in my codebase noticed because my codebase wasn't looking. The name was still sitting in my static list of 1,136 underlyings, politely waiting for a price that would never come. Every time the scanner touched it, it returned 'Cannot fetch current price for AAN'. I kept dismissing it as a minor glitch. It was a structural problem.",
      "So I replaced the static list with a database table. `ticker_universe` — every name with a validity flag, a last-checked timestamp, and a source. A cron job now runs every Sunday at 2:00 AM UTC and validates the entire universe against yfinance in batches: any ticker without price data in the previous five sessions gets flagged as delisted and silently dropped from future scans. On the first of every month, a second job hits Wikipedia's S&P 500 and S&P 400 pages and adds whatever names have entered the indices since last time. New member joins the S&P 400 on a rebalancing? It's in the universe by the next morning. Name gets delisted? Gone by Sunday. The list is no longer a file I edit by hand. It's a living thing. AAN will not come back.",
      "While I was in there untangling ticker data, I also fixed a less obvious bug in the Historical Volatility calculations. yfinance sometimes returns `float('nan')` for missing trading days, which would be fine if Python handled NaN the way you'd expect. It doesn't. `nan <= 0` evaluates to `False` — so NaN values were passing right through my price filter and flowing into the HV rolling window. The result was HV20, HV60, and HV Rank all rendering as `NaN%` on the Opportunity Analysis page. A two-character fix: `math.isnan(v)` before the `<= 0` check. I'd been staring at this for longer than I'm comfortable admitting.",
      "And then, somewhere around 2 in the morning — after the commits were pushed and the deploys were green and I should have been asleep — I had an idea I'm not ready to talk about yet. Something about the structure of implied volatility across time horizons. The way the term structure behaves in specific conditions. A strategy. I've been turning it over in my head for weeks, but I needed data to test it — specifically, I needed a long series of ATM IV at one year and two years out, captured daily, for hundreds of names. So the last thing I shipped before closing the laptop was an extension to the daily IV snapshot cron: it now captures six DTE buckets instead of four. Thirty, sixty, ninety, one-eighty — and now three-sixty-five and seven-thirty. One year and two years. Starting tomorrow, the terminal will accumulate that history every single day at 16:30 UTC. Give it six months. Then I'll tell you what I was building towards.",
    ],
  },
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
    version: 'v2.7',
    headline: 'The surface now fills the whole screen. And the landing page finally shows what this thing actually does.',
    tag: 'feature',
    body: [
      "Someone pointed out that the volatility surface in the scanner is beautiful but you can't really see it — because it lives in a panel that's maybe 40% of the viewport, and when you zoom in to inspect the skew you lose half the chart to the edges. The fix was a single fullscreen button. Click ⛶ FULLSCREEN and the surface takes over the entire screen. Click ✕ EXIT and you're back. The IV shift slider, the click-to-watchlist, everything still works in fullscreen. The modal opens above the overlay. Obvious feature in retrospect.",
      "The landing page got a proper showcase. It used to have three icon cards that said something vague about 'advanced tools' and did nothing. Now there are six feature blocks with real screenshots and real descriptions — the LEAPS scanner table, the actual QQQ vol surface (that 3D Plotly chart), the WHY Panel scoring breakdown, the portfolio tracker, the HV screener with compression bars, and the What-If payoff diagram with the multi-curve Black-Scholes plot. If you land on the site and wonder what you're signing up for, now you can just scroll down and see it.",
      "Also fixed a CSS build error that was breaking Vercel deploys. The Google Fonts @import had to come before @import 'tailwindcss' — Tailwind expands inline and pushes everything after it into invalid territory per the CSS spec. One line swap, build is clean.",
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
