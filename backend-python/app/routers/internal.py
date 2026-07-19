"""
internal.py — Internal-only endpoints for scheduled jobs.

Authentication: X-Internal-Token header, constant-time comparison (hmac.compare_digest).
The token is NEVER printed in logs.

Endpoints:
  POST /api/internal/newsletter/generate   — trigger newsletter generation
  GET  /api/internal/newsletter/{run_id}   — check run status
"""
from __future__ import annotations

import hmac
import os
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app import models

router = APIRouter()


# ── Auth ──────────────────────────────────────────────────────────────────────

def _verify_token(x_internal_token: str = Header(...)) -> None:
    """
    Constant-time token comparison to prevent timing side-channel attacks.
    Uses hmac.compare_digest — token is never logged.
    """
    expected = (os.getenv("INTERNAL_SECRET") or settings.cron_internal_key).encode()
    received = x_internal_token.encode()
    if not hmac.compare_digest(received, expected):
        # Log only that auth failed, never the received token
        print("[INTERNAL] Auth failed — invalid X-Internal-Token")
        raise HTTPException(status_code=403, detail="Forbidden")


# ── Newsletter endpoints ───────────────────────────────────────────────────────

@router.post("/newsletter/generate")
async def trigger_newsletter(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_token),
):
    """
    Trigger newsletter generation job.

    Called by Railway Cron every Monday at 19:30 UTC:
      POST /api/internal/newsletter/generate
      X-Internal-Token: <INTERNAL_SECRET>

    Returns immediately with {ok, run_id, status}.
    Actual generation runs as a background task (non-blocking).

    Idempotency: if this week's newsletter already completed successfully,
    returns status="skipped" without creating a new run.
    """
    enabled = os.getenv("NEWSLETTER_ENABLED", "true").lower() == "true"
    if not enabled:
        return {"ok": False, "status": "disabled", "reason": "NEWSLETTER_ENABLED=false"}

    now = datetime.now(timezone.utc)
    iso = now.isocalendar()
    week_key = f"newsletter_{iso.year}_W{iso.week:02d}"

    # Idempotency check
    existing = (
        db.query(models.NewsletterLog)
        .filter(models.NewsletterLog.week_key == week_key)
        .first()
    )
    if existing and existing.status == "success":
        return {
            "ok":       True,
            "run_id":   existing.id,
            "status":   "skipped",
            "reason":   "already_completed_this_week",
            "week_key": week_key,
        }

    # Create log record (status = generating)
    log = models.NewsletterLog(
        run_date          = now,
        week_key          = week_key,
        tickers_scanned   = 0,
        setups_found      = 0,
        tickers_published = 0,
        status            = "generating",
        error_message     = None,
    )
    db.add(log)
    db.commit()
    run_id = log.id

    # Launch background task — HTTP response returns immediately
    from app.database import SessionLocal
    from app.jobs.newsletter_job import run_newsletter_job

    async def _run_in_background() -> None:
        bg_db = SessionLocal()
        try:
            await run_newsletter_job(bg_db, run_id=run_id)
        except Exception:
            pass   # errors already logged and alerted inside run_newsletter_job
        finally:
            bg_db.close()

    background_tasks.add_task(_run_in_background)

    print(f"[INTERNAL] Newsletter job started | run_id={run_id} | week_key={week_key}")

    return {
        "ok":       True,
        "run_id":   run_id,
        "status":   "generating",
        "week_key": week_key,
    }


@router.get("/newsletter/{run_id}")
async def get_newsletter_status(
    run_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(_verify_token),
):
    """Check the status of a newsletter run by ID."""
    log = (
        db.query(models.NewsletterLog)
        .filter(models.NewsletterLog.id == run_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return {
        "run_id":           log.id,
        "week_key":         log.week_key,
        "status":           log.status,
        "tickers_scanned":  log.tickers_scanned,
        "setups_found":     log.setups_found,
        "tickers_published":log.tickers_published,
        "error_message":    log.error_message,
        "run_date":         log.run_date.isoformat() if log.run_date else None,
    }
