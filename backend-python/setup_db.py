"""
Run this script once to create all database tables.
Usage: python setup_db.py

Make sure backend-python/.env exists with the correct DATABASE_URL.
"""
import app.models  # noqa: F401 — registers all models with Base
from app.database import Base, engine


def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Tables created:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")


if __name__ == "__main__":
    main()
