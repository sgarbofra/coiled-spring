"""
Google OAuth 2.0 — Authorization Code exchange endpoint.

Flow:
  Next.js /api/auth/google          → redirects user to Google consent screen
  Google                            → redirects to Next.js /api/auth/google/callback?code=...
  Next.js callback                  → POST /api/auth/google/exchange  { code, redirect_uri }
  This endpoint                     → exchanges code, finds/creates user, returns JWT
  Next.js callback                  → sets cs_token cookie, redirects to /watchlists
"""

import os
import secrets
import string

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.routers.auth import _create_token, _user_out

router = APIRouter()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class GoogleExchangeRequest(BaseModel):
    code: str
    redirect_uri: str


def _random_password() -> str:
    """Generate a random unusable password for Google-only accounts."""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(alphabet) for _ in range(48))


@router.post("/exchange", response_model=schemas.Token)
async def google_exchange(payload: GoogleExchangeRequest, db: Session = Depends(get_db)):
    """
    Exchange Google authorization code for a Coiled Spring JWT.
    Called by the Next.js callback route — never by the browser directly.
    """
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    # 1. Exchange code for Google tokens
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": payload.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": payload.redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Google token exchange failed")

    google_tokens = token_resp.json()
    access_token_google = google_tokens.get("access_token")
    if not access_token_google:
        raise HTTPException(status_code=400, detail="No access_token in Google response")

    # 2. Fetch user info from Google
    async with httpx.AsyncClient(timeout=10.0) as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token_google}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

    guser = userinfo_resp.json()
    google_id: str = guser.get("id")
    email: str = (guser.get("email") or "").lower().strip()
    email_verified: bool = guser.get("verified_email", False)

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete Google profile")

    # 3. Find or create user
    user = db.query(models.User).filter(models.User.google_id == google_id).first()

    if user is None:
        # Check if email already exists (registered via password)
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is not None:
            # Link existing account to Google
            user.google_id = google_id
            if email_verified and not user.email_verified:
                user.email_verified = True
            db.commit()
        else:
            # Brand-new Google user — create account
            from app.routers.auth import _hash_password  # avoid circular at module level
            user = models.User(
                email=email,
                password_hash=_hash_password(_random_password()),
                plan="free",
                email_verified=email_verified,
                google_id=google_id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # 4. Return JWT (same schema as regular login)
    return schemas.Token(
        access_token=_create_token(user.id),
        user=_user_out(user),
    )
