"""
ETF Calendar Scanner — job giornaliero
Coiled Spring Terminal

Per ogni ETF dell'universo:
1. Fetch ATM option chain via yfinance
2. Calcola maturità sintetiche 30/60/90d e credit% normalizzato su spot
3. Legge storico 252 giorni dal DB per calcolare media e std
4. Calcola z-score: (credit_oggi - media_52w) / std_52w
5. Classifica segnale: RICH / WATCH / FAIR / CHEAP
6. Upsert snapshot in etf_calendar_snapshots

Schedulato ogni giorno alle 17:30 Europe/Rome
(dopo il refresh HV delle 17:00 UTC — mercati US già chiusi da 1h).

Entry point: run_etf_calendar_scan()
"""

from __future__ import annotations

import logging
import statistics
from datetime import date, datetime, timezone
from typing import Optional

from app.services.etf_calendar_calculator import (
    ETF_UNIVERSE,
    MIN_HISTORY_FOR_ZSCORE,
    classify_signal,
    fetch_etf_calendar_data,
)

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_z_score(history: list[float], current: float) -> Optional[float]:
    """Calcola lo z-score del valore corrente rispetto alla storia.

    Args:
        history: lista di valori storici (più recente prima, max 252)
        current: valore di oggi

    Returns:
        z-score arrotondato a 2 decimali, oppure None se storia insufficiente.
    """
    if len(history) < MIN_HISTORY_FOR_ZSCORE:
        return None

    mean = statistics.mean(history)
    try:
        std = statistics.stdev(history)
    except statistics.StatisticsError:
        return None

    if std == 0:
        return None

    return round((current - mean) / std, 2)


def _get_credit_history(db, ticker: str, metric: str, limit: int = 252) -> list[float]:
    """Legge gli ultimi N valori di un credit% dal DB.

    metric: 'credit_30v60_pct' | 'credit_30v90_pct' | 'credit_60v90_pct'
    Ritorna lista ordinata più recente → più vecchio (per statistics.mean/stdev).
    """
    from app import models
    from sqlalchemy import desc

    col_map = {
        "credit_30v60_pct": models.ETFCalendarSnapshot.credit_30v60_pct,
        "credit_30v90_pct": models.ETFCalendarSnapshot.credit_30v90_pct,
        "credit_60v90_pct": models.ETFCalendarSnapshot.credit_60v90_pct,
    }
    col = col_map.get(metric)
    if col is None:
        return []

    rows = (
        db.query(col)
        .filter(
            models.ETFCalendarSnapshot.ticker == ticker,
            col.isnot(None),
        )
        .order_by(desc(models.ETFCalendarSnapshot.snap_date))
        .limit(limit)
        .all()
    )
    return [float(r[0]) for r in rows if r[0] is not None]


# ── Entry point ───────────────────────────────────────────────────────────────

def run_etf_calendar_scan() -> dict:
    """Esegue lo scan giornaliero ETF Calendar Monitor.

    Chiamato dal job APScheduler e dall'endpoint POST /api/etf-calendar/refresh.

    Returns:
        dict con: success, skipped, error, details (per logging e risposta API).
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import DATABASE_URL
    from app import models

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    today = date.today()
    now   = datetime.now(timezone.utc)

    results: dict = {
        "scan_date": today.isoformat(),
        "success":   0,
        "skipped":   0,
        "error":     0,
        "details":   [],
    }

    logger.info(f"[ETF-CAL] Avvio scan giornaliero — {today} — {len(ETF_UNIVERSE)} ETF")

    try:
        for ticker in ETF_UNIVERSE:
            logger.info(f"[ETF-CAL] → {ticker}")
            try:
                # 1. Fetch dati option chain
                data = fetch_etf_calendar_data(ticker)

                if data is None:
                    logger.warning(f"[ETF-CAL] {ticker}: dati non disponibili — skip")
                    results["skipped"] += 1
                    results["details"].append({"ticker": ticker, "status": "skipped"})
                    continue

                # 2. Storico per z-score (escludi il giorno di oggi per non contaminare)
                hist_30v60 = _get_credit_history(db, ticker, "credit_30v60_pct")
                hist_30v90 = _get_credit_history(db, ticker, "credit_30v90_pct")
                hist_60v90 = _get_credit_history(db, ticker, "credit_60v90_pct")

                # 3. Z-score
                z_30v60 = (
                    _compute_z_score(hist_30v60, data["credit_30v60_pct"])
                    if data["credit_30v60_pct"] is not None else None
                )
                z_30v90 = (
                    _compute_z_score(hist_30v90, data["credit_30v90_pct"])
                    if data["credit_30v90_pct"] is not None else None
                )
                z_60v90 = (
                    _compute_z_score(hist_60v90, data["credit_60v90_pct"])
                    if data["credit_60v90_pct"] is not None else None
                )

                # 4. Classificazione segnale (su 30v60 — metrica principale)
                signal = classify_signal(z_30v60)

                # 5. Upsert snapshot
                existing = (
                    db.query(models.ETFCalendarSnapshot)
                    .filter_by(ticker=ticker, snap_date=today)
                    .first()
                )
                if existing:
                    snap = existing
                else:
                    snap = models.ETFCalendarSnapshot(ticker=ticker, snap_date=today)
                    db.add(snap)

                snap.spot_price        = data["spot"]
                snap.iv_30d            = data["iv_30d"]
                snap.iv_60d            = data["iv_60d"]
                snap.iv_90d            = data["iv_90d"]
                snap.credit_30v60_pct  = data["credit_30v60_pct"]
                snap.credit_30v90_pct  = data["credit_30v90_pct"]
                snap.credit_60v90_pct  = data["credit_60v90_pct"]
                snap.z_score_30v60     = z_30v60
                snap.z_score_30v90     = z_30v90
                snap.z_score_60v90     = z_60v90
                snap.signal_30v60      = signal
                snap.history_days      = len(hist_30v60)
                snap.computed_at       = now

                db.commit()

                results["success"] += 1
                detail = {
                    "ticker":           ticker,
                    "status":           "ok",
                    "spot":             data["spot"],
                    "credit_30v60_pct": data["credit_30v60_pct"],
                    "z_score_30v60":    z_30v60,
                    "signal":           signal,
                    "history_days":     len(hist_30v60),
                }
                results["details"].append(detail)

                logger.info(
                    f"[ETF-CAL] {ticker}: spot={data['spot']} "
                    f"credit={data['credit_30v60_pct']}% "
                    f"z={z_30v60} signal={signal} hist={len(hist_30v60)}d"
                )

            except Exception as exc:
                logger.error(f"[ETF-CAL] {ticker}: errore — {exc}", exc_info=True)
                try:
                    db.rollback()
                except Exception:
                    pass
                results["error"] += 1
                results["details"].append({
                    "ticker": ticker,
                    "status": "error",
                    "error":  str(exc),
                })

    finally:
        db.close()

    logger.info(
        f"[ETF-CAL] Scan completato — "
        f"{results['success']} OK, {results['skipped']} skip, {results['error']} errori"
    )
    return results
