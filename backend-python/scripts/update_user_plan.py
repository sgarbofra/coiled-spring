#!/usr/bin/env python3
"""Update user plan in database"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User


def update_plan(email: str, new_plan: str):
    """Update user plan"""
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"[ERROR] User {email} not found!")
            return False

        old_plan = user.plan
        user.plan = new_plan

        # Clear AI key if downgrading from BYOK
        if old_plan == 'pro_byok' and new_plan != 'pro_byok':
            user.ai_api_key = None
            print(f"   Cleared AI API key")

        db.commit()

        print(f"[SUCCESS] Updated user {email}:")
        print(f"  Old plan: {old_plan}")
        print(f"  New plan: {new_plan}")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    print("\n=== Updating User Plan ===")
    success = update_plan("test2@example.com", "free")
    if success:
        print("=== Update Complete ===\n")
    else:
        print("=== Update Failed ===\n")
        sys.exit(1)
