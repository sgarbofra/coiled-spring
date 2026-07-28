"""
ticker_validator.py — Dynamic ticker universe management.

Tre operazioni principali:
  seed_db_from_static(db)      — seed one-time dalla lista statica
  validate_universe(db)        — settimanale: marca ticker delisted
  refresh_from_wikipedia(db)   — mensile: aggiunge nuovi ticker da S&P 500/400
  get_valid_tickers(db)        — lettura: ritorna lista ticker validi da DB
"""
from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import Optional

import yfinance as yf
from sqlalchemy.orm import Session

from app import models


# ── Wikipedia fetchers ───────────────────────────────────────────────────────

def _fetch_sp500_wikipedia() -> list[str]:
    """Fetch S&P 500 tickers da Wikipedia. Ritorna [] in caso di errore."""
    try:
        import pandas as pd
        tables = pd.read_html(
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            timeout=20,
        )
        raw = tables[0]["Symbol"].tolist()
        # Wikipedia usa "." (BRK.B), yfinance vuole "-" (BRK-B)
        return [str(t).replace(".", "-").strip() for t in raw if t]
    except Exception as e:
        print(f"[UNIVERSE] Wikipedia S&P 500 fetch failed: {e}")
        return []


def _fetch_sp400_wikipedia() -> list[str]:
    """Fetch S&P 400 tickers da Wikipedia. Ritorna [] in caso di errore."""
    try:
        import pandas as pd
        tables = pd.read_html(
            "https://en.wikipedia.org/wiki/List_of_S%26P_400_companies",
            timeout=20,
        )
        df = tables[0]
        # Wikipedia può chiamare la colonna in modi diversi
        col = None
        for candidate in ("Symbol", "Ticker symbol", "Ticker", "ticker"):
            if candidate in df.columns:
                col = candidate
                break
        if col is None:
            col = df.columns[0]
        raw = df[col].tolist()
        return [str(t).replace(".", "-").strip() for t in raw if t]
    except Exception as e:
        print(f"[UNIVERSE] Wikipedia S&P 400 fetch failed: {e}")
        return []


# ── yfinance validation ───────────────────────────────────────────────────────

def _validate_batch_yf(tickers: list[str], period: str = "5d") -> dict[str, bool]:
    """
    Verifica un batch di ticker via yf.download.
    Ritorna {ticker: is_valid} per ogni ticker.

    Un ticker è considerato delisted se non ha dati Close negli ultimi 5 giorni.
    In caso di errore del batch, assume tutti validi (evita mass-delist falso).
    """
    if not tickers:
        return {}

    try:
        import pandas as pd

        df = yf.download(
            tickers,
            period=period,
            auto_adjust=True,
            progress=False,
            group_by="ticker",
        )

        result: dict[str, bool] = {}

        if len(tickers) == 1:
            # Single ticker: df è flat (Open, High, Low, Close, Volume)
            ticker = tickers[0]
            close = df.get("Close")
            if close is None or (hasattr(close, "empty") and close.empty):
                result[ticker] = False
            else:
                result[ticker] = len(pd.Series(close).dropna()) > 0
        else:
            # Multi ticker: MultiIndex (ticker, field)
            for ticker in tickers:
                try:
                    # Controlla se il ticker è presente nel livello 0 del MultiIndex
                    if hasattr(df.columns, "levels"):
                        lvl0 = df.columns.get_level_values(0)
                        if ticker not in lvl0:
                            result[ticker] = False
                            continue
                        close = df[ticker].get("Close")
                    else:
                        # Fallback: colonne flat (un solo ticker sopravvissuto al download)
                        close = df.get("Close")

                    if close is None or (hasattr(close, "empty") and close.empty):
                        result[ticker] = False
                    else:
                        result[ticker] = len(close.dropna()) > 0
                except Exception:
                    result[ticker] = False

        return result

    except Exception as e:
        print(f"[UNIVERSE] Batch yf validation error ({len(tickers)} tickers): {e}")
        # In caso di errore, considera tutti validi (approccio conservativo)
        return {t: True for t in tickers}


# ── Core operations ───────────────────────────────────────────────────────────

def seed_db_from_static(db: Session) -> int:
    """
    Seed one-time: popola ticker_universe dalla lista statica.
    Salta i ticker già presenti in DB.
    Ritorna il numero di righe inserite.
    """
    from app.data.us_optionable_tickers import _SP500, _SP400, _SPECIAL, _ETFS

    # Mappa ticker → categoria (prima categoria vince per duplicati)
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for ticker_list, category in (
        (_SP500,   "sp500"),
        (_SP400,   "sp400"),
        (_SPECIAL, "special"),
        (_ETFS,    "etf"),
    ):
        for ticker in ticker_list:
            t = ticker.strip()
            if t and t not in seen:
                seen.add(t)
                unique.append((t, category))

    # Ticker già in DB
    existing: set[str] = {
        row.ticker
        for row in db.query(models.TickerUniverse.ticker).all()
    }

    inserted = 0
    for ticker, category in unique:
        if ticker in existing:
            continue
        db.add(models.TickerUniverse(
            ticker=ticker,
            category=category,
            source="static",
            is_valid=True,
        ))
        inserted += 1

    db.commit()
    print(f"[UNIVERSE] Seed: {inserted} nuovi ticker inseriti ({len(existing)} già presenti)")
    return inserted


def validate_universe(db: Session, batch_size: int = 50) -> dict:
    """
    Validazione settimanale: verifica via yfinance tutti i ticker is_valid=True.
    Marca come delisted (is_valid=False) i ticker senza dati recenti.

    batch_size: ticker per chiamata yf.download (50 è sicuro per yfinance).
    Ritorna summary dict.
    """
    tickers = [
        row.ticker
        for row in db.query(models.TickerUniverse)
        .filter(models.TickerUniverse.is_valid == True)  # noqa: E712
        .order_by(models.TickerUniverse.ticker)
        .all()
    ]

    if not tickers:
        return {"checked": 0, "delisted": 0, "errors": 0}

    now = datetime.now(timezone.utc)
    checked = 0
    delisted_count = 0
    error_count = 0

    print(f"[UNIVERSE] Validazione {len(tickers)} ticker in batch da {batch_size}...")

    for i in range(0, len(tickers), batch_size):
        batch = tickers[i: i + batch_size]
        try:
            validity = _validate_batch_yf(batch)
        except Exception as e:
            print(f"[UNIVERSE] Batch {i // batch_size + 1} errore: {e}")
            error_count += len(batch)
            continue

        for ticker, is_valid in validity.items():
            row = (
                db.query(models.TickerUniverse)
                .filter(models.TickerUniverse.ticker == ticker)
                .first()
            )
            if row is None:
                continue

            row.last_checked = now

            if not is_valid and row.is_valid:
                row.is_valid = False
                row.delisted_at = now
                delisted_count += 1
                print(f"[UNIVERSE] Delisted: {ticker}")
            elif is_valid and not row.is_valid:
                # Re-listato o falso positivo precedente — ripristina
                row.is_valid = True
                row.delisted_at = None
                print(f"[UNIVERSE] Ripristinato: {ticker}")

            checked += 1

        db.commit()
        # Pausa tra batch per non sovraccaricare yfinance
        time.sleep(1)

    print(f"[UNIVERSE] Validazione completata: {checked} verificati, {delisted_count} delisted, {error_count} errori")
    return {"checked": checked, "delisted": delisted_count, "errors": error_count}


def refresh_from_wikipedia(db: Session) -> dict:
    """
    Refresh mensile: fetch S&P 500 + S&P 400 da Wikipedia.
    Aggiunge nuovi ticker (source='wikipedia').
    Riattiva ticker precedentemente marcati delisted se ancora in S&P.
    Ritorna summary dict.
    """
    sp500 = _fetch_sp500_wikipedia()
    sp400 = _fetch_sp400_wikipedia()

    existing_map: dict[str, models.TickerUniverse] = {
        row.ticker: row
        for row in db.query(models.TickerUniverse).all()
    }

    now = datetime.now(timezone.utc)
    added = 0
    reactivated = 0

    fresh_tickers: list[tuple[str, str]] = (
        [(t, "sp500") for t in sp500] +
        [(t, "sp400") for t in sp400]
    )

    # Deduplicazione: prima categoria vince
    seen: set[str] = set()
    for ticker, category in fresh_tickers:
        if not ticker or not ticker.strip():
            continue
        ticker = ticker.upper().strip()
        if ticker in seen:
            continue
        seen.add(ticker)

        if ticker in existing_map:
            row = existing_map[ticker]
            if not row.is_valid:
                # Era stato marcato delisted ma è ancora in S&P → riattiva
                row.is_valid = True
                row.delisted_at = None
                row.category = category
                reactivated += 1
                print(f"[UNIVERSE] Riattivato: {ticker} ({category})")
        else:
            db.add(models.TickerUniverse(
                ticker=ticker,
                category=category,
                source="wikipedia",
                is_valid=True,
                last_checked=now,
            ))
            added += 1
            print(f"[UNIVERSE] Aggiunto: {ticker} ({category})")

    db.commit()
    print(
        f"[UNIVERSE] Refresh Wikipedia: sp500={len(sp500)}, sp400={len(sp400)} | "
        f"aggiunti={added}, riattivati={reactivated}"
    )
    return {
        "sp500_fetched": len(sp500),
        "sp400_fetched": len(sp400),
        "added": added,
        "reactivated": reactivated,
    }


def get_valid_tickers(
    db: Session,
    category: Optional[str] = None,
    exclude_leveraged: bool = False,
) -> list[str]:
    """
    Ritorna tutti i ticker validi da DB.
    Fallback alla lista statica se il DB è vuoto (es. primo avvio pre-seed).
    """
    q = db.query(models.TickerUniverse.ticker).filter(
        models.TickerUniverse.is_valid == True  # noqa: E712
    )
    if category:
        q = q.filter(models.TickerUniverse.category == category)

    rows = q.order_by(models.TickerUniverse.ticker).all()

    if not rows:
        # DB non ancora seedato — usa lista statica
        from app.data.us_optionable_tickers import US_OPTIONABLE_TICKERS
        tickers = list(US_OPTIONABLE_TICKERS)
    else:
        tickers = [row.ticker for row in rows]

    if exclude_leveraged:
        _LEVERAGED = {
            "UVXY", "SVXY", "TVIX", "VXX", "VIXY",
            "TQQQ", "SQQQ", "UPRO", "SPXS", "SPXU",
            "SOXL", "SOXS", "TECL", "TECS", "FNGU", "FNGD",
            "LABU", "LABD", "TNA", "TZA", "UDOW", "SDOW",
            "BOIL", "KOLD", "UCO", "SCO", "TMV", "TMF",
            "TBT", "TBF",
        }
        tickers = [t for t in tickers if t not in _LEVERAGED]

    return tickers
