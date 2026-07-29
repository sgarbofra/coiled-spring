"""
ETF Calendar Monitor — Calculator
Coiled Spring Terminal

Calcola per ogni ETF dell'universo:
  - Maturità sintetiche costanti: 30d, 60d, 90d (interpolazione lineare VIX-style)
  - Credit% normalizzato su spot: (price_far - price_near) / spot × 100
  - Classificazione segnale: RICH / WATCH / FAIR / CHEAP (basata su z-score 52w)

Nessun accesso al DB — funzioni pure, chiamate dal scanner.

NOTA SUL SEGNO:
  credit_NxM_pct = (price_M - price_N) / spot × 100
  Positivo = la far-term vale più della near-term (struttura normale / contango)
  Z-score alto   → spread storicamente caro  → vantaggio sell far / buy near
  Z-score basso  → spread storicamente cheap → vantaggio buy far / sell near
"""

from __future__ import annotations

import logging
import time
from datetime import date
from typing import Optional

import yfinance as yf

logger = logging.getLogger(__name__)

# ── Universo ETF ──────────────────────────────────────────────────────────────

ETF_UNIVERSE: list[str] = [
    # Equity broad
    "SPY", "QQQ", "IWM", "DIA",
    # Settoriali
    "XLF", "XLE", "XLK", "XLV", "XLU",
    # Macro / cross-asset
    "GLD", "TLT", "SLV", "EEM", "EFA", "HYG",
]

# DTE target per maturità sintetiche
TARGET_DTES: list[int] = [30, 60, 90]

# Range DTE accettabile per lo straddling (scadenze fuori range ignorate)
DTE_MIN_FETCH: int = 10   # < 10gg: delta esplosivi, dati inaffidabili
DTE_MAX_FETCH: int = 150  # > 150gg: fuori dal range di interesse

# Soglie z-score per classificazione segnale
Z_RICH:  float =  1.5
Z_WATCH: float =  0.5
Z_CHEAP: float = -1.5

# Minimo osservazioni storiche per z-score affidabile
MIN_HISTORY_FOR_ZSCORE: int = 20

# Pausa tra chiamate yfinance (rate limiting)
YFINANCE_SLEEP: float = 0.15


# ── Signal classifier ─────────────────────────────────────────────────────────

def classify_signal(z: Optional[float]) -> str:
    """Classifica il segnale dal z-score del calendar spread 30v60.

    RICH  → credito storicamente alto  → setup: buy near / sell far (incassi credito elevato)
    WATCH → zona di osservazione
    FAIR  → pricing nella norma storica → nessun edge statistico
    CHEAP → credito storicamente basso → setup: sell near / buy far (paghi meno del solito)
    """
    if z is None:
        return "INSUFFICIENT_DATA"
    if z >= Z_RICH:
        return "RICH"
    if z >= Z_WATCH:
        return "WATCH"
    if z > Z_CHEAP:
        return "FAIR"
    return "CHEAP"


# ── Interpolazione VIX-style ──────────────────────────────────────────────────

def _select_expirations_to_fetch(
    expirations: list[str],
    today: date,
    targets: list[int],
) -> list[str]:
    """Seleziona il set minimo di scadenze da fetchare per coprire tutti i target DTE.

    Per ogni target (es. 30d) trova le due scadenze reali che lo straddlano.
    Tipicamente restituisce 3-4 scadenze per ETF, riducendo le chiamate API.
    """
    dte_exp = [
        ((date.fromisoformat(exp) - today).days, exp)
        for exp in expirations
    ]

    to_fetch: set[str] = set()
    for target in targets:
        lower = [(d, e) for d, e in dte_exp if DTE_MIN_FETCH <= d < target]
        upper = [(d, e) for d, e in dte_exp if target <= d <= DTE_MAX_FETCH]

        if lower:
            to_fetch.add(max(lower, key=lambda x: x[0])[1])
        if upper:
            to_fetch.add(min(upper, key=lambda x: x[0])[1])

    return list(to_fetch)


def _interpolate_at_dte(
    by_dte: dict[int, dict],
    target_dte: int,
) -> Optional[dict]:
    """Interpolazione lineare per ottenere dati sintetici a maturità costante.

    Metodologia analoga al calcolo VIX: media pesata delle scadenze reali
    che straddlano il target DTE.

    Args:
        by_dte: {dte: {'price': float, 'iv': float}}
        target_dte: DTE sintetico target (30, 60 o 90)

    Returns:
        {'price': float, 'iv': float} oppure None se interpolazione impossibile.
    """
    dtes = sorted(by_dte.keys())

    # Match esatto
    if target_dte in by_dte:
        d = by_dte[target_dte]
        return {"price": d["price"], "iv": d["iv"]}

    lower = [d for d in dtes if d < target_dte]
    upper = [d for d in dtes if d > target_dte]

    if not lower or not upper:
        return None

    d1 = max(lower)  # scadenza più vicina al target (near)
    d2 = min(upper)  # scadenza appena oltre il target (far)

    if d2 == d1:
        return None

    # Peso lineare: w = frazione di "quanto d1 conta" per arrivare al target
    w = (d2 - target_dte) / (d2 - d1)

    price = w * by_dte[d1]["price"] + (1 - w) * by_dte[d2]["price"]
    iv    = w * by_dte[d1]["iv"]    + (1 - w) * by_dte[d2]["iv"]

    return {"price": round(price, 4), "iv": round(iv, 2)}


# ── Fetch yfinance ─────────────────────────────────────────────────────────────

def _get_spot(t: "yf.Ticker") -> Optional[float]:
    """Estrae il prezzo spot con fallback multipli (yfinance è instabile sui naming)."""
    # Tentativo 1: fast_info (attributo snake_case nelle versioni recenti)
    try:
        v = t.fast_info.last_price
        if v and v > 0:
            return float(v)
    except Exception:
        pass

    # Tentativo 2: fast_info camelCase (versioni precedenti)
    try:
        v = t.fast_info.get("lastPrice") or t.fast_info.get("regularMarketPrice")
        if v and v > 0:
            return float(v)
    except Exception:
        pass

    # Tentativo 3: t.info (più lento, usato come ultima risorsa)
    try:
        info = t.info
        v = info.get("regularMarketPrice") or info.get("currentPrice")
        if v and v > 0:
            return float(v)
    except Exception:
        pass

    return None


def _fetch_chain(t: "yf.Ticker", exp: str, spot: float) -> Optional[dict]:
    """Fetcha la chain call ATM per una singola scadenza.

    Returns:
        {'price': float, 'iv': float, 'strike': float} oppure None.
    """
    try:
        chain = t.option_chain(exp)
        calls = chain.calls

        # Filtra opzioni con IV e prezzo validi
        calls = calls[
            (calls["impliedVolatility"] > 0.01) &
            (calls["strike"] > 0)
        ].copy()

        if calls.empty:
            return None

        # ATM: strike più vicino allo spot corrente
        atm_idx = (calls["strike"] - spot).abs().idxmin()
        atm = calls.loc[atm_idx]

        bid  = float(atm.get("bid",  0) or 0)
        ask  = float(atm.get("ask",  0) or 0)
        last = float(atm.get("lastPrice", 0) or 0)

        # Mid price (con fallback a lastPrice se spread non valido)
        if bid > 0 and ask > 0 and ask > bid:
            mid = (bid + ask) / 2.0
        elif last > 0:
            mid = last
        else:
            return None

        iv = float(atm["impliedVolatility"]) * 100  # → percentuale

        if mid <= 0 or iv <= 0:
            return None

        return {
            "price":  round(mid, 4),
            "iv":     round(iv,  2),
            "strike": float(atm["strike"]),
        }

    except Exception as exc:
        logger.debug(f"[ETF-CAL] chain fetch error exp={exp}: {exc}")
        return None


def fetch_etf_calendar_data(ticker: str) -> Optional[dict]:
    """Fetch dati ATM option chain e calcola le maturità sintetiche 30/60/90d.

    1. Recupera prezzo spot
    2. Seleziona il set minimo di scadenze da fetchare (3-4 tipicamente)
    3. Fetcha ATM call price e IV per ciascuna scadenza
    4. Interpola a maturità costanti (30d, 60d, 90d)
    5. Calcola credit% normalizzato: (price_far - price_near) / spot × 100

    Returns dict con le metriche calcolate, oppure None se dati non disponibili.
    """
    try:
        t = yf.Ticker(ticker)
        spot = _get_spot(t)

        if not spot or spot <= 0:
            logger.warning(f"[ETF-CAL] {ticker}: spot non disponibile")
            return None

        expirations = t.options
        if not expirations:
            logger.warning(f"[ETF-CAL] {ticker}: nessuna scadenza opzioni disponibile")
            return None

        today = date.today()
        to_fetch = _select_expirations_to_fetch(expirations, today, TARGET_DTES)

        if not to_fetch:
            logger.warning(f"[ETF-CAL] {ticker}: nessuna scadenza nel range {DTE_MIN_FETCH}-{DTE_MAX_FETCH}d")
            return None

        # Fetch ATM data per le scadenze selezionate
        by_dte: dict[int, dict] = {}
        for exp in sorted(to_fetch):
            dte = (date.fromisoformat(exp) - today).days
            result = _fetch_chain(t, exp, spot)
            if result is not None:
                by_dte[dte] = result
            time.sleep(YFINANCE_SLEEP)

        if not by_dte:
            logger.warning(f"[ETF-CAL] {ticker}: nessun dato ATM valido recuperato")
            return None

        # Interpolazione maturità sintetiche
        d30 = _interpolate_at_dte(by_dte, 30)
        d60 = _interpolate_at_dte(by_dte, 60)
        d90 = _interpolate_at_dte(by_dte, 90)

        # Credit% normalizzato su spot: (price_far - price_near) / spot × 100
        def _credit(near: Optional[dict], far: Optional[dict]) -> Optional[float]:
            if near is None or far is None:
                return None
            return round((far["price"] - near["price"]) / spot * 100, 4)

        return {
            "spot":             round(spot, 2),
            "iv_30d":           d30["iv"] if d30 else None,
            "iv_60d":           d60["iv"] if d60 else None,
            "iv_90d":           d90["iv"] if d90 else None,
            "credit_30v60_pct": _credit(d30, d60),
            "credit_30v90_pct": _credit(d30, d90),
            "credit_60v90_pct": _credit(d60, d90),
        }

    except Exception as exc:
        logger.error(f"[ETF-CAL] {ticker}: errore fetch — {exc}")
        return None
