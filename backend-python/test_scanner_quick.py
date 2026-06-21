"""Quick test to verify scanner works and debug MU"""
import sys
sys.path.insert(0, '.')

from app.services.market_data import scan_yfinance

print("="*80)
print("TESTING MU WITH WIDE FILTERS")
print("="*80)

try:
    results = scan_yfinance(
        symbols=["MU"],
        dte_min=10,
        dte_max=1000,
        option_types=["call"],
        delta_min=0.1,
        delta_max=0.9,
        filters={},
    )
    print(f"\n{'='*80}")
    print(f"FINAL RESULTS: {len(results)} contracts")
    print(f"{'='*80}")

    if results:
        print("\nFirst 5 results:")
        for r in results[:5]:
            print(f"  {r.option_type} K={r.strike} DTE={r.dte} IV={r.iv}% Delta={r.delta} Mid=${r.mid}")
    else:
        print("\nWARNING: No results returned - check debug logs above!")

except Exception as e:
    print(f"\nERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
