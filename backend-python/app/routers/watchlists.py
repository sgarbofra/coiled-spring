from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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


def _get_or_404(db: Session, watchlist_id: int, user_id: int) -> models.Watchlist:
    wl = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == user_id)
        .first()
    )
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl
