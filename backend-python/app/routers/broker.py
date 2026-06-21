from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_current_user, get_db
from app.services.ibkr_service import ibkr_service
from app.services.data_provider import data_provider

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_BROKERS = {"ibkr", "tastytrade"}


@router.get("", response_model=Optional[schemas.BrokerOut])
def get_broker(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get broker configuration for current user.
    Returns 200 with null if no broker configured (not 404).
    """
    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()
    return cfg  # Returns None if not found, which is valid for Optional[BrokerOut]


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


# ── New IBKR Connection Endpoints ────────────────────────────────────────────


class IBKRConnectRequest(BaseModel):
    broker: str
    host: str = "127.0.0.1"
    port: int = 7497


@router.post("/connect")
def connect_broker(
    body: IBKRConnectRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Test and establish IBKR connection
    If successful, saves configuration to database
    """
    if body.broker.lower() != "ibkr":
        raise HTTPException(
            status_code=400,
            detail="Only IBKR broker is supported for live connections currently"
        )

    # Attempt connection
    try:
        logger.info(f"Attempting IBKR connection: {body.host}:{body.port}")
        connected = ibkr_service.connect(host=body.host, port=body.port, client_id=1)

        if not connected:
            raise HTTPException(
                status_code=503,
                detail="Failed to connect to IBKR. Ensure TWS/IB Gateway is running and API connections are enabled."
            )

        # Connection successful — save to database
        cfg = db.query(models.BrokerConfig).filter(
            models.BrokerConfig.user_id == current_user.id
        ).first()

        broker_config = {
            "host": body.host,
            "port": body.port,
            "client_id": 1
        }

        if cfg:
            cfg.broker = "ibkr"
            cfg.config = broker_config
            cfg.is_active = True
        else:
            cfg = models.BrokerConfig(
                user_id=current_user.id,
                broker="ibkr",
                config=broker_config,
                is_active=True
            )
            db.add(cfg)

        # Update user broker field
        current_user.broker = "ibkr"

        db.commit()
        logger.info(f"IBKR connection saved for user {current_user.id}")

        return {
            "connected": True,
            "broker": "ibkr",
            "host": body.host,
            "port": body.port,
            "message": "Successfully connected to IBKR"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IBKR connection error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Connection error: {str(e)}"
        )


@router.get("/status")
def get_broker_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get current broker connection status and data source being used
    """
    cfg = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == current_user.id
    ).first()

    # Get data source status from provider
    data_source_info = data_provider.get_data_source_status(current_user)

    response = {
        "broker_configured": cfg.broker if cfg else None,
        "is_active": cfg.is_active if cfg else False,
        "data_source": data_source_info["data_source"],
        "user_plan": current_user.plan,
    }

    # Add IBKR-specific status
    if cfg and cfg.broker == "ibkr":
        response["connected"] = ibkr_service.is_connected()
        response["config"] = cfg.config
    else:
        response["connected"] = None

    return response
