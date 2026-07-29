"""
S&P 500 Calendar Scanner — job giornaliero
Coiled Spring Terminal

Per ogni ticker S&P 500 attivo (da ticker_universe):
1. Fetch ATM option chain via yfinance
2. Calcola maturità sintetiche 30/60/90d e credit% normalizzato su spot
3. Legge storico 252 giorni dal DB per calcolare media e std
4. Calcola z-score: (credit_oggi - media_52w) / std_52w
5. Classifica segnale: RICH / WATCH / FAIR / CHEAP
6. Upsert snapshot in sp500_calendar_snapshots

Strategia di batching:
- Ticker processati in batch da BATCH_SIZE (default 50) per:
  a) Evitare rate limiting yfinance su lunghe sessioni
  b) Committare al DB ogni batch (fail-safe parziale)
  c) Log di progresso intermedio
- Sleep BATCH_SLEEP secondi tra batch (default 3s)

Schedulato ogni giorno alle 18:00 Europe/Rome
(30 min dopo il job ETF calendar alle 17:30).

Entry point: run_sp500_calendar_scan()
"""

from __future__ import annotations

import logging
import statistics
import time
from datetime import date, datetime, timezone
from typing import Optional

from app.services.sp500_calendar_calculator import (
    MIN_HISTORY_FOR_ZSCORE,
    classify_signal,
    fetch_sp500_calendar_data,
)

logger = logging.getLogger(__name__)

# Dimensione batch di ticker per sessione yfinance
BATCH_SIZE: int  = 50
BATCH_SLEEP: float = 3.0   # secondi di pausa tra batch


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_z_score(history: list[float], current: float) -> Optional[float]:
    """Calcola lo z-score del valore corrente rispetto alla storia."""
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
    """Legge gli ultimi N valori di un credit% dal DB sp500_calendar_snapshots."""
    from app import models
    from sqlalchemy import desc

    col_map = {
        "credit_30v60_pct": models.SP500CalendarSnapshot.credit_30v60_pct,
        "credit_30v90_pct": models.SP500CalendarSnapshot.credit_30v90_pct,
        "credit_60v90_pct": models.SP500CalendarSnapshot.credit_60v90_pct,
    }
    col = col_map.get(metric)
    if col is None:
        return []

    rows = (
        db.query(col)
        .filter(
            models.SP500CalendarSnapshot.ticker == ticker,
            col.isnot(None),
        )
        .order_by(desc(models.SP500CalendarSnapshot.snap_date))
        .limit(limit)
        .all()
    )
    return [float(r[0]) for r in rows if r[0] is not None]


def _get_sp500_tickers(db) -> list[str]:
    """Legge i ticker S&P 500 attivi da ticker_universe.

    Filtra: category='sp500', is_valid=True.
    Ordinati alfabeticamente per scan deterministico.
    """
    from app import models

    rows = (
        db.query(models.TickerUniverse.ticker)
        .filter(
            models.TickerUniverse.category == "sp500",
            models.TickerUniverse.is_valid == True,  # noqa: E712
        )
        .order_by(models.TickerUniverse.ticker)
        .all()
    )
    return [r[0] for r in rows]


def _upsert_snapshot(db, ticker: str, today: date, now: datetime, data: dict, z_30v60, z_30v90, z_60v90, signal: str, hist_days: int):
    """Inserisce o aggiorna lo snapshot giornaliero per un ticker."""
    from app import models

    existing = (
        db.query(models.SP500CalendarSnapshot)
        .filter_by(ticker=ticker, snap_date=today)
        .first()
    )
    if existing:
        snap = existing
    else:
        snap = models.SP500CalendarSnapshot(ticker=ticker, snap_date=today)
        db.add(snap)

    snap.spot_price       = data["spot"]
    snap.iv_30d           = data["iv_30d"]
    snap.iv_60d           = data["iv_60d"]
    snap.iv_90d           = data["iv_90d"]
    snap.credit_30v60_pct = data["credit_30v60_pct"]
    snap.credit_30v90_pct = data["credit_30v90_pct"]
    snap.credit_60v90_pct = data["credit_60v90_pct"]
    snap.z_score_30v60    = z_30v60
    snap.z_score_30v90    = z_30v90
    snap.z_score_60v90    = z_60v90
    snap.signal_30v60     = signal
    snap.history_days     = hist_days
    snap.computed_at      = now

    db.commit()


# ── Entry point ───────────────────────────────────────────────────────────────

def run_sp500_calendar_scan(tickers: Optional[list[str]] = None) -> dict:
    """Esegue lo scan giornaliero S&P 500 Calendar Monitor.

    Args:
        tickers: lista opzionale di ticker da processare.
                 Se None, usa tutti i ticker sp500 attivi da ticker_universe.

    Chiamato dal job APScheduler e dall'endpoint POST /api/sp500-calendar/refresh.

    Returns:
        dict con: success, skipped, error, total, batches, details.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import DATABASE_URL

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
        "total":     0,
        "batches":   0,
        "details":   [],
    }

    try:
        # Determina lista ticker
        if tickers is None:
            tickers = _get_sp500_tickers(db)

        results["total"] = len(tickers)
        logger.info(f"[SP500-CAL] Avvio scan — {today} — {len(tickers)} ticker")

        # Suddividi in batch
        batches = [tickers[i:i + BATCH_SIZE] for i in range(0, len(tickers), BATCH_SIZE)]
        results["batches"] = len(batches)

        for batch_num, batch in enumerate(batches, 1):
            logger.info(f"[SP500-CAL] Batch {batch_num}/{len(batches)} — {len(batch)} ticker")

            for ticker in batch:
                try:
                    # 1. Fetch dati option chain
                    data = fetch_sp500_calendar_data(ticker)

                    if data is None:
                        results["skipped"] += 1
                        results["details"].append({"ticker": ticker, "status": "skipped"})
                        continue

                    # 2. Storico per z-score
                    hist_30v60 = _get_credit_history(db, ticker, "credit_30v60_pct")
                    hist_30v90 = _get_credit_history(db, ticker, "credit_30v90_pct")
                    hist_60v90 = _get_credit_history(db, ticker, "credit_60v90_pct")

                    # 3. Z-score
                    z_30v60 = _compute_z_score(hist_30v60, data["credit_30v60_pct"]) if data["credit_30v60_pct"] is not None else None
                    z_30v90 = _compute_z_score(hist_30v90, data["credit_30v90_pct"]) if data["credit_30v90_pct"] is not None else None
                    z_60v90 = _compute_z_score(hist_60v90, data["credit_60v90_pct"]) if data["credit_60v90_pct"] is not None else None

                    # 4. Classificazione segnale
                    signal = classify_signal(z_30v60)

                    # 5. Upsert
                    _upsert_snapshot(
                        db, ticker, today, now, data,
                        z_30v60, z_30v90, z_60v90,
                        signal, len(hist_30v60),
                    )

                    results["success"] += 1
                    results["details"].append({
                        "ticker":           ticker,
                        "status":           "ok",
                        "spot":             data["spot"],
                        "credit_30v60_pct": data["credit_30v60_pct"],
                        "z_score_30v60":    z_30v60,
                        "signal":           signal,
                        "history_days":     len(hist_30v60),
                    })

                    logger.debug(
                        f"[SP500-CAL] {ticker}: spot={data['spot']} "
                        f"credit={data['credit_30v60_pct']}% z={z_30v60} "
                        f"signal={signal} hist={len(hist_30v60)}d"
                    )

                except Exception as exc:
                    logger.error(f"[SP500-CAL] {ticker}: errore — {exc}", exc_info=True)
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

            # Pausa tra batch (rate limiting yfinance)
            if batch_num < len(batches):
                logger.info(
                    f"[SP500-CAL] Batch {batch_num} completato "
                    f"(tot OK={results['success']} skip={results['skipped']} err={results['error']}) "
                    f"— pausa {BATCH_SLEEP}s"
                )
                time.sleep(BATCH_SLEEP)

    finally:
        db.close()

    logger.info(
        f"[SP500-CAL] Scan completato — "
        f"{results['success']}/{results['total']} OK, "
        f"{results['skipped']} skip, {results['error']} errori"
    )
    return results
