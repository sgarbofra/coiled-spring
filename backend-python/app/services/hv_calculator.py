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
    """Calcola HV su finestre multiple (20, 30, 60, 252), Rank e Percentile.

    Ritorna None se i dati sono insufficienti.
    Le finestre HV20/HV60/HV252 sono calcolate una sola volta dalla stessa serie
    di log-return per efficienza.
    """
    prices = prices.dropna()
    if len(prices) < MIN_PRICES:
        return None

    log_ret = np.log(prices / prices.shift(1)).dropna()

    # ── Multi-window HV ─────────────────────────────────────────────────────
    multi_hv: dict = {}
    for w in [20, 30, 60, 252]:
        if len(log_ret) < w:
            multi_hv[f"hv{w}"] = None
            continue
        s = log_ret.rolling(w).std() * np.sqrt(252) * 100
        s = s.dropna()
        multi_hv[f"hv{w}"] = round(float(s.iloc[-1]), 1) if len(s) > 0 else None

    # HV30 is used for Rank/Percentile (unchanged behaviour)
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
        **multi_hv,                           # hv20, hv30, hv60, hv252
        "hv_rank": hv_rank,
        "hv_percentile": hv_pct,
        "hv_52w_high": round(hv_max, 1),
        "hv_52w_low": round(hv_min, 1),
    }


def _compute_parkinson_hv(highs: pd.Series, lows: pd.Series, window: int = 30) -> Optional[float]:
    """Calcola la Parkinson Historical Volatility su una finestra rolling.

    Usa il range intraday (High/Low) invece dei rendimenti close-to-close.
    Statisticamente 5.6x più efficiente del metodo classico.

    Formula (Parkinson 1980):
        σ²_P = 1/(4n·ln2) · Σ ln(High_i / Low_i)²
        HV_P = √(σ²_P · 252) × 100  (annualizzata, in %)

    Ritorna None se dati insufficienti o se High/Low contengono NaN/zero.
    """
    highs = highs.dropna()
    lows = lows.dropna()

    # Allinea gli indici
    common = highs.index.intersection(lows.index)
    if len(common) < window + 5:
        return None

    h = highs.loc[common]
    l = lows.loc[common]

    # Sanity check: evita divisione per zero su lows = 0
    if (l <= 0).any():
        return None

    log_hl = np.log(h / l)
    parkinson_var = log_hl.tail(window).pow(2).mean() / (4 * np.log(2))
    hv_parkinson = float(np.sqrt(parkinson_var * 252) * 100)

    return round(hv_parkinson, 1) if hv_parkinson > 0 else None


def _download_batch(tickers: list[str]) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Scarica Close, High e Low per un batch di ticker.

    Ritorna tuple (close_df, high_df, low_df) — DataFrame con righe=date, colonne=ticker.
    Gestisce MultiIndex e single-ticker edge-case.
    In caso di errore ritorna tre DataFrame vuoti.
    """
    empty = pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
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
            return empty

        def _extract(metric: str) -> pd.DataFrame:
            if isinstance(raw.columns, pd.MultiIndex):
                df = raw[metric] if metric in raw.columns.get_level_values(0) else pd.DataFrame()
            else:
                df = raw[[metric]] if metric in raw.columns else pd.DataFrame()

            # Single ticker: yfinance ritorna Series
            if isinstance(df, pd.Series):
                df = df.to_frame(name=tickers[0])
            return df

        return _extract("Close"), _extract("High"), _extract("Low")

    except Exception as exc:
        logger.error(f"[HV] Batch download error: {exc}")
        return empty


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
        close_df, high_df, low_df = _download_batch(batch)

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

                # Parkinson HV — richiede High e Low
                hv30_parkinson = None
                if ticker in high_df.columns and ticker in low_df.columns:
                    hv30_parkinson = _compute_parkinson_hv(high_df[ticker], low_df[ticker], window=HV_WINDOW)

                results.append({
                    "ticker": ticker,
                    "computed_at": now,
                    "hv30_parkinson": hv30_parkinson,
                    **metrics,   # includes hv20, hv30, hv60, hv252, hv_rank, ...
                })
            except Exception as exc:
                logger.warning(f"[HV] {ticker}: {exc}")
                errors += 1

    logger.info(f"[HV] Done: {len(results)} OK, {errors} errors")
    return results
