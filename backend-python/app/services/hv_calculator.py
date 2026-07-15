"""
HV Calculator — Historical Volatility Screener
Coiled Spring Terminal

Calcola per ogni ticker dell'universo:
  - HV30: volatilità storica annualizzata su finestra 30gg (log returns)
  - HV Rank: posizione dell'HV corrente nel range 52 settimane (0–100)
  - HV Percentile: % di sessioni nelle ultime 252 in cui HV era inferiore all'attuale

Usato dal job APScheduler giornaliero e dall'endpoint /api/hv-screener.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# ── Costanti ─────────────────────────────────────────────────────────────────
HV_WINDOW = 30       # giorni per il calcolo dell'HV corrente
LOOKBACK = 252       # sessioni per HV Rank / Percentile (≈1 anno)
MIN_PRICES = 40      # minimo di prezzi per calcolo affidabile (30 + buffer)
BATCH_SIZE = 200     # ticker per batch download — yfinance si instabilizza oltre


# ── Core computation ──────────────────────────────────────────────────────────

def _compute_hv_for_series(prices: pd.Series) -> Optional[dict]:
    """Calcola HV30, Rank e Percentile da una serie di prezzi di chiusura.

    Ritorna None se i dati sono insufficienti.
    """
    prices = prices.dropna()
    if len(prices) < MIN_PRICES:
        return None

    log_ret = np.log(prices / prices.shift(1)).dropna()
    hv_series = log_ret.rolling(HV_WINDOW).std() * np.sqrt(252) * 100
    hv_series = hv_series.dropna()

    if len(hv_series) < 2:
        return None

    current_hv = float(hv_series.iloc[-1])
    window = hv_series.tail(LOOKBACK)
    hv_min = float(window.min())
    hv_max = float(window.max())

    # HV Rank
    if hv_max == hv_min:
        hv_rank = 0.0
    else:
        hv_rank = round((current_hv - hv_min) / (hv_max - hv_min) * 100, 1)

    # HV Percentile (esclude il valore corrente dal confronto)
    past = window.iloc[:-1]
    hv_pct = round(float((past < current_hv).sum()) / len(past) * 100, 1) if len(past) > 0 else 0.0

    return {
        "hv30": round(current_hv, 1),
        "hv_rank": hv_rank,
        "hv_percentile": hv_pct,
        "hv_52w_high": round(hv_max, 1),
        "hv_52w_low": round(hv_min, 1),
    }


def _download_batch(tickers: list[str]) -> pd.DataFrame:
    """Scarica prezzi di chiusura per un batch di ticker.

    Ritorna DataFrame con righe=date, colonne=ticker.
    Gestisce MultiIndex e single-ticker edge-case.
    """
    try:
        raw = yf.download(
            tickers,
            period="1y",
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=True,
        )
        if raw.empty:
            return pd.DataFrame()

        # Estrai la colonna Close — può essere MultiIndex con (metric, ticker)
        if isinstance(raw.columns, pd.MultiIndex):
            close = raw["Close"]
        else:
            close = raw[["Close"]] if "Close" in raw.columns else raw

        # Single ticker: yfinance ritorna Series, non DataFrame
        if isinstance(close, pd.Series):
            close = close.to_frame(name=tickers[0])

        return close

    except Exception as exc:
        logger.error(f"[HV] Batch download error: {exc}")
        return pd.DataFrame()


# ── Public API ────────────────────────────────────────────────────────────────

def compute_hv_batch(tickers: list[str]) -> list[dict]:
    """Calcola HV30/Rank/Pct per tutti i ticker in input.

    Scarica in batch da yfinance (BATCH_SIZE ticker per volta per stabilità).
    Ritorna lista di dict pronti per upsert in HVSnapshot.
    """
    now = datetime.now(timezone.utc)
    results: list[dict] = []
    errors = 0

    # Split in batch
    batches = [tickers[i:i + BATCH_SIZE] for i in range(0, len(tickers), BATCH_SIZE)]
    logger.info(f"[HV] Starting computation: {len(tickers)} tickers in {len(batches)} batches")

    for batch_idx, batch in enumerate(batches):
        logger.info(f"[HV] Batch {batch_idx + 1}/{len(batches)}: {len(batch)} tickers")
        close_df = _download_batch(batch)

        if close_df.empty:
            logger.warning(f"[HV] Batch {batch_idx + 1} returned empty DataFrame")
            errors += len(batch)
            continue

        for ticker in batch:
            if ticker not in close_df.columns:
                errors += 1
                continue
            try:
                metrics = _compute_hv_for_series(close_df[ticker])
                if metrics is None:
                    errors += 1
                    continue
                results.append({
                    "ticker": ticker,
                    "computed_at": now,
                    **metrics,
                })
            except Exception as exc:
                logger.warning(f"[HV] {ticker}: {exc}")
                errors += 1

    logger.info(f"[HV] Done: {len(results)} OK, {errors} errors")
    return results
