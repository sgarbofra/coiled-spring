from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_current_user, get_db

router = APIRouter()

SUPPORTED_BROKERS = {"ibkr", "tastytrade"}


@router.get("", response_model=schemas.BrokerOut)
def get_broker(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No broker configured")
    return cfg


@router.post("", response_model=schemas.BrokerOut, status_code=status.HTTP_201_CREATED)
def save_broker(
    body: schemas.BrokerSave,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.broker not in SUPPORTED_BROKERS:
        raise HTTPException(status_code=400, detail=f"Unsupported broker. Supported: {SUPPORTED_BROKERS}")

    # Sanitize: never store plaintext passwords — remove before saving
    safe_config = {k: v for k, v in body.config.items() if k != "password"}

    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()

    if cfg:
        cfg.broker = body.broker
        cfg.config = safe_config
        cfg.is_active = True
    else:
        cfg = models.BrokerConfig(
            user_id=current_user.id,
            broker=body.broker,
            config=safe_config,
        )
        db.add(cfg)

    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_broker(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()
    if cfg:
        db.delete(cfg)
        db.commit()


@router.post("/test", status_code=status.HTTP_200_OK)
def test_connection(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No broker configured")

    # Stub — real connection test implemented in scanner phase
    return {"ok": True, "broker": cfg.broker, "status": "reachable (simulated)"}
