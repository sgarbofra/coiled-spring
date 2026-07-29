"""
ETF Calendar Router — /api/etf-calendar
Coiled Spring Terminal

GET  /api/etf-calendar/dashboard            — dashboard (tutti gli ETF, snapshot corrente)
GET  /api/etf-calendar/{ticker}/history     — storico 252gg per grafici drill-down
POST /api/etf-calendar/refresh              — trigger manuale scan (solo internal key)

Segnali restituiti:
  RICH              → z-score > +1.5  → spread storicamente caro (sell calendar)
  WATCH             → z-score +0.5/+1.5
  FAIR              → z-score -0.5/+0.5 → nessun edge statistico
  CHEAP             → z-score < -1.5  → spread storicamente economico (buy calendar)
  INSUFFICIENT_DATA → storia < 20 osservazioni
  NO_DATA           → ticker non ancora scansionato
"""

from __future__ import annotations

import statistics as _stats
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.dependencies import get_current_user, get_db
from app.services.etf_calendar_calculator import ETF_UNIVERSE

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ETFCalendarRow(BaseModel):
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

    signal_30v60: Optional[str]    # RICH | WATCH | FAIR | CHEAP | INSUFFICIENT_DATA | NO_DATA
    history_days: Optional[int]
    computed_at:  Optional[str]

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    data: List[ETFCalendarRow]
    total: int
    etf_universe: List[str]


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
    points: List[HistoryPoint]          # ordinati cronologicamente (più vecchio prima)
    avg_30v60: Optional[float]          # media 52w del credit_30v60_pct (linea punteggiata)
    std_30v60: Optional[float]          # deviazione standard (banda di dispersione)
    avg_30v90: Optional[float]
    avg_60v90: Optional[float]
    history_days: int


# ── Helpers ───────────────────────────────────────────────────────────────────

_SORTABLE = {"z_score_30v60", "z_score_30v90", "credit_30v60_pct", "ticker", "history_days"}


def _latest_snap(db: Session, ticker: str) -> Optional[models.ETFCalendarSnapshot]:
    return (
        db.query(models.ETFCalendarSnapshot)
        .filter_by(ticker=ticker)
        .order_by(models.ETFCalendarSnapshot.snap_date.desc())
        .first()
    )


def _snap_to_row(snap: models.ETFCalendarSnapshot) -> ETFCalendarRow:
    return ETFCalendarRow(
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


def _placeholder_row(ticker: str) -> ETFCalendarRow:
    """Riga vuota per ETF non ancora scansionati."""
    return ETFCalendarRow(
        ticker=ticker,
        snap_date=None,
        spot_price=None,
        iv_30d=None, iv_60d=None, iv_90d=None,
        credit_30v60_pct=None, credit_30v90_pct=None, credit_60v90_pct=None,
        z_score_30v60=None, z_score_30v90=None, z_score_60v90=None,
        signal_30v60="NO_DATA",
        history_days=0,
        computed_at=None,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    sort_by: str = Query(
        "z_score_30v60",
        description="Campo di ordinamento: z_score_30v60 | credit_30v60_pct | ticker | history_days",
    ),
    sort_dir: str = Query("desc", description="asc | desc"),
    signal_filter: Optional[str] = Query(
        None,
        description="Filtra per segnale: RICH | WATCH | FAIR | CHEAP",
    ),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Dashboard ETF Calendar Monitor.

    Restituisce l'ultimo snapshot disponibile per ciascuno dei 15 ETF dell'universo.
    Default: ordinamento per z-score 30v60 decrescente (spread più caro storicamente prima).

    Se signal_filter è impostato, gli ETF senza quel segnale vengono esclusi
    (inclusi quelli senza dati: NO_DATA / INSUFFICIENT_DATA).
    """
    if sort_by not in _SORTABLE:
        sort_by = "z_score_30v60"

    rows: list[ETFCalendarRow] = []
    for ticker in ETF_UNIVERSE:
        snap = _latest_snap(db, ticker)

        if snap is None:
            if signal_filter:
                continue  # placeholder non corrisponde a nessun segnale reale
            rows.append(_placeholder_row(ticker))
        else:
            if signal_filter and snap.signal_30v60 != signal_filter:
                continue
            rows.append(_snap_to_row(snap))

    # Ordinamento in Python — lista piccola (max 15 ETF), nessun impatto performance
    reverse = sort_dir != "asc"
    rows.sort(
        key=lambda r: (getattr(r, sort_by) is None, getattr(r, sort_by) or 0),
        reverse=reverse,
    )

    return DashboardResponse(data=rows, total=len(rows), etf_universe=ETF_UNIVERSE)


@router.get("/{ticker}/history", response_model=HistoryResponse)
def get_ticker_history(
    ticker: str,
    limit: int = Query(252, ge=10, le=504, description="Numero di giorni storici (max 504 = 2 anni)"),
    db: Session = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    """Storico giornaliero per un singolo ETF — per i grafici di drill-down.

    I dati vengono restituiti in ordine cronologico (più vecchio prima)
    per essere compatibili direttamente con chart.js / recharts.

    avg_30v60: media della serie storica (linea punteggiata nel grafico).
    std_30v60: deviazione standard (banda di dispersione).
    """
    ticker = ticker.upper()
    if ticker not in ETF_UNIVERSE:
        raise HTTPException(
            status_code=404,
            detail=f"'{ticker}' non è nell'universo ETF Calendar Monitor. "
                   f"ETF disponibili: {', '.join(ETF_UNIVERSE)}",
        )

    snaps = (
        db.query(models.ETFCalendarSnapshot)
        .filter_by(ticker=ticker)
        .order_by(models.ETFCalendarSnapshot.snap_date.desc())
        .limit(limit)
        .all()
    )

    # Statistiche per linee di riferimento nel grafico
    def _avg(values: list[float]) -> Optional[float]:
        return round(sum(values) / len(values), 4) if values else None

    def _std(values: list[float]) -> Optional[float]:
        return round(_stats.stdev(values), 4) if len(values) >= 2 else None

    c30v60 = [s.credit_30v60_pct for s in snaps if s.credit_30v60_pct is not None]
    c30v90 = [s.credit_30v90_pct for s in snaps if s.credit_30v90_pct is not None]
    c60v90 = [s.credit_60v90_pct for s in snaps if s.credit_60v90_pct is not None]

    # Inverti per ordine cronologico (più vecchio prima)
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
):
    """Trigger manuale del scan ETF Calendar.

    Protetto da x-internal-key. Chiamato dall'APScheduler o per test manuali.
    Eseguito in modo sincrono — ritorna il riepilogo completo del run.
    """
    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.etf_calendar_scanner import run_etf_calendar_scan
    return run_etf_calendar_scan()
