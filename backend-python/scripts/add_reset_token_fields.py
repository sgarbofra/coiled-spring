"""
Migration script to add reset_token and reset_token_expires columns to users table.
SQLite compatible.

Run with: python scripts/add_reset_token_fields.py
"""
import sqlite3
from pathlib import Path


def run_migration():
    # Path to the SQLite database
    db_path = Path(__file__).parent.parent / "coiled_spring.db"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        if "reset_token" in columns and "reset_token_expires" in columns:
            print("✓ Columns already exist. Migration skipped.")
            return

        # Add reset_token column
        if "reset_token" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN reset_token TEXT NULL")
            print("✓ Added reset_token column")

        # Add reset_token_expires column
        if "reset_token_expires" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP NULL")
            print("✓ Added reset_token_expires column")

        conn.commit()
        print("✓ Migration completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
