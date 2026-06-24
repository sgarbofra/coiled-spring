"""
MarketDataService — provider intercambiabile per dati di mercato.

Layer base: YFinanceProvider (gratis, ritardo 15 min, nessun account)
Layer premium: BrokerProvider (live, richiede account IBKR/Tastytrade) — da implementare
"""

import math
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

try:
    from scipy.optimize import brentq
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("[WARNING] scipy not available - IV calculation will be limited")

# ── Shared Black-Scholes ──────────────────────────────────────────────────────

def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bs_greeks(S: float, K: float, T: float, r: float, sigma: float, is_call: bool):
    """Return (price, delta, gamma, vega, theta). Returns zeros if T<=0 or sigma<=0."""
    if T <= 0 or sigma <= 0:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    sqrt_T = math.sqrt(T)
    try:
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    except (ValueError, ZeroDivisionError):
        return 0.0, 0.0, 0.0, 0.0, 0.0

    d2 = d1 - sigma * sqrt_T
    nd1 = _norm_cdf(d1)
    nd2 = _norm_cdf(d2)
    pdf_d1 = math.exp(-0.5 * d1 ** 2) / math.sqrt(2 * math.pi)

    if is_call:
        price = S * nd1 - K * math.exp(-r * T) * nd2
        delta = nd1
    else:
        price = K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)
        delta = nd1 - 1.0

    gamma = pdf_d1 / (S * sigma * sqrt_T)
    vega = S * pdf_d1 * sqrt_T / 100        # per 1% IV change
    theta = (-(S * pdf_d1 * sigma) / (2 * sqrt_T)
             - r * K * math.exp(-r * T) * (nd2 if is_call else _norm_cdf(-d2))) / 365

    return max(price, 0.0), delta, gamma, vega, theta


def implied_volatility_bs(
    market_price: float, S: float, K: float, T: float, r: float, is_call: bool
) -> Optional[float]:
    """
    Calculate implied volatility using Black-Scholes inverse with Brent's method.

    Args:
        market_price: Observed market price (mid = (bid+ask)/2)
        S: Current stock price
        K: Strike price
        T: Time to expiration in years (DTE/365)
        r: Risk-free rate (e.g., 0.05 for 5%)
        is_call: True for call, False for put

    Returns:
        Implied volatility as decimal (e.g., 0.28 for 28%) or None if calculation fails
    """
    if not SCIPY_AVAILABLE:
        return None

    if market_price <= 0 or S <= 0 or K <= 0 or T <= 0:
        return None

    # Intrinsic value bounds
    if is_call:
        intrinsic = max(S - K, 0)
    else:
        intrinsic = max(K - S, 0)

    # Market price must be >= intrinsic value
    if market_price < intrinsic * 0.99:  # Allow small rounding error
        return None

    def objective(sigma: float) -> float:
        """Price difference: BS_price(sigma) - market_price"""
        bs_price, _, _, _, _ = bs_greeks(S, K, T, r, sigma, is_call)
        return bs_price - market_price

    try:
        # Search for IV in range [0.01, 5.0] (1% to 500%)
        iv = brentq(objective, 0.01, 5.0, xtol=1e-6, maxiter=100)

        # Sanity check: reject unrealistic values
        if iv < 0.05 or iv > 3.0:  # < 5% or > 300%
            return None

        return iv
    except (ValueError, RuntimeError):
        # brentq failed (no root found, or objective doesn't change sign)
        return None


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class OptionResult:
    underlying: str
    option_type: str
    strike: float
    expiration: str
    dte: int
    bid: float
    ask: float
    mid: float
    last_price: float  # last traded price
    spread_pct: float
    iv: float          # as percentage, e.g. 28.5
    iv_rank: float     # 0-100
    delta: float
    gamma: float
    vega: float
    theta: float
    open_interest: int
    volume: int
    symbol_key: str


# ── Simple in-memory cache ────────────────────────────────────────────────────

class _Cache:
    def __init__(self):
        self._data: Dict[str, Tuple[float, object]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, ttl: float) -> Optional[object]:
        with self._lock:
            if key in self._data:
                ts, val = self._data[key]
                if time.time() - ts < ttl:
                    return val
        return None

    def set(self, key: str, val: object):
        with self._lock:
            self._data[key] = (time.time(), val)


_cache = _Cache()

PRICE_TTL      = 60 * 5     # 5 min  — prezzo sottostante
HISTORY_TTL    = 60 * 60    # 1 hour — info ticker
OPTIONS_TTL    = 60 * 15    # 15 min — chain scanner (costoso, non cambia spesso)
OPTPRICE_TTL   = 60 * 2     # 2 min  — singola opzione per portfolio (deve essere fresco)


# ── YFinance provider ─────────────────────────────────────────────────────────

def _yf_current_price(symbol: str) -> Optional[float]:
    cached = _cache.get(f"price:{symbol}", PRICE_TTL)
    if cached is not None:
        return cached
    try:
        import yfinance as yf
        t = yf.Ticker(symbol)
        price = t.fast_info.last_price
        if price and price > 0:
            _cache.set(f"price:{symbol}", price)
            return float(price)
    except Exception:
        pass
    return None


def _yf_iv_rank(symbol: str) -> float:
    """
    IV Rank calculation disabled - requires 52-week historical options data.
    This is a PRO feature. Returns 0 as placeholder.
    """
    # PRO FEATURE: Proper IV Rank requires 52 weeks of historical IV data
    # from options chains, not stock price volatility.
    # Current implementation would be misleading, so we return 0.
    return 0.0


def _yf_options_for_symbol(
    symbol: str,
    dte_min: int,
    dte_max: int,
    option_types: List[str],
    delta_min: float,
    delta_max: float,
    filters: dict,
) -> List[OptionResult]:
    cache_key = f"opts:{symbol}:{dte_min}:{dte_max}:v2"  # v2 = force cache miss for testing
    # Cache raw chains only
    raw = _cache.get(cache_key, OPTIONS_TTL)

    if raw is not None:
        print(f"[CACHE HIT] {symbol}: Using cached options data")
    else:
        print(f"[CACHE MISS] {symbol}: Downloading fresh options data")

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)

        price = _yf_current_price(symbol)
        if not price:
            return []

        iv_rank = _yf_iv_rank(symbol)

        if raw is None:
            exps = ticker.options   # tuple of "YYYY-MM-DD" strings
            # Check if no options are available
            if not exps or len(exps) == 0:
                raise ValueError(f"No options data found for {symbol}")
            raw = {"exps": exps, "chains": {}}
            today = date.today()

            print(f"\n[DEBUG {symbol}] Stock price: ${price:.2f}")
            print(f"[DEBUG {symbol}] Total expirations available: {len(exps)}")
            exps_in_range = 0

            for exp_str in exps:
                exp_date = date.fromisoformat(exp_str)
                dte = (exp_date - today).days
                if dte_min <= dte <= dte_max:
                    exps_in_range += 1
                    try:
                        chain = ticker.option_chain(exp_str)
                        raw["chains"][exp_str] = {
                            "calls": chain.calls.to_dict("records"),
                            "puts":  chain.puts.to_dict("records"),
                        }
                    except Exception as e:
                        print(f"[DEBUG {symbol}] Failed to download chain for {exp_str}: {e}")

            print(f"[DEBUG {symbol}] Expirations in DTE range {dte_min}-{dte_max}: {exps_in_range}")
            print(f"[DEBUG {symbol}] Chains downloaded: {len(raw['chains'])}")
            _cache.set(cache_key, raw)

        today = date.today()
        r = 0.045  # risk-free rate
        results: List[OptionResult] = []

        # Debug counters
        total_contracts = 0
        filtered_no_iv = 0
        filtered_no_bid_ask = 0
        filtered_delta = 0
        delta_distribution = []  # Track all delta values for analysis
        bs_calculation_failures = 0
        iv_calculation_attempts = 0
        iv_calculation_successes = 0

        for exp_str, chains in raw["chains"].items():
            exp_date = date.fromisoformat(exp_str)
            dte = (exp_date - today).days
            T = dte / 365.0

            for opt_type in option_types:
                is_call = opt_type == "call"
                rows = chains["calls"] if is_call else chains["puts"]

                for row in rows:
                    total_contracts += 1
                    try:
                        K = float(row.get("strike", 0))
                        iv_raw = float(row.get("impliedVolatility", 0))
                        bid = float(row.get("bid", 0) or 0)
                        ask = float(row.get("ask", 0) or 0)
                        last_price = float(row.get("lastPrice", 0) or 0)
                        oi = int(row.get("openInterest", 0) or 0)
                        vol = int(row.get("volume", 0) or 0)
                    except (TypeError, ValueError):
                        continue

                    # Must have valid strike
                    if K <= 0:
                        filtered_no_iv += 1
                        continue

                    # Apply strike filters if provided
                    strike_min = filters.get("strike_min")
                    strike_max = filters.get("strike_max")
                    if strike_min is not None and K < strike_min:
                        continue
                    if strike_max is not None and K > strike_max:
                        continue

                    # Calculate mid price first (needed for IV calculation if missing)
                    mid = 0.0
                    if bid > 0 and ask > 0:
                        mid = (bid + ask) / 2
                    elif last_price > 0:
                        mid = last_price
                    elif bid > 0:
                        mid = bid
                    elif ask > 0:
                        mid = ask

                    # Scanner requires at least one price source
                    if mid <= 0:
                        filtered_no_bid_ask += 1
                        continue

                    # Calculate IV: use yfinance IV if valid, otherwise compute via Black-Scholes inverse
                    sigma = None
                    if iv_raw > 0 and iv_raw >= 0.05:
                        # yfinance IV is valid
                        sigma = iv_raw
                    else:
                        # IV missing or corrupted - calculate it ourselves
                        iv_calculation_attempts += 1
                        if SCIPY_AVAILABLE and mid > 0:
                            calculated_iv = implied_volatility_bs(mid, price, K, T, r, is_call)
                            if calculated_iv is not None:
                                sigma = calculated_iv
                                iv_calculation_successes += 1

                    # Skip contract if we still don't have valid IV
                    if sigma is None or sigma <= 0:
                        filtered_no_iv += 1
                        continue

                    # Round mid for final output
                    mid = round(mid, 2)

                    # Calculate spread percentage (99.0 if no valid bid/ask)
                    if bid > 0 and ask > 0 and mid > 0:
                        spread_pct = round((ask - bid) / mid * 100, 1)
                    else:
                        spread_pct = 99.0

                    # Calculate Greeks using Black-Scholes
                    try:
                        _, delta, gamma, vega, theta = bs_greeks(price, K, T, r, sigma, is_call)
                        abs_delta = delta if is_call else abs(delta)
                    except Exception as e:
                        bs_calculation_failures += 1
                        if symbol == "MU" or bs_calculation_failures <= 3:
                            print(f"[BS ERROR] {symbol} K={K} S={price} T={T:.3f} sigma={sigma:.3f}: {e}")
                        filtered_delta += 1
                        continue

                    # Track delta for distribution analysis
                    delta_distribution.append(abs_delta)

                    if not (delta_min <= abs_delta <= delta_max):
                        filtered_delta += 1
                        continue

                    # Optional filters
                    sp_max = filters.get("spread_pct_max")
                    if sp_max is not None and spread_pct > sp_max:
                        continue
                    pm_min = filters.get("premium_min")
                    if pm_min is not None and mid < pm_min:
                        continue
                    pm_max = filters.get("premium_max")
                    if pm_max is not None and mid > pm_max:
                        continue

                    side = "C" if is_call else "P"
                    symbol_key = f"{symbol}-{exp_date.strftime('%Y%m%d')}{side}{int(K)}"

                    results.append(OptionResult(
                        underlying=symbol,
                        option_type=opt_type,
                        strike=round(K, 2),
                        expiration=exp_str,
                        dte=dte,
                        bid=round(bid, 2),
                        ask=round(ask, 2),
                        mid=round(mid, 2),
                        last_price=round(last_price, 2),
                        spread_pct=spread_pct,
                        iv=round(sigma * 100, 1),   # usa sigma effettivo (calcolato via BS se yahoo IV mancante)
                        iv_rank=iv_rank,
                        delta=round(abs_delta, 3),
                        gamma=round(gamma, 4),
                        vega=round(vega, 3),
                        theta=round(theta, 4),
                        open_interest=oi,
                        volume=vol,
                        symbol_key=symbol_key,
                    ))

        print(f"\n[DEBUG {symbol}] Processing summary:")
        print(f"  Total contracts processed: {total_contracts}")
        print(f"  Filtered (no IV or K<=0): {filtered_no_iv}")
        print(f"    - IV calculation attempts: {iv_calculation_attempts}")
        print(f"    - IV calculation successes: {iv_calculation_successes}")
        print(f"  Filtered (no bid/ask): {filtered_no_bid_ask}")
        print(f"  Filtered (BS calculation failed): {bs_calculation_failures}")
        print(f"  Filtered (delta out of range {delta_min:.2f}-{delta_max:.2f}): {filtered_delta}")
        print(f"  [OK] Contracts passed ALL filters: {len(results)}")

        # Delta distribution analysis
        if delta_distribution:
            import numpy as np
            deltas = np.array(delta_distribution)
            print(f"\n[DEBUG {symbol}] Delta distribution (before delta filter):")
            print(f"  Min: {deltas.min():.3f}, Max: {deltas.max():.3f}, Mean: {deltas.mean():.3f}")
            print(f"  Delta < {delta_min:.2f}: {(deltas < delta_min).sum()}")
            print(f"  Delta {delta_min:.2f}-{delta_max:.2f}: {((deltas >= delta_min) & (deltas <= delta_max)).sum()}")
            print(f"  Delta > {delta_max:.2f}: {(deltas > delta_max).sum()}")

            # Show sample deltas for debugging
            if symbol == "MU" or len(results) == 0:
                print(f"\n[DEBUG {symbol}] Sample deltas (first 10):")
                for i, d in enumerate(deltas[:10]):
                    print(f"    Contract {i+1}: delta={d:.3f}")

        return results

    except ValueError as ve:
        # Re-raise ValueError for "no options" message
        raise ve
    except Exception:
        return []


def scan_yfinance(
    symbols: List[str],
    dte_min: int,
    dte_max: int,
    option_types: List[str],
    delta_min: float,
    delta_max: float,
    filters: dict,
    max_results: int = 1000,
) -> List[OptionResult]:
    """Scan multiple symbols in parallel using yfinance."""
    # Extract strike filters from dict for debug
    strike_min = filters.get("strike_min")
    strike_max = filters.get("strike_max")

    print(f"[FILTER CHECK] option_types={option_types}, strike_min={strike_min}, strike_max={strike_max}, delta_min={delta_min}, delta_max={delta_max}, dte_min={dte_min}, dte_max={dte_max}")

    print(f"\n[scan_yfinance] Called with:")
    print(f"  symbols: {symbols}")
    print(f"  dte_min: {dte_min}, dte_max: {dte_max}")
    print(f"  option_types: {option_types}")
    print(f"  delta_min: {delta_min}, delta_max: {delta_max}")
    print(f"  filters: {filters}")
    print(f"  max_results: {max_results}\n")

    all_results: List[OptionResult] = []
    failed_tickers = {}  # {ticker: error_message}

    with ThreadPoolExecutor(max_workers=min(len(symbols), 6)) as pool:
        futures = {
            pool.submit(
                _yf_options_for_symbol,
                sym, dte_min, dte_max, option_types, delta_min, delta_max, filters,
            ): sym
            for sym in symbols
        }
        for future in as_completed(futures):
            sym = futures[future]
            try:
                all_results.extend(future.result())
            except ValueError as e:
                # Clear error message (e.g. "No options data found for INVALID")
                failed_tickers[sym] = str(e)
                print(f"[SCANNER] {sym}: {e}")
            except Exception as e:
                # Generic error
                failed_tickers[sym] = f"Failed to fetch data: {type(e).__name__}"
                print(f"[SCANNER] {sym}: Failed with {type(e).__name__}: {e}")

    # If all tickers failed, raise error with details
    if not all_results and failed_tickers:
        error_summary = "; ".join([f"{t}: {msg}" for t, msg in failed_tickers.items()])
        raise ValueError(f"No results found. {error_summary}")

    all_results.sort(key=lambda x: (x.iv_rank, x.underlying, x.dte))
    return all_results[:max_results]


def get_ticker_info(symbol: str) -> Optional[dict]:
    """Get ticker information from yfinance (name and ISIN if available)."""
    cache_key = f"ticker_info:{symbol}"
    cached = _cache.get(cache_key, HISTORY_TTL)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info

        result = {
            "name": info.get("longName") or info.get("shortName") or symbol,
            "isin": info.get("isin")
        }
        _cache.set(cache_key, result)
        return result
    except Exception:
        return None


# ── Current option price by symbol_key ───────────────────────────────────────

@dataclass
class OptionPrice:
    symbol_key: str
    bid: float
    ask: float
    mid: float
    iv: Optional[float]  # percentuale, es. 28.5 (None if corrupted data)
    iv_rank: float
    volume: int
    open_interest: int
    last_price: float = 0.0              # last traded price (può essere stale)
    price_source: str = "mid"            # "mid"|"bid"|"ask"|"last"|"bs_theoretical"
    delta: Optional[float] = None
    gamma: Optional[float] = None
    vega: Optional[float] = None
    theta: Optional[float] = None
    fetched_at: str = None               # ISO timestamp


def _parse_symbol_key(symbol_key: str):
    """Parse 'AAPL-20261218C150' → (underlying, expiry_str, is_call, strike)."""
    try:
        parts = symbol_key.split('-', 1)
        underlying = parts[0]
        rest = parts[1]  # 20261218C150 or 20261218P150
        if 'C' in rest:
            idx = rest.index('C')
            is_call = True
        else:
            idx = rest.index('P')
            is_call = False
        exp_raw = rest[:idx]          # 20261218
        strike = float(rest[idx+1:])  # 150.0
        expiry = f"{exp_raw[:4]}-{exp_raw[4:6]}-{exp_raw[6:]}"  # 2026-12-18
        return underlying, expiry, is_call, strike
    except Exception:
        return None, None, None, None


def get_option_current_price(symbol_key: str) -> Optional[OptionPrice]:
    """Fetch current bid/ask/mid for a single option contract via yfinance.
    Results cached for OPTPRICE_TTL (2 min) — TTL basso per PNL portfolio fresco.
    """
    cached = _cache.get(f"optprice:{symbol_key}", OPTPRICE_TTL)
    if cached is not None:
        return cached

    underlying, expiry, is_call, strike = _parse_symbol_key(symbol_key)
    if not underlying:
        return None

    try:
        import yfinance as yf
        ticker = yf.Ticker(underlying)
        chain = ticker.option_chain(expiry)
        df = chain.calls if is_call else chain.puts

        # Trova lo strike esatto o il più vicino
        matches = df[abs(df['strike'] - strike) < 0.01]
        if matches.empty:
            matches = df.iloc[(df['strike'] - strike).abs().argsort()[:1]]
        if matches.empty:
            return None

        row = matches.iloc[0]
        bid = float(row.get('bid', 0) or 0)
        ask = float(row.get('ask', 0) or 0)
        last_price = float(row.get('lastPrice', 0) or 0)
        iv_raw = float(row.get('impliedVolatility', 0) or 0)
        volume = int(row.get('volume', 0) or 0)
        oi = int(row.get('openInterest', 0) or 0)

        # ── Calcolo mid: 3 livelli di fallback ───────────────────────────────────
        # Livello 1: bid/ask — quotazione corrente dai market maker (più fresca)
        # Livello 2: lastPrice — ultimo trade eseguito (può essere stale per LEAPS illiquide)
        # Livello 3: prezzo teorico B-S — ultimo resort quando mercato non ha prezzi
        mid = 0.0
        price_source = "none"

        if bid > 0 and ask > 0:
            mid = round((bid + ask) / 2, 2)
            price_source = "mid"
        elif bid > 0:
            mid = round(bid, 2)
            price_source = "bid"
        elif ask > 0:
            mid = round(ask, 2)
            price_source = "ask"
        elif last_price > 0:
            mid = round(last_price, 2)
            price_source = "last"

        # Livello 3: B-S teorico — quando non ci sono prezzi di mercato
        if mid == 0 and SCIPY_AVAILABLE:
            try:
                underlying_price_bs = _yf_current_price(underlying)
                from datetime import date as _date_bs
                exp_date_bs = _date_bs.fromisoformat(expiry)
                dte_bs = (exp_date_bs - _date_bs.today()).days
                if underlying_price_bs and dte_bs > 0:
                    T_bs = dte_bs / 365.0
                    # Usa iv_raw di Yahoo se disponibile (anche se bassa), altrimenti sigma di default 25%
                    sigma_bs = iv_raw if iv_raw > 0.01 else 0.25
                    bs_price, _, _, _, _ = bs_greeks(underlying_price_bs, strike, T_bs, 0.045, sigma_bs, is_call)
                    if bs_price > 0:
                        mid = round(bs_price, 2)
                        price_source = "bs_theoretical"
            except Exception:
                pass

        if mid == 0:
            return None  # nessun prezzo disponibile in nessuna forma

        iv_rank = _yf_iv_rank(underlying)

        # IV: accetta valori >= 5% (0.05 in decimale). Sotto è quasi certamente dato corrotto
        # (Yahoo restituisce spesso ~3% per LEAPS illiquide con bid/ask=0).
        iv_value = round(iv_raw * 100, 1) if iv_raw >= 0.05 else None

        # Calculate Greeks using Black-Scholes if we have valid IV
        delta_val = None
        gamma_val = None
        vega_val = None
        theta_val = None

        # Fallback IV: se Yahoo non fornisce IV (o è < 5%), stimala da mid price con B-S inverso
        sigma_for_greeks = iv_raw if iv_raw >= 0.05 else None
        if sigma_for_greeks is None and mid > 0:
            try:
                underlying_price_tmp = _yf_current_price(underlying)
                from datetime import date as _date
                exp_date_tmp = _date.fromisoformat(expiry)
                dte_tmp = (exp_date_tmp - _date.today()).days
                if underlying_price_tmp and dte_tmp > 0:
                    T_tmp = dte_tmp / 365.0
                    calc_iv = implied_volatility_bs(mid, underlying_price_tmp, strike, T_tmp, 0.045, is_call)
                    if calc_iv and calc_iv >= 0.01:
                        sigma_for_greeks = calc_iv
                        iv_value = round(calc_iv * 100, 1)
            except Exception:
                pass

        if sigma_for_greeks is not None:  # IV disponibile
            try:
                # Get current underlying price
                underlying_price = _yf_current_price(underlying)
                if underlying_price:
                    # Calculate DTE
                    from datetime import date
                    exp_date = date.fromisoformat(expiry)
                    dte = (exp_date - date.today()).days
                    T = dte / 365.0

                    if T > 0:
                        r = 0.045  # risk-free rate
                        _, delta, gamma, vega, theta = bs_greeks(
                            underlying_price, strike, T, r, sigma_for_greeks, is_call
                        )
                        # For puts, use absolute delta
                        delta_val = round(delta if is_call else abs(delta), 3)
                        gamma_val = round(gamma, 4)
                        vega_val = round(vega, 3)
                        theta_val = round(theta, 4)
            except Exception:
                pass  # Greeks calculation failed, leave as None

        result = OptionPrice(
            symbol_key=symbol_key,
            bid=round(bid, 2),
            ask=round(ask, 2),
            mid=mid,
            last_price=round(last_price, 2),
            price_source=price_source,
            iv=iv_value,
            iv_rank=iv_rank,
            volume=volume,
            open_interest=oi,
            delta=delta_val,
            gamma=gamma_val,
            vega=vega_val,
            theta=theta_val,
            fetched_at=datetime.utcnow().isoformat(),
        )
        _cache.set(f"optprice:{symbol_key}", result)
        return result
    except Exception:
        return None


def get_options_prices_bulk(symbol_keys: List[str]) -> Dict[str, Optional[OptionPrice]]:
    """Fetch prices for multiple option contracts in parallel."""
    results: Dict[str, Optional[OptionPrice]] = {}
    with ThreadPoolExecutor(max_workers=min(len(symbol_keys), 8)) as pool:
        futures = {pool.submit(get_option_current_price, sk): sk for sk in symbol_keys}
        for future in as_completed(futures):
            sk = futures[future]
            try:
                results[sk] = future.result()
            except Exception:
                results[sk] = None
    return results
