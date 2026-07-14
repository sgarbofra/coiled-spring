/**
 * Coiled Strategy Candidate Score — funzioni condivise
 * Usato da: Scanner, Watchlist
 *
 * Formula: Vega (35%) + DTE (30%) + Liquidity (20%) + Delta (15%)
 * Hard cap: DTE < 300 → max 69 | OI < 100 → Liquidity max 39
 *
 * Delta scoring: band-based (non lineare) per riflettere la filosofia CS.
 * Target ottimale: |Δ| 0.18–0.30. Range accettabile: 0.10–0.35.
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

/**
 * Delta band scoring — Coiled Spring Strategy
 *
 * 🟢 Optimal  : 0.18–0.25 → 100  |  0.25–0.30 → 95
 * 🟡 Good     : 0.15–0.18 → 90   |  0.30–0.35 → 85
 * 🟠 Marginal : 0.10–0.15 → 70   |  0.35–0.40 → 65
 * 🔴 Avoid    : <0.10      → 30   |  >0.40     → 25
 *
 * Basato sulla filosofia CS: massima convessità + leva + probabilità ITM
 * non trascurabile. Da validare empiricamente con dati ORATS.
 */
function deltaBandScore(absDelta: number): number {
  if (absDelta >= 0.18 && absDelta <= 0.25) return 100
  if (absDelta >  0.25 && absDelta <= 0.30) return 95
  if (absDelta >= 0.15 && absDelta <  0.18) return 90
  if (absDelta >  0.30 && absDelta <= 0.35) return 85
  if (absDelta >= 0.10 && absDelta <  0.15) return 70
  if (absDelta >  0.35 && absDelta <= 0.40) return 65
  if (absDelta <  0.10) return 30
  return 25  // > 0.40
}

function deltaBandLabel(absDelta: number): string {
  const d = absDelta.toFixed(2)
  if (absDelta >= 0.18 && absDelta <= 0.25) return `🟢 Optimal Delta |Δ|=${d} (0.18–0.25)`
  if (absDelta >  0.25 && absDelta <= 0.30) return `🟢 Very Good Delta |Δ|=${d} (0.25–0.30)`
  if (absDelta >= 0.15 && absDelta <  0.18) return `🟡 Acceptable Delta |Δ|=${d} (0.15–0.18)`
  if (absDelta >  0.30 && absDelta <= 0.35) return `🟡 Acceptable Delta |Δ|=${d} (0.30–0.35)`
  if (absDelta >= 0.10 && absDelta <  0.15) return `🟠 Marginal Delta |Δ|=${d} (0.10–0.15)`
  if (absDelta >  0.35 && absDelta <= 0.40) return `🟠 Marginal Delta |Δ|=${d} (0.35–0.40)`
  if (absDelta <  0.10) return `🔴 Delta Too Low |Δ|=${d} (<0.10)`
  return `🔴 Delta Too High |Δ|=${d} (>0.40)`
}

export function computeCandidateScore(r: CsScoreInput): number | null {
  if (r.delta == null || r.vega == null || r.dte == null) return null

  const delta    = r.delta
  const vega     = r.vega
  const dte      = r.dte
  const spreadPct = r.spread_pct ?? 100

  const absDelta   = Math.abs(delta)  // put delta è negativo — usiamo abs per lo score
  const deltaScore = deltaBandScore(absDelta)
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

  const absDelta   = Math.abs(delta)
  const deltaScore = deltaBandScore(absDelta)
  const dteScore   = Math.min(dte / 730, 1) * 100
  const liqScore   = liquidityScore(spreadPct, r.open_interest)

  const oiLabel = r.open_interest == null
    ? (liqScore > 75 ? 'Excellent Liquidity (spread only)' : liqScore > 40 ? 'Good Liquidity (spread only)' : 'Poor Liquidity (spread only)')
    : (liqScore > 75 ? 'Excellent Liquidity' : liqScore > 40 ? 'Good Liquidity (OI>=100)' : 'Poor Liquidity (OI<100)')

  return [
    deltaBandLabel(absDelta),
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
