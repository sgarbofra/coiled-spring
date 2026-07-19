"""
scanner_service.py — Shared scanner logic for HTTP endpoint and newsletter job.

Extracts cs_score() and run_newsletter_scan() from scanner.py router so they
can be used without HTTP overhead, JWT auth, or endpoint coupling.

Used by:
  - app/routers/scanner.py  (existing endpoint — imports cs_score)
  - app/jobs/newsletter_job.py  (newsletter cron — imports run_newsletter_scan)
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import List, Optional

from sqlalchemy.orm import Session

from app.services.market_data import scan_yfinance, OptionResult
from app import models


# ── CS Score v2.4 ─────────────────────────────────────────────────────────────

CS_SCORE_VERSION = "2.4"


def cs_score(abs_delta: float, vega: float, dte: int, spread_pct: float, oi: int) -> int:
    """
    CS Score v2.4 — Coiled Spring Candidate Score.

    Formula: vega_s*0.35 + dte_s*0.30 + liq_s*0.20 + ds*0.15
    Hard cap: score <= 69 if DTE < 300.

    Args:
        abs_delta:  absolute value of option delta
        vega:       option vega (Black-Scholes)
        dte:        days to expiration
        spread_pct: (ask-bid)/mid * 100
        oi:         open interest

    Returns:
        int in range [0, 100], capped at 69 if dte < 300
    """
    # 1. Delta band score (ds)
    if   0.18 <= abs_delta <= 0.25: ds = 100
    elif 0.25 < abs_delta  <= 0.30: ds = 95
    elif 0.15 <= abs_delta <  0.18: ds = 90
    elif 0.30 < abs_delta  <= 0.35: ds = 85
    elif 0.10 <= abs_delta <  0.15: ds = 70
    elif 0.35 < abs_delta  <= 0.40: ds = 65
    elif abs_delta < 0.10:          ds = 30
    else:                            ds = 25  # abs_delta > 0.40

    # 2. DTE score
    dte_s = min(dte / 730, 1) * 100

    # 3. Liquidity score
    sp_comp = max(0.0, 1 - spread_pct / 100)
    if oi == 0:
        liq_s = sp_comp * 100
    else:
        raw_liq = sp_comp * 60 + min(oi / 500, 1) * 40
        liq_s = min(raw_liq, 39) if oi < 100 else raw_liq

    # 4. Vega score
    vega_s = min(vega / 1.0, 1) * 100

    raw = round(vega_s * 0.35 + dte_s * 0.30 + liq_s * 0.20 + ds * 0.15)
    return min(raw, 69) if dte < 300 else raw


# ── Candidate dataclass ───────────────────────────────────────────────────────

@dataclass
class ScanCandidate:
    """Options scan result enriched with CS Score and HV snapshot data."""
    ticker: str
    option_type: str
    strike: float
    expiration: str      # "YYYY-MM-DD"
    dte: int
    bid: float
    ask: float
    mid: float
    last: float
    spread_pct: float
    iv: float            # IV as percentage, e.g. 28.5
    delta: float
    vega: float
    theta: float
    gamma: float
    open_interest: int
    volume: int
    cs_score_value: int
    hv_rank: Optional[float]   # from HVSnapshot table
    hv30: Optional[float]      # HV30 annualised (%)
    symbol_key: str


# ── Newsletter scan ───────────────────────────────────────────────────────────

def run_newsletter_scan(
    db: Session,
    hv_rank_max: float = 25.0,
    cs_score_min: int = 65,
    limit: int = 6,
    dte_min: int = 300,
    dte_max: int = 750,
    delta_min: float = 0.15,
    delta_max: float = 0.45,
    spread_pct_max: float = 50.0,
) -> tuple[List[ScanCandidate], int]:
    """
    Newsletter scan pipeline:

    Phase A — Get tickers with low HV Rank from DB (fast query).
    Phase B — Scan options for those tickers via yfinance.
    Phase C — Data quality filter (stale, bid/ask missing, spread excessive).
    Phase D — CS Score filter and sort.

    Args:
        db:             SQLAlchemy session
        hv_rank_max:    max HV Rank (e.g. 25.0 = lower quartile)
        cs_score_min:   minimum CS Score to qualify
        limit:          max candidates to return
        dte_min/max:    DTE range filter
        delta_min/max:  delta range filter
        spread_pct_max: max spread % to accept (data quality)

    Returns:
        (candidates sorted by cs_score DESC, total_setups_found_before_limit)
    """

    # Phase A: tickers with compressed HV from DB
    hv_rows = (
        db.query(models.HVSnapshot)
        .filter(
            models.HVSnapshot.hv_rank <= hv_rank_max,
            models.HVSnapshot.hv_rank.isnot(None),
        )
        .order_by(models.HVSnapshot.hv_rank.asc())
        .limit(50)   # cap at 50 — each ticker takes ~2-4s to scan
        .all()
    )

    if not hv_rows:
        return [], 0

    hv_map: dict[str, models.HVSnapshot] = {row.ticker: row for row in hv_rows}
    tickers = list(hv_map.keys())

    # Phase B + C: scan options, apply data quality filter
    all_candidates: List[ScanCandidate] = []

    for ticker in tickers:
        try:
            results: List[OptionResult] = scan_yfinance(
                symbols=[ticker],
                dte_min=dte_min,
                dte_max=dte_max,
                option_types=["call"],
                delta_min=delta_min,
                delta_max=delta_max,
                filters={},
                max_results=10,
            )
        except Exception as e:
            print(f"[SCANNER_SERVICE] scan_yfinance error for {ticker}: {e}")
            time.sleep(0.3)
            continue

        for r in results:
            # Data quality filter (Phase C)
            if r.is_stale:
                continue
            if r.bid <= 0 or r.ask <= 0:
                continue
            if r.spread_pct > spread_pct_max:
                continue
            if r.iv <= 0 or r.iv > 300:
                continue

            # Phase D: CS Score filter
            score = cs_score(abs(r.delta), r.vega, r.dte, r.spread_pct, r.open_interest)
            if score < cs_score_min:
                continue

            hv = hv_map.get(ticker)
            all_candidates.append(ScanCandidate(
                ticker=r.underlying,
                option_type=r.option_type,
                strike=r.strike,
                expiration=r.expiration,
                dte=r.dte,
                bid=r.bid,
                ask=r.ask,
                mid=r.mid,
                last=r.last_price,
                spread_pct=r.spread_pct,
                iv=r.iv,
                delta=r.delta,
                vega=r.vega,
                theta=r.theta,
                gamma=r.gamma,
                open_interest=r.open_interest,
                volume=r.volume,
                cs_score_value=score,
                hv_rank=hv.hv_rank if hv else None,
                hv30=hv.hv30 if hv else None,
                symbol_key=r.symbol_key,
            ))

        time.sleep(0.3)  # yfinance rate limiting

    total_found = len(all_candidates)

    # Sort by CS Score DESC, take top N
    all_candidates.sort(key=lambda x: x.cs_score_value, reverse=True)
    return all_candidates[:limit], total_found
