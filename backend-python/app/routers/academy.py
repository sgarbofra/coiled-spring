"""
Academy API — quiz attempts e risultati.

Il contenuto delle domande (testo, opzioni) risiede nel file questions_bank.json
accessibile da Next.js. Python gestisce solo lo stato:
  - QuizAttempt: quali domande sono state estratte, risposte date, status
  - QuizResult:  record finale con score/passed

La validazione "risposta corretta" avviene server-side in Next.js (legge il JSON),
che poi chiama /api/academy/attempts/:id/answer con is_correct già calcolato.
"""

import copy
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app import models
from app.dependencies import get_current_user, get_db

router = APIRouter()

QUESTIONS_PER_QUIZ = 10
PASS_THRESHOLD = 7  # 7/10 domande corrette per superare il modulo


# ── Pydantic Schemas ────────────────────────────────────────────────────────────

class AttemptCreateIn(BaseModel):
    module_id: int
    question_ids: List[str]  # 10 ID selezionati da Next.js dalla question bank


class AnswerIn(BaseModel):
    question_id: str
    chosen_idx: int       # indice 0-3 scelto dall'utente
    is_correct: bool      # calcolato server-side da Next.js


class AttemptOut(BaseModel):
    id: int
    module_id: int
    question_ids: List[str]
    answers: List[dict]
    status: str
    score: Optional[int] = None
    passed: Optional[bool] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class QuizResultOut(BaseModel):
    id: int
    module_id: int
    attempt_id: int
    score: int
    total: int
    passed: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _get_attempt_or_404(db: Session, attempt_id: int, user_id: int) -> models.QuizAttempt:
    attempt = (
        db.query(models.QuizAttempt)
        .filter(
            models.QuizAttempt.id == attempt_id,
            models.QuizAttempt.user_id == user_id,
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.post("/attempts", response_model=AttemptOut, status_code=201)
def create_attempt(
    body: AttemptCreateIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Crea un nuovo quiz attempt per il modulo indicato.
    Se esiste già un attempt 'open' per quel modulo, lo restituisce senza crearne uno nuovo
    (consente di riprendere un quiz interrotto).
    """
    if len(body.question_ids) != QUESTIONS_PER_QUIZ:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {QUESTIONS_PER_QUIZ} question IDs, got {len(body.question_ids)}",
        )

    # Riprendi attempt aperto se esiste
    existing = (
        db.query(models.QuizAttempt)
        .filter(
            models.QuizAttempt.user_id == user.id,
            models.QuizAttempt.module_id == body.module_id,
            models.QuizAttempt.status == "open",
        )
        .first()
    )
    if existing:
        return existing

    attempt = models.QuizAttempt(
        user_id=user.id,
        module_id=body.module_id,
        question_ids=body.question_ids,
        answers=[],
        status="open",
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/attempts/{attempt_id}", response_model=AttemptOut)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_attempt_or_404(db, attempt_id, user.id)


@router.post("/attempts/{attempt_id}/answer", response_model=AttemptOut)
def record_answer(
    attempt_id: int,
    body: AnswerIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Registra una risposta. La correttezza è già validata da Next.js.
    Quando l'ultima domanda viene risposta, chiude l'attempt e crea QuizResult.
    """
    attempt = _get_attempt_or_404(db, attempt_id, user.id)

    if attempt.status == "finished":
        raise HTTPException(status_code=400, detail="Attempt already finished")

    if body.question_id not in attempt.question_ids:
        raise HTTPException(status_code=400, detail="Question not part of this attempt")

    answered_ids = {a["question_id"] for a in attempt.answers}
    if body.question_id in answered_ids:
        raise HTTPException(status_code=400, detail="Question already answered")

    # Reassign per triggerare il dirty tracking di SQLAlchemy su colonne JSON
    new_answer = {
        "question_id": body.question_id,
        "chosen_idx": body.chosen_idx,
        "correct": body.is_correct,
    }
    attempt.answers = copy.copy(attempt.answers) + [new_answer]
    flag_modified(attempt, "answers")

    # Chiudi attempt se tutte le domande sono state risposte
    if len(attempt.answers) >= len(attempt.question_ids):
        score = sum(1 for a in attempt.answers if a["correct"])
        passed = score >= PASS_THRESHOLD
        attempt.status = "finished"
        attempt.score = score
        attempt.passed = passed

        result = models.QuizResult(
            user_id=user.id,
            module_id=attempt.module_id,
            attempt_id=attempt.id,
            score=score,
            total=len(attempt.question_ids),
            passed=passed,
        )
        db.add(result)

    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/open-attempt/{module_id}", response_model=AttemptOut)
def get_open_attempt(
    module_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Ritorna attempt 'open' per il modulo, se esiste. 404 se non c'è."""
    attempt = (
        db.query(models.QuizAttempt)
        .filter(
            models.QuizAttempt.user_id == user.id,
            models.QuizAttempt.module_id == module_id,
            models.QuizAttempt.status == "open",
        )
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="No open attempt for this module")
    return attempt


@router.get("/results", response_model=List[QuizResultOut])
def get_all_results(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Tutti i QuizResult dell'utente, ordinati per data decrescente."""
    return (
        db.query(models.QuizResult)
        .filter(models.QuizResult.user_id == user.id)
        .order_by(models.QuizResult.created_at.desc())
        .all()
    )


@router.get("/results/{module_id}", response_model=List[QuizResultOut])
def get_module_results(
    module_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Risultati per un modulo specifico, più recente prima."""
    return (
        db.query(models.QuizResult)
        .filter(
            models.QuizResult.user_id == user.id,
            models.QuizResult.module_id == module_id,
        )
        .order_by(models.QuizResult.created_at.desc())
        .all()
    )
