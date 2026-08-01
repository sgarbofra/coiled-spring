from pathlib import Path
from dotenv import load_dotenv

# Carica .env PRIMA di qualsiasi import locale
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Solo DOPO caricare gli import locali
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List
from fastapi import FastAPI, Request, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import pandas as pd
import yfinance as yf

from app.config import settings
from app.database import Base, engine
from app.dependencies import get_db
from app.routers import academy, admin, ai_chat, auth, auth_google, broker, etf_calendar, hv_screener, internal, market, notes, paper_trading, portfolio, scanner, sp500_calendar, stripe, watchlist_items, watchlists
from sqlalchemy.orm import Session

import app.models  # noqa: F401 — registers all models with Base

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


def _run_daily_iv_snapshot():
    """Job APScheduler — eseguito ogni giorno alle 16:30 UTC (dopo chiusura mercato US).

    Chiama l'endpoint interno usando la porta dinamica Railway ($PORT).
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/scanner/iv-snapshot",
            headers={"x-internal-key": key},
            timeout=10,
        )
        print(f"[CRON] IV snapshot triggered: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger IV snapshot: {e}")


def _run_daily_hv_snapshot():
    """Job APScheduler — eseguito ogni giorno alle 17:00 UTC (30 min dopo chiusura).

    Ricalcola HV30/Rank/Pct per tutti i ticker dell'universo e fa upsert in hv_snapshots.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/hv-screener/refresh",
            headers={"x-internal-key": key},
            timeout=10,
        )
        print(f"[CRON] HV snapshot triggered: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger HV snapshot: {e}")


def _run_weekly_ticker_validate():
    """Job APScheduler — ogni domenica alle 02:00 UTC.

    Valida via yfinance tutti i ticker is_valid=True,
    marcando come delisted quelli senza dati recenti.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/internal/ticker-universe-validate",
            headers={"X-Internal-Token": key},
            timeout=15,
        )
        print(f"[CRON] Ticker universe validate triggered: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger ticker universe validate: {e}")


def _run_paper_trading_scan():
    """Job APScheduler — ogni giorno alle 16:30 Europe/Rome (≈1h dopo apertura mercato US).

    Esegue lo scanner paper trading HV Long PUT LEAPS:
    manutenzione posizioni aperte + scan nuovi ingressi + diary.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/paper-trading/run",
            headers={"x-internal-key": key},
            timeout=300,  # 5 minuti: scan di centinaia di ticker richiede tempo
        )
        print(f"[CRON] Paper trading scan triggered: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger paper trading scan: {e}")


def _run_etf_calendar_scan():
    """Job APScheduler — ogni giorno alle 17:30 Europe/Rome (dopo HV refresh delle 17:00 UTC).

    Esegue lo scan ETF Calendar Monitor: fetcha option chain per 15 ETF,
    calcola credit% normalizzato e z-score 52w, salva snapshot in DB.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/etf-calendar/refresh",
            headers={"x-internal-key": key},
            timeout=120,  # 15 ETF × ~5s/ETF = ~75s max
        )
        print(f"[CRON] ETF calendar scan triggered: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger ETF calendar scan: {e}")


def _run_sp500_calendar_scan():
    """Job APScheduler — ogni giorno alle 18:00 Europe/Rome.

    Esegue lo scan S&P 500 Calendar Monitor: fetcha option chain per ~503 titoli
    in batch da 50, calcola credit% normalizzato e z-score 52w, salva in DB.
    Timeout 600s: 503 ticker × ~1.5s/ticker (incluso sleep) ≈ 750s worst case,
    ma con skip rapidi su titoli senza opzioni il reale è ~400-500s.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/sp500-calendar/refresh",
            headers={"x-internal-key": key},
            timeout=600,  # ~500 titoli × ~1.2s avg = ~600s
        )
        print(f"[CRON] S&P500 calendar scan triggered: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger S&P500 calendar scan: {e}")


def _run_monthly_ticker_refresh():
    """Job APScheduler — il 1° di ogni mese alle 01:00 UTC.

    Fetch Wikipedia S&P 500 + S&P 400, aggiunge nuovi ticker,
    riattiva eventuali re-listing, poi valida l'intero universo.
    """
    import os, requests as _requests
    port = os.environ.get("PORT", "8080")
    try:
        key = settings.cron_internal_key
        resp = _requests.post(
            f"http://localhost:{port}/api/internal/ticker-universe-refresh",
            headers={"X-Internal-Token": key},
            timeout=15,
        )
        print(f"[CRON] Ticker universe refresh triggered: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[CRON] Failed to trigger ticker universe refresh: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea tabelle nuove (non tocca quelle esistenti)
    Base.metadata.create_all(bind=engine)

    # Migration: aggiungi dte_bucket a iv_history se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE iv_history ADD COLUMN IF NOT EXISTS dte_bucket INTEGER NOT NULL DEFAULT 30"
            ))
            conn.commit()
            print("[MIGRATION] iv_history.dte_bucket OK")
    except Exception as e:
        # Colonna già presente o DB non PostgreSQL — non bloccare l'avvio
        print(f"[MIGRATION] dte_bucket skip: {e}")

    # Migration: aggiungi google_id a users se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE"
            ))
            conn.commit()
            print("[MIGRATION] users.google_id OK")
    except Exception as e:
        print(f"[MIGRATION] google_id skip: {e}")

    # Migration: aggiungi privacy_accepted a users se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ"
            ))
            conn.commit()
            print("[MIGRATION] users.privacy_accepted OK")
    except Exception as e:
        print(f"[MIGRATION] privacy_accepted skip: {e}")

    # Migration: crea newsletter_log se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS newsletter_log (
                    id                SERIAL PRIMARY KEY,
                    run_date          TIMESTAMPTZ NOT NULL,
                    week_key          TEXT UNIQUE NOT NULL,
                    tickers_scanned   INTEGER NOT NULL DEFAULT 0,
                    setups_found      INTEGER NOT NULL DEFAULT 0,
                    tickers_published INTEGER NOT NULL DEFAULT 0,
                    substack_draft_id TEXT,
                    status            TEXT NOT NULL DEFAULT 'running',
                    error_message     TEXT,
                    created_at        TIMESTAMPTZ DEFAULT now()
                )
            """))
            conn.commit()
            print("[MIGRATION] newsletter_log OK")
    except Exception as e:
        print(f"[MIGRATION] newsletter_log skip: {e}")

    # Migration: aggiungi hv30_parkinson a hv_snapshots se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE hv_snapshots ADD COLUMN IF NOT EXISTS hv30_parkinson REAL"
            ))
            conn.commit()
            print("[MIGRATION] hv_snapshots.hv30_parkinson OK")
    except Exception as e:
        print(f"[MIGRATION] hv30_parkinson skip: {e}")

    # Migration: aggiungi HV multi-window e compression_streak a hv_snapshots
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            for col in ["hv20", "hv60", "hv252"]:
                conn.execute(text(
                    f"ALTER TABLE hv_snapshots ADD COLUMN IF NOT EXISTS {col} REAL"
                ))
            conn.execute(text(
                "ALTER TABLE hv_snapshots ADD COLUMN IF NOT EXISTS compression_streak INTEGER DEFAULT 0"
            ))
            conn.commit()
            print("[MIGRATION] hv_snapshots multi-window + compression_streak OK")
    except Exception as e:
        print(f"[MIGRATION] hv_snapshots multi-window skip: {e}")

    # Migration: crea tabelle paper trading (pt_positions, pt_diary)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pt_positions (
                    id           SERIAL PRIMARY KEY,
                    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
                    ticker       TEXT NOT NULL,
                    trade_id     INTEGER REFERENCES portfolio_trades(id) ON DELETE SET NULL,
                    roll_count   INTEGER NOT NULL DEFAULT 0,
                    pause_until  DATE,
                    signal_details JSONB NOT NULL DEFAULT '{}',
                    created_at   TIMESTAMPTZ DEFAULT now(),
                    updated_at   TIMESTAMPTZ DEFAULT now(),
                    CONSTRAINT pt_positions_portfolio_ticker_unique UNIQUE (portfolio_id, ticker)
                )
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pt_diary (
                    id                  SERIAL PRIMARY KEY,
                    portfolio_id        INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
                    diary_date          DATE NOT NULL,
                    tickers_scanned     INTEGER NOT NULL DEFAULT 0,
                    tickers_eligible    INTEGER NOT NULL DEFAULT 0,
                    filter_level_used   INTEGER NOT NULL DEFAULT 0,
                    trades_opened       INTEGER NOT NULL DEFAULT 0,
                    trades_closed_sl    INTEGER NOT NULL DEFAULT 0,
                    trades_closed_tp    INTEGER NOT NULL DEFAULT 0,
                    trades_rolled       INTEGER NOT NULL DEFAULT 0,
                    scan_details        JSONB NOT NULL DEFAULT '{}',
                    report_md           TEXT NOT NULL DEFAULT '',
                    created_at          TIMESTAMPTZ DEFAULT now(),
                    CONSTRAINT pt_diary_portfolio_date_unique UNIQUE (portfolio_id, diary_date)
                )
            """))
            conn.commit()
            print("[MIGRATION] pt_positions + pt_diary OK")
    except Exception as e:
        print(f"[MIGRATION] paper trading tables skip: {e}")

    # Migration: crea etf_calendar_snapshots se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS etf_calendar_snapshots (
                    id                SERIAL PRIMARY KEY,
                    ticker            TEXT NOT NULL,
                    snap_date         DATE NOT NULL,
                    spot_price        REAL,
                    iv_30d            REAL,
                    iv_60d            REAL,
                    iv_90d            REAL,
                    credit_30v60_pct  REAL,
                    credit_30v90_pct  REAL,
                    credit_60v90_pct  REAL,
                    z_score_30v60     REAL,
                    z_score_30v90     REAL,
                    z_score_60v90     REAL,
                    signal_30v60      TEXT,
                    history_days      INTEGER DEFAULT 0,
                    computed_at       TIMESTAMPTZ,
                    CONSTRAINT etf_cal_ticker_date_unique UNIQUE (ticker, snap_date)
                )
            """))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS etf_cal_ticker_date_idx "
                "ON etf_calendar_snapshots(ticker, snap_date)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS etf_cal_signal_idx "
                "ON etf_calendar_snapshots(signal_30v60, snap_date)"
            ))
            conn.commit()
            print("[MIGRATION] etf_calendar_snapshots OK")
    except Exception as e:
        print(f"[MIGRATION] etf_calendar_snapshots skip: {e}")

    # Migration: crea sp500_calendar_snapshots se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sp500_calendar_snapshots (
                    id                SERIAL PRIMARY KEY,
                    ticker            TEXT NOT NULL,
                    snap_date         DATE NOT NULL,
                    spot_price        DOUBLE PRECISION,
                    iv_30d            DOUBLE PRECISION,
                    iv_60d            DOUBLE PRECISION,
                    iv_90d            DOUBLE PRECISION,
                    credit_30v60_pct  DOUBLE PRECISION,
                    credit_30v90_pct  DOUBLE PRECISION,
                    credit_60v90_pct  DOUBLE PRECISION,
                    z_score_30v60     DOUBLE PRECISION,
                    z_score_30v90     DOUBLE PRECISION,
                    z_score_60v90     DOUBLE PRECISION,
                    signal_30v60      TEXT,
                    history_days      INTEGER DEFAULT 0,
                    computed_at       TIMESTAMPTZ,
                    CONSTRAINT sp500_cal_ticker_date_unique UNIQUE (ticker, snap_date)
                )
            """))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS sp500_cal_ticker_date_idx "
                "ON sp500_calendar_snapshots(ticker, snap_date)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS sp500_cal_signal_idx "
                "ON sp500_calendar_snapshots(signal_30v60, snap_date)"
            ))
            conn.commit()
            print("[MIGRATION] sp500_calendar_snapshots OK")
    except Exception as e:
        print(f"[MIGRATION] sp500_calendar_snapshots skip: {e}")

    # Migration: crea ticker_universe se non esiste
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ticker_universe (
                    id           SERIAL PRIMARY KEY,
                    ticker       TEXT NOT NULL UNIQUE,
                    category     TEXT NOT NULL DEFAULT 'other',
                    source       TEXT NOT NULL DEFAULT 'static',
                    is_valid     BOOLEAN NOT NULL DEFAULT TRUE,
                    last_checked TIMESTAMPTZ,
                    delisted_at  TIMESTAMPTZ,
                    added_at     TIMESTAMPTZ DEFAULT now()
                )
            """))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ticker_universe_valid_idx ON ticker_universe(is_valid, category)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ticker_universe_checked_idx ON ticker_universe(last_checked)"
            ))
            conn.commit()
            print("[MIGRATION] ticker_universe OK")
    except Exception as e:
        print(f"[MIGRATION] ticker_universe skip: {e}")

    # Seed ticker_universe al primo avvio (no-op se già popolato)
    try:
        from app.database import SessionLocal as _SessionLocal
        from app.services.ticker_validator import seed_db_from_static as _seed
        _seed_db = _SessionLocal()
        try:
            from app import models as _models
            count = _seed_db.query(_models.TickerUniverse).count()
            if count == 0:
                inserted = _seed(_seed_db)
                print(f"[STARTUP] ticker_universe seedato: {inserted} ticker")
            else:
                print(f"[STARTUP] ticker_universe già popolato: {count} ticker")
        finally:
            _seed_db.close()
    except Exception as e:
        print(f"[STARTUP] ticker_universe seed fallito (non bloccante): {e}")

    # APScheduler: daily IV snapshot alle 16:30 UTC
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        _run_daily_iv_snapshot,
        trigger="cron",
        hour=16,
        minute=30,
        id="daily_iv_snapshot",
        replace_existing=True,
    )
    scheduler.add_job(
        _run_daily_hv_snapshot,
        trigger="cron",
        hour=17,
        minute=0,
        id="daily_hv_snapshot",
        replace_existing=True,
    )
    # Paper trading scan — ogni giorno alle 16:30 Europe/Rome
    # (≈10:30-11:30 ET, 1-2h dopo apertura mercato US — prezzi opzioni stabili)
    scheduler.add_job(
        _run_paper_trading_scan,
        trigger="cron",
        hour=16,
        minute=30,
        timezone="Europe/Rome",
        id="daily_pt_scan",
        replace_existing=True,
    )
    # ETF Calendar scan — ogni giorno alle 17:30 Europe/Rome (dopo HV refresh)
    scheduler.add_job(
        _run_etf_calendar_scan,
        trigger="cron",
        hour=17,
        minute=30,
        timezone="Europe/Rome",
        id="daily_etf_calendar_scan",
        replace_existing=True,
    )
    # S&P 500 Calendar scan — ogni giorno alle 18:00 Europe/Rome (30min dopo ETF scan)
    scheduler.add_job(
        _run_sp500_calendar_scan,
        trigger="cron",
        hour=18,
        minute=0,
        timezone="Europe/Rome",
        id="daily_sp500_calendar_scan",
        replace_existing=True,
    )
    # Validazione settimanale ticker universe — domenica alle 02:00 UTC
    scheduler.add_job(
        _run_weekly_ticker_validate,
        trigger="cron",
        day_of_week="sun",
        hour=2,
        minute=0,
        id="weekly_ticker_validate",
        replace_existing=True,
    )
    # Refresh mensile ticker universe — 1° del mese alle 01:00 UTC
    scheduler.add_job(
        _run_monthly_ticker_refresh,
        trigger="cron",
        day=1,
        hour=1,
        minute=0,
        id="monthly_ticker_refresh",
        replace_existing=True,
    )
    scheduler.start()
    print("[SCHEDULER] Daily IV snapshot scheduled at 16:30 UTC")
    print("[SCHEDULER] Daily HV snapshot scheduled at 17:00 UTC")
    print("[SCHEDULER] ETF calendar scan scheduled at 17:30 Europe/Rome")
    print("[SCHEDULER] Paper trading scan scheduled at 16:30 Europe/Rome")
    print("[SCHEDULER] Weekly ticker universe validate scheduled Sunday 02:00 UTC")
    print("[SCHEDULER] Monthly ticker universe refresh scheduled 1st-of-month 01:00 UTC")

    # Pre-carica la lista S&P500 in cache al startup (evita lazy load al primo cron)
    try:
        from app.data.us_optionable_tickers import get_iv_snapshot_universe
        universe = get_iv_snapshot_universe()
        print(f"[STARTUP] IV snapshot universe pre-loaded: {len(universe)} tickers")
    except Exception as e:
        print(f"[STARTUP] Universe pre-load failed (non bloccante): {e}")

    yield

    scheduler.shutdown(wait=False)
    print("[SCHEDULER] Shutdown")


app = FastAPI(
    title="Coiled Spring API",
    version="0.1.0",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter

# Add rate limit exceeded handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait before retrying."}
    )

# Build CORS allowed origins list
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

# Add production origins from environment variable if set
if settings.cors_origins:
    production_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    allowed_origins.extend(production_origins)
    # Also add www. variant for each https:// origin that doesn't already have it
    for origin in production_origins:
        if origin.startswith("https://") and not origin.startswith("https://www."):
            allowed_origins.append(origin.replace("https://", "https://www.", 1))
        elif origin.startswith("https://www."):
            # Also add non-www variant
            allowed_origins.append(origin.replace("https://www.", "https://", 1))

# Remove duplicates while preserving order
seen = set()
allowed_origins = [o for o in allowed_origins if not (o in seen or seen.add(o))]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(academy.router, prefix="/api/academy", tags=["academy"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_google.router, prefix="/api/auth/google", tags=["auth-google"])
app.include_router(broker.router, prefix="/api/broker", tags=["broker"])
app.include_router(stripe.router, prefix="/api/stripe", tags=["stripe"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(watchlist_items.router, prefix="/api/watchlists", tags=["watchlist-items"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["ai-chat"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(hv_screener.router, prefix="/api/hv-screener", tags=["hv-screener"])
app.include_router(paper_trading.router, prefix="/api/paper-trading", tags=["paper-trading"])
app.include_router(etf_calendar.router, prefix="/api/etf-calendar", tags=["etf-calendar"])
app.include_router(sp500_calendar.router, prefix="/api/sp500-calendar", tags=["sp500-calendar"])
app.include_router(internal.router, prefix="/api/internal", tags=["internal"])


# Market movers - uses yahooquery in app.routers.market (cached 15min)


@app.get("/api/public/market-movers")
def get_market_movers():
    """
    Public endpoint - no auth required.
    Returns top 10 gainers and losers from real-time Yahoo Finance data.
    Cached for 15 minutes.
    """
    # Delegate to the market router endpoint which has yahooquery implementation
    from app.routers.market import get_market_movers as get_movers_impl
    return get_movers_impl()


# Cache TTL
CACHE_TTL = timedelta(minutes=15)

# Cache for VIX data (15min TTL)
vix_cache = {"data": None, "timestamp": None}


class VixDataPoint(BaseModel):
    date: str
    close: float


class VixDataResponse(BaseModel):
    data: List[VixDataPoint]


@app.get("/api/public/vix-data", response_model=VixDataResponse)
def get_vix_data():
    """Public endpoint - no auth required. Returns 1 year of VIX data."""
    now = datetime.utcnow()

    # Check cache
    if (vix_cache["data"] is not None and
        vix_cache["timestamp"] is not None and
        now - vix_cache["timestamp"] < CACHE_TTL):
        print("[VIX] Returning cached data")
        return vix_cache["data"]

    # Fetch fresh data
    print("[VIX] Fetching fresh data from yfinance...")
    try:
        vix_df = yf.download("^VIX", period="1y", interval="1d", progress=False)
        print(f"[VIX] Downloaded dataframe shape: {vix_df.shape}")
        print(f"[VIX] Columns: {vix_df.columns.tolist()}")
        print(f"[VIX] First few rows:\n{vix_df.head()}")

        # Fix MultiIndex columns - flatten to single level
        if hasattr(vix_df.columns, 'levels'):
            print("[VIX] Flattening MultiIndex columns")
            vix_df.columns = vix_df.columns.get_level_values(0)

        data_points = [
            VixDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                close=float(row["Close"])
            )
            for idx, row in vix_df.iterrows()
            if not pd.isna(row["Close"]) and float(row["Close"]) > 0
        ]

        print(f"[VIX] Created {len(data_points)} data points")

        response = VixDataResponse(data=data_points)

        # Update cache
        vix_cache["data"] = response
        vix_cache["timestamp"] = now

        print("[VIX] Successfully cached and returning data")
        return response

    except Exception as e:
        print(f"[VIX] ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # On error, return empty data
        return VixDataResponse(data=[])


# Cache for stock prices (5min TTL for real-time data)
stock_price_cache = {}
PRICE_CACHE_TTL = timedelta(minutes=5)


class StockPriceResponse(BaseModel):
    ticker: str
    last_price: float | None


@app.get("/api/public/stock-price/{ticker}", response_model=StockPriceResponse)
def get_stock_price(ticker: str):
    """Public endpoint - no auth required. Returns last price for a ticker."""
    ticker_upper = ticker.upper()
    now = datetime.utcnow()

    # Check cache
    if ticker_upper in stock_price_cache:
        cached = stock_price_cache[ticker_upper]
        if now - cached["timestamp"] < PRICE_CACHE_TTL:
            return cached["data"]

    # Fetch fresh data
    try:
        stock = yf.Ticker(ticker_upper)
        info = stock.info

        # Try multiple fields for last price
        last_price = (
            info.get("currentPrice") or
            info.get("regularMarketPrice") or
            info.get("previousClose")
        )

        if last_price is None:
            # Try history as fallback
            hist = stock.history(period="1d")
            if len(hist) > 0:
                last_price = float(hist["Close"].iloc[-1])

        response = StockPriceResponse(
            ticker=ticker_upper,
            last_price=float(last_price) if last_price else None
        )

        # Update cache
        stock_price_cache[ticker_upper] = {
            "data": response,
            "timestamp": now
        }

        return response

    except Exception as e:
        # On error, return None price
        response = StockPriceResponse(ticker=ticker_upper, last_price=None)
        stock_price_cache[ticker_upper] = {
            "data": response,
            "timestamp": now
        }
        return response


@app.post("/api/public/feedback")
def submit_cancellation_feedback(
    feedback: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Public endpoint - no auth required.
    Saves cancellation feedback and sends admin notification.
    """
    from app.models import CancellationFeedback
    from app.core.notification_service import send_cancellation_notification

    email = feedback.get("email", "").strip()
    reason = feedback.get("reason", "").strip() or None
    suggestions = feedback.get("suggestions", "").strip() or None

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Save to database
    try:
        feedback_entry = CancellationFeedback(
            email=email,
            reason=reason,
            suggestions=suggestions
        )
        db.add(feedback_entry)
        db.commit()
        print(f"[CANCELLATION FEEDBACK] Saved for {email}")
    except Exception as e:
        print(f"[CANCELLATION FEEDBACK] DB Error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    # Send admin notification in background (don't block if fails)
    try:
        background_tasks.add_task(
            send_cancellation_notification,
            email,
            reason,
            suggestions
        )
    except Exception as e:
        print(f"[CANCELLATION FEEDBACK] Failed to schedule notification: {e}")
        # Don't fail the request if email scheduling fails

    return {"ok": True, "message": "Feedback received"}


@app.get("/health")
def health():
    return {"ok": True, "service": "coiled-spring-api"}
