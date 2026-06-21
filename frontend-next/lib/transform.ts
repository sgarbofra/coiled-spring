export function transformWatchlist(w: Record<string, unknown>) {
  return {
    id: String(w.id),
    name: w.name as string,
    isActive: w.is_active as boolean,
    createdAt: w.created_at as string,
    updatedAt: w.updated_at as string,
    userId: String(w.user_id),
  }
}

function calcDte(expiration: string | null): number | null {
  if (!expiration) return null
  const diff = Math.floor((new Date(expiration).getTime() - Date.now()) / 86_400_000)
  return diff > 0 ? diff : 0
}

export function transformItem(item: Record<string, unknown>) {
  const c = item.option_contract as Record<string, unknown>
  return {
    id: String(item.id),
    symbol: c.symbol_key as string,
    underlyingSymbol: c.underlying as string,
    instrumentType: 'OPTION',
    optionSide: c.option_type ? (c.option_type as string).toUpperCase() : null,
    strike: c.strike != null ? Number(c.strike) : null,
    expirationDate: (c.expiration as string) ?? null,
    dte: calcDte(c.expiration as string | null),
    premiumPaid: item.entry_premium != null ? Number(item.entry_premium) : null,
    currentPremium: item.current_premium != null ? Number(item.current_premium) : null,
    ivCurrent: item.current_iv != null ? Number(item.current_iv) : null,
    ivRank: null,
    ivPercentile: null,
    ivMovingAvg: null,
    delta: item.current_delta != null ? Number(item.current_delta) : null,
    gamma: item.current_gamma != null ? Number(item.current_gamma) : null,
    vega: item.current_vega != null ? Number(item.current_vega) : null,
    theta: item.current_theta != null ? Number(item.current_theta) : null,
    openInterest: null,
    volume: null,
    bid: item.current_bid != null ? Number(item.current_bid) : null,
    ask: item.current_ask != null ? Number(item.current_ask) : null,
    bidAskSpread: null,
    theoreticalPnl: null,
    notes: (item.notes as string) ?? null,
  }
}

// Frontend scanner/add-item payload → Python BulkAddItems format
export function transformCandidateToPython(c: Record<string, unknown>) {
  const optionType = ((c.optionSide as string) || 'CALL').toLowerCase()
  return {
    option_contract: {
      symbol_key: c.symbol as string,
      underlying: c.underlyingSymbol as string,
      option_type: optionType === 'put' ? 'put' : 'call',
      expiration: (c.expirationDate as string) || '2099-01-01',
      strike: c.strike != null ? Number(c.strike) : 0,
      exchange: null,
    },
    entry_premium: c.premiumPaid != null ? Number(c.premiumPaid) : null,
    entry_iv: c.ivCurrent != null ? Number(c.ivCurrent) : null,
    entry_delta: c.delta != null ? Number(c.delta) : null,
    entry_gamma: c.gamma != null ? Number(c.gamma) : null,
    entry_vega: c.vega != null ? Number(c.vega) : null,
    entry_theta: c.theta != null ? Number(c.theta) : null,
    notes: (c.notes as string) || null,
  }
}
