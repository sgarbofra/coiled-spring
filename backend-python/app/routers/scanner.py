from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app import models, schemas
from app.services.market_data import scan_yfinance, OptionResult, get_ticker_info
from app.services.data_provider import data_provider
from app.data.us_optionable_tickers import UNIVERSE_BY_CATEGORY, US_OPTIONABLE_TICKERS

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ── Schemas ───────────────────────────────────────────────────────────────────

class ScanFilters(BaseModel):
    underlyings: List[str] = ["AAPL", "SPY"]
    option_type: str = "call"
    dte_min: int = 300        # range preferenziale libro: 300-750 giorni
    dte_max: int = 750
    delta_min: float = 0.20
    delta_max: float = 0.45
    strike_min: Optional[float] = None
    strike_max: Optional[float] = None
    premium_min: Optional[float] = None
    premium_max: Optional[float] = None
    spread_pct_max: Optional[float] = None

    @field_validator("dte_min")
    @classmethod
    def dte_min_floor(cls, v: int) -> int:
        return max(v, 7)  # Allow weekly options (min 7 days)

    @field_validator("option_type")
    @classmethod
    def option_type_valid(cls, v: str) -> str:
        return v if v in ("call", "put", "both") else "call"


class ScanResult(BaseModel):
    underlying: str
    option_type: str
    strike: float
    expiration: str
    dte: int
    bid: float
    ask: float
    mid: float
    last_price: float
    spread_pct: float
    iv: float
    iv_rank: float
    delta: float
    gamma: float
    vega: float
    theta: float
    open_interest: int
    volume: int
    symbol_key: str


class ScanResponse(BaseModel):
    ok: bool
    results: List[ScanResult]
    ticker_names: dict[str, str]  # {ticker: name}


class ScanRunOut(BaseModel):
    id: int
    user_id: int
    source: str
    filters: dict
    created_at: datetime

    class Config:
        from_attributes = True


class AddToWatchlistRequest(BaseModel):
    result: ScanResult
    watchlist_id: int
    quantity: int = 1
    notes: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_scan_result(r: OptionResult) -> ScanResult:
    return ScanResult(
        underlying=r.underlying, option_type=r.option_type, strike=r.strike,
        expiration=r.expiration, dte=r.dte, bid=r.bid, ask=r.ask, mid=r.mid,
        last_price=r.last_price, spread_pct=r.spread_pct, iv=r.iv, iv_rank=r.iv_rank,
        delta=r.delta, gamma=r.gamma, vega=r.vega, theta=r.theta,
        open_interest=r.open_interest, volume=r.volume, symbol_key=r.symbol_key,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/run", response_model=ScanResponse)
@limiter.limit("10/minute")
def run_scan(
    request: Request,
    filters: ScanFilters,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    symbols = [s.upper().strip() for s in filters.underlyings if s.strip()]
    if not symbols:
        return []

    option_types = []
    if filters.option_type in ("call", "both"):
        option_types.append("call")
    if filters.option_type in ("put", "both"):
        option_types.append("put")

    extra_filters = {}
    if filters.strike_min is not None:
        extra_filters["strike_min"] = filters.strike_min
    if filters.strike_max is not None:
        extra_filters["strike_max"] = filters.strike_max
    if filters.premium_min is not None:
        extra_filters["premium_min"] = filters.premium_min
    if filters.premium_max is not None:
        extra_filters["premium_max"] = filters.premium_max
    if filters.spread_pct_max is not None:
        extra_filters["spread_pct_max"] = filters.spread_pct_max

    print(f"\n{'='*80}")
    print(f"[SCANNER ENDPOINT] Request details:")
    print(f"  Symbols: {symbols}")
    print(f"  Option types: {option_types}")
    print(f"  Delta range: {filters.delta_min}-{filters.delta_max}")
    print(f"  DTE range: {filters.dte_min}-{filters.dte_max}")
    print(f"  Extra filters: {extra_filters}")
    print(f"{'='*80}\n")

    try:
        raw_results = scan_yfinance(
            symbols=symbols,
            dte_min=filters.dte_min,
            dte_max=filters.dte_max,
            option_types=option_types,
            delta_min=filters.delta_min,
            delta_max=filters.delta_max,
            filters=extra_filters,
        )
        print(f"\n[SCANNER ENDPOINT] scan_yfinance returned {len(raw_results)} results")
        if len(raw_results) > 0:
            print(f"[SCANNER ENDPOINT] First result: {raw_results[0].underlying} {raw_results[0].option_type} K={raw_results[0].strike}")
        else:
            print(f"[SCANNER ENDPOINT] WARNING: Empty results from scan_yfinance!")
    except ValueError as ve:
        # Handle "no options data" error
        print(f"[SCANNER ENDPOINT] ValueError: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        print(f"[SCANNER ENDPOINT] Unexpected error: {type(e).__name__}: {e}")
        raise

    # Persist scan run
    scan_run = models.ScanRun(
        user_id=current_user.id,
        source="scanner_yfinance",
        filters=filters.model_dump(),
    )
    db.add(scan_run)
    db.commit()

    # Fetch ticker names
    ticker_names = {}
    for symbol in symbols:
        info = get_ticker_info(symbol)
        if info and info.get("name"):
            ticker_names[symbol] = info["name"]

    converted_results = [_to_scan_result(r) for r in raw_results]
    print(f"\n[SCANNER ENDPOINT] Returning {len(converted_results)} results to client")
    print(f"[SCANNER ENDPOINT] Ticker names: {ticker_names}")
    print(f"{'='*80}\n")

    return ScanResponse(
        ok=True,
        results=converted_results,
        ticker_names=ticker_names
    )


@router.get("/ticker-info")
def ticker_info(ticker: str):
    """Get ticker information (name and ISIN) from yfinance."""
    info = get_ticker_info(ticker.upper())
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker information not found for {ticker}"
        )
    return info


@router.get("/history", response_model=List[ScanRunOut])
def scan_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ScanRun)
        .filter(models.ScanRun.user_id == current_user.id)
        .order_by(models.ScanRun.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/results/add-to-watchlist", response_model=schemas.WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_result_to_watchlist(
    body: AddToWatchlistRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    watchlist = (
        db.query(models.Watchlist)
        .filter(
            models.Watchlist.id == body.watchlist_id,
            models.Watchlist.user_id == current_user.id,
        )
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    r = body.result
    expiration_date = date.fromisoformat(r.expiration)

    contract = (
        db.query(models.OptionContract)
        .filter(models.OptionContract.symbol_key == r.symbol_key)
        .first()
    )
    if not contract:
        contract = models.OptionContract(
            underlying=r.underlying,
            option_type=r.option_type,
            expiration=expiration_date,
            strike=r.strike,
            symbol_key=r.symbol_key,
        )
        db.add(contract)
        db.flush()

    existing = (
        db.query(models.WatchlistItem)
        .filter(
            models.WatchlistItem.watchlist_id == body.watchlist_id,
            models.WatchlistItem.option_contract_id == contract.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Contract already in watchlist")

    item = models.WatchlistItem(
        watchlist_id=body.watchlist_id,
        option_contract_id=contract.id,
        entry_premium=r.mid,
        entry_iv=r.iv / 100,
        entry_delta=r.delta,
        entry_gamma=r.gamma,
        entry_vega=r.vega,
        entry_theta=r.theta,
        quantity=body.quantity,
        notes=body.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _ = item.option_contract
    return item


@router.get("/universe")
def get_universe(current_user: models.User = Depends(get_current_user)):
    all_symbols = sorted({s for syms in UNIVERSE_BY_CATEGORY.values() for s in syms})
    return {"symbols": all_symbols, "by_category": UNIVERSE_BY_CATEGORY}


@router.get("/vol-surface/{symbol}")
@limiter.limit("5/minute")
def vol_surface(
    request: Request,
    symbol: str,
    option_type: str = "call",
    current_user: models.User = Depends(get_current_user),
):
    """
    Calcola la Superficie di Volatilità 3D per un ticker.

    Approccio matematico:
    1. Raccoglie (strike, DTE, IV) da tutte le scadenze disponibili via yfinance
    2. Filtra i punti rumorosi (IV=0, spread assenti, strike troppo lontani)
    3. Interpola sulla varianza totale W = (IV/100)² × T  (T = DTE/365)
       — più corretto della semplice interpolazione dell'IV perché rispetta
       le condizioni di assenza di arbitraggio sul calendar spread.
    4. Converte la varianza totale interpolata in IV%: IV = sqrt(W/T) × 100
    5. Riempie i NaN residui con nearest-neighbor per evitare buchi grafici
    """
    import numpy as np
    from scipy.interpolate import griddata
    import yfinance as yf
    import traceback

    print(f"\n{'='*80}")
    print(f"[VOL-SURFACE] START REQUEST for {symbol}")
    print(f"{'='*80}\n")

    sym = symbol.upper().strip()
    today = date.today()

    try:
        print(f"[VOL-SURFACE] Step 1: Fetching ticker {sym}...")
        ticker = yf.Ticker(sym)
        print(f"[VOL-SURFACE] Step 2: Getting price...")
        price = ticker.fast_info.last_price
        print(f"[VOL-SURFACE] Price: {price}")
        if not price or price <= 0:
            print(f"[VOL-SURFACE ERROR] {sym}: Invalid price {price}")
            raise HTTPException(status_code=404, detail=f"Ticker {sym} non trovato o prezzo non disponibile")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VOL-SURFACE ERROR] {sym}: Failed to get ticker - {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=404, detail=f"Ticker {sym} non trovato")

    raw: list[tuple[float, int, float, str]] = []  # (strike, dte, iv%, option_type)

    print(f"[VOL-SURFACE] Step 3: Processing option chains...")
    print(f"[VOL-SURFACE] Available expirations: {len(ticker.options or [])}")

    # Usa solo opzioni OTM: PUT per strike < prezzo, CALL per strike >= prezzo
    for exp_str in (ticker.options or []):
        try:
            exp_date = date.fromisoformat(exp_str)
            dte = (exp_date - today).days
            if dte < 7 or dte > 900:
                continue
            chain = ticker.option_chain(exp_str)

            # Processa sia CALL che PUT
            for df, opt_type in [(chain.calls, "call"), (chain.puts, "put")]:
                for _, row in df.iterrows():
                    K = float(row.get("strike", 0) or 0)
                    iv_raw = float(row.get("impliedVolatility", 0) or 0)
                    bid = float(row.get("bid", 0) or 0)
                    ask = float(row.get("ask", 0) or 0)
                    last_price = float(row.get("lastPrice", 0) or 0)

                    # Must have valid strike and IV
                    if K <= 0 or iv_raw <= 0 or iv_raw > 5.0:
                        continue
                    # Must have at least one price (bid, ask, or lastPrice)
                    if bid <= 0 and ask <= 0 and last_price <= 0:
                        continue
                    # Filter extreme strikes (too far OTM/ITM)
                    if K < price * 0.40 or K > price * 1.80:
                        continue

                    # Logica richiesta: PUT IV per ITM (K < price), CALL IV per OTM (K >= price)
                    if opt_type == "put" and K < price:
                        # ITM zone: usa PUT IV
                        raw.append((K, dte, iv_raw * 100, opt_type))
                    elif opt_type == "call" and K >= price:
                        # OTM zone: usa CALL IV
                        raw.append((K, dte, iv_raw * 100, opt_type))

        except Exception as e:
            print(f"Error processing expiration {exp_str}: {e}")
            continue

    print(f"[VOL-SURFACE] Step 4: Collected {len(raw)} valid data points")

    if len(raw) < 6:
        print(f"[VOL-SURFACE ERROR] {sym}: Only {len(raw)} valid points (need at least 6)")
        raise HTTPException(status_code=422, detail=f"Dati insufficienti per costruire la superficie ({len(raw)} punti, minimo 6)")

    print(f"[VOL-SURFACE] Step 5: Building interpolation grid...")

    try:
        strikes_arr = np.array([p[0] for p in raw])
        dtes_arr    = np.array([p[1] for p in raw])
        ivs_arr     = np.array([p[2] for p in raw])

        print(f"[VOL-SURFACE DEBUG] {sym}: {len(raw)} raw points")
        print(f"  Strike range: {strikes_arr.min():.2f} - {strikes_arr.max():.2f}")
        print(f"  DTE range: {dtes_arr.min()} - {dtes_arr.max()}")
        print(f"  IV range: {ivs_arr.min():.2f}% - {ivs_arr.max():.2f}%")

        # Griglia regolare per l'interpolazione
        n_k, n_t = 35, 25
        k_grid = np.linspace(strikes_arr.min(), strikes_arr.max(), n_k)
        t_grid = np.linspace(dtes_arr.min(),    dtes_arr.max(),    n_t)
        KK, TT = np.meshgrid(k_grid, t_grid)

        # ── Interpolazione sulla varianza totale ──────────────────────────────────
        T_yr = dtes_arr / 365.0
        total_var = (ivs_arr / 100.0) ** 2 * T_yr          # W = σ² × T

        TT_yr = TT / 365.0

        try:
            W_grid = griddata(
                (strikes_arr, dtes_arr), total_var,
                (KK, TT), method="cubic",
            )
        except Exception as interp_error:
            print(f"[VOL-SURFACE WARNING] {sym}: Cubic interpolation failed, falling back to linear")
            print(f"  Error: {interp_error}")
            try:
                W_grid = griddata(
                    (strikes_arr, dtes_arr), total_var,
                    (KK, TT), method="linear",
                )
            except Exception as linear_error:
                print(f"[VOL-SURFACE ERROR] {sym}: Linear interpolation also failed")
                print(f"  Error: {linear_error}")
                raise HTTPException(
                    status_code=500,
                    detail="Impossibile interpolare i dati di volatilità. Provare con un ticker diverso."
                )

        # Converti W → IV%
        with np.errstate(invalid="ignore", divide="ignore"):
            Z = np.sqrt(np.maximum(W_grid, 0) / np.maximum(TT_yr, 1e-4)) * 100.0

        # Riempi NaN con nearest-neighbor
        nan_mask = np.isnan(Z)
        if nan_mask.any():
            Z_nn = griddata(
                (strikes_arr, dtes_arr), ivs_arr,
                (KK, TT), method="nearest",
            )
            Z[nan_mask] = Z_nn[nan_mask]

        # Clip valori irragionevoli
        Z = np.clip(Z, 1.0, 300.0)

        print(f"[VOL-SURFACE] Step 6: Preparing response data...")
        print(f"[VOL-SURFACE SUCCESS] {sym}: Surface built successfully")

        response_data = {
            "symbol": sym,
            "current_price": round(float(price), 2),
            "option_type": "mixed",  # PUT IV for ITM (K<price), CALL IV for OTM (K>=price)
            "x_strikes": [round(v, 2) for v in k_grid.tolist()],
            "y_dtes":    [int(v) for v in t_grid.tolist()],
            "z_iv":      [[round(v, 2) for v in row] for row in Z.tolist()],
            "raw_points": [
                {"strike": round(p[0], 2), "dte": p[1], "iv": round(p[2], 1), "option_type": p[3]}
                for p in raw
            ],
            "n_raw": len(raw),
        }

        print(f"[VOL-SURFACE] Response data prepared, size: {len(str(response_data))} chars")
        print(f"[VOL-SURFACE] Returning response...")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"\n{'='*80}")
        print(f"[VOL-SURFACE ERROR] {sym}: Surface calculation failed")
        print(f"  Error type: {type(e).__name__}")
        print(f"  Error message: {e}")
        print(f"{'='*80}")
        traceback.print_exc()
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=500,
            detail=f"Errore nel calcolo della superficie di volatilità: {type(e).__name__}: {str(e)}"
        )
