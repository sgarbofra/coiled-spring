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
from app.routers import admin, ai_chat, auth, broker, market, portfolio, scanner, stripe, watchlist_items, watchlists
from sqlalchemy.orm import Session

import app.models  # noqa: F401 — registers all models with Base

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TEMPORARILY DISABLED - blocking startup
    # Base.metadata.create_all(bind=engine)
    yield


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

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(broker.router, prefix="/api/broker", tags=["broker"])
app.include_router(stripe.router, prefix="/api/stripe", tags=["stripe"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(watchlist_items.router, prefix="/api/watchlists", tags=["watchlist-items"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["ai-chat"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


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
