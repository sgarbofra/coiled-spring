#!/usr/bin/env python3
"""
Migration script to encrypt existing plaintext ai_api_key values in the database.

This script:
1. Reads all users with non-null ai_api_key
2. Checks if each key is already encrypted (idempotent)
3. Encrypts plaintext keys
4. Saves them back to the database
5. Logs the number of migrated records

Run this script ONCE after deploying the encryption feature and setting ENCRYPTION_KEY.

Usage:
    python scripts/migrate_encrypt_keys.py

Requirements:
    - ENCRYPTION_KEY must be set in environment or .env file
    - Database must be accessible
"""

import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User
from app.core.encryption import encrypt_value, is_encrypted


def migrate_encrypt_keys():
    """
    Migrate plaintext ai_api_key values to encrypted format.
    Idempotent: can be run multiple times safely.
    """
    db: Session = SessionLocal()
    migrated_count = 0
    already_encrypted_count = 0
    error_count = 0

    try:
        # Find all users with ai_api_key set
        users_with_keys = db.query(User).filter(User.ai_api_key.isnot(None)).all()

        print(f"Found {len(users_with_keys)} users with API keys")

        for user in users_with_keys:
            try:
                current_key = user.ai_api_key

                if not current_key:
                    continue

                # Check if already encrypted (idempotent)
                if is_encrypted(current_key):
                    print(f"  User {user.email} (ID {user.id}): already encrypted, skipping")
                    already_encrypted_count += 1
                    continue

                # Encrypt the plaintext key
                encrypted_key = encrypt_value(current_key)

                if not encrypted_key:
                    print(f"  User {user.email} (ID {user.id}): encryption returned None, skipping")
                    error_count += 1
                    continue

                # Save the encrypted key
                user.ai_api_key = encrypted_key
                db.commit()

                print(f"  User {user.email} (ID {user.id}): encrypted successfully")
                migrated_count += 1

            except Exception as e:
                print(f"  User {user.email} (ID {user.id}): ERROR - {e}")
                error_count += 1
                db.rollback()
                continue

    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
        raise

    finally:
        db.close()

    print("\n" + "=" * 60)
    print("Migration complete!")
    print(f"  Newly encrypted: {migrated_count}")
    print(f"  Already encrypted (skipped): {already_encrypted_count}")
    print(f"  Errors: {error_count}")
    print("=" * 60)

    return migrated_count, already_encrypted_count, error_count


if __name__ == "__main__":
    print("Starting API key encryption migration...")
    print("=" * 60)

    try:
        migrate_encrypt_keys()
        print("\nMigration completed successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"\nMigration failed with error: {e}")
        sys.exit(1)
