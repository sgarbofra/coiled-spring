from datetime import datetime, timedelta, timezone
import secrets

import bcrypt
import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.config import settings
from app.core.encryption import encrypt_value, decrypt_value
from app.core.email_service import send_reset_email, send_verification_email
from app.core.notification_service import (
    send_admin_notification,
    send_welcome_email,
    send_account_deletion_notification,
    send_cancellation_confirmation_email
)
from app.dependencies import get_current_user, get_db

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


def _user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        has_ai_key=bool(user.ai_api_key),
        ai_queries_today=user.ai_queries_today or 0,
        email=user.email,
        plan=user.plan,
        is_active=user.is_active,
        has_broker=user.broker_config is not None,
        created_at=user.created_at,
    )


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(
    request: Request,
    body: schemas.UserRegister,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    plan = body.plan if body.plan in ("free", "pro", "pro_byok") else "free"

    # Encrypt AI API key if provided
    encrypted_key = None
    if plan == "pro_byok" and body.ai_api_key:
        encrypted_key = encrypt_value(body.ai_api_key)

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    user = models.User(
        email=body.email,
        password_hash=_hash_password(body.password),
        plan=plan,
        ai_api_key=encrypted_key,
        email_verified=False,
        verification_token=verification_token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Save email to marketing list (upsert to avoid conflict)
    try:
        existing_email = db.query(models.EmailList).filter(
            models.EmailList.email == user.email
        ).first()

        if existing_email:
            # Update existing record
            existing_email.plan = user.plan
            existing_email.is_active = True
            existing_email.registered_at = user.created_at
            existing_email.source = "web"
            print(f"Updated existing email_list entry for {user.email}")
        else:
            # Insert new record
            email_list_entry = models.EmailList(
                email=user.email,
                plan=user.plan,
                source="web"
            )
            db.add(email_list_entry)
            print(f"Created new email_list entry for {user.email}")

        db.commit()
    except Exception as e:
        # Don't fail registration if email list save fails
        print(f"Failed to save/update email in marketing list: {e}")

    # Send verification email immediately (synchronous) to log result
    print(f"[REGISTRATION] ========== EMAIL VERIFICATION START ==========")
    print(f"[REGISTRATION] User registered: {user.email} (ID: {user.id})")
    print(f"[REGISTRATION] email_verified: {user.email_verified}")
    print(f"[REGISTRATION] verification_token: {verification_token[:20]}...")
    print(f"[REGISTRATION] ")
    print(f"[REGISTRATION] BEFORE send_verification_email():")
    print(f"[REGISTRATION]   - Destinatario email: {user.email}")
    print(f"[REGISTRATION]   - Verification token: {verification_token}")
    print(f"[REGISTRATION]   - About to call send_verification_email()...")
    print(f"[REGISTRATION] ")

    try:
        email_result = send_verification_email(user.email, verification_token)

        print(f"[REGISTRATION] ")
        print(f"[REGISTRATION] AFTER send_verification_email():")
        print(f"[REGISTRATION]   - Function returned: {email_result}")
        print(f"[REGISTRATION]   - Type: {type(email_result)}")

        if email_result:
            print(f"[REGISTRATION]   - Status: SUCCESS")
            print(f"[REGISTRATION]   - Verification email sent to: {user.email}")
        else:
            print(f"[REGISTRATION]   - Status: FAILED")
            print(f"[REGISTRATION]   - WARNING: send_verification_email() returned False")

    except Exception as e:
        print(f"[REGISTRATION] ")
        print(f"[REGISTRATION] EXCEPTION in send_verification_email():")
        print(f"[REGISTRATION]   - Exception type: {type(e).__name__}")
        print(f"[REGISTRATION]   - Exception message: {str(e)}")
        print(f"[REGISTRATION]   - Full exception details:")
        import traceback
        traceback.print_exc()

    print(f"[REGISTRATION] ========== EMAIL VERIFICATION END ==========")
    print(f"[REGISTRATION] ")

    # Send admin notification in background (non-blocking)
    try:
        background_tasks.add_task(
            send_admin_notification,
            user.email,
            user.plan,
            user.created_at
        )
        print(f"[REGISTRATION] Admin notification scheduled")
    except Exception as e:
        print(f"[REGISTRATION] FAILED to schedule admin notification: {e}")
        import traceback
        traceback.print_exc()

    # Nuovo utente: nessun broker ancora
    token_data = schemas.Token(
        access_token=_create_token(user.id),
        user=schemas.UserOut(
            id=user.id,
            email=user.email,
            plan=user.plan,
            is_active=user.is_active,
            has_broker=False,
            has_ai_key=bool(user.ai_api_key),
            ai_queries_today=0,
            created_at=user.created_at,
        )
    )
    return token_data


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, body: schemas.UserLogin, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    user = (
        db.query(models.User)
        .options(joinedload(models.User.broker_config))
        .filter(models.User.email == body.email)
        .first()
    )
    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    return schemas.Token(access_token=_create_token(user.id), user=_user_out(user))


@router.patch("/plan", response_model=schemas.UserOut)
def update_plan(
    body: schemas.UserPlanUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.plan not in ("free", "pro", "pro_byok"):
        raise HTTPException(status_code=400, detail="Piano non valido")
    current_user.plan = body.plan

    # Encrypt new AI API key if provided for BYOK plan
    if body.plan == "pro_byok" and body.ai_api_key:
        current_user.ai_api_key = encrypt_value(body.ai_api_key)
    elif body.plan != "pro_byok":
        current_user.ai_api_key = None

    db.commit()
    db.refresh(current_user)
    return _user_out(current_user)


@router.get("/me", response_model=schemas.UserOut)
def me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import time
    t0 = time.time()
    print(f"[/me] ===== ENDPOINT START =====")
    print(f"[/me] current_user received: {current_user.email} (ID: {current_user.id})")
    print(f"[/me] After dependency injection: {time.time()-t0:.3f}s")

    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    print(f"[/me] After second DB query: {time.time()-t0:.3f}s")

    result = _user_out(user)
    print(f"[/me] After _user_out: {time.time()-t0:.3f}s")
    print(f"[/me] ===== ENDPOINT COMPLETE: {time.time()-t0:.3f}s =====")
    return result


@router.delete("/me", status_code=200)
def delete_account(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    DELETE /api/auth/me

    Delete the authenticated user's account.
    Protected by JWT authentication.

    - Deletes all related data (email_list, broker_config, watchlists, scan_runs)
    - Deletes user account
    - Sends admin notification
    - Returns success message
    """
    user_email = current_user.email
    user_id = current_user.id
    user_plan = current_user.plan

    print(f"[DELETE ACCOUNT] User {user_email} (ID: {user_id}) requesting account deletion")

    # Delete in order to avoid FK constraint issues
    # Even though CASCADE is set, explicit deletion is safer with SQLAlchemy ORM

    # 1. Delete from email_list (no FK to users)
    deleted_from_email_list = db.query(models.EmailList).filter(
        models.EmailList.email == user_email
    ).delete()
    if deleted_from_email_list:
        print(f"[DELETE ACCOUNT] Deleted {deleted_from_email_list} email_list entry")

    # 2. Delete broker_config (FK: user_id → users.id)
    deleted_broker = db.query(models.BrokerConfig).filter(
        models.BrokerConfig.user_id == user_id
    ).delete()
    if deleted_broker:
        print(f"[DELETE ACCOUNT] Deleted {deleted_broker} broker_config entry")

    # 3. Delete watchlists (FK: user_id → users.id)
    #    This will CASCADE delete: watchlist_items → alerts
    deleted_watchlists = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == user_id
    ).delete()
    if deleted_watchlists:
        print(f"[DELETE ACCOUNT] Deleted {deleted_watchlists} watchlist(s) (+ items, alerts)")

    # 4. Delete scan_runs (FK: user_id → users.id)
    #    watchlist_items.source_scan_id will be SET NULL
    deleted_scans = db.query(models.ScanRun).filter(
        models.ScanRun.user_id == user_id
    ).delete()
    if deleted_scans:
        print(f"[DELETE ACCOUNT] Deleted {deleted_scans} scan_run(s)")

    # 5. Finally delete user
    db.delete(current_user)
    db.commit()

    print(f"[DELETE ACCOUNT] Account deleted: {user_email} (ID: {user_id})")

    # Send emails in background (don't block if fails)
    try:
        # 1. Confirmation email to user
        background_tasks.add_task(
            send_cancellation_confirmation_email,
            user_email
        )
        # 2. Admin notification
        background_tasks.add_task(
            send_account_deletion_notification,
            user_email,
            user_id,
            user_plan
        )
    except Exception as e:
        print(f"[DELETE ACCOUNT] Failed to schedule notifications: {e}")
        # Don't fail the request if email scheduling fails

    return {"message": "Account deleted successfully"}


# Password reset schemas
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
@limiter.limit("3/hour")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset. Always returns 200 to prevent email enumeration.
    Rate limited to 3 requests per hour per IP.
    """
    user = db.query(models.User).filter(models.User.email == body.email).first()

    if user:
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)

        # Save token to database
        user.reset_token = reset_token
        user.reset_token_expires = reset_expires
        db.commit()

        # Send reset email
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        send_reset_email(user.email, reset_token, reset_url)

    # Always return success to prevent email enumeration
    return {"ok": True, "message": "If this email exists, you will receive a reset link shortly."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using token from email.
    """
    user = db.query(models.User).filter(models.User.reset_token == body.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check if token is expired
    if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    # Validate new password
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Hash new password
    user.password_hash = _hash_password(body.new_password)

    # Clear reset token
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {"ok": True, "message": "Password reset successfully"}


@router.get("/verify-email")
def verify_email(token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Verify email using token from verification email.
    GET /auth/verify-email?token=<token>
    """
    user = db.query(models.User).filter(models.User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if user.email_verified:
        return {"ok": True, "message": "Email already verified"}

    # Mark email as verified and clear token
    user.email_verified = True
    user.verification_token = None
    db.commit()

    # Send welcome email after verification
    try:
        background_tasks.add_task(
            send_welcome_email,
            user.email,
            user.plan
        )
        print(f"[EMAIL] Welcome email scheduled for {user.email} after verification")
    except Exception as e:
        print(f"Failed to schedule welcome email: {e}")

    return {"ok": True, "message": "Email verified successfully"}
