const db = require('../db/mock-db');

async function getIvCurve({ underlying, optionType }) {
  const contracts = db.option_contracts.filter(
    c => c.underlying === underlying && c.option_type === optionType
  );

  const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
  const expirations = [...new Set(contracts.map(c => c.expiration))].sort();

  const series = strikes.map(strike => {
    const points = expirations.map((expiration, idx) => {
      const base = optionType === 'call' ? 19.0 : 21.0;
      const strikeAdj = Math.max(0, (strike - strikes[0]) / 25) * 1.4;
      const expiryAdj = idx * 1.1;
      const typeAdj = optionType === 'call' ? 0.0 : 1.2;
      const iv = +(base + strikeAdj + expiryAdj + typeAdj).toFixed(2);
      const dte = 365 + idx * 180;
      return { dte, expiration, iv };
    });

    return { strike, points };
  });

  return { underlying, option_type: optionType, series };
}

module.exports = {
  getIvCurve
};