/**
 * Coiled Strategy Candidate Score — funzioni condivise
 * Usato da: Scanner, Watchlist
 *
 * Formula: Vega (35%) + DTE (30%) + Liquidity (20%) + Delta (15%)
 * Hard cap: DTE < 300 → max 69 | OI < 100 → Liquidity max 39
 *
 * Nota OI: null = dati non disponibili (es. watchlist senza OI persistito).
 * In questo caso il liquidity score usa solo lo spread (scaled 0-100) senza
 * applicare il cap OI < 100, per evitare penalizzazioni errate.
 */

export type CsScoreInput = {
  delta: number | null
  vega: number | null
  dte: number | null
  spread_pct: number | null   // (ask-bid)/mid*100
  open_interest: number | null
}

function liquidityScore(spreadPct: number, oi: number | null): number {
  const spreadComponent = Math.max(0, 1 - spreadPct / 100)
  if (oi == null) {
    // OI sconosciuto: usa solo spread, scaled a 0-100 (nessun cap OI)
    return spreadComponent * 100
  }
  const raw = spreadComponent * 60 + Math.min(oi / 500, 1) * 40
  return oi < 100 ? Math.min(raw, 39) : raw
}

export function computeCandidateScore(r: CsScoreInput): number | null {
  if (r.delta == null || r.vega == null || r.dte == null) return null

  const delta    = r.delta
  const vega     = r.vega
  const dte      = r.dte
  const spreadPct = r.spread_pct ?? 100

  const deltaScore = Math.max(0, Math.min((delta - 0.20) / 0.30, 1)) * 100
  const dteScore   = Math.min(dte / 730, 1) * 100
  const liqScore   = liquidityScore(spreadPct, r.open_interest)
  const vegaScore  = Math.min(vega / 1.0, 1) * 100

  const raw = Math.round(vegaScore * 0.35 + dteScore * 0.30 + liqScore * 0.20 + deltaScore * 0.15)
  return dte < 300 ? Math.min(raw, 69) : raw
}

export function computeWhyPanel(r: CsScoreInput): string[] {
  if (r.delta == null || r.vega == null || r.dte == null) return []

  const delta    = r.delta
  const vega     = r.vega
  const dte      = r.dte
  const spreadPct = r.spread_pct ?? 100

  const deltaScore = Math.max(0, Math.min((delta - 0.20) / 0.30, 1)) * 100
  const dteScore   = Math.min(dte / 730, 1) * 100
  const liqScore   = liquidityScore(spreadPct, r.open_interest)

  const oiLabel = r.open_interest == null
    ? (liqScore > 75 ? 'Excellent Liquidity (spread only)' : liqScore > 40 ? 'Good Liquidity (spread only)' : 'Poor Liquidity (spread only)')
    : (liqScore > 75 ? 'Excellent Liquidity' : liqScore > 40 ? 'Good Liquidity (OI>=100)' : 'Poor Liquidity (OI<100)')

  return [
    deltaScore > 75 ? 'Excellent Delta (>=0.45)' : deltaScore > 60 ? 'Good Delta (>=0.40)' : 'Poor Delta (<0.40)',
    oiLabel,
    dteScore > 75 ? 'Excellent DTE (LEAPS)' : dteScore > 40 ? 'Good DTE' : 'Short DTE — capped',
    vega >= 1.0 ? 'Excellent Vega (>=1.0)' : vega >= 0.5 ? 'Good Vega (>=0.5)' : 'Poor Vega (<0.5)',
  ]
}

export function scoreColor(score: number): string {
  if (score > 75) return '#00DD00'
  if (score >= 70) return '#FFAA00'
  return '#FF3333'
}
