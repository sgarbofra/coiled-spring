"""
Admin endpoints for Coiled Spring
"""
from io import StringIO
import csv
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.dependencies import get_db

router = APIRouter()


def verify_admin_key(x_admin_key: str = Header(None)):
    """Verify admin authentication via API key"""
    admin_key = getattr(settings, 'admin_key', None)

    if not admin_key:
        raise HTTPException(status_code=500, detail="Admin key not configured")

    if x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    return True


@router.get("/email-list")
def export_email_list(
    admin_verified: bool = Depends(verify_admin_key),
    db: Session = Depends(get_db)
):
    """
    Export email list as CSV.

    Requires X-Admin-Key header with valid admin key.
    Returns CSV with columns: email, plan, registered_at, source
    """
    # Query all emails from the list
    emails = db.query(models.EmailList).order_by(models.EmailList.registered_at.desc()).all()

    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(['email', 'plan', 'registered_at', 'source', 'is_active'])

    # Write data rows
    for email_entry in emails:
        writer.writerow([
            email_entry.email,
            email_entry.plan,
            email_entry.registered_at.isoformat() if email_entry.registered_at else '',
            email_entry.source,
            'yes' if email_entry.is_active else 'no'
        ])

    # Prepare response
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=coiled_spring_email_list.csv"
        }
    )


@router.get("/stats")
def get_stats(
    admin_verified: bool = Depends(verify_admin_key),
    db: Session = Depends(get_db)
):
    """
    Get registration statistics.

    Requires X-Admin-Key header with valid admin key.
    """
    from sqlalchemy import func

    # Total users
    total_users = db.query(func.count(models.User.id)).scalar()

    # Users by plan
    plan_stats = db.query(
        models.User.plan,
        func.count(models.User.id)
    ).group_by(models.User.plan).all()

    # Total emails in marketing list
    total_emails = db.query(func.count(models.EmailList.id)).scalar()

    # Active emails
    active_emails = db.query(func.count(models.EmailList.id)).filter(
        models.EmailList.is_active == True
    ).scalar()

    return {
        "total_users": total_users,
        "total_emails": total_emails,
        "active_emails": active_emails,
        "users_by_plan": {plan: count for plan, count in plan_stats}
    }


@router.delete("/delete-user")
def delete_user(
    email: str,
    x_admin_secret: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    DELETE /api/admin/delete-user?email=xxx

    Development-only endpoint to delete test users.
    Requires X-Admin-Secret header matching ADMIN_SECRET env var.
    Returns 403 if DEBUG=False (production).

    Deletes user and cascades to related tables (broker_config, etc.).
    """
    # Block in production
    if not settings.debug:
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available in development mode"
        )

    # Verify admin secret
    admin_secret = getattr(settings, 'admin_secret', None)
    if not admin_secret:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_SECRET not configured"
        )

    if x_admin_secret != admin_secret:
        raise HTTPException(
            status_code=403,
            detail="Invalid admin secret"
        )

    # Find user by email
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with email '{email}' not found"
        )

    # Delete user (CASCADE will handle related tables)
    user_id = user.id
    user_email = user.email

    # Also delete from email_list to avoid conflicts on re-registration
    deleted_from_email_list = db.query(models.EmailList).filter(
        models.EmailList.email == email
    ).delete()

    db.delete(user)
    db.commit()

    print(f"[ADMIN] Deleted user: {user_email} (ID: {user_id})")
    if deleted_from_email_list:
        print(f"[ADMIN] Also deleted from email_list")

    return {
        "ok": True,
        "deleted_user": {
            "id": user_id,
            "email": user_email
        },
        "message": f"User '{user_email}' deleted successfully"
    }
