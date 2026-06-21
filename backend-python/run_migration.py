"""
Script per aggiungere le colonne current_* alla tabella watchlist_items
"""
import sqlite3

DB_PATH = "coiled_spring.db"

columns_to_add = [
    "current_bid NUMERIC(12, 4)",
    "current_ask NUMERIC(12, 4)",
    "current_last_price NUMERIC(12, 4)",
    "current_premium NUMERIC(12, 4)",
    "current_iv NUMERIC(8, 4)",
    "current_delta NUMERIC(8, 4)",
    "current_gamma NUMERIC(8, 4)",
    "current_vega NUMERIC(8, 4)",
    "current_theta NUMERIC(8, 4)",
    "last_refreshed_at TIMESTAMP",
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

for col_def in columns_to_add:
    try:
        sql = f"ALTER TABLE watchlist_items ADD COLUMN {col_def};"
        print(f"Running: {sql}")
        cursor.execute(sql)
        print(f"  OK - Added column: {col_def.split()[0]}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"  SKIP - Column already exists: {col_def.split()[0]}")
        else:
            print(f"  ERROR: {e}")
            raise

conn.commit()
conn.close()

print("\nMigration completed successfully!")
