from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app import models
from app.services.market_data import get_options_prices_bulk

router = APIRouter()

DATA_SOURCE = "Yahoo Finance (ritardo 15 min)"

# ── Schemas ───────────────────────────────────────────────────────────────────

class PositionOut(BaseModel):
    item_id: int
    watchlist_id: int
    watchlist_name: str
    underlying: str
    option_type: str
    strike: float
    expiration: str
    dte: int
    quantity: int
    entry_premium: Optional[float]
    current_mid: Optional[float]
    current_bid: Optional[float]
    current_ask: Optional[float]
    current_iv: Optional[float]
    current_iv_rank: Optional[float]
    pnl_per_contract: Optional[float]
    pnl_total: Optional[float]
    pnl_pct: Optional[float]
    entry_delta: Optional[float]
    entry_iv: Optional[float]
    status: str
    notes: Optional[str]
    data_source: str
    last_updated: Optional[str]


class PortfolioSummary(BaseModel):
    total_positions: int
    total_cost_basis: float
    total_pnl: float
    total_pnl_pct: float
    winners: int
    losers: int
    avg_dte: float
    data_source: str
    last_updated: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_active_items(db: Session, user_id: int, status: Optional[str]):
    q = (
        db.query(models.WatchlistItem)
        .options(
            joinedload(models.WatchlistItem.option_contract),
            joinedload(models.WatchlistItem.watchlist),
        )
        .join(models.Watchlist)
        .filter(models.Watchlist.user_id == user_id)
    )
    if status:
        q = q.filter(models.WatchlistItem.status == status)
    return q.order_by(models.WatchlistItem.created_at.desc()).all()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/positions", response_model=List[PositionOut])
def list_positions(
    status: Optional[str] = "active",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    items = _load_active_items(db, current_user.id, status)
    if not items:
        return []

    today = date.today()

    # Fetch prezzi reali in parallelo per tutti i contratti
    symbol_keys = [item.option_contract.symbol_key for item in items]
    prices = get_options_prices_bulk(symbol_keys)

    positions: List[PositionOut] = []
    for item in items:
        contract = item.option_contract
        dte = (contract.expiration - today).days
        entry = float(item.entry_premium) if item.entry_premium is not None else None

        price_data = prices.get(contract.symbol_key)

        if price_data:
            current = price_data.mid
            current_bid = price_data.bid
            current_ask = price_data.ask
            current_iv = price_data.iv
            current_iv_rank = price_data.iv_rank
            last_updated = price_data.fetched_at
        else:
            current = None
            current_bid = None
            current_ask = None
            current_iv = None
            current_iv_rank = None
            last_updated = None

        pnl_per = round((current - entry) * 100, 2) if (entry and current) else None
        pnl_total = round(pnl_per * item.quantity, 2) if pnl_per is not None else None
        pnl_pct = round((current - entry) / entry * 100, 1) if (entry and current and entry > 0) else None

        positions.append(PositionOut(
            item_id=item.id,
            watchlist_id=item.watchlist_id,
            watchlist_name=item.watchlist.name,
            underlying=contract.underlying,
            option_type=contract.option_type,
            strike=float(contract.strike),
            expiration=contract.expiration.isoformat(),
            dte=dte,
            quantity=item.quantity,
            entry_premium=entry,
            current_mid=current,
            current_bid=current_bid,
            current_ask=current_ask,
            current_iv=current_iv,
            current_iv_rank=current_iv_rank,
            pnl_per_contract=pnl_per,
            pnl_total=pnl_total,
            pnl_pct=pnl_pct,
            entry_delta=float(item.entry_delta) if item.entry_delta is not None else None,
            entry_iv=float(item.entry_iv) if item.entry_iv is not None else None,
            status=item.status,
            notes=item.notes,
            data_source=DATA_SOURCE,
            last_updated=last_updated,
        ))

    return positions


@router.get("/summary", response_model=PortfolioSummary)
def portfolio_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    items = _load_active_items(db, current_user.id, "active")

    today = date.today()
    symbol_keys = [item.option_contract.symbol_key for item in items]
    prices = get_options_prices_bulk(symbol_keys) if symbol_keys else {}

    total_cost = 0.0
    total_pnl = 0.0
    winners = 0
    losers = 0
    dte_list: List[int] = []
    now_str = datetime.now(timezone.utc).isoformat()

    for item in items:
        contract = item.option_contract
        dte_list.append((contract.expiration - today).days)

        if item.entry_premium is None:
            continue

        entry = float(item.entry_premium)
        price_data = prices.get(contract.symbol_key)
        current = price_data.mid if price_data else None

        if current is None:
            continue

        cost = entry * 100 * item.quantity
        pnl = (current - entry) * 100 * item.quantity
        total_cost += cost
        total_pnl += pnl
        if pnl >= 0:
            winners += 1
        else:
            losers += 1

    total_pnl_pct = round(total_pnl / total_cost * 100, 1) if total_cost > 0 else 0.0
    avg_dte = round(sum(dte_list) / len(dte_list), 0) if dte_list else 0.0

    return PortfolioSummary(
        total_positions=len(items),
        total_cost_basis=round(total_cost, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=total_pnl_pct,
        winners=winners,
        losers=losers,
        avg_dte=avg_dte,
        data_source=DATA_SOURCE,
        last_updated=now_str,
    )
