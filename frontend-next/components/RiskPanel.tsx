'use client'

/**
 * RiskPanel — mostra i flag di rischio per un contratto opzione.
 * Props: spread_pct (0-1 o 0-100?): usa valore raw dal scanner (es. 12.5 = 12.5%)
 *        open_interest: numero intero
 *        dte: giorni a scadenza
 *        earnings_date?: ISO date string oppure null/undefined
 */

export type RiskPanelProps = {
  spread_pct: number
  open_interest: number
  dte: number
  earnings_date?: string | null
}

export type RiskFlag = {
  label: string
  color: string
}

export function computeFlags(props: RiskPanelProps): RiskFlag[] {
  const { spread_pct, open_interest, dte, earnings_date } = props
  const flags: RiskFlag[] = []

  // 1. Wide spread (spread_pct arriva come percentuale, es. 12.5 = 12.5%)
  if (spread_pct > 10) {
    flags.push({ label: `⚠ Wide Spread (${spread_pct.toFixed(1)}%)`, color: 'var(--negative)' })
  }

  // 2. Low open interest
  if (open_interest < 100) {
    flags.push({ label: '⚠ Low Open Interest', color: 'var(--negative)' })
  }

  // 3. Short DTE
  if (dte < 300) {
    flags.push({ label: `⚠ Short DTE (${dte} days)`, color: 'var(--accent)' })
  }

  // 4. Earnings within 14 days
  if (earnings_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const ed = new Date(earnings_date)
    ed.setHours(0, 0, 0, 0)
    const daysToEarnings = Math.round((ed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToEarnings >= 0 && daysToEarnings <= 14) {
      flags.push({ label: `⚠ Earnings in ${daysToEarnings} days`, color: 'var(--negative)' })
    }
  }

  return flags
}

export default function RiskPanel(props: RiskPanelProps) {
  const flags = computeFlags(props)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      background: 'transparent',
    }}>
      {flags.length === 0 ? (
        <span style={{ color: 'var(--positive)' }}>✅ No immediate risks</span>
      ) : (
        flags.map((f, i) => (
          <span key={i} style={{ color: f.color }}>{f.label}</span>
        ))
      )}
    </div>
  )
}

/**
 * Versione inline usata nel tooltip della tabella scanner.
 * Wrappa RiskPanel in un popup posizionato assolutamente.
 */
export function RiskTooltip({
  props,
  idx,
  visible,
}: {
  props: RiskPanelProps
  idx: number          // indice riga — usato per decidere se aprire sopra/sotto
  visible: boolean
}) {
  if (!visible) return null
  const showBelow = idx < 4

  return (
    <div style={{
      position: 'absolute',
      ...(showBelow ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' }),
      left: 0,
      backgroundColor: '#000',
      border: '1px solid var(--border)',
      borderRadius: '3px',
      padding: '8px 12px',
      zIndex: 300,
      minWidth: '220px',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.8)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: '#888',
        letterSpacing: '0.5px',
        marginBottom: '6px',
        textTransform: 'uppercase',
      }}>
        RISK FLAGS
      </div>
      <RiskPanel {...props} />
      {/* Freccia */}
      {showBelow ? (
        <div style={{ position: 'absolute', top: '-6px', left: '14px', width: 0, height: 0,
          borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
          borderBottom: '6px solid var(--border)' }} />
      ) : (
        <div style={{ position: 'absolute', bottom: '-6px', left: '14px', width: 0, height: 0,
          borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
          borderTop: '6px solid var(--border)' }} />
      )}
    </div>
  )
}
