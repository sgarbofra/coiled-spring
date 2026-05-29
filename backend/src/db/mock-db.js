const state = {
  users: [
    {
      id: 1,
      email: 'demo@coiledspring.app',
      plan: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  watchlists: [
    {
      id: 1,
      user_id: 1,
      name: 'Core LEAPS',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 1,
      name: 'Earnings setups',
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  option_contracts: [
    {
      id: 1,
      underlying: 'AAPL',
      option_type: 'call',
      expiration: '2027-01-15',
      strike: 250,
      multiplier: 100,
      exchange: 'SMART',
      symbol_key: 'AAPL-20270115C250',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      underlying: 'NVDA',
      option_type: 'call',
      expiration: '2027-06-18',
      strike: 180,
      multiplier: 100,
      exchange: 'SMART',
      symbol_key: 'NVDA-20270618C180',
      created_at: new Date().toISOString()
    }
  ],
  watchlist_items: [
    {
      id: 1,
      watchlist_id: 1,
      option_contract_id: 1,
      source_scan_id: 1,
      status: 'active',
      entry_premium: 9.05,
      entry_iv: 21.4,
      entry_delta: 0.24,
      entry_gamma: 0.66,
      entry_vega: 0.03,
      entry_theta: -0.03,
      quantity: 1,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      watchlist_id: 1,
      option_contract_id: 2,
      source_scan_id: 1,
      status: 'active',
      entry_premium: 12.45,
      entry_iv: 23.9,
      entry_delta: 0.31,
      entry_gamma: 0.74,
      entry_vega: 0.04,
      entry_theta: -0.04,
      quantity: 1,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  option_snapshots: [],
  alerts: [
    {
      id: 1,
      watchlist_item_id: 1,
      alert_type: 'iv_below',
      threshold_value: 22,
      is_enabled: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  scan_runs: [
    {
      id: 1,
      user_id: 1,
      source: 'scanner',
      filters: {
        underlying: ['AAPL', 'NVDA', 'AMZN'],
        option_type: 'call',
        min_dte: 365,
        max_dte: 900,
        min_delta: 0.2,
        max_delta: 0.4
      },
      created_at: new Date().toISOString()
    }
  ],
  counters: {
    users: 1,
    watchlists: 2,
    option_contracts: 2,
    watchlist_items: 2,
    option_snapshots: 0,
    alerts: 1,
    scan_runs: 1
  },
  nextId(table) {
    this.counters[table] += 1;
    return this.counters[table];
  }
};

module.exports = state;