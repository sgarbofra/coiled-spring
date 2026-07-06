"""
Note personali dell'utente su contratti opzione.

GET  /api/notes?ticker=X&strike=Y&expiration=Z  → legge nota corrente
POST /api/notes                                  → crea o aggiorna nota (upsert)
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app import models

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class NoteUpsertRequest(BaseModel):
    ticker: str
    strike: float
    expiration: str        # ISO date string "YYYY-MM-DD"
    note_text: str


class NoteResponse(BaseModel):
    id: int
    ticker: str
    strike: float
    expiration: str
    note_text: str
    updated_at: str        # ISO datetime string


# ── Helper ────────────────────────────────────────────────────────────────────

def _note_to_response(note: models.UserNote) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        ticker=note.ticker,
        strike=float(note.strike),
        expiration=note.expiration,
        note_text=note.note_text,
        updated_at=note.updated_at.isoformat() if note.updated_at else "",
    )


# ── GET /api/notes ─────────────────────────────────────────────────────────────

@router.get("")
def get_note(
    ticker: str = Query(...),
    strike: float = Query(...),
    expiration: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restituisce la nota dell'utente per il contratto specificato, o null se non esiste."""
    note = (
        db.query(models.UserNote)
        .filter(
            models.UserNote.user_id == current_user.id,
            models.UserNote.ticker == ticker.upper(),
            models.UserNote.strike == strike,
            models.UserNote.expiration == expiration,
        )
        .first()
    )
    if not note:
        return {"ok": True, "note": None}
    return {"ok": True, "note": _note_to_response(note).model_dump()}


# ── POST /api/notes ────────────────────────────────────────────────────────────

@router.post("")
def upsert_note(
    body: NoteUpsertRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Crea o aggiorna (upsert) la nota dell'utente per il contratto specificato."""
    ticker = body.ticker.upper()

    note = (
        db.query(models.UserNote)
        .filter(
            models.UserNote.user_id == current_user.id,
            models.UserNote.ticker == ticker,
            models.UserNote.strike == body.strike,
            models.UserNote.expiration == body.expiration,
        )
        .first()
    )

    if note:
        note.note_text = body.note_text
        note.updated_at = datetime.now(timezone.utc)
    else:
        note = models.UserNote(
            user_id=current_user.id,
            ticker=ticker,
            strike=body.strike,
            expiration=body.expiration,
            note_text=body.note_text,
        )
        db.add(note)

    try:
        db.commit()
        db.refresh(note)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {"ok": True, "note": _note_to_response(note).model_dump()}
