from collections import defaultdict
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func as sql_func
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app import models, schemas
from app.services.market_data import scan_yfinance, OptionResult, get_ticker_info, bs_greeks, get_atm_iv_snapshot
from app.services.data_provider import data_provider
from app.data.us_optionable_tickers import UNIVERSE_BY_CATEGORY, US_OPTIONABLE_TICKERS, get_iv_snapshot_universe

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
    price_source: str = "mid"   # "mid" = liquid | "last" = illiquid/stale
    is_stale: bool = False       # True when price_source == "last"


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


def _save_iv_history(db: Session, results: List[ScanResult]) -> None:
    """Salva IV media per ticker unico dopo ogni scan.

    Strategia: un record per ticker per giorno (upsert-like — se oggi c'è già
    un record per quel ticker, lo aggiorna invece di duplicare).
    IV salvata come decimale: r.iv è percentuale (25.0) → salviamo 0.25.
    """
    if not results:
        return

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # Raggruppa IV per ticker e calcola media
    ticker_ivs: Dict[str, List[float]] = defaultdict(list)
    for r in results:
        if r.iv > 0:
            ticker_ivs[r.underlying].append(r.iv / 100.0)  # converti % → decimale

    now = datetime.now(timezone.utc)
    updated = 0
    inserted = 0

    for ticker, ivs in ticker_ivs.items():
        avg_iv = sum(ivs) / len(ivs)

        # Cerca record di oggi per questo ticker (evita duplicati giornalieri)
        existing = (
            db.query(models.IVHistory)
            .filter(
                models.IVHistory.ticker == ticker,
                models.IVHistory.recorded_at >= today_start,
            )
            .first()
        )

        if existing:
            # Aggiorna la media di oggi (media mobile tra vecchio e nuovo)
            existing.iv = (existing.iv + avg_iv) / 2.0
            updated += 1
        else:
            # dte_bucket=30 per scan-triggered (bootstrap — IV da LEAPS approssimata)
            db.add(models.IVHistory(ticker=ticker, iv=avg_iv, dte_bucket=30, recorded_at=now))
            inserted += 1

    db.commit()
    print(f"[IV_HISTORY] Saved: {inserted} new, {updated} updated for {len(ticker_ivs)} tickers")


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

    converted_results = [_to_scan_result(r) for r in raw_results]

    # Salva IV history in background (non blocca la risposta)
    try:
        _save_iv_history(db, converted_results)
    except Exception as e:
        print(f"[IV_HISTORY] Non-critical save error: {e}")

    # Fetch ticker names
    ticker_names = {}
    for symbol in symbols:
        info = get_ticker_info(symbol)
        if info and info.get("name"):
            ticker_names[symbol] = info["name"]

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


def _cs_score(abs_delta: float, vega: float, dte: int, spread_pct: float, oi: int) -> int:
    """Replica Python di computeCandidateScore (TypeScript cs-score.ts)."""
    # Delta band
    if   0.18 <= abs_delta <= 0.25: ds = 100
    elif 0.25 < abs_delta  <= 0.30: ds = 95
    elif 0.15 <= abs_delta <  0.18: ds = 90
    elif 0.30 < abs_delta  <= 0.35: ds = 85
    elif 0.10 <= abs_delta <  0.15: ds = 70
    elif 0.35 < abs_delta  <= 0.40: ds = 65
    elif abs_delta < 0.10:          ds = 30
    else:                            ds = 25
    # DTE
    dte_s = min(dte / 730, 1) * 100
    # Liquidity
    sp_comp = max(0.0, 1 - spread_pct / 100)
    if oi == 0:
        liq_s = sp_comp * 100
    else:
        raw_liq = sp_comp * 60 + min(oi / 500, 1) * 40
        liq_s = min(raw_liq, 39) if oi < 100 else raw_liq
    # Vega
    vega_s = min(vega / 1.0, 1) * 100
    raw_score = round(vega_s * 0.35 + dte_s * 0.30 + liq_s * 0.20 + ds * 0.15)
    return min(raw_score, 69) if dte < 300 else raw_score


@router.get("/iv-ranks")
def get_iv_ranks(
    tickers: str = Query(..., description="Comma-separated tickers, e.g. AAPL,NVDA"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restituisce IV percentile per una lista di ticker.

    Calcola percentile 30d/90d/252d rispetto allo storico accumulato.
    Ritorna null per ticker con < 10 data points (insufficienti).

    Response: { "AAPL": { percentile_30d, percentile_90d, percentile_252d,
                           data_points, days_tracked, current_iv } | null, ... }
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list or len(ticker_list) > 50:
        raise HTTPException(status_code=400, detail="Provide 1-50 tickers")

    now = datetime.now(timezone.utc)
    cutoffs = {
        "30d":  now - timedelta(days=30),
        "90d":  now - timedelta(days=90),
        "252d": now - timedelta(days=252),
    }

    result: Dict[str, Optional[dict]] = {}

    for ticker in ticker_list:
        # Solo bucket 30d (ATM ~30 DTE) per calcolare IV Rank standard
        all_rows = (
            db.query(models.IVHistory.iv, models.IVHistory.recorded_at)
            .filter(
                models.IVHistory.ticker == ticker,
                models.IVHistory.dte_bucket == 30,
                models.IVHistory.recorded_at >= cutoffs["252d"],
            )
            .order_by(models.IVHistory.recorded_at.asc())
            .all()
        )

        if not all_rows:
            result[ticker] = None
            continue

        all_ivs = [row.iv for row in all_rows]
        current_iv = all_ivs[-1]  # IV più recente
        data_points = len(all_ivs)

        # Calcola percentile: % di valori storici <= current_iv
        def _pct(ivs: List[float]) -> Optional[float]:
            if len(ivs) < 10:
                return None
            below = sum(1 for v in ivs if v <= current_iv)
            return round(below / len(ivs) * 100, 1)

        # Filtra per finestra temporale
        rows_30d  = [row.iv for row in all_rows if row.recorded_at >= cutoffs["30d"]]
        rows_90d  = [row.iv for row in all_rows if row.recorded_at >= cutoffs["90d"]]

        oldest = all_rows[0].recorded_at
        days_tracked = max(1, (now - oldest).days)

        result[ticker] = {
            "current_iv":     round(current_iv * 100, 2),   # restituisce come %
            "percentile_30d": _pct(rows_30d),
            "percentile_90d": _pct(rows_90d),
            "percentile_252d": _pct(all_ivs),
            "data_points":    data_points,
            "days_tracked":   days_tracked,
        }

    return result


@router.get("/validate-ticker/{ticker}")
def validate_ticker(ticker: str):
    """Verifica se un ticker esiste su Yahoo Finance e ha opzioni disponibili.

    Usato dal frontend per la validazione in tempo reale (debounced).
    Nessuna autenticazione richiesta — market data pubblico.

    Risposta: { ticker, valid, has_options, price, reason }
    """
    import yfinance as yf
    from app.services.market_data import _yf_current_price

    symbol = ticker.upper().strip()

    # Sanity check: ticker deve essere 1-6 caratteri alfanumerici + punto
    import re
    if not re.match(r'^[A-Z0-9.]{1,6}$', symbol):
        return {
            "ticker": symbol,
            "valid": False,
            "has_options": False,
            "price": None,
            "reason": "Formato ticker non valido",
        }

    try:
        t = yf.Ticker(symbol)
        options = t.options  # tupla di date di scadenza — vuota se nessuna opzione
        has_options = bool(options)
        price = _yf_current_price(symbol)

        return {
            "ticker": symbol,
            "valid": has_options and price is not None,
            "has_options": has_options,
            "price": price,
            "reason": (
                None if (has_options and price is not None)
                else "Nessuna opzione disponibile su Yahoo Finance" if not has_options
                else "Prezzo non disponibile — ticker potrebbe non essere un'azione US"
            ),
        }
    except Exception as e:
        return {
            "ticker": symbol,
            "valid": False,
            "has_options": False,
            "price": None,
            "reason": f"Ticker non trovato ({type(e).__name__})",
        }


@router.get("/iv-history/{ticker}")
def get_iv_history(
    ticker: str,
    db: Session = Depends(get_db),
):
    """Ritorna tutto lo storico IV ATM salvato per un ticker, tutti i DTE bucket.

    Risposta: { ticker, count, records: [{date, dte_bucket, iv_pct}] }
    Ordinato per data DESC. Limite 500 record (>1 anno di storia per 4 bucket).
    """
    records = (
        db.query(models.IVHistory)
        .filter(models.IVHistory.ticker == ticker.upper())
        .order_by(models.IVHistory.recorded_at.desc())
        .limit(500)
        .all()
    )

    return {
        "ticker": ticker.upper(),
        "count": len(records),
        "records": [
            {
                "date": r.recorded_at.strftime("%Y-%m-%d"),
                "dte_bucket": r.dte_bucket,
                "iv_pct": round(r.iv * 100, 2),  # decimal → percentuale
            }
            for r in records
        ],
    }


@router.post("/iv-refresh/{ticker}")
def iv_refresh_single(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch ATM IV on-demand per un singolo ticker su tutti i DTE bucket.

    Salva i record in iv_history (upsert per oggi).
    Utile quando lo storico è ancora vuoto (prima del primo cron giornaliero).

    Returns: { ticker, records: [{dte_bucket, iv_pct}], saved }
    """
    from app.services.market_data import _get_all_dte_ivs
    import math as _math

    symbol = ticker.upper().strip()
    DTE_BUCKETS = [30, 60, 90, 180]

    # Fetch IV da yfinance (1 chiamata, 4 bucket)
    bucket_ivs = _get_all_dte_ivs(symbol, DTE_BUCKETS)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    saved = 0
    records = []

    for dte_bucket, iv in bucket_ivs.items():
        if iv is None or _math.isnan(iv):
            continue

        # Upsert: evita duplicati per (ticker, dte_bucket, today)
        existing = (
            db.query(models.IVHistory)
            .filter(
                models.IVHistory.ticker == symbol,
                models.IVHistory.dte_bucket == dte_bucket,
                models.IVHistory.recorded_at >= today_start,
            )
            .first()
        )
        if existing:
            existing.iv = (existing.iv + iv) / 2.0  # media mobile
        else:
            db.add(models.IVHistory(ticker=symbol, iv=iv, dte_bucket=dte_bucket, recorded_at=now))
        saved += 1
        records.append({"dte_bucket": dte_bucket, "iv_pct": round(iv * 100, 2)})

    db.commit()
    print(f"[IV_REFRESH] {symbol}: {saved} bucket(s) saved")

    return {"ticker": symbol, "records": records, "saved": saved}


@router.post("/iv-snapshot", include_in_schema=False)
def iv_snapshot(
    background_tasks: BackgroundTasks,
    x_internal_key: str = Header(...),
    db: Session = Depends(get_db),
):
    """Endpoint interno — chiamato dal cron giornaliero (APScheduler o Railway Cron).

    Esegue snapshot ATM IV per tutti i ticker della universe su 4 DTE bucket.
    Protetto da header X-Internal-Key (settings.cron_internal_key).
    Non esposto nella documentazione OpenAPI (include_in_schema=False).
    """
    from app.config import settings

    if x_internal_key != settings.cron_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")

    DTE_BUCKETS = [30, 60, 90, 180]
    tickers = get_iv_snapshot_universe()  # 277 curati + S&P 500 ≈ 500-550 ticker unici

    def _run_snapshot():
        """Eseguito in background — non blocca la risposta HTTP."""
        print(f"[IV_SNAPSHOT] Starting daily snapshot for {len(tickers)} tickers × {len(DTE_BUCKETS)} buckets")
        snapshot = get_atm_iv_snapshot(tickers, DTE_BUCKETS)

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        saved = 0
        skipped = 0

        # Usa una sessione dedicata per il background task
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            for ticker, bucket_ivs in snapshot.items():
                for dte_bucket, iv in bucket_ivs.items():
                    if iv is None:
                        skipped += 1
                        continue

                    # Evita duplicati: un record per ticker×bucket per giorno
                    existing = (
                        bg_db.query(models.IVHistory)
                        .filter(
                            models.IVHistory.ticker == ticker,
                            models.IVHistory.dte_bucket == dte_bucket,
                            models.IVHistory.recorded_at >= today_start,
                        )
                        .first()
                    )
                    if existing:
                        # Media mobile se eseguito più volte nello stesso giorno
                        existing.iv = (existing.iv + iv) / 2.0
                    else:
                        bg_db.add(models.IVHistory(
                            ticker=ticker,
                            iv=iv,
                            dte_bucket=dte_bucket,
                            recorded_at=now,
                        ))
                    saved += 1

            bg_db.commit()
            print(f"[IV_SNAPSHOT] Done: {saved} saved, {skipped} skipped (no data)")
        except Exception as e:
            print(f"[IV_SNAPSHOT] Error during save: {e}")
            bg_db.rollback()
        finally:
            bg_db.close()

    background_tasks.add_task(_run_snapshot)
    return {"ok": True, "message": f"Snapshot started for {len(tickers)} tickers"}


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

    raw: list[dict] = []  # {strike, dte, iv, option_type, delta, vega, spread_pct, open_interest, cs_score}

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
                    is_call = (opt_type == "call")
                    if (opt_type == "put" and K < price) or (opt_type == "call" and K >= price):
                        oi_val = int(row.get("openInterest", 0) or 0)
                        if bid > 0 and ask > 0:
                            mid_p = (bid + ask) / 2
                            sp = (ask - bid) / mid_p * 100
                        else:
                            sp = 100.0
                        T_yr = dte / 365.0
                        _, bs_delta, _, bs_vega, _ = bs_greeks(price, K, T_yr, 0.05, iv_raw, is_call)
                        cs = _cs_score(abs(bs_delta), bs_vega, dte, sp, oi_val)
                        raw.append({
                            "strike": K, "dte": dte, "iv": round(iv_raw * 100, 2),
                            "option_type": opt_type,
                            "delta": round(bs_delta, 4),
                            "vega": round(bs_vega, 4),
                            "spread_pct": round(sp, 1),
                            "open_interest": oi_val,
                            "cs_score": cs,
                        })

        except Exception as e:
            print(f"Error processing expiration {exp_str}: {e}")
            continue

    print(f"[VOL-SURFACE] Step 4: Collected {len(raw)} valid data points")

    if len(raw) < 6:
        print(f"[VOL-SURFACE ERROR] {sym}: Only {len(raw)} valid points (need at least 6)")
        raise HTTPException(status_code=422, detail=f"Dati insufficienti per costruire la superficie ({len(raw)} punti, minimo 6)")

    print(f"[VOL-SURFACE] Step 5: Building interpolation grid...")

    try:
        strikes_arr = np.array([p["strike"] for p in raw])
        dtes_arr    = np.array([p["dte"]    for p in raw])
        ivs_arr     = np.array([p["iv"]     for p in raw])
        cs_arr      = np.array([p["cs_score"] for p in raw], dtype=float)

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

        # ── Interpolazione CS Score ───────────────────────────────────────────
        try:
            Z_cs = griddata(
                (strikes_arr, dtes_arr), cs_arr,
                (KK, TT), method="linear",
            )
            nan_mask_cs = np.isnan(Z_cs)
            if nan_mask_cs.any():
                Z_cs_nn = griddata(
                    (strikes_arr, dtes_arr), cs_arr,
                    (KK, TT), method="nearest",
                )
                Z_cs[nan_mask_cs] = Z_cs_nn[nan_mask_cs]
            Z_cs = np.clip(Z_cs, 0.0, 100.0)
        except Exception:
            Z_cs = np.full_like(Z, fill_value=50.0)

        print(f"[VOL-SURFACE] Step 6: Preparing response data...")
        print(f"[VOL-SURFACE SUCCESS] {sym}: Surface built successfully")

        response_data = {
            "symbol": sym,
            "current_price": round(float(price), 2),
            "option_type": "mixed",
            "x_strikes": [round(v, 2) for v in k_grid.tolist()],
            "y_dtes":    [int(v) for v in t_grid.tolist()],
            "z_iv":      [[round(v, 2) for v in row] for row in Z.tolist()],
            "z_cs":      [[round(v, 1) for v in row] for row in Z_cs.tolist()],
            "raw_points": [
                {
                    "strike": p["strike"], "dte": p["dte"], "iv": p["iv"],
                    "option_type": p["option_type"], "delta": p["delta"],
                    "vega": p["vega"], "spread_pct": p["spread_pct"],
                    "open_interest": p["open_interest"], "cs_score": p["cs_score"],
                }
                for p in raw
            ],
            "n_raw": len(raw),
        }

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"[VOL-SURFACE ERROR] {sym}: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Errore nel calcolo della superficie: {type(e).__name__}: {str(e)}"
             )
