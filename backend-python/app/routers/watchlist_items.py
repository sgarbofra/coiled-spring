from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.dependencies import get_current_user, get_db

router = APIRouter()


@router.get("/{watchlist_id}/items", response_model=List[schemas.WatchlistItemOut])
def list_items(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    return (
        db.query(models.WatchlistItem)
        .options(joinedload(models.WatchlistItem.option_contract))
        .filter(models.WatchlistItem.watchlist_id == watchlist_id)
        .order_by(models.WatchlistItem.created_at.desc())
        .all()
    )


@router.get("/{watchlist_id}/items/{item_id}", response_model=schemas.WatchlistItemOut)
def get_item(
    watchlist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    item = (
        db.query(models.WatchlistItem)
        .options(joinedload(models.WatchlistItem.option_contract))
        .filter(
            models.WatchlistItem.id == item_id,
            models.WatchlistItem.watchlist_id == watchlist_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return item


@router.post(
    "/{watchlist_id}/items/bulk-add",
    response_model=List[schemas.WatchlistItemOut],
    status_code=status.HTTP_201_CREATED,
)
def bulk_add_items(
    watchlist_id: int,
    body: schemas.BulkAddItems,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    created_ids = []

    for item_data in body.items:
        contract = _get_or_create_contract(db, item_data.option_contract)

        already_exists = (
            db.query(models.WatchlistItem)
            .filter(
                models.WatchlistItem.watchlist_id == watchlist_id,
                models.WatchlistItem.option_contract_id == contract.id,
            )
            .first()
        )
        if already_exists:
            continue

        item = models.WatchlistItem(
            watchlist_id=watchlist_id,
            option_contract_id=contract.id,
            source_scan_id=item_data.source_scan_id,
            entry_premium=item_data.entry_premium,
            entry_iv=item_data.entry_iv,
            entry_delta=item_data.entry_delta,
            entry_gamma=item_data.entry_gamma,
            entry_vega=item_data.entry_vega,
            entry_theta=item_data.entry_theta,
            quantity=item_data.quantity,
            notes=item_data.notes,
        )
        db.add(item)
        db.flush()
        created_ids.append(item.id)

    db.commit()

    if not created_ids:
        return []

    return (
        db.query(models.WatchlistItem)
        .options(joinedload(models.WatchlistItem.option_contract))
        .filter(models.WatchlistItem.id.in_(created_ids))
        .all()
    )


@router.patch("/{watchlist_id}/items/{item_id}", response_model=schemas.WatchlistItemOut)
def update_item(
    watchlist_id: int,
    item_id: int,
    body: schemas.WatchlistItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    item = _get_item_or_404(db, item_id, watchlist_id)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    _ = item.option_contract
    return item


@router.delete("/{watchlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    watchlist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    item = _get_item_or_404(db, item_id, watchlist_id)
    db.delete(item)
    db.commit()


@router.post("/{watchlist_id}/items/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_remove_items(
    watchlist_id: int,
    body: schemas.BulkRemoveItems,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id.in_(body.item_ids),
        models.WatchlistItem.watchlist_id == watchlist_id,
    ).delete(synchronize_session=False)
    db.commit()


@router.post("/{watchlist_id}/items/move", response_model=List[schemas.WatchlistItemOut])
def move_items(
    watchlist_id: int,
    body: schemas.MoveItems,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    _get_watchlist_or_404(db, body.target_watchlist_id, current_user.id)

    items = (
        db.query(models.WatchlistItem)
        .filter(
            models.WatchlistItem.id.in_(body.item_ids),
            models.WatchlistItem.watchlist_id == watchlist_id,
        )
        .all()
    )

    moved_ids = []
    for item in items:
        conflict = (
            db.query(models.WatchlistItem)
            .filter(
                models.WatchlistItem.watchlist_id == body.target_watchlist_id,
                models.WatchlistItem.option_contract_id == item.option_contract_id,
            )
            .first()
        )
        if not conflict:
            item.watchlist_id = body.target_watchlist_id
            moved_ids.append(item.id)

    db.commit()

    if not moved_ids:
        return []

    return (
        db.query(models.WatchlistItem)
        .options(joinedload(models.WatchlistItem.option_contract))
        .filter(models.WatchlistItem.id.in_(moved_ids))
        .all()
    )


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/{watchlist_id}/items/{item_id}/alerts", response_model=List[schemas.AlertOut])
def list_alerts(
    watchlist_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    _get_item_or_404(db, item_id, watchlist_id)
    return db.query(models.Alert).filter(models.Alert.watchlist_item_id == item_id).all()


@router.post(
    "/{watchlist_id}/items/{item_id}/alerts",
    response_model=schemas.AlertOut,
    status_code=status.HTTP_201_CREATED,
)
def create_alert(
    watchlist_id: int,
    item_id: int,
    body: schemas.AlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    _get_item_or_404(db, item_id, watchlist_id)
    alert = models.Alert(watchlist_item_id=item_id, **body.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{watchlist_id}/items/{item_id}/alerts/{alert_id}", response_model=schemas.AlertOut)
def update_alert(
    watchlist_id: int,
    item_id: int,
    alert_id: int,
    body: schemas.AlertUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    _get_item_or_404(db, item_id, watchlist_id)
    alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.watchlist_item_id == item_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(alert, field, value)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete(
    "/{watchlist_id}/items/{item_id}/alerts/{alert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_alert(
    watchlist_id: int,
    item_id: int,
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_watchlist_or_404(db, watchlist_id, current_user.id)
    _get_item_or_404(db, item_id, watchlist_id)
    alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.watchlist_item_id == item_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_watchlist_or_404(db: Session, watchlist_id: int, user_id: int) -> models.Watchlist:
    wl = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == user_id)
        .first()
    )
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl


def _get_item_or_404(db: Session, item_id: int, watchlist_id: int) -> models.WatchlistItem:
    item = (
        db.query(models.WatchlistItem)
        .filter(
            models.WatchlistItem.id == item_id,
            models.WatchlistItem.watchlist_id == watchlist_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return item


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
