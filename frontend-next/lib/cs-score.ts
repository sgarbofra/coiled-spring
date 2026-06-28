/**
 * Coiled Strategy Candidate Score — funzioni condivise
 * Usato da: Scanner, Watchlist
 *
 * Formula: Vega (35%) + DTE (30%) + Liquidity (20%) + Delta (15%)
 * Hard cap: DTE < 300 → max 69 | OI < 100 → Liquidity max 39
 */

export type CsScoreInput = {
  delta: number | null
  vega: number | null
  dte: number | null
  spread_pct: number | null   // (ask-bid)/mid*100
  open_interest: number | null
}

export function computeCandidateScore(r: CsScoreInput): number | null {
  if (r.delta == null || r.vega == null || r.dte == null) return null

  const delta = r.delta
  const vega  = r.vega
  const dte   = r.dte
  const spreadPct = r.spread_pct ?? 100
  const oi        = r.open_interest ?? 0

  const deltaScore    = Math.max(0, Math.min((delta - 0.20) / 0.30, 1)) * 100
  const dteScore      = Math.min(dte / 730, 1) * 100
  const rawLiquidity  = Math.max(0, 1 - spreadPct / 100) * 60 + Math.min(oi / 500, 1) * 40
  const liquidityScore = oi < 100 ? Math.min(rawLiquidity, 39) : rawLiquidity
  const vegaScore     = Math.min(vega / 1.0, 1) * 100

  const raw = Math.round(vegaScore * 0.35 + dteScore * 0.30 + liquidityScore * 0.20 + deltaScore * 0.15)
  return dte < 300 ? Math.min(raw, 69) : raw
}

export function computeWhyPanel(r: CsScoreInput): string[] {
  if (r.delta == null || r.vega == null || r.dte == null) return []

  const delta = r.delta
  const vega  = r.vega
  const dte   = r.dte
  const spreadPct = r.spread_pct ?? 100
  const oi        = r.open_interest ?? 0

  const deltaScore    = Math.max(0, Math.min((delta - 0.20) / 0.30, 1)) * 100
  const dteScore      = Math.min(dte / 730, 1) * 100
  const rawLiquidity  = Math.max(0, 1 - spreadPct / 100) * 60 + Math.min(oi / 500, 1) * 40
  const liquidityScore = oi < 100 ? Math.min(rawLiquidity, 39) : rawLiquidity

  return [
    deltaScore > 75 ? 'Excellent Delta (>=0.45)' : deltaScore > 60 ? 'Good Delta (>=0.40)' : 'Poor Delta (<0.40)',
    liquidityScore > 75 ? 'Excellent Liquidity' : liquidityScore > 40 ? 'Good Liquidity (OI>=100)' : 'Poor Liquidity (OI<100)',
    dteScore > 75 ? 'Excellent DTE (LEAPS)' : dteScore > 40 ? 'Good DTE' : 'Short DTE — capped',
    vega >= 1.0 ? 'Excellent Vega (>=1.0)' : vega >= 0.5 ? 'Good Vega (>=0.5)' : 'Poor Vega (<0.5)',
  ]
}

export function scoreColor(score: number): string {
  if (score > 75) return '#00DD00'
  if (score >= 70) return '#FFAA00'
  return '#FF3333'
}
