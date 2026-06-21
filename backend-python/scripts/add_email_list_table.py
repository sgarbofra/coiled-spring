"""
Migration script: Add email_list table for marketing

Creates the email_list table to store all registered user emails
for marketing purposes and analytics.
"""

import sqlite3
from pathlib import Path

# Path to SQLite database
DB_PATH = Path(__file__).parent.parent / "coiled_spring.db"

def migrate():
    """Add email_list table to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create email_list table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            plan TEXT NOT NULL,
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            source TEXT DEFAULT 'web',
            is_active BOOLEAN DEFAULT 1,
            unsubscribed_at DATETIME
        )
    """)

    # Create index on email for faster lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_email_list_email
        ON email_list(email)
    """)

    # Create index on registered_at for date filtering
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_email_list_registered_at
        ON email_list(registered_at)
    """)

    conn.commit()
    conn.close()

    print("[SUCCESS] Migration completed: email_list table created")

if __name__ == "__main__":
    migrate()
