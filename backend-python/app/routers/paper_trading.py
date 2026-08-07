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
from app.services.put_credit_spread_scanner import (
    PORTFOLIO_NAME as CS_PORTFOLIO_NAME,
    INITIAL_EQUITY as CS_INITIAL_EQUITY,
    UNIVERSE as CS_UNIVERSE,
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


# ── Bull Put Credit Spread endpoints ──────────────────────────────────────────

CS_PORTFOLIO_NOT_FOUND = HTTPException(
    status_code=404,
    detail=f"Portfolio '{CS_PORTFOLIO_NAME}' non trovato per l'utente corrente.",
)


def _get_cs_portfolio(db: Session, user: models.User) -> models.Portfolio:
    """Restituisce il portfolio Bull Put Credit Spread per l'utente corrente."""
    portfolio = (
        db.query(models.Portfolio)
        .filter_by(user_id=user.id, name=CS_PORTFOLIO_NAME)
        .first()
    )
    if not portfolio:
        raise CS_PORTFOLIO_NOT_FOUND
    return portfolio


class CsPositionRow(BaseModel):
    """Posizione aperta di un credit spread."""
    trade_id: int
    ticker: str
    expiration: Optional[str]
    short_strike: Optional[float]
    long_strike: Optional[float]
    spread_width: Optional[float]
    net_credit: float          # entry_price (premio netto incassato)
    quantity: int
    max_profit: float          # net_credit * 100 * qty
    max_loss: float            # (spread_width - net_credit) * 100 * qty
    current_value: Optional[float]  # ultimo valore spread dal notes (o None)
    unrealized_pnl: Optional[float]
    delta_at_entry: Optional[float]
    iv_at_entry: Optional[float]
    status: str
    opened_at: Optional[str]

    class Config:
        from_attributes = True


class CsStatus(BaseModel):
    portfolio_id: int
    portfolio_name: str
    universe: List[str]
    initial_equity: float
    equity_simulated: float
    open_positions: int
    total_realized_pnl: float
    last_scan_date: Optional[str]
    last_scan_tickers_scanned: Optional[int]
    last_scan_trades_opened: Optional[int]
    last_scan_trades_closed: Optional[int]


@router.get("/cs/status", response_model=CsStatus)
def cs_get_status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Riepilogo del portfolio Bull Put Credit Spread."""
    portfolio = _get_cs_portfolio(db, user)

    closed_trades = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio.id,
            models.PortfolioTrade.status == "closed",
            models.PortfolioTrade.realized_pnl.isnot(None),
        )
        .all()
    )
    realized = sum(float(t.realized_pnl or 0) for t in closed_trades)
    equity = CS_INITIAL_EQUITY + realized

    open_count = (
        db.query(models.PortfolioTrade)
        .filter_by(portfolio_id=portfolio.id, status="open")
        .count()
    )

    last_diary = (
        db.query(models.PaperTradingDiary)
        .filter_by(portfolio_id=portfolio.id)
        .order_by(models.PaperTradingDiary.diary_date.desc())
        .first()
    )

    return CsStatus(
        portfolio_id=portfolio.id,
        portfolio_name=CS_PORTFOLIO_NAME,
        universe=CS_UNIVERSE,
        initial_equity=CS_INITIAL_EQUITY,
        equity_simulated=round(equity, 2),
        open_positions=open_count,
        total_realized_pnl=round(realized, 2),
        last_scan_date=last_diary.diary_date.isoformat() if last_diary else None,
        last_scan_tickers_scanned=last_diary.tickers_scanned if last_diary else None,
        last_scan_trades_opened=last_diary.trades_opened if last_diary else None,
        last_scan_trades_closed=(
            (last_diary.trades_closed_sl + last_diary.trades_closed_tp)
            if last_diary else None
        ),
    )


@router.get("/cs/positions", response_model=List[CsPositionRow])
def cs_get_positions(
    status_filter: str = "open",   # "open" | "closed" | "all"
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Posizioni credit spread (default: solo aperte). status_filter: open|closed|all."""
    portfolio = _get_cs_portfolio(db, user)

    q = db.query(models.PortfolioTrade).filter_by(
        portfolio_id=portfolio.id,
        direction="short",
    )
    if status_filter == "open":
        q = q.filter(models.PortfolioTrade.status == "open")
    elif status_filter == "closed":
        q = q.filter(models.PortfolioTrade.status == "closed")
    # "all" → nessun filtro aggiuntivo

    trades = q.order_by(models.PortfolioTrade.created_at.desc()).all()

    rows: list[CsPositionRow] = []
    for t in trades:
        import json as _json
        notes: dict = {}
        if t.notes:
            try:
                notes = _json.loads(t.notes)
            except Exception:
                pass

        entry = float(t.entry_price or 0)
        qty   = int(t.quantity or 1)
        width = float(notes.get("spread_width", 0))
        max_profit = round(entry * 100 * qty, 2)
        max_loss   = round((width - entry) * 100 * qty, 2) if width else 0.0

        current_val: Optional[float] = None
        unr_pnl:     Optional[float] = None
        if t.status == "open" and t.close_price is not None:
            current_val = float(t.close_price)
            unr_pnl = round((entry - current_val) * 100 * qty, 2)

        rows.append(CsPositionRow(
            trade_id=t.id,
            ticker=notes.get("ticker", ""),
            expiration=notes.get("expiration"),
            short_strike=notes.get("short_strike"),
            long_strike=notes.get("long_strike"),
            spread_width=width or None,
            net_credit=entry,
            quantity=qty,
            max_profit=max_profit,
            max_loss=max_loss,
            current_value=current_val,
            unrealized_pnl=unr_pnl,
            delta_at_entry=notes.get("delta"),
            iv_at_entry=notes.get("iv"),
            status=t.status,
            opened_at=t.created_at.isoformat() if t.created_at else None,
        ))

    return rows


@router.get("/cs/diary", response_model=List[DiaryListItem])
def cs_list_diary(
    limit: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Ultime N diary entry del credit spread portfolio."""
    portfolio = _get_cs_portfolio(db, user)
    entries = (
        db.query(models.PaperTradingDiary)
        .filter_by(portfolio_id=portfolio.id)
        .order_by(models.PaperTradingDiary.diary_date.desc())
        .limit(limit)
        .all()
    )
    return entries


@router.get("/cs/diary/{diary_date}", response_model=DiaryDetail)
def cs_get_diary(
    diary_date: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Diary di un giorno specifico per il credit spread portfolio (YYYY-MM-DD)."""
    try:
        target_date = date.fromisoformat(diary_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato data non valido. Usare YYYY-MM-DD.")

    portfolio = _get_cs_portfolio(db, user)
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


@router.post("/cs/run", include_in_schema=False)
def cs_trigger_scan(
    x_internal_key: Optional[str] = Header(None),
):
    """Trigger manuale del credit spread scan.

    Protetto da X-Internal-Key. Identico a /run ma per il portfolio CS.
    """
    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.put_credit_spread_scanner import run_credit_spread_scan
    result = run_credit_spread_scan()
    return result
