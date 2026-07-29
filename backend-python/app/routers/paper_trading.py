"""
Paper Trading Router — /api/paper-trading
Coiled Spring Terminal

Espone:
  GET  /api/paper-trading/diary          — lista diary entries (più recente prima)
  GET  /api/paper-trading/diary/{date}   — diary di un giorno specifico (YYYY-MM-DD)
  GET  /api/paper-trading/positions      — posizioni per-ticker (roll_count, pausa)
  GET  /api/paper-trading/status         — riepilogo rapido (equity, open, last scan)
  POST /api/paper-trading/run            — trigger manuale scan (solo internal key)
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.dependencies import get_current_user, get_db
from app.services.paper_trading_scanner import (
    PORTFOLIO_NAME,
    USER_EMAIL,
    INITIAL_EQUITY,
    MAX_LOSS_PER_POS,
)

router = APIRouter()

PORTFOLIO_NOT_FOUND = HTTPException(
    status_code=404,
    detail=f"Portfolio '{PORTFOLIO_NAME}' non trovato per l'utente corrente.",
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_pt_portfolio(db: Session, user: models.User) -> models.Portfolio:
    """Restituisce il portfolio HV Long PUT LEAPS per l'utente corrente.

    Accessibile solo dall'utente a cui appartiene.
    """
    portfolio = (
        db.query(models.Portfolio)
        .filter_by(user_id=user.id, name=PORTFOLIO_NAME)
        .first()
    )
    if not portfolio:
        raise PORTFOLIO_NOT_FOUND
    return portfolio


# ── Schemas ───────────────────────────────────────────────────────────────────

class DiaryListItem(BaseModel):
    id: int
    diary_date: date
    tickers_scanned: int
    tickers_eligible: int
    filter_level_used: int
    trades_opened: int
    trades_closed_sl: int
    trades_closed_tp: int
    trades_rolled: int

    class Config:
        from_attributes = True


class DiaryDetail(DiaryListItem):
    report_md: str
    scan_details: dict
    created_at: str

    class Config:
        from_attributes = True


class PositionRow(BaseModel):
    ticker: str
    trade_id: Optional[int]
    roll_count: int
    pause_until: Optional[date]
    is_open: bool
    is_paused: bool
    signal_details: dict

    class Config:
        from_attributes = True


class PortfolioStatus(BaseModel):
    portfolio_id: int
    portfolio_name: str
    equity_simulated: float
    open_positions: int
    drawdown_used: float
    drawdown_cap: float
    drawdown_pct: float
    last_scan_date: Optional[str]
    last_scan_eligible: Optional[int]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/diary", response_model=List[DiaryListItem])
def list_diary(
    limit: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Restituisce le ultime N diary entry, più recente prima."""
    portfolio = _get_pt_portfolio(db, user)
    entries = (
        db.query(models.PaperTradingDiary)
        .filter_by(portfolio_id=portfolio.id)
        .order_by(models.PaperTradingDiary.diary_date.desc())
        .limit(limit)
        .all()
    )
    return entries


@router.get("/diary/{diary_date}", response_model=DiaryDetail)
def get_diary(
    diary_date: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Restituisce il diary di un giorno specifico (formato YYYY-MM-DD)."""
    try:
        target_date = date.fromisoformat(diary_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato data non valido. Usare YYYY-MM-DD.")

    portfolio = _get_pt_portfolio(db, user)
    entry = (
        db.query(models.PaperTradingDiary)
        .filter_by(portfolio_id=portfolio.id, diary_date=target_date)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Nessun diary per il {diary_date}.")

    return DiaryDetail(
        id=entry.id,
        diary_date=entry.diary_date,
        tickers_scanned=entry.tickers_scanned,
        tickers_eligible=entry.tickers_eligible,
        filter_level_used=entry.filter_level_used,
        trades_opened=entry.trades_opened,
        trades_closed_sl=entry.trades_closed_sl,
        trades_closed_tp=entry.trades_closed_tp,
        trades_rolled=entry.trades_rolled,
        report_md=entry.report_md,
        scan_details=entry.scan_details,
        created_at=entry.created_at.isoformat(),
    )


@router.get("/positions", response_model=List[PositionRow])
def get_positions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Restituisce lo stato per-ticker del paper trading (roll count, pausa, ecc.)."""
    portfolio = _get_pt_portfolio(db, user)
    today = date.today()
    positions = (
        db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id)
        .all()
    )
    return [
        PositionRow(
            ticker=pos.ticker,
            trade_id=pos.trade_id,
            roll_count=pos.roll_count,
            pause_until=pos.pause_until,
            is_open=pos.trade_id is not None,
            is_paused=bool(pos.pause_until and pos.pause_until > today),
            signal_details=pos.signal_details or {},
        )
        for pos in positions
    ]


@router.get("/status", response_model=PortfolioStatus)
def get_status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Riepilogo rapido: equity simulata, posizioni aperte, drawdown."""
    portfolio = _get_pt_portfolio(db, user)

    # Equity simulata
    closed = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio.id,
            models.PortfolioTrade.status == "closed",
            models.PortfolioTrade.realized_pnl.isnot(None),
        )
        .all()
    )
    realized = sum(float(t.realized_pnl or 0) for t in closed)
    equity = INITIAL_EQUITY + realized

    open_count = (
        db.query(models.PortfolioTrade)
        .filter_by(portfolio_id=portfolio.id, status="open")
        .count()
    )

    drawdown_used = open_count * MAX_LOSS_PER_POS
    drawdown_cap  = equity * 0.20
    drawdown_pct  = (drawdown_used / drawdown_cap * 100) if drawdown_cap > 0 else 0.0

    # Ultimo scan
    last_diary = (
        db.query(models.PaperTradingDiary)
        .filter_by(portfolio_id=portfolio.id)
        .order_by(models.PaperTradingDiary.diary_date.desc())
        .first()
    )

    return PortfolioStatus(
        portfolio_id=portfolio.id,
        portfolio_name=PORTFOLIO_NAME,
        equity_simulated=round(equity, 2),
        open_positions=open_count,
        drawdown_used=round(drawdown_used, 2),
        drawdown_cap=round(drawdown_cap, 2),
        drawdown_pct=round(drawdown_pct, 1),
        last_scan_date=last_diary.diary_date.isoformat() if last_diary else None,
        last_scan_eligible=last_diary.tickers_eligible if last_diary else None,
    )


@router.post("/run", include_in_schema=False)
def trigger_scan(
    x_internal_key: Optional[str] = Header(None),
):
    """Trigger manuale del paper trading scan.

    Protetto da X-Internal-Key. Usato dall'APScheduler o per test.
    Eseguito in modo sincrono (non in background) per poter controllare il risultato.
    """
    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.paper_trading_scanner import run_paper_trading_scan
    result = run_paper_trading_scan()
    return result
