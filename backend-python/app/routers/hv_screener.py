"""
HV Screener Router — /api/hv-screener
Coiled Spring Terminal

GET /api/hv-screener
  Ritorna tutti i ticker con HV30, HV Rank, HV Percentile pre-computati.
  Supporta filtri server-side e ordinamento.

POST /api/hv-screener/refresh  (internal)
  Triggera un ricalcolo manuale (solo con x-internal-key).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.dependencies import get_current_user, get_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class HVRow(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    hv30: Optional[float] = None
    hv30_parkinson: Optional[float] = None   # Parkinson estimator (High/Low range)
    hv_rank: Optional[float] = None
    hv_percentile: Optional[float] = None
    hv_52w_high: Optional[float] = None
    hv_52w_low: Optional[float] = None
    computed_at: Optional[datetime] = None


class HVScreenerResponse(BaseModel):
    data: list[HVRow]
    total: int
    computed_at: Optional[datetime] = None  # timestamp più recente nel DB


# ── Helpers ───────────────────────────────────────────────────────────────────

_SORTABLE = {
    "ticker", "hv30", "hv_rank", "hv_percentile",
    "hv_52w_high", "hv_52w_low",
}


def _sniper_conditions_met(hv20, hv60, hv252, hv_rank) -> bool:
    """Controlla se le condizioni base del filtro sniper sono soddisfatte.

    Usato per calcolare compression_streak durante il refresh giornaliero.
    NON include il filtro durata (streak ≥ 5) — quello è applicato dallo scanner.
    """
    if any(v is None for v in [hv20, hv60, hv252, hv_rank]):
        return False
    triple = hv20 < hv60 < hv252
    rank_ok = hv_rank < 20
    depth_ok = hv20 <= hv252 * 0.65
    return triple and rank_ok and depth_ok


def _run_hv_refresh(db_url: str) -> None:
    """Eseguito in background — ricalcola e fa upsert di tutti i ticker.

    Calcola HV20/HV30/HV60/HV252, Parkinson, Rank, Percentile.
    Aggiorna compression_streak: +1 se condizioni sniper sono soddisfatte, 0 altrimenti.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.data.us_optionable_tickers import get_iv_snapshot_universe
    from app.services.hv_calculator import compute_hv_batch

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        tickers = get_iv_snapshot_universe()
        logger.info(f"[HV REFRESH] Computing {len(tickers)} tickers")
        results = compute_hv_batch(tickers)

        for row in results:
            ticker = row["ticker"]
            hv20  = row.get("hv20")
            hv30  = row.get("hv30")
            hv60  = row.get("hv60")
            hv252 = row.get("hv252")
            hv_rank = row.get("hv_rank")

            existing = db.query(models.HVSnapshot).filter_by(ticker=ticker).first()

            # Compression streak: conserva il valore precedente e incrementa o azzera
            prev_streak = existing.compression_streak if existing else 0
            conditions_ok = _sniper_conditions_met(hv20, hv60, hv252, hv_rank)
            new_streak = (prev_streak or 0) + 1 if conditions_ok else 0

            if existing:
                existing.hv20 = hv20
                existing.hv30 = hv30
                existing.hv60 = hv60
                existing.hv252 = hv252
                existing.hv30_parkinson = row.get("hv30_parkinson")
                existing.hv_rank = hv_rank
                existing.hv_percentile = row.get("hv_percentile")
                existing.hv_52w_high = row.get("hv_52w_high")
                existing.hv_52w_low = row.get("hv_52w_low")
                existing.compression_streak = new_streak
                existing.computed_at = row["computed_at"]
            else:
                db.add(models.HVSnapshot(
                    ticker=ticker,
                    hv20=hv20,
                    hv30=hv30,
                    hv60=hv60,
                    hv252=hv252,
                    hv30_parkinson=row.get("hv30_parkinson"),
                    hv_rank=hv_rank,
                    hv_percentile=row.get("hv_percentile"),
                    hv_52w_high=row.get("hv_52w_high"),
                    hv_52w_low=row.get("hv_52w_low"),
                    compression_streak=new_streak,
                    computed_at=row["computed_at"],
                ))

        db.commit()
        logger.info(f"[HV REFRESH] Upserted {len(results)} rows")
    except Exception as exc:
        logger.error(f"[HV REFRESH] Error: {exc}")
        db.rollback()
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=HVScreenerResponse)
def get_hv_screener(
    hv_rank_min: Optional[float] = Query(None, description="Filtro HV Rank minimo (0–100)"),
    hv_rank_max: Optional[float] = Query(None, description="Filtro HV Rank massimo (0–100)"),
    hv_pct_min: Optional[float] = Query(None, description="Filtro HV Percentile minimo (0–100)"),
    hv_pct_max: Optional[float] = Query(None, description="Filtro HV Percentile massimo (0–100)"),
    hv30_min: Optional[float] = Query(None, description="Filtro HV30 minimo (%)"),
    hv30_max: Optional[float] = Query(None, description="Filtro HV30 massimo (%)"),
    search: Optional[str] = Query(None, description="Ricerca per ticker (partial match)"),
    sort_by: str = Query("hv_rank", description="Colonna di ordinamento"),
    sort_dir: str = Query("desc", description="asc | desc"),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Restituisce tutti i ticker con metriche HV pre-computate.

    I dati vengono aggiornati una volta al giorno dal job APScheduler (16:30 UTC).
    Se la tabella è vuota (primo avvio), ritorna lista vuota — il job notturno
    la popolerà. È possibile triggare un refresh manuale via POST /refresh.
    """
    query = db.query(models.HVSnapshot)

    # Filtri server-side
    if hv_rank_min is not None:
        query = query.filter(models.HVSnapshot.hv_rank >= hv_rank_min)
    if hv_rank_max is not None:
        query = query.filter(models.HVSnapshot.hv_rank <= hv_rank_max)
    if hv_pct_min is not None:
        query = query.filter(models.HVSnapshot.hv_percentile >= hv_pct_min)
    if hv_pct_max is not None:
        query = query.filter(models.HVSnapshot.hv_percentile <= hv_pct_max)
    if hv30_min is not None:
        query = query.filter(models.HVSnapshot.hv30 >= hv30_min)
    if hv30_max is not None:
        query = query.filter(models.HVSnapshot.hv30 <= hv30_max)
    if search:
        query = query.filter(models.HVSnapshot.ticker.ilike(f"%{search.upper()}%"))

    total = query.count()

    # Ordinamento
    if sort_by not in _SORTABLE:
        sort_by = "hv_rank"
    sort_col = getattr(models.HVSnapshot, sort_by)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc().nullsfirst())
    else:
        query = query.order_by(sort_col.desc().nullslast())

    rows = query.all()

    # Timestamp più recente per mostrare all'utente "dati aggiornati al..."
    computed_at = max(
        (r.computed_at for r in rows if r.computed_at),
        default=None,
    )

    return HVScreenerResponse(
        data=[
            HVRow(
                ticker=r.ticker,
                company_name=r.company_name,
                hv30=r.hv30,
                hv30_parkinson=r.hv30_parkinson,
                hv_rank=r.hv_rank,
                hv_percentile=r.hv_percentile,
                hv_52w_high=r.hv_52w_high,
                hv_52w_low=r.hv_52w_low,
                computed_at=r.computed_at,
            )
            for r in rows
        ],
        total=total,
        computed_at=computed_at,
    )


@router.post("/refresh")
def trigger_hv_refresh(
    background_tasks: BackgroundTasks,
    x_internal_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Triggera il ricalcolo HV in background.

    Richiede header x-internal-key uguale a settings.cron_internal_key.
    Chiamato dal cron job APScheduler — non esposto al frontend.
    """
    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.database import DATABASE_URL
    background_tasks.add_task(_run_hv_refresh, DATABASE_URL)
    logger.info("[HV] Refresh triggered via POST /api/hv-screener/refresh")
    return {"ok": True, "message": "HV refresh started in background"}
