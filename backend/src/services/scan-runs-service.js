const db = require('../db/mock-db');

async function listScanRuns(userId) {
  return db.scan_runs.filter(r => r.user_id === userId);
}

async function getScanRun({ scanRunId, userId }) {
  const run = db.scan_runs.find(
    r => r.id === scanRunId && r.user_id === userId
  );

  if (!run) return null;

  const results = [
    {
      id: 1,
      underlying: 'AAPL',
      option_type: 'call',
      expiration: '2027-01-15',
      dte: 604,
      strike: 250,
      delta: 0.24,
      gamma: 0.66,
      vega: 0.03,
      theta: -0.03,
      iv: 21.4,
      bid: 8.9,
      ask: 9.2,
      mid: 9.05,
      oi: 1824,
      volume: 244,
      spread_pct: 3.3
    },
    {
      id: 2,
      underlying: 'NVDA',
      option_type: 'call',
      expiration: '2027-06-18',
      dte: 758,
      strike: 180,
      delta: 0.31,
      gamma: 0.74,
      vega: 0.04,
      theta: -0.04,
      iv: 23.9,
      bid: 12.1,
      ask: 12.8,
      mid: 12.45,
      oi: 1402,
      volume: 178,
      spread_pct: 5.6
    }
  ];

  return { run, results };
}

async function createScanRun({ userId, source, filters }) {
  const row = {
    id: db.nextId('scan_runs'),
    user_id: userId,
    source,
    filters,
    created_at: new Date().toISOString()
  };

  db.scan_runs.push(row);
  return row;
}

module.exports = {
  listScanRuns,
  getScanRun,
  createScanRun
};