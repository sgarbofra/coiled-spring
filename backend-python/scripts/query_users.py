#!/usr/bin/env python3
"""Quick script to query and modify users in SQLite database"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User


def show_users():
    """Display all users with email, plan, and ai_api_key"""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()

        print("\n" + "=" * 80)
        print(f"{'EMAIL':<30} {'PLAN':<15} {'AI_API_KEY':<30}")
        print("=" * 80)

        for user in users:
            api_key_display = user.ai_api_key[:30] + "..." if user.ai_api_key and len(user.ai_api_key) > 30 else user.ai_api_key or "(null)"
            print(f"{user.email:<30} {user.plan:<15} {api_key_display:<30}")

        print("=" * 80)
        print(f"Total users: {len(users)}\n")

    finally:
        db.close()


def update_user_plan(email: str, new_plan: str):
    """Update user plan"""
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"User {email} not found!")
            return

        old_plan = user.plan
        user.plan = new_plan
        db.commit()

        print(f"\nUpdated user {email}:")
        print(f"  Old plan: {old_plan}")
        print(f"  New plan: {new_plan}")
        print()

    finally:
        db.close()


if __name__ == "__main__":
    print("\n=== Current Users ===")
    show_users()

    print("=== Updating test@test.com to pro_byok ===")
    update_user_plan("test@test.com", "pro_byok")

    print("=== Users After Update ===")
    show_users()
