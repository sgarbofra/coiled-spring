'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const colors = {
  bg:       '#0c0e12',
  surface:  '#111318',
  surface2: '#161922',
  border:   '#1e2330',
  border2:  '#252a35',
  orange:   '#e87722',
  white:    '#f0f2f5',
  gray:     '#8b94a3',
  darkGray: '#4a5260',
}

const mono = "'JetBrains Mono', 'Courier New', monospace"
const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

type Tag = 'greek' | 'strategy' | 'volatility' | 'fundamental' | 'cs-tool'

const TAG_COLORS: Record<Tag, string> = {
  greek:       '#60a5fa',
  strategy:    '#e87722',
  volatility:  '#a78bfa',
  fundamental: '#4ade80',
  'cs-tool':   '#fbbf24',
}
const TAG_LABELS: Record<Tag, string> = {
  greek:       'GREEK',
  strategy:    'STRATEGY',
  volatility:  'VOLATILITY',
  fundamental: 'FUNDAMENTAL',
  'cs-tool':   'CS TOOL',
}

type Term = {
  term: string
  tag: Tag
  definition: string
  cs?: string  // optional link to CS page
}

const TERMS: Term[] = [
  // ── A ──────────────────────────────────────────────────────────────────
  {
    term: 'American-Style Option',
    tag: 'fundamental',
    definition: 'An option that can be exercised at any time before and including the expiration date. Most equity options listed in the US are American-style. This contrasts with European-style options (such as index options like SPX) which can only be exercised at expiration. For sellers, American-style options carry assignment risk at any point while the position is open.',
  },
  {
    term: 'Annualized Return',
    tag: 'fundamental',
    definition: 'A method of expressing the return of a trade as if it were held for exactly one year, enabling comparison between trades with different holding periods. Calculated as: (premium / collateral) × (365 / DTE) × 100. A 1.5% return on a 30-day trade annualizes to roughly 18%. Useful for comparing the efficiency of different strikes and expirations.',
  },
  {
    term: 'Assignment',
    tag: 'fundamental',
    definition: 'What happens when the buyer of an option exercises their right, obligating the seller to fulfill the contract. If you sold a put and it goes in-the-money, you may be assigned — meaning you must buy 100 shares at the strike price. For covered call sellers, assignment means delivering your shares at the strike. Assignment on American-style options can happen at any time, not just at expiration.',
  },
  {
    term: 'At-the-Money (ATM)',
    tag: 'fundamental',
    definition: 'An option whose strike price is equal to, or very close to, the current price of the underlying asset. ATM options carry the highest time value and the highest gamma of any strike at a given expiration. Delta is approximately 0.50 for ATM calls (−0.50 for puts). The ATM implied volatility is the benchmark used in CS\'s IV Rank cron job.',
    cs: '/scanner',
  },

  // ── B ──────────────────────────────────────────────────────────────────
  {
    term: 'Bear Call Spread',
    tag: 'strategy',
    definition: 'A credit spread strategy built by selling a call at a lower strike and buying a call at a higher strike, same expiration. You collect a net credit. Maximum profit = credit received (if the stock stays below the short strike). Maximum loss = width of strikes minus credit. A defined-risk strategy for mildly bearish or neutral outlooks.',
  },
  {
    term: 'Bid-Ask Spread',
    tag: 'fundamental',
    definition: 'The difference between the highest price a buyer will pay (bid) and the lowest price a seller will accept (ask) for an option contract. Wide spreads indicate low liquidity and high transaction costs — you immediately lose the spread cost upon entry. The CS Scanner flags contracts with spread% above threshold as a liquidity warning. Prefer spread% below 5% for clean entries.',
    cs: '/scanner',
  },
  {
    term: 'Breakeven Price',
    tag: 'fundamental',
    definition: 'The underlying price at which a position neither gains nor loses at expiration. For a short put: strike − premium received. For a short call: strike + premium received. For a long call: strike + premium paid. Knowing breakeven is the minimum check before entering any trade — it tells you exactly how much the stock can move against you before you lose money.',
  },
  {
    term: 'Bull Put Spread',
    tag: 'strategy',
    definition: 'A credit spread built by selling a put at a higher strike and buying a put at a lower strike, same expiration. You collect a net credit. Maximum profit = credit received (if the stock stays above the short strike). Maximum loss = width of strikes minus credit. Ideal for bullish-to-neutral outlook when IV is elevated — you monetize vol without taking unlimited risk.',
  },
  {
    term: 'Buy to Close (BTC)',
    tag: 'fundamental',
    definition: 'The order used to exit a short option position. After selling to open, you buy to close when you want to take profit, cut a loss, or free up capital before expiration. A common rule in premium selling: buy to close at 50% of the original credit received. This captures the bulk of theta decay while avoiding the gamma risk of the final days.',
  },

  // ── C ──────────────────────────────────────────────────────────────────
  {
    term: 'Calendar Spread',
    tag: 'strategy',
    definition: 'A strategy involving selling a near-term option and buying a longer-dated option at the same strike. Also called a time spread or horizontal spread. Profits from the faster time decay of the short leg relative to the long leg. Vega-positive: benefits if IV increases after entry. Requires the underlying to stay near the strike through the short expiration.',
  },
  {
    term: 'Call Option',
    tag: 'fundamental',
    definition: 'A contract giving the buyer the right — but not the obligation — to purchase 100 shares of the underlying asset at the strike price before expiration. The seller (writer) of a call is obligated to deliver shares if assigned. LEAPS calls (DTE > 365) are a core focus of CS: low delta (0.25–0.35), long time horizon, high vega exposure to volatility compression.',
    cs: '/scanner',
  },
  {
    term: 'Cash-Secured Put (CSP)',
    tag: 'strategy',
    definition: 'A strategy where you sell a put option and hold enough cash to buy 100 shares at the strike price if assigned. You collect premium upfront. If the stock stays above the strike, the option expires worthless and you keep the full premium. If assigned, you acquire shares at an effective cost of strike minus premium — a potential discount to the market price. First leg of the wheel strategy.',
  },
  {
    term: 'Charm',
    tag: 'greek',
    definition: 'A second-order Greek measuring the rate of change of delta over time — delta decay. Charm tells you how much your delta will shift simply due to the passage of time, without any price movement. Near expiration, charm accelerates dramatically: a 0.30-delta option can become a 0.10-delta option in two days purely from time passing. Important for managing LEAPS positions over long horizons.',
  },
  {
    term: 'Cost Basis',
    tag: 'fundamental',
    definition: 'The effective price you paid for a stock position, adjusted for all premiums collected. In a wheel strategy, each premium received from selling puts and covered calls reduces your cost basis. If you bought stock at $50 after assignment on a $52 put where you collected $2 premium, your cost basis is $50. Tracking cost basis precisely is how you measure the wheel strategy\'s actual performance.',
  },
  {
    term: 'Covered Call',
    tag: 'strategy',
    definition: 'A strategy where you own 100 shares and sell a call option against them. You collect premium in exchange for capping your upside at the strike price. If the stock rises above the strike, your shares are called away — you sell them at the strike and keep the premium. Second leg of the wheel strategy. Premium collected reduces your effective cost basis on every cycle.',
  },
  {
    term: 'Credit Spread',
    tag: 'strategy',
    definition: 'Any options strategy where you sell one option and buy another, resulting in a net credit received. The long option defines and caps your maximum loss. Common credit spreads: bull put spread, bear call spread, iron condor. Credit spreads have defined risk unlike naked options. The max loss is always known before entry: width of strikes minus credit received.',
  },
  {
    term: 'CS Candidate Score',
    tag: 'cs-tool',
    definition: 'CoiledSpring\'s proprietary scoring system (0–100) that evaluates the structural quality of an options contract across four dimensions: delta quality (proximity to 0.30), liquidity (spread% and open interest), DTE (longer is better for LEAPS), and vega efficiency (vega relative to premium paid). The score measures contract quality, not directional edge. Above 75 = strong candidate. The WHY Panel breaks down each component in plain English.',
    cs: '/scanner',
  },
  {
    term: 'CS Morning Scout',
    tag: 'cs-tool',
    definition: 'An upcoming CoiledSpring feature (in development) that lets you describe what you want to monitor in plain English. Every night the system scans 1,136 tickers using your criteria, applies Claude AI reasoning over IV Rank, CS Score, HV, and Greeks data, and delivers a personalized email briefing by 7:00 AM. Findings include signal (bullish/bearish/alert/neutral), matching contract, and the specific data that triggered the match.',
    cs: '/settings',
  },

  // ── D ──────────────────────────────────────────────────────────────────
  {
    term: 'Delta',
    tag: 'greek',
    definition: 'Measures how much an option\'s price changes for each $1 move in the underlying stock. A delta of 0.30 means the option gains $0.30 for every $1 the stock rises (for calls). Delta also approximates the probability of expiring in-the-money: a 0.30-delta call has roughly a 30% chance of expiring ITM. For LEAPS buyers, the 0.25–0.35 delta range balances leverage and probability — it is the primary filter in the CS Scanner.',
    cs: '/scanner',
  },
  {
    term: 'Diagonal Spread',
    tag: 'strategy',
    definition: 'A strategy combining elements of both a calendar spread (different expirations) and a vertical spread (different strikes). Typically involves buying a longer-dated option at one strike and selling a shorter-dated option at a different strike. The most common form: buying a LEAPS call and selling a near-term call against it (poor man\'s covered call). Combines the leverage of LEAPS with recurring premium income.',
  },
  {
    term: 'DTE (Days to Expiration)',
    tag: 'fundamental',
    definition: 'The number of calendar days remaining until an option contract expires. DTE is one of the most important variables in options trading. Theta decay accelerates non-linearly as DTE approaches zero — the last 30 days are where time value collapses fastest. The CS Candidate Score penalizes short DTE because low-DTE LEAPS candidates carry higher gamma risk and less margin for error.',
    cs: '/scanner',
  },

  // ── E ──────────────────────────────────────────────────────────────────
  {
    term: 'European-Style Option',
    tag: 'fundamental',
    definition: 'An option that can only be exercised at expiration, not before. Index options (SPX, XSP, NDX) are typically European-style. This eliminates early assignment risk, which makes them popular for credit spread strategies. If you trade credit spreads on SPX versus SPY, you take on European vs American exercise risk respectively — a meaningful structural difference.',
  },
  {
    term: 'Exercise',
    tag: 'fundamental',
    definition: 'When the buyer of an option chooses to use their right — to buy shares (call) or sell shares (put) at the strike price. Exercise triggers assignment for the seller. Most retail traders close options before expiration rather than exercising. Deep ITM options are sometimes exercised early to capture dividends (calls) or to monetize time value remaining (puts).',
  },
  {
    term: 'Extrinsic Value',
    tag: 'fundamental',
    definition: 'The portion of an option\'s price beyond its intrinsic value — also called time value or premium. It reflects two things: remaining time until expiration and the implied volatility baked in by the market. All OTM options consist entirely of extrinsic value. Extrinsic value is what sellers collect and what decays to zero at expiration. Selling high-IV options means collecting inflated extrinsic value.',
  },

  // ── G ──────────────────────────────────────────────────────────────────
  {
    term: 'Gamma',
    tag: 'greek',
    definition: 'Measures the rate of change of delta for each $1 move in the underlying. A gamma of 0.05 means your delta increases by 0.05 for every $1 the stock rises. Gamma is highest for ATM options near expiration — the source of "gamma risk" in short-term positions. Long-dated LEAPS have very low gamma, which is part of their appeal: your delta stays relatively stable as the stock moves.',
    cs: '/scanner',
  },
  {
    term: 'Greeks',
    tag: 'greek',
    definition: 'A set of risk measures describing how an option\'s price responds to changes in market variables: Delta (underlying price), Gamma (delta rate of change), Theta (time decay), Vega (implied volatility), Rho (interest rates), Vanna (delta sensitivity to IV changes), and Charm (delta decay over time). The CS Scanner displays Delta, Gamma, Vega, and Theta for every contract in the results table.',
    cs: '/scanner',
  },

  // ── H ──────────────────────────────────────────────────────────────────
  {
    term: 'Historical Volatility (HV)',
    tag: 'volatility',
    definition: 'The actual realized volatility of a stock\'s price over a specific past period, expressed as an annualized percentage. Typically calculated as the standard deviation of daily log returns over 20 or 30 trading days. HV is backward-looking; IV is forward-looking. When IV is significantly above HV, options are expensive relative to recent realized moves — the core signal for premium sellers. The CS HV Screener tracks HV across 1,136 tickers.',
    cs: '/hv-screener',
  },
  {
    term: 'HV Rank Panel',
    tag: 'cs-tool',
    definition: 'A CoiledSpring feature on the Opportunity Analysis page that contextualizes current 20-day Historical Volatility against its trailing 52-week range. The color-coded gauge shows whether HV is compressed (green — optimal window for buying LEAPS), average (neutral), or elevated (orange/red — historically poor entry timing for long vega positions). Complements IV Rank by adding the realized-vol perspective.',
    cs: '/scanner',
  },

  // ── I ──────────────────────────────────────────────────────────────────
  {
    term: 'Implied Volatility (IV)',
    tag: 'volatility',
    definition: 'The market\'s consensus forecast for the magnitude of a stock\'s future price movement, derived by reverse-engineering the Black-Scholes pricing model from observed option prices. IV rises when the market expects large moves (earnings, macro events, uncertainty) and falls when calm is expected. IV is a forward-looking estimate of risk — it is not a directional forecast. Higher IV = more expensive options.',
    cs: '/scanner',
  },
  {
    term: 'In-the-Money (ITM)',
    tag: 'fundamental',
    definition: 'An option has intrinsic value and is ITM when: a call\'s strike is below the current stock price, or a put\'s strike is above it. ITM options are more expensive, have higher delta (closer to 1.00), and lower extrinsic value. Deep ITM options move almost dollar-for-dollar with the stock. Shallow ITM options (delta 0.55–0.70) are sometimes used for less-leveraged LEAPS positions.',
  },
  {
    term: 'Intrinsic Value',
    tag: 'fundamental',
    definition: 'The real, immediate value of an option if exercised right now. For a call with a $100 strike when the stock is at $108: intrinsic value = $8. For a put with a $50 strike when the stock is at $45: intrinsic value = $5. OTM options always have zero intrinsic value. The remaining value in any option above its intrinsic value is extrinsic (time) value — the part that decays.',
  },
  {
    term: 'Iron Condor',
    tag: 'strategy',
    definition: 'A neutral strategy combining a bull put spread (below the market) and a bear call spread (above the market) with the same expiration. You collect premium from both sides and profit if the stock stays within the range defined by the two short strikes. Maximum loss is limited. Iron condors benefit from time decay and falling IV. Ideal when IV is high and you expect the stock to stay range-bound.',
  },
  {
    term: 'IV Rank (IVR)',
    tag: 'volatility',
    definition: 'Measures where current implied volatility sits relative to its 52-week high and low. Formula: (Current IV − 52W Low) / (52W High − 52W Low) × 100. An IVR of 80 means current IV is near the top of its annual range — options are historically expensive. IVR above 50 generally favors selling premium; below 30 favors buying. CS runs a daily ATM IV snapshot cron at 18:00 UTC to build this historical database across 524+ tickers.',
    cs: '/scanner',
  },
  {
    term: 'IV Percentile',
    tag: 'volatility',
    definition: 'The percentage of trading days over the past year when IV was lower than today\'s level. An IV percentile of 85% means options are more expensive than they were on 85% of days in the past year. Unlike IV Rank (which uses the high/low range), IV Percentile counts actual days — making it more robust to temporary IV spikes that can distort the rank calculation.',
  },

  // ── L ──────────────────────────────────────────────────────────────────
  {
    term: 'LEAPS',
    tag: 'strategy',
    definition: 'Long-term Equity Anticipation Securities — options with expiration dates more than one year away (DTE > 365). LEAPS have high vega, low gamma, and slower theta decay relative to short-dated options. They behave more like leveraged stock positions than speculative bets. CS is specifically designed for LEAPS analysis: the Candidate Score, Opportunity Analysis, vol surface, and HV Rank Panel are all optimized for identifying quality LEAPS entries.',
    cs: '/scanner',
  },
  {
    term: 'Liquidity',
    tag: 'fundamental',
    definition: 'The ease with which an option can be bought or sold without significantly moving the price. Measured in CS by two metrics: bid-ask spread percentage (lower = more liquid) and open interest (higher = more active market). Illiquid options have wide spreads that immediately erode returns upon entry and exit. CS Scanner flags stale prices with an amber LAST badge when no live bid/ask is available.',
    cs: '/scanner',
  },

  // ── M ──────────────────────────────────────────────────────────────────
  {
    term: 'Mid Price',
    tag: 'fundamental',
    definition: 'The midpoint between the bid and ask prices of an option. Mid = (Bid + Ask) / 2. In liquid markets, orders often fill at or near mid. In illiquid markets, mid is theoretical — actual fills may be closer to bid or ask. CS displays mid price in the Scanner and Portfolio. When there is no live quote, the last traded price is shown instead with a LAST badge.',
    cs: '/scanner',
  },
  {
    term: 'Multiplier',
    tag: 'fundamental',
    definition: 'Standard equity options control 100 shares per contract. A quoted premium of $3.50 costs $350 per contract ($3.50 × 100). All CS Scanner prices display per-share values consistent with market convention — remember to multiply by 100 for actual dollar amounts. Mini options (1/10 contract size) exist but are rare. Index options like SPX use the same 100× multiplier.',
  },

  // ── O ──────────────────────────────────────────────────────────────────
  {
    term: 'Open Interest (OI)',
    tag: 'fundamental',
    definition: 'The total number of outstanding option contracts for a specific strike and expiration that have not been closed, exercised, or expired. OI is a measure of market participation — high OI means many active positions exist and the contract is liquid. CS uses OI as one of the four liquidity inputs in the Candidate Score. OI above 500 generally indicates adequate liquidity for clean entries.',
    cs: '/scanner',
  },
  {
    term: 'Out-of-the-Money (OTM)',
    tag: 'fundamental',
    definition: 'An option with no intrinsic value. A call is OTM when the stock price is below the strike; a put is OTM when the stock price is above the strike. OTM options consist entirely of extrinsic value (time + vol premium). They are cheaper than ITM options and require a larger move to become profitable for buyers. The CS Scanner focuses on OTM calls (0.25–0.40 delta range) as LEAPS entry candidates.',
    cs: '/scanner',
  },

  // ── P ──────────────────────────────────────────────────────────────────
  {
    term: 'Premium',
    tag: 'fundamental',
    definition: 'The price of an option contract, quoted per share and multiplied by 100 for the actual dollar cost. A $2.50 premium = $250 per contract. For buyers, premium is the maximum loss. For sellers, premium is the maximum profit. Premium is composed of intrinsic value (if any) plus extrinsic value (time + vol premium). Sellers of high-IV options collect inflated premiums they expect to decay away.',
  },
  {
    term: 'Probability of Profit (POP)',
    tag: 'fundamental',
    definition: 'An estimate of the likelihood that a trade will be profitable at expiration, derived from the option\'s delta. For a short put with a delta of −0.30, POP ≈ 70% (the put has roughly a 30% chance of expiring ITM, and a 70% chance of expiring worthless — a win for the seller). POP is a probabilistic estimate under current market conditions, not a guarantee.',
  },
  {
    term: 'Put Option',
    tag: 'fundamental',
    definition: 'A contract giving the buyer the right — but not the obligation — to sell 100 shares of the underlying asset at the strike price before expiration. Put buyers profit when the stock falls below the strike. Put sellers (short puts / cash-secured puts) collect premium and accept the obligation to buy shares at the strike if assigned. Put delta is negative and ranges from 0 to −1.',
  },

  // ── R ──────────────────────────────────────────────────────────────────
  {
    term: 'Realized Volatility',
    tag: 'volatility',
    definition: 'The actual annualized standard deviation of a stock\'s returns over a specific past period — the vol that actually happened, as opposed to implied vol (what the market priced in). The difference between IV and realized vol is the Volatility Risk Premium (VRP). When IV chronically exceeds realized vol — which it does for most liquid underlyings — premium sellers have a structural statistical edge.',
  },
  {
    term: 'Rho',
    tag: 'greek',
    definition: 'Measures an option\'s sensitivity to changes in interest rates. A rho of 0.05 means the option gains $0.05 for every 1% rise in the risk-free rate. Rho matters most for long-dated options (LEAPS): a 10-year option has significant rho exposure because interest rates meaningfully affect the cost of carry over long horizons. In low-rate environments rho is negligible; in rising-rate cycles it becomes more important for LEAPS pricing.',
  },
  {
    term: 'Rolling an Option',
    tag: 'strategy',
    definition: 'Closing an existing option position and simultaneously opening a new one — usually to extend the expiration and/or adjust the strike. "Rolling for credit" means the new position generates more premium than the cost to close the old one, netting a positive cash flow. Common reasons to roll: extend a winning position, give a losing position more time, or move the strike to reduce assignment risk.',
  },

  // ── S ──────────────────────────────────────────────────────────────────
  {
    term: 'Sell to Open (STO)',
    tag: 'fundamental',
    definition: 'The order type used to initiate a new short options position. When you sell a covered call or cash-secured put, you use STO. This creates an open obligation that stays on your books until you buy to close (BTC), the option expires, or you are assigned. Short positions show as negative quantities in your broker and portfolio tracker.',
  },
  {
    term: 'Selling Premium',
    tag: 'strategy',
    definition: 'A trading philosophy focused on selling options contracts to collect theta income. The edge comes from two sources: (1) time decay — options lose value as expiration approaches, and (2) the volatility risk premium — IV systematically overstates realized vol for most liquid underlyings. Common strategies: covered calls, cash-secured puts, credit spreads, iron condors, strangles. Also known as "theta gang" trading.',
  },
  {
    term: 'Spread%',
    tag: 'fundamental',
    definition: 'The bid-ask spread expressed as a percentage of the option\'s mid price. Formula: (Ask − Bid) / Mid × 100. Used in CS as the primary liquidity filter. A spread% of 3% means you immediately lose 3% in transaction cost upon entry. CS flags high-spread contracts as a risk warning in the Risk Panel and uses spread% as a component of the Candidate Score liquidity dimension. Target: below 5%.',
    cs: '/scanner',
  },
  {
    term: 'Straddle',
    tag: 'strategy',
    definition: 'A strategy involving both a put and a call on the same stock, same strike, same expiration. A short straddle (selling both) profits if the stock stays near the strike through expiration — maximum premium, maximum risk. A long straddle (buying both) profits from large moves in either direction. Short straddles are high-risk, high-reward neutral strategies best suited for experienced traders with strong IV conviction.',
  },
  {
    term: 'Strangle',
    tag: 'strategy',
    definition: 'Like a straddle, but using different strike prices — typically selling an OTM put and an OTM call, same expiration. Cheaper to enter than a straddle (both legs OTM), but requires a wider range for the stock to stay within. Short strangles profit if the stock stays between the two short strikes. The risk is unlimited in either direction — a position that requires active management.',
  },
  {
    term: 'Strike Price',
    tag: 'fundamental',
    definition: 'The predetermined price at which the option holder can buy (call) or sell (put) the underlying shares. Selecting the right strike is the core decision in options trading. For LEAPS buyers, the sweet spot is typically 0.25–0.35 delta: far enough OTM to be affordable, close enough to participate meaningfully in the stock\'s move. CS Scanner filters by delta to surface strikes in this range.',
    cs: '/scanner',
  },

  // ── T ──────────────────────────────────────────────────────────────────
  {
    term: 'Theta',
    tag: 'greek',
    definition: 'Measures the daily time decay of an option\'s price — how much value the option loses per day as it approaches expiration, all else equal. Theta is always negative for option buyers (they lose time value daily) and positive for sellers (they profit from decay). Theta decay is not linear: it accelerates sharply in the last 30–45 days before expiration. LEAPS have low theta — another reason they are capital-efficient for buyers.',
    cs: '/scanner',
  },
  {
    term: 'Theta Burned %',
    tag: 'cs-tool',
    definition: 'A CoiledSpring Portfolio metric showing how much of the original time value of a position has already decayed. Calculated as: (original_extrinsic − current_extrinsic) / original_extrinsic × 100. A theta burned % of 70% on a short option means 70% of the premium collected has been earned — often a signal to consider closing and redeploying capital rather than holding through the faster-decaying final weeks.',
    cs: '/portfolio',
  },
  {
    term: 'Theta Gang',
    tag: 'strategy',
    definition: 'A colloquial term for the community of traders who systematically sell options premium to profit from time decay. The name references theta (θ), the Greek measuring daily time value erosion. Core strategies: covered calls, cash-secured puts, the wheel, credit spreads, iron condors. The philosophy: let time work in your favor, collect premium, manage losers, let winners expire. CS is built for theta gang practitioners.',
  },
  {
    term: 'The Wheel Strategy',
    tag: 'strategy',
    definition: 'A systematic income strategy that cycles between selling cash-secured puts and covered calls on the same underlying. Step 1: sell CSPs on a stock you would be comfortable owning. Step 2: if assigned, sell covered calls on the shares. Step 3: if called away, restart with CSPs. The goal is to collect premium at every step, continuously reducing effective cost basis. Best suited to stocks with elevated IV and strong fundamentals.',
  },

  // ── V ──────────────────────────────────────────────────────────────────
  {
    term: 'Vanna',
    tag: 'greek',
    definition: 'A second-order Greek measuring how delta changes as implied volatility changes. Vanna = ∂Delta/∂IV. A positive vanna means your delta increases when IV rises. This matters for LEAPS positions: if you hold a call with significant vanna, an IV spike will increase your delta — amplifying your directional exposure exactly when the market is most volatile. Understanding vanna helps size LEAPS positions during earnings or macro events.',
  },
  {
    term: 'Vega',
    tag: 'greek',
    definition: 'Measures how much an option\'s price changes for each 1% change in implied volatility. A vega of 0.15 means the option gains $0.15 for every 1% IV increase (and loses $0.15 for each 1% IV decrease). Long-dated LEAPS have the highest vega — they are very sensitive to IV changes. Buying LEAPS when IV is low (compressed HV, low IVR) and benefiting from a subsequent IV expansion is a core LEAPS strategy.',
    cs: '/hv-screener',
  },
  {
    term: 'Volatility Risk Premium (VRP)',
    tag: 'volatility',
    definition: 'The systematic difference between implied volatility and subsequent realized volatility. For most liquid underlyings, IV exceeds realized vol over 70–80% of rolling 30-day periods. This means the market chronically overpays for options — the structural source of edge for premium sellers. VRP is not constant: it collapses around high-uncertainty events (earnings, Fed meetings) and expands during calm periods. Monitoring IV/HV ratios is the practical way to track VRP.',
    cs: '/hv-screener',
  },
  {
    term: 'Volatility Skew',
    tag: 'volatility',
    definition: 'The pattern where OTM put options trade at higher implied volatility than OTM calls at the same DTE. Also called the "vol smile" or "smirk." Driven by demand for downside protection: investors pay up for puts as portfolio insurance, inflating their IV. Skew is visible on the CS volatility surface (Opportunity Analysis page). A steep skew means puts are expensive relative to calls — relevant for put sellers evaluating fair premium.',
    cs: '/scanner',
  },
  {
    term: 'Volatility Surface',
    tag: 'volatility',
    definition: 'A 3-dimensional representation of implied volatility across all available strikes (x-axis) and expirations (y-axis) for a given underlying. The z-axis shows IV. The surface reveals skew, term structure, and relative cheapness of different contracts. CoiledSpring renders an interactive vol surface in the Opportunity Analysis page for any scanned ticker — one of the most powerful analytical tools available in the terminal.',
    cs: '/scanner',
  },

  // ── W ──────────────────────────────────────────────────────────────────
  {
    term: 'WHY Panel',
    tag: 'cs-tool',
    definition: 'CoiledSpring\'s companion panel to the CS Candidate Score. While the score gives a 0–100 number, the WHY Panel explains it in plain English across four dimensions: Delta Rating ("Excellent Delta — proximity to 0.30 ideal"), Liquidity Rating ("Good Liquidity — spread tight, OI sufficient"), DTE Rating ("Excellent DTE — long runway, low gamma risk"), and Vega Rating ("High Vega Efficiency — premium well-supported by vega"). Visible in the Scanner for each result.',
    cs: '/scanner',
  },
]

const LETTERS = Array.from(new Set(TERMS.map(t => t.term[0].toUpperCase()))).sort()

export default function GlossaryPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<Tag | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return TERMS.filter(t => {
      const matchTag = activeTag === 'all' || t.tag === activeTag
      const matchSearch = !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
      return matchTag && matchSearch
    })
  }, [search, activeTag])

  const byLetter = useMemo(() => {
    const map: Record<string, Term[]> = {}
    filtered.forEach(t => {
      const l = t.term[0].toUpperCase()
      if (!map[l]) map[l] = []
      map[l].push(t)
    })
    return map
  }, [filtered])

  const activeLetter = Object.keys(byLetter).sort()

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: sans, color: colors.white }}>

      {/* ── Navbar ── */}
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
        <button onClick={() => router.push('/')} style={{
          background: 'none', border: 'none', color: colors.orange,
          fontFamily: mono, fontSize: '1rem', fontWeight: 700,
          letterSpacing: '2px', cursor: 'pointer', padding: 0,
        }}>
          COILED SPRING
        </button>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button onClick={() => router.push('/changelog')} style={{
            background: 'none', border: 'none', color: colors.gray,
            fontFamily: mono, fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '1px',
          }}>SHIP LOG</button>
          <button onClick={() => router.push('/login')} style={{
            background: 'none', border: 'none', color: colors.gray,
            fontFamily: mono, fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '1px',
          }}>LOGIN</button>
          <button onClick={() => router.push('/register')} style={{
            background: colors.orange, border: 'none', color: '#000',
            fontFamily: mono, fontSize: '0.8rem', fontWeight: 700,
            cursor: 'pointer', padding: '0.4rem 1rem', letterSpacing: '1px',
          }}>GET ACCESS</button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '5rem 2rem 2rem' }}>
        <div style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.orange, letterSpacing: '3px', marginBottom: '1rem' }}>
          ◈ REFERENCE
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, margin: '0 0 1rem', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
          Options Glossary.
        </h1>
        <p style={{ color: colors.gray, fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '600px', margin: 0 }}>
          {TERMS.length}+ terms. Greeks, strategies, volatility concepts, and CS-specific tools — all in one place.
          No fluff, no oversimplification.
        </p>
        <div style={{ marginTop: '2.5rem', width: '48px', height: '2px', background: colors.orange }} />
      </div>

      {/* ── Search + Tag filters ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 2rem 0' }}>
        <input
          type="text"
          placeholder="Search terms or definitions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: colors.surface,
            border: `1px solid ${colors.border2}`,
            color: colors.white,
            fontFamily: mono,
            fontSize: '0.85rem',
            padding: '0.75rem 1rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '1rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {(['all', 'greek', 'strategy', 'volatility', 'fundamental', 'cs-tool'] as const).map(tag => {
            const isActive = activeTag === tag
            const color = tag === 'all' ? colors.white : TAG_COLORS[tag]
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                style={{
                  background: isActive ? (tag === 'all' ? 'rgba(240,242,245,0.1)' : `${color}18`) : 'transparent',
                  border: `1px solid ${isActive ? color : colors.border2}`,
                  color: isActive ? color : colors.gray,
                  fontFamily: mono,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  padding: '0.3rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tag === 'all' ? 'ALL' : TAG_LABELS[tag]}
              </button>
            )
          })}
          <span style={{ fontFamily: mono, fontSize: '0.7rem', color: colors.darkGray, alignSelf: 'center', marginLeft: '0.5rem' }}>
            {filtered.length} terms
          </span>
        </div>

        {/* ── Letter nav ── */}
        {search === '' && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {LETTERS.map(l => {
              const has = !!byLetter[l]
              return (
                <a
                  key={l}
                  href={has ? `#letter-${l}` : undefined}
                  style={{
                    fontFamily: mono,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: has ? colors.orange : colors.border2,
                    textDecoration: 'none',
                    width: '24px',
                    textAlign: 'center',
                    cursor: has ? 'pointer' : 'default',
                  }}
                >
                  {l}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Terms ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 2rem 6rem' }}>
        {filtered.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: '0.85rem', color: colors.gray, padding: '3rem 0' }}>
            No terms match your search.
          </div>
        )}
        {activeLetter.map(letter => (
          <div key={letter} id={`letter-${letter}`}>
            {/* Letter header */}
            <div style={{
              fontFamily: mono,
              fontSize: '1.4rem',
              fontWeight: 800,
              color: colors.orange,
              borderBottom: `1px solid ${colors.border}`,
              padding: '2rem 0 0.5rem',
              marginBottom: '0.25rem',
              letterSpacing: '2px',
            }}>
              {letter}
            </div>

            {byLetter[letter].map((t, i) => {
              const tagColor = TAG_COLORS[t.tag]
              return (
                <div
                  key={i}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    padding: '1.5rem 0',
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr',
                    gap: '0 2rem',
                  }}
                >
                  {/* Left */}
                  <div style={{ paddingTop: '0.1rem' }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: colors.white,
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                    }}>
                      {t.term}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      fontFamily: mono,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: tagColor,
                      border: `1px solid ${tagColor}40`,
                      background: `${tagColor}12`,
                      padding: '0.15rem 0.4rem',
                      letterSpacing: '1.5px',
                    }}>
                      {TAG_LABELS[t.tag]}
                    </div>
                    {t.cs && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          onClick={() => router.push(t.cs!)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.orange,
                            fontFamily: mono,
                            fontSize: '0.6rem',
                            cursor: 'pointer',
                            padding: 0,
                            letterSpacing: '0.5px',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          → View in CS ↗
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div>
                    <p style={{
                      color: colors.gray,
                      fontSize: '0.9rem',
                      lineHeight: 1.75,
                      margin: 0,
                    }}>
                      {t.definition}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* End marker */}
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '2.5rem',
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{ width: '8px', height: '8px', background: colors.orange, borderRadius: '50%' }} />
          <span style={{ fontFamily: mono, fontSize: '0.75rem', color: colors.darkGray, letterSpacing: '1px' }}>
            {TERMS.length} TERMS — UPDATED WITH EVERY RELEASE
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
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
        <a href="mailto:info@coiledspring.app" style={{
          fontFamily: mono, fontSize: '0.75rem', color: colors.darkGray, textDecoration: 'none',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = colors.orange)}
          onMouseLeave={e => (e.currentTarget.style.color = colors.darkGray)}
        >
          info@coiledspring.app
        </a>
      </footer>

    </div>
  )
}
