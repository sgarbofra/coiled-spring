#!/usr/bin/env python3
"""Manage users in database"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import bcrypt
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User


def show_all_users():
    """Display all users with email and plan"""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()

        print("\n" + "=" * 60)
        print(f"{'EMAIL':<30} {'PLAN':<15}")
        print("=" * 60)

        for user in users:
            print(f"{user.email:<30} {user.plan:<15}")

        print("=" * 60)
        print(f"Total users: {len(users)}\n")

    finally:
        db.close()


def update_user(email: str, plan: str = None, password: str = None):
    """Update user plan and/or password"""
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"[ERROR] User {email} not found!")
            return False

        print(f"\n[UPDATE] User: {email}")

        if plan:
            old_plan = user.plan
            user.plan = plan
            print(f"  Plan: {old_plan} -> {plan}")

            # Clear AI key if downgrading from BYOK
            if old_plan == 'pro_byok' and plan != 'pro_byok':
                user.ai_api_key = None
                print(f"  AI key cleared")

        if password:
            # Hash password with bcrypt
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()
            user.password_hash = hashed
            print(f"  Password updated (bcrypt hash)")

        db.commit()
        print(f"[SUCCESS] User updated\n")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    print("\n=== USER MANAGEMENT ===")

    # 1. Show all users
    print("\n1. Current users:")
    show_all_users()

    # 2. Update test2@example.com plan to 'free'
    print("2. Updating test2@example.com plan to 'free':")
    update_user("test2@example.com", plan="free")

    # 3. Update test2@example.com password to 'test123'
    print("3. Updating test2@example.com password to 'test123':")
    update_user("test2@example.com", password="test123")

    # Show final state
    print("4. Final state:")
    show_all_users()

    print("=== COMPLETE ===\n")
