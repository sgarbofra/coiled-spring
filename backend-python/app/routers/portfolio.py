"""
Portfolio router.

Logica chiusura:
  - Direzione INVERSA rispetto alla posizione aperta -> chiusura automatica
  - PNL = (close_price - entry_price) * 100 * qty * sign  (long=+1, short=-1)

Quantita parziale:
  - qty_inv == qty_open  -> chiusura totale
  - qty_inv <  qty_open  -> chiusura parziale (riduce qty aperta)
  - qty_inv >  qty_open  -> chiude tutto + apre posizione inversa per il residuo
"""

from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app import models
from app.services.market_data import get_options_prices_bulk
from app import schemas

MAX_PORTFOLIOS = 3
MULTIPLIER = 100

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class PortfolioUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class PortfolioOut(BaseModel):
    id: int
    name: str
    open_positions: int
    created_at: datetime
    model_config = {"from_attributes": True}


class TradeIn(BaseModel):
    option_contract: schemas.OptionContractCreate
    direction: str = Field(..., pattern="^(long|short)$")
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)
    notes: Optional[str] = None


class TradeOut(BaseModel):
    id: int
    portfolio_id: int
    underlying: str
    option_type: str
    strike: float
    expiration: str
    direction: str
    quantity: int
    entry_price: float
    status: str
    close_price: Optional[float]
    realized_pnl: Optional[float]
    closed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class OpenPositionOut(BaseModel):
    trade_id: int
    underlying: str
    option_type: str
    strike: float
    expiration: str
    dte: int
    direction: str
    quantity: int
    entry_price: float
    current_mid: Optional[float]
    current_bid: Optional[float]
    current_ask: Optional[float]
    current_last: Optional[float]
    current_iv: Optional[float]
    pnl_price: Optional[float]
    price_source: str                # "mid"|"bid"|"ask"|"last"|"bs_theoretical"
    unrealized_pnl: Optional[float]
    unrealized_pnl_pct: Optional[float]
    notes: Optional[str]
    last_refreshed: Optional[str]
    data_source: str


class UnderlyingGreeks(BaseModel):
    underlying: str
    net_delta: float
    net_gamma: float
    net_vega: float
    net_theta: float
    positions_count: int


class TradeActionResult(BaseModel):
    action: str
    trade_id: int
    realized_pnl: Optional[float] = None
    message: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_portfolio_or_404(db: Session, portfolio_id: int, user_id: int) -> models.Portfolio:
    p = (
        db.query(models.Portfolio)
        .filter(models.Portfolio.id == portfolio_id, models.Portfolio.user_id == user_id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio non trovato")
    return p


def _get_or_create_contract(db: Session, data: schemas.OptionContractCreate) -> models.OptionContract:
    contract = (
        db.query(models.OptionContract)
        .filter(models.OptionContract.symbol_key == data.symbol_key)
        .first()
    )
    if not contract:
        contract = models.OptionContract(**data.model_dump())
        db.add(contract)
        db.flush()
    return contract


def _pnl_sign(direction: str) -> int:
    return 1 if direction == "long" else -1


def _calc_realized_pnl(entry: Decimal, close: float, qty: int, direction: str) -> float:
    return round((close - float(entry)) * MULTIPLIER * qty * _pnl_sign(direction), 2)


def _build_trade_out(trade: models.PortfolioTrade) -> TradeOut:
    c = trade.option_contract
    return TradeOut(
        id=trade.id,
        portfolio_id=trade.portfolio_id,
        underlying=c.underlying,
        option_type=c.option_type,
        strike=float(c.strike),
        expiration=c.expiration.isoformat(),
        direction=trade.direction,
        quantity=trade.quantity,
        entry_price=float(trade.entry_price),
        status=trade.status,
        close_price=float(trade.close_price) if trade.close_price is not None else None,
        realized_pnl=float(trade.realized_pnl) if trade.realized_pnl is not None else None,
        closed_at=trade.closed_at,
        notes=trade.notes,
        created_at=trade.created_at,
    )


# ── Portfolio CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=List[PortfolioOut])
def list_portfolios(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    portfolios = (
        db.query(models.Portfolio)
        .filter(models.Portfolio.user_id == current_user.id)
        .order_by(models.Portfolio.created_at.asc())
        .all()
    )
    result = []
    for p in portfolios:
        open_count = (
            db.query(models.PortfolioTrade)
            .filter(
                models.PortfolioTrade.portfolio_id == p.id,
                models.PortfolioTrade.status == "open",
            )
            .count()
        )
        result.append(PortfolioOut(
            id=p.id,
            name=p.name,
            open_positions=open_count,
            created_at=p.created_at,
        ))
    return result


@router.post("", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED)
def create_portfolio(
    body: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing_count = (
        db.query(models.Portfolio)
        .filter(models.Portfolio.user_id == current_user.id)
        .count()
    )
    if existing_count >= MAX_PORTFOLIOS:
        raise HTTPException(
            status_code=409,
            detail=f"Limite massimo di {MAX_PORTFOLIOS} portafogli raggiunto",
        )
    if (
        db.query(models.Portfolio)
        .filter(
            models.Portfolio.user_id == current_user.id,
            models.Portfolio.name == body.name,
        )
        .first()
    ):
        raise HTTPException(status_code=409, detail="Esiste gia un portafoglio con questo nome")

    p = models.Portfolio(user_id=current_user.id, name=body.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return PortfolioOut(id=p.id, name=p.name, open_positions=0, created_at=p.created_at)


@router.patch("/{portfolio_id}", response_model=PortfolioOut)
def rename_portfolio(
    portfolio_id: int,
    body: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = _get_portfolio_or_404(db, portfolio_id, current_user.id)
    conflict = (
        db.query(models.Portfolio)
        .filter(
            models.Portfolio.user_id == current_user.id,
            models.Portfolio.name == body.name,
            models.Portfolio.id != portfolio_id,
        )
        .first()
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Esiste gia un portafoglio con questo nome")

    p.name = body.name
    db.commit()
    db.refresh(p)

    open_count = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == p.id,
            models.PortfolioTrade.status == "open",
        )
        .count()
    )
    return PortfolioOut(id=p.id, name=p.name, open_positions=open_count, created_at=p.created_at)


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = _get_portfolio_or_404(db, portfolio_id, current_user.id)
    db.delete(p)
    db.commit()


# ── Trade: apri / chiudi posizione ───────────────────────────────────────────

@router.post("/{portfolio_id}/trades", response_model=TradeActionResult, status_code=status.HTTP_201_CREATED)
def add_trade(
    portfolio_id: int,
    body: TradeIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Inserisce un trade nel portafoglio.
    - Nessuna posizione aperta sullo stesso contratto  -> apre nuova posizione
    - Posizione aperta STESSA direzione                -> 409
    - Posizione aperta DIREZIONE OPPOSTA               -> chiude (totale / parziale / chiudi+riapri)
    """
    _get_portfolio_or_404(db, portfolio_id, current_user.id)
    contract = _get_or_create_contract(db, body.option_contract)

    open_trade: Optional[models.PortfolioTrade] = (
        db.query(models.PortfolioTrade)
        .options(joinedload(models.PortfolioTrade.option_contract))
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.option_contract_id == contract.id,
            models.PortfolioTrade.status == "open",
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    # Caso 1: nessuna posizione aperta -> apri
    if open_trade is None:
        new_trade = models.PortfolioTrade(
            portfolio_id=portfolio_id,
            option_contract_id=contract.id,
            direction=body.direction,
            quantity=body.quantity,
            entry_price=Decimal(str(body.price)),
            status="open",
            notes=body.notes,
        )
        db.add(new_trade)
        db.commit()
        db.refresh(new_trade)
        return TradeActionResult(
            action="opened",
            trade_id=new_trade.id,
            message=f"Posizione {body.direction} aperta: {body.quantity} contratti a {body.price}",
        )

    # Caso 2: stessa direzione -> errore
    if open_trade.direction == body.direction:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Hai gia una posizione {open_trade.direction} aperta su questo contratto "
                f"(trade #{open_trade.id}, qty {open_trade.quantity}). "
                "Chiudi la posizione esistente prima di aprirne un'altra nella stessa direzione."
            ),
        )

    # Caso 3: direzione opposta -> chiudi
    open_qty = open_trade.quantity
    close_qty = body.quantity

    if close_qty == open_qty:
        # Chiusura totale
        pnl = _calc_realized_pnl(open_trade.entry_price, body.price, close_qty, open_trade.direction)
        open_trade.status = "closed"
        open_trade.close_price = Decimal(str(body.price))
        open_trade.realized_pnl = Decimal(str(pnl))
        open_trade.closed_at = now
        db.commit()
        return TradeActionResult(
            action="closed",
            trade_id=open_trade.id,
            realized_pnl=pnl,
            message=f"Posizione chiusa interamente. PNL realizzato: ${pnl:+.2f}",
        )

    elif close_qty < open_qty:
        # Chiusura parziale
        pnl = _calc_realized_pnl(open_trade.entry_price, body.price, close_qty, open_trade.direction)
        closed_partial = models.PortfolioTrade(
            portfolio_id=portfolio_id,
            option_contract_id=contract.id,
            direction=open_trade.direction,
            quantity=close_qty,
            entry_price=open_trade.entry_price,
            status="closed",
            close_price=Decimal(str(body.price)),
            realized_pnl=Decimal(str(pnl)),
            closed_at=now,
            notes=f"Chiusura parziale da trade #{open_trade.id}",
        )
        db.add(closed_partial)
        open_trade.quantity = open_qty - close_qty
        db.commit()
        db.refresh(closed_partial)
        return TradeActionResult(
            action="partially_closed",
            trade_id=closed_partial.id,
            realized_pnl=pnl,
            message=(
                f"Chiusura parziale: {close_qty}/{open_qty} contratti. "
                f"PNL realizzato: ${pnl:+.2f}. "
                f"Rimangono {open_qty - close_qty} contratti aperti (trade #{open_trade.id})."
            ),
        )

    else:
        # close_qty > open_qty: chiude tutto + apre inversa per il residuo
        residual_qty = close_qty - open_qty
        pnl = _calc_realized_pnl(open_trade.entry_price, body.price, open_qty, open_trade.direction)

        open_trade.status = "closed"
        open_trade.close_price = Decimal(str(body.price))
        open_trade.realized_pnl = Decimal(str(pnl))
        open_trade.closed_at = now

        new_trade = models.PortfolioTrade(
            portfolio_id=portfolio_id,
            option_contract_id=contract.id,
            direction=body.direction,
            quantity=residual_qty,
            entry_price=Decimal(str(body.price)),
            status="open",
            notes=body.notes,
        )
        db.add(new_trade)
        db.commit()
        db.refresh(new_trade)
        return TradeActionResult(
            action="closed_and_reopened",
            trade_id=new_trade.id,
            realized_pnl=pnl,
            message=(
                f"Posizione {open_trade.direction} chiusa ({open_qty} contratti, PNL: ${pnl:+.2f}). "
                f"Aperta nuova posizione {body.direction} per {residual_qty} contratti a {body.price}."
            ),
        )


# ── Posizioni aperte con PNL live ─────────────────────────────────────────────

@router.get("/{portfolio_id}/positions", response_model=List[OpenPositionOut])
def list_open_positions(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_portfolio_or_404(db, portfolio_id, current_user.id)

    trades = (
        db.query(models.PortfolioTrade)
        .options(joinedload(models.PortfolioTrade.option_contract))
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.status == "open",
        )
        .order_by(models.PortfolioTrade.created_at.desc())
        .all()
    )

    if not trades:
        return []

    today = date.today()
    symbol_keys = [t.option_contract.symbol_key for t in trades]
    prices = get_options_prices_bulk(symbol_keys)

    result: List[OpenPositionOut] = []
    for trade in trades:
        c = trade.option_contract
        dte = (c.expiration - today).days
        price_data = prices.get(c.symbol_key)
        entry = float(trade.entry_price)
        sign = _pnl_sign(trade.direction)

        current_mid = current_bid = current_ask = current_last = current_iv = None
        unrealized_pnl = unrealized_pnl_pct = pnl_price = None
        last_refreshed = None

        if price_data:
            current_mid  = price_data.mid if price_data.mid > 0 else None
            current_bid  = price_data.bid if price_data.bid > 0 else None
            current_ask  = price_data.ask if price_data.ask > 0 else None
            current_last = price_data.last_price if price_data.last_price > 0 else None
            current_iv   = price_data.iv
            last_refreshed = price_data.fetched_at

            # Priorità prezzo per PNL:
            # 1. mid = (bid+ask)/2 se bid > 0 E ask > 0  → quotazione corrente, aggiornata dai MM
            # 2. last                                     → solo se bid=ask=0 (già gestito in current_mid)
            # NOTA: current_mid già incorpora il fallback su lastPrice quando bid=ask=0
            # Non usare last come priorità: per LEAPS può essere di 1-3 giorni fa
            pnl_price = current_mid

            if pnl_price is not None and entry > 0:
                unrealized_pnl = round(
                    (pnl_price - entry) * MULTIPLIER * trade.quantity * sign, 2
                )
                unrealized_pnl_pct = round((pnl_price - entry) / entry * 100 * sign, 2)

        result.append(OpenPositionOut(
            trade_id=trade.id,
            underlying=c.underlying,
            option_type=c.option_type,
            strike=float(c.strike),
            expiration=c.expiration.isoformat(),
            dte=dte,
            direction=trade.direction,
            quantity=trade.quantity,
            entry_price=entry,
            current_mid=current_mid,
            current_bid=current_bid,
            current_ask=current_ask,
            current_last=current_last,
            pnl_price=pnl_price,
            price_source=price_data.price_source if price_data else "none",
            current_iv=current_iv,
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_pct=unrealized_pnl_pct,
            notes=trade.notes,
            last_refreshed=last_refreshed,
            data_source="Yahoo Finance (ritardo 15 min)",
        ))

    return result


# ── Esposizione greche per sottostante ────────────────────────────────────────

@router.get("/{portfolio_id}/greeks", response_model=List[UnderlyingGreeks])
def portfolio_greeks(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Somma netta delta/gamma/vega/theta per ogni sottostante. Usa prezzi live."""
    _get_portfolio_or_404(db, portfolio_id, current_user.id)

    trades = (
        db.query(models.PortfolioTrade)
        .options(joinedload(models.PortfolioTrade.option_contract))
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.status == "open",
        )
        .all()
    )

    if not trades:
        return []

    symbol_keys = [t.option_contract.symbol_key for t in trades]
    prices = get_options_prices_bulk(symbol_keys)

    greeks_map: dict = {}
    for trade in trades:
        c = trade.option_contract
        under = c.underlying
        price_data = prices.get(c.symbol_key)
        sign = _pnl_sign(trade.direction)
        qty = trade.quantity

        if under not in greeks_map:
            greeks_map[under] = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0, "count": 0}

        greeks_map[under]["count"] += 1

        if price_data:
            greeks_map[under]["delta"] += (price_data.delta or 0.0) * qty * sign
            greeks_map[under]["gamma"] += (price_data.gamma or 0.0) * qty * sign
            greeks_map[under]["vega"] += (price_data.vega or 0.0) * qty * sign
            greeks_map[under]["theta"] += (price_data.theta or 0.0) * qty * sign

    return [
        UnderlyingGreeks(
            underlying=under,
            net_delta=round(v["delta"], 4),
            net_gamma=round(v["gamma"], 6),
            net_vega=round(v["vega"], 4),
            net_theta=round(v["theta"], 4),
            positions_count=v["count"],
        )
        for under, v in sorted(greeks_map.items())
    ]


# ── Storico trade ─────────────────────────────────────────────────────────────

@router.get("/{portfolio_id}/history", response_model=List[TradeOut])
def portfolio_history(
    portfolio_id: int,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_portfolio_or_404(db, portfolio_id, current_user.id)

    q = (
        db.query(models.PortfolioTrade)
        .options(joinedload(models.PortfolioTrade.option_contract))
        .filter(models.PortfolioTrade.portfolio_id == portfolio_id)
    )
    if status_filter in ("open", "closed"):
        q = q.filter(models.PortfolioTrade.status == status_filter)

    trades = q.order_by(models.PortfolioTrade.created_at.desc()).all()
    return [_build_trade_out(t) for t in trades]


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/{portfolio_id}/summary")
def portfolio_summary(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_portfolio_or_404(db, portfolio_id, current_user.id)

    all_trades = (
        db.query(models.PortfolioTrade)
        .options(joinedload(models.PortfolioTrade.option_contract))
        .filter(models.PortfolioTrade.portfolio_id == portfolio_id)
        .all()
    )

    open_trades = [t for t in all_trades if t.status == "open"]
    closed_trades = [t for t in all_trades if t.status == "closed"]

    realized_pnl = sum(
        float(t.realized_pnl) for t in closed_trades if t.realized_pnl is not None
    )
    winners = sum(1 for t in closed_trades if t.realized_pnl is not None and float(t.realized_pnl) > 0)
    losers = sum(1 for t in closed_trades if t.realized_pnl is not None and float(t.realized_pnl) < 0)

    unrealized_pnl = 0.0
    if open_trades:
        symbol_keys = [t.option_contract.symbol_key for t in open_trades]
        prices = get_options_prices_bulk(symbol_keys)
        for trade in open_trades:
            price_data = prices.get(trade.option_contract.symbol_key)
            if price_data and price_data.mid is not None:
                entry = float(trade.entry_price)
                unrealized_pnl += (
                    (price_data.mid - entry) * MULTIPLIER * trade.quantity * _pnl_sign(trade.direction)
                )

    return {
        "open_positions": len(open_trades),
        "closed_positions": len(closed_trades),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "realized_pnl": round(realized_pnl, 2),
        "total_pnl": round(unrealized_pnl + realized_pnl, 2),
        "winners": winners,
        "losers": losers,
        "data_source": "Yahoo Finance (ritardo 15 min)",
    }
