#!/usr/bin/env python3
"""Check encryption status of ai_api_key field"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User


def check_api_keys():
    """Display raw ai_api_key values from database"""
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()

        print("\n" + "=" * 100)
        print(f"{'EMAIL':<30} {'AI_API_KEY (raw value)':<70}")
        print("=" * 100)

        for user in users:
            api_key_display = user.ai_api_key if user.ai_api_key else "(null)"
            print(f"{user.email:<30} {api_key_display}")

        print("=" * 100)

        # Check specifically for test@test.com
        test_user = db.query(User).filter(User.email == "test@test.com").first()
        if test_user and test_user.ai_api_key:
            print("\ntest@test.com ai_api_key details:")
            print(f"  Length: {len(test_user.ai_api_key)} characters")
            print(f"  First 10 chars: {test_user.ai_api_key[:10]}")
            print(f"  Starts with 'gAAAAAB': {test_user.ai_api_key.startswith('gAAAAAB')}")
            if test_user.ai_api_key.startswith('gAAAAAB'):
                print("  [OK] Encryption is working correctly (Fernet format)")
            else:
                print("  [WARNING] Value does not appear to be Fernet-encrypted")
        else:
            print("\ntest@test.com has no API key set")

        print()

    finally:
        db.close()


if __name__ == "__main__":
    check_api_keys()
