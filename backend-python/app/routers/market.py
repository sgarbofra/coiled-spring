import re
from datetime import datetime, timedelta
from typing import List

import yfinance as yf
from yahooquery import Screener
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.dependencies import get_current_user, get_db
from app.services.market_data import _cache

router = APIRouter()


def is_isin(symbol: str) -> bool:
    """Check if a symbol is an ISIN (2 letters + 10 alphanumeric characters)"""
    return bool(re.match(r'^[A-Z]{2}[A-Z0-9]{10}$', symbol))


class QuoteResponse(BaseModel):
    ticker: str
    current_price: float | None
    currency: str | None
    error: str | None = None


class MultiQuoteResponse(BaseModel):
    quotes: List[QuoteResponse]


class VixDataPoint(BaseModel):
    date: str
    close: float


class MoverStock(BaseModel):
    ticker: str
    name: str
    price: float
    change_percent: float
    volume: int | None = None


class MarketMoversResponse(BaseModel):
    gainers: List[MoverStock]
    losers: List[MoverStock]


@router.get("/vix", response_model=List[VixDataPoint])
def get_vix_history():
    """
    Get 1-year VIX (Volatility Index) historical data.
    Public endpoint - no authentication required.
    """
    try:
        # Fetch VIX data for last 1 year
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)

        vix = yf.Ticker("^VIX")
        hist = vix.history(start=start_date, end=end_date)

        if hist.empty:
            raise HTTPException(status_code=404, detail="VIX data not available")

        # Convert to list of data points
        data_points = []
        for date, row in hist.iterrows():
            data_points.append(VixDataPoint(
                date=date.strftime("%Y-%m-%d"),
                close=round(float(row['Close']), 2)
            ))

        return data_points
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch VIX data: {str(e)}")


def fetch_yahoo_movers(screener_id: str, limit: int = 10) -> List[MoverStock]:
    """
    Fetch market movers using yahooquery Screener API.

    Args:
        screener_id: 'day_gainers' or 'day_losers'
        limit: Number of results to return

    Returns:
        List of MoverStock objects
    """
    try:
        print(f"[MOVERS] Fetching {screener_id} via yahooquery")

        # Create screener and fetch data
        screener = Screener()
        data = screener.get_screeners(screener_id, count=limit)

        if not data or screener_id not in data:
            print(f"[MOVERS] No data returned for {screener_id}")
            return []

        quotes = data[screener_id].get('quotes', [])
        print(f"[MOVERS] Received {len(quotes)} quotes from {screener_id}")

        movers = []
        for quote in quotes[:limit]:
            try:
                ticker = quote.get('symbol', '')
                name = quote.get('shortName') or quote.get('longName', ticker)

                # Get current price
                price = quote.get('regularMarketPrice') or quote.get('regularMarketPreviousClose', 0)

                # Get change percentage
                change_percent = quote.get('regularMarketChangePercent', 0)

                # Get volume
                volume = quote.get('regularMarketVolume')

                if ticker and price > 0:
                    movers.append(MoverStock(
                        ticker=ticker,
                        name=name,
                        price=round(float(price), 2),
                        change_percent=round(float(change_percent), 2),
                        volume=int(volume) if volume else None
                    ))
            except Exception as e:
                print(f"[MOVERS] Failed to parse quote: {e}")
                continue

        print(f"[MOVERS] Successfully parsed {len(movers)} movers from {screener_id}")
        return movers

    except Exception as e:
        print(f"[MOVERS] yahooquery failed: {e}")
        return []


@router.get("/movers", response_model=MarketMoversResponse)
def get_market_movers():
    """
    Get top 10 gainers and losers from Yahoo Finance screener.
    Public endpoint - no authentication required.
    Cached for 15 minutes.
    """
    # Check cache (15 minutes TTL)
    cache_key = "market_movers"
    cached = _cache.get(cache_key, ttl=900)  # 900 seconds = 15 minutes
    if cached is not None:
        print("[MOVERS] Returning cached data")
        return cached

    try:
        # Fetch gainers and losers using yahooquery screeners
        gainers = fetch_yahoo_movers("day_gainers", limit=10)
        losers = fetch_yahoo_movers("day_losers", limit=10)

        # If scraping failed or returned empty results, fallback to hardcoded sample
        if not gainers or not losers:
            print("[MOVERS] Scraping failed, using fallback method")
            # Fallback: use sample tickers with yfinance
            sp500_sample = [
                "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "UNH", "XOM",
                "JPM", "V", "PG", "MA", "HD", "CVX", "MRK", "ABBV", "KO",
                "PEP", "COST", "AVGO", "TMO", "WMT", "MCD", "CSCO", "ACN", "LIN", "ABT",
                "NFLX", "DHR", "VZ", "ADBE", "CRM", "NKE", "TXN", "CMCSA", "PM", "NEE"
            ]

            movers = []
            for ticker in sp500_sample:
                try:
                    stock = yf.Ticker(ticker)
                    hist = stock.history(period="2d")
                    info = stock.info

                    if len(hist) >= 2:
                        current_price = float(hist['Close'].iloc[-1])
                        prev_price = float(hist['Close'].iloc[-2])
                        change_percent = ((current_price - prev_price) / prev_price) * 100
                        volume = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else None
                        name = info.get('shortName', ticker)

                        movers.append(MoverStock(
                            ticker=ticker,
                            name=name,
                            price=round(current_price, 2),
                            change_percent=round(change_percent, 2),
                            volume=volume
                        ))
                except:
                    continue

            movers.sort(key=lambda x: x.change_percent, reverse=True)
            gainers = movers[:10]
            losers = movers[-10:]
            losers.reverse()

        result = MarketMoversResponse(gainers=gainers, losers=losers)

        # Cache the result (TTL is checked on get, not set)
        _cache.set(cache_key, result)
        print(f"[MOVERS] Cached fresh data: {len(gainers)} gainers, {len(losers)} losers")

        return result

    except Exception as e:
        print(f"[MOVERS] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch market movers: {str(e)}")


@router.get("/quote", response_model=MultiQuoteResponse)
def get_quotes(
    tickers: str = Query(..., description="Comma-separated list of tickers or ISINs (e.g., AAPL,SPY,US0378331005)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get current market quotes for multiple tickers or ISINs using yfinance.
    Requires authentication.

    Supports both ticker symbols (AAPL, SPY) and ISIN codes (US0378331005).
    yfinance natively supports ISINs.

    Example: GET /api/market/quote?tickers=AAPL,SPY,US0378331005
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided")

    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers allowed per request")

    quotes = []

    for ticker_symbol in ticker_list:
        try:
            # yfinance supports ISINs natively, just pass them directly
            ticker_obj = yf.Ticker(ticker_symbol)
            fast_info = ticker_obj.fast_info

            current_price = getattr(fast_info, "last_price", None) or getattr(fast_info, "regularMarketPrice", None)
            currency = getattr(fast_info, "currency", None)

            # Add note if ISIN was used
            error_msg = None
            if not current_price:
                if is_isin(ticker_symbol):
                    error_msg = "ISIN not found or not supported by yfinance"
                else:
                    error_msg = "Price not available"

            quotes.append(QuoteResponse(
                ticker=ticker_symbol,
                current_price=current_price,
                currency=currency,
                error=error_msg
            ))
        except Exception as e:
            error_detail = str(e)
            if is_isin(ticker_symbol):
                error_detail = f"ISIN lookup failed: {error_detail}"

            quotes.append(QuoteResponse(
                ticker=ticker_symbol,
                current_price=None,
                currency=None,
                error=error_detail
            ))

    return MultiQuoteResponse(quotes=quotes)
