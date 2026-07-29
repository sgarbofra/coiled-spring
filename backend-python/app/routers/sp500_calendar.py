"""
S&P 500 Calendar Router — /api/sp500-calendar
Coiled Spring Terminal

GET  /api/sp500-calendar/dashboard            — dashboard paginata (~503 titoli)
GET  /api/sp500-calendar/{ticker}/history     — storico 252gg per un singolo ticker
POST /api/sp500-calendar/refresh              — trigger manuale scan (solo internal key)

Differenze rispetto a /api/etf-calendar:
- Universo dinamico da ticker_universe (non lista statica)
- Dashboard paginata: page + page_size (default 50)
- Filtro per settore (sector) aggiunto come query param
- Placeholder rows NON incluse (500 ticker senza dati = rumore)
"""

from __future__ import annotations

import statistics as _stats
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.dependencies import get_current_user, get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SP500CalendarRow(BaseModel):
    ticker: str
    snap_date: Optional[date]
    spot_price: Optional[float]

    iv_30d: Optional[float]
    iv_60d: Optional[float]
    iv_90d: Optional[float]

    credit_30v60_pct: Optional[float]
    credit_30v90_pct: Optional[float]
    credit_60v90_pct: Optional[float]

    z_score_30v60: Optional[float]
    z_score_30v90: Optional[float]
    z_score_60v90: Optional[float]

    signal_30v60: Optional[str]
    history_days: Optional[int]
    computed_at:  Optional[str]

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    data: List[SP500CalendarRow]
    total: int          # righe in questa pagina
    total_tickers: int  # ticker con almeno uno snapshot
    page: int
    page_size: int
    pages: int


class HistoryPoint(BaseModel):
    snap_date: date
    spot_price: Optional[float]
    credit_30v60_pct: Optional[float]
    credit_30v90_pct: Optional[float]
    credit_60v90_pct: Optional[float]
    z_score_30v60: Optional[float]
    z_score_30v90: Optional[float]
    z_score_60v90: Optional[float]
    signal_30v60: Optional[str]

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    ticker: str
    points: List[HistoryPoint]
    avg_30v60: Optional[float]
    std_30v60: Optional[float]
    avg_30v90: Optional[float]
    avg_60v90: Optional[float]
    history_days: int


# ── Helpers ───────────────────────────────────────────────────────────────────

_SORTABLE = {"z_score_30v60", "credit_30v60_pct", "ticker", "history_days", "spot_price"}


def _snap_to_row(snap: models.SP500CalendarSnapshot) -> SP500CalendarRow:
    return SP500CalendarRow(
        ticker=snap.ticker,
        snap_date=snap.snap_date,
        spot_price=snap.spot_price,
        iv_30d=snap.iv_30d,
        iv_60d=snap.iv_60d,
        iv_90d=snap.iv_90d,
        credit_30v60_pct=snap.credit_30v60_pct,
        credit_30v90_pct=snap.credit_30v90_pct,
        credit_60v90_pct=snap.credit_60v90_pct,
        z_score_30v60=snap.z_score_30v60,
        z_score_30v90=snap.z_score_30v90,
        z_score_60v90=snap.z_score_60v90,
        signal_30v60=snap.signal_30v60,
        history_days=snap.history_days,
        computed_at=snap.computed_at.isoformat() if snap.computed_at else None,
    )


def _get_latest_snaps(
    db: Session,
    signal_filter: Optional[str],
    search: Optional[str],
    sort_by: str,
    sort_dir: str,
    page: int,
    page_size: int,
) -> tuple[list[models.SP500CalendarSnapshot], int]:
    """Recupera gli snapshot più recenti per ogni ticker con filtri e paginazione.

    Usa una subquery per trovare il max(snap_date) per ticker,
    poi join per ottenere la riga completa.
    """
    # Subquery: snap_date più recente per ticker
    latest_dates = (
        db.query(
            models.SP500CalendarSnapshot.ticker,
            func.max(models.SP500CalendarSnapshot.snap_date).label("max_date"),
        )
        .group_by(models.SP500CalendarSnapshot.ticker)
        .subquery()
    )

    # Join per recuperare la riga completa con i dati
    q = (
        db.query(models.SP500CalendarSnapshot)
        .join(
            latest_dates,
            (models.SP500CalendarSnapshot.ticker == latest_dates.c.ticker) &
            (models.SP500CalendarSnapshot.snap_date == latest_dates.c.max_date),
        )
    )

    # Filtro segnale
    if signal_filter:
        q = q.filter(models.SP500CalendarSnapshot.signal_30v60 == signal_filter)

    # Filtro ricerca testuale sul ticker
    if search:
        q = q.filter(models.SP500CalendarSnapshot.ticker.ilike(f"%{search.upper()}%"))

    # Conta totale prima della paginazione
    total_tickers = q.count()

    # Ordinamento
    sort_col_map = {
        "z_score_30v60":    models.SP500CalendarSnapshot.z_score_30v60,
        "credit_30v60_pct": models.SP500CalendarSnapshot.credit_30v60_pct,
        "ticker":           models.SP500CalendarSnapshot.ticker,
        "history_days":     models.SP500CalendarSnapshot.history_days,
        "spot_price":       models.SP500CalendarSnapshot.spot_price,
    }
    col = sort_col_map.get(sort_by, models.SP500CalendarSnapshot.z_score_30v60)

    if sort_dir == "asc":
        q = q.order_by(col.asc().nulls_last())
    else:
        q = q.order_by(col.desc().nulls_last())

    # Paginazione
    offset = (page - 1) * page_size
    snaps = q.offset(offset).limit(page_size).all()

    return snaps, total_tickers


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    sort_by: str = Query(
        "z_score_30v60",
        description="z_score_30v60 | credit_30v60_pct | ticker | history_days | spot_price",
    ),
    sort_dir: str = Query("desc", description="asc | desc"),
    signal_filter: Optional[str] = Query(
        None,
        description="RICH | WATCH | FAIR | CHEAP | INSUFFICIENT_DATA",
    ),
    search: Optional[str] = Query(
        None,
        description="Filtra per ticker (ricerca parziale, case-insensitive)",
    ),
    page: int = Query(1, ge=1, description="Numero di pagina (1-based)"),
    page_size: int = Query(50, ge=10, le=200, description="Righe per pagina (10-200)"),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Dashboard S&P 500 Calendar Monitor — paginata.

    Restituisce l'ultimo snapshot disponibile per ciascun ticker scansionato.
    Solo ticker con almeno uno snapshot sono inclusi (no placeholder).
    """
    if sort_by not in _SORTABLE:
        sort_by = "z_score_30v60"

    snaps, total_tickers = _get_latest_snaps(
        db, signal_filter, search, sort_by, sort_dir, page, page_size
    )

    rows = [_snap_to_row(s) for s in snaps]
    import math
    pages = max(1, math.ceil(total_tickers / page_size))

    return DashboardResponse(
        data=rows,
        total=len(rows),
        total_tickers=total_tickers,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{ticker}/history", response_model=HistoryResponse)
def get_ticker_history(
    ticker: str,
    limit: int = Query(252, ge=10, le=504),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Storico giornaliero per un singolo ticker S&P 500."""
    ticker = ticker.upper()

    snaps = (
        db.query(models.SP500CalendarSnapshot)
        .filter_by(ticker=ticker)
        .order_by(models.SP500CalendarSnapshot.snap_date.desc())
        .limit(limit)
        .all()
    )

    if not snaps:
        raise HTTPException(
            status_code=404,
            detail=f"Nessun dato per '{ticker}'. Il ticker potrebbe non essere ancora stato scansionato.",
        )

    def _avg(values: list[float]) -> Optional[float]:
        return round(sum(values) / len(values), 4) if values else None

    def _std(values: list[float]) -> Optional[float]:
        return round(_stats.stdev(values), 4) if len(values) >= 2 else None

    c30v60 = [s.credit_30v60_pct for s in snaps if s.credit_30v60_pct is not None]
    c30v90 = [s.credit_30v90_pct for s in snaps if s.credit_30v90_pct is not None]
    c60v90 = [s.credit_60v90_pct for s in snaps if s.credit_60v90_pct is not None]

    points = [
        HistoryPoint(
            snap_date=s.snap_date,
            spot_price=s.spot_price,
            credit_30v60_pct=s.credit_30v60_pct,
            credit_30v90_pct=s.credit_30v90_pct,
            credit_60v90_pct=s.credit_60v90_pct,
            z_score_30v60=s.z_score_30v60,
            z_score_30v90=s.z_score_30v90,
            z_score_60v90=s.z_score_60v90,
            signal_30v60=s.signal_30v60,
        )
        for s in reversed(snaps)
    ]

    return HistoryResponse(
        ticker=ticker,
        points=points,
        avg_30v60=_avg(c30v60),
        std_30v60=_std(c30v60),
        avg_30v90=_avg(c30v90),
        avg_60v90=_avg(c60v90),
        history_days=len(snaps),
    )


@router.post("/refresh", include_in_schema=False)
def trigger_refresh(
    x_internal_key: Optional[str] = Header(None),
    tickers: Optional[List[str]] = None,
):
    """Trigger manuale del scan S&P 500 Calendar.

    Protetto da x-internal-key.
    tickers: lista opzionale per scan parziale (debug/test).
    """
    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.sp500_calendar_scanner import run_sp500_calendar_scan
    return run_sp500_calendar_scan(tickers=tickers)
