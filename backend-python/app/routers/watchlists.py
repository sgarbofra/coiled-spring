from typing import List
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.dependencies import get_current_user, get_db

router = APIRouter()


@router.get("", response_model=List[schemas.WatchlistOut])
def list_watchlists(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Watchlist)
        .filter(models.Watchlist.user_id == current_user.id)
        .order_by(models.Watchlist.is_active.desc(), models.Watchlist.created_at.asc())
        .all()
    )


@router.get("/{watchlist_id}", response_model=schemas.WatchlistOut)
def get_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_or_404(db, watchlist_id, current_user.id)


@router.post("", response_model=schemas.WatchlistOut, status_code=status.HTTP_201_CREATED)
def create_watchlist(
    body: schemas.WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if (
        db.query(models.Watchlist)
        .filter(models.Watchlist.user_id == current_user.id, models.Watchlist.name == body.name)
        .first()
    ):
        raise HTTPException(status_code=409, detail="A watchlist with this name already exists")

    wl = models.Watchlist(user_id=current_user.id, name=body.name)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


@router.patch("/{watchlist_id}", response_model=schemas.WatchlistOut)
def update_watchlist(
    watchlist_id: int,
    body: schemas.WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wl = _get_or_404(db, watchlist_id, current_user.id)
    if body.name is not None:
        wl.name = body.name
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wl = _get_or_404(db, watchlist_id, current_user.id)
    db.delete(wl)
    db.commit()


@router.post("/{watchlist_id}/activate", response_model=schemas.WatchlistOut)
def activate_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.Watchlist).filter(
        models.Watchlist.user_id == current_user.id
    ).update({"is_active": False})

    wl = _get_or_404(db, watchlist_id, current_user.id)
    wl.is_active = True
    db.commit()
    db.refresh(wl)
    return wl


@router.post("/{watchlist_id}/refresh")
def refresh_watchlist_prices(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Aggiorna i prezzi e le greche correnti per tutti i contratti nella watchlist.
    Fetcha dati live da yfinance e salva in current_* fields.
    """
    try:
        from app.services.market_data import get_options_prices_bulk

        wl = _get_or_404(db, watchlist_id, current_user.id)

        # Load all items with their contracts
        items = (
            db.query(models.WatchlistItem)
            .options(joinedload(models.WatchlistItem.option_contract))
            .filter(models.WatchlistItem.watchlist_id == watchlist_id)
            .all()
        )

        if not items:
            return {"ok": True, "message": "No items to refresh", "updated": 0}

        # Collect all symbol_keys
        symbol_keys = [item.option_contract.symbol_key for item in items]

        # Fetch current prices from yfinance (bulk)
        prices_data = get_options_prices_bulk(symbol_keys)

        updated_count = 0
        now = datetime.utcnow()

        for item in items:
            symbol_key = item.option_contract.symbol_key
            price_info = prices_data.get(symbol_key)

            if price_info:
                # Update current values
                item.current_bid = Decimal(str(price_info.bid)) if price_info.bid else None
                item.current_ask = Decimal(str(price_info.ask)) if price_info.ask else None
                item.current_last_price = Decimal(str(price_info.mid)) if price_info.mid else None
                item.current_premium = Decimal(str(price_info.mid)) if price_info.mid else None
                item.current_iv = Decimal(str(price_info.iv)) if price_info.iv else None  # Store as percentage (29.3 = 29.3%)

                # Update Greeks (calculated via Black-Scholes in market_data.py)
                item.current_delta = Decimal(str(price_info.delta)) if price_info.delta is not None else None
                item.current_gamma = Decimal(str(price_info.gamma)) if price_info.gamma is not None else None
                item.current_vega = Decimal(str(price_info.vega)) if price_info.vega is not None else None
                item.current_theta = Decimal(str(price_info.theta)) if price_info.theta is not None else None

                item.last_refreshed_at = now
                updated_count += 1

        db.commit()

        return {
            "ok": True,
            "message": f"Refreshed {updated_count}/{len(items)} items",
            "updated": updated_count,
            "total": len(items),
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] Refresh failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


def _get_or_404(db: Session, watchlist_id: int, user_id: int) -> models.Watchlist:
    wl = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == user_id)
        .first()
    )
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl
