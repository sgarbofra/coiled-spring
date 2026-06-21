"""Test MU via local import to see actual results"""
import sys
sys.path.insert(0, '.')

# Simulate what the API does
from app.routers.scanner import run_scan, ScanFilters
from app.dependencies import get_db
from app import models
from sqlalchemy.orm import Session
from fastapi import Request
from unittest.mock import Mock

print("\n" + "="*80)
print("SIMULATING API CALL FOR MU")
print("="*80 + "\n")

# Create mock request and user
mock_request = Mock(spec=Request)
mock_user = Mock(spec=models.User)
mock_user.id = 1

# Create filters (same as API request)
filters = ScanFilters(
    underlyings=["MU"],
    option_type="call",
    dte_min=10,
    dte_max=1000,
    delta_min=0.1,
    delta_max=0.9,
)

print("Filters:")
print(f"  underlyings: {filters.underlyings}")
print(f"  option_type: {filters.option_type}")
print(f"  dte_min: {filters.dte_min}")
print(f"  dte_max: {filters.dte_max}")
print(f"  delta_min: {filters.delta_min}")
print(f"  delta_max: {filters.delta_max}")
print()

# Get DB session
from app.database import SessionLocal
db = SessionLocal()

try:
    # Call the actual endpoint function
    result = run_scan(
        request=mock_request,
        filters=filters,
        db=db,
        current_user=mock_user,
    )

    print("\n" + "="*80)
    print(f"API ENDPOINT RETURNED: {len(result.results)} results")
    print(f"Ticker names: {result.ticker_names}")
    print("="*80 + "\n")

    if result.results:
        print("First 3 results:")
        for r in result.results[:3]:
            print(f"  {r.option_type} K={r.strike} DTE={r.dte} IV={r.iv}% Delta={r.delta}")
    else:
        print("WARNING: No results returned from API endpoint!")

except Exception as e:
    print(f"\nERROR in API endpoint: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
