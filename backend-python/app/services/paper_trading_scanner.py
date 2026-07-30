"""
Paper Trading Scanner — HV Long PUT LEAPS
Coiled Spring Terminal

Eseguito ogni giorno alle 16:30 CET (mercato US aperto da 1-2h, prezzi opzioni stabili).

Logica:
  1. Manutenzione posizioni aperte: controlla SL/TP/roll per ogni trade aperto
  2. Scansione universo HV: applica filtro sniper con tightening dinamico
  3. Apertura nuove posizioni: seleziona la migliore PUT LEAPS OTM con CS Green e OI ≥ 100
  4. Genera diary entry

Regole:
  - Portafoglio: €100.000 simulati
  - Max position: €4.000 → max loss €2.000 (SL al -50%)
  - Max drawdown totale aperto: 20% dell'equity corrente
  - Max 1 posizione per ticker (attiva contemporaneamente)
  - SL: valore opzione ≤ 50% del costo iniziale
  - TP: valore opzione ≥ 200% del costo iniziale
  - Roll: CS scende da Green a Yellow → chiudi e riapri (max 2 roll)
  - Dopo 2 roll: pausa ticker per 14 giorni di calendario (≈10 trading days)
  - Dopo SL: il giorno successivo il ticker è di nuovo eligible se condizioni valide
"""

from __future__ import annotations

import logging
import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import yfinance as yf

from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# ── Costanti strategia ────────────────────────────────────────────────────────

PORTFOLIO_NAME    = "HV LONG PUT LEAPS"
USER_EMAIL        = "francesco.sgarbossa@yahoo.com"
INITIAL_EQUITY    = 100_000.0   # EUR simulati
MAX_POSITION_USD  = 4_000.0     # budget max per posizione (approssimato in USD)
SL_MULTIPLIER     = 0.50        # stop loss al 50% del valore iniziale
TP_MULTIPLIER     = 2.00        # take profit al 200% del valore iniziale
MAX_ROLLS         = 2           # numero massimo di roll per ticker per setup
PAUSE_CALENDAR_DAYS = 14        # ≈10 trading days di pausa dopo 2 roll
MAX_DRAWDOWN_PCT  = 0.20        # 20% dell'equity corrente come max perdita aperta
MAX_LOSS_PER_POS  = MAX_POSITION_USD * (1 - SL_MULTIPLIER)  # €2.000
CS_GREEN          = 75          # soglia minima CS Score (Green)
MIN_OI            = 100         # open interest minimo
LEAPS_DTE_MIN     = 365         # DTE minimo (LEAPS = >12 mesi)
LEAPS_DTE_MAX     = 730         # DTE massimo (2 anni)
MAX_ELIGIBLE      = 10          # max ticker eleggibili dopo tightening

# Cascade di tightening — applicata se >50 ticker eleggibili al livello base
TIGHTENING_LEVELS = [
    {"hv_rank_max": 20, "depth_factor": 0.65, "streak_min": 5,  "label": "L0"},
    {"hv_rank_max": 15, "depth_factor": 0.62, "streak_min": 5,  "label": "L1"},
    {"hv_rank_max": 12, "depth_factor": 0.60, "streak_min": 8,  "label": "L2"},
    {"hv_rank_max": 10, "depth_factor": 0.58, "streak_min": 10, "label": "L3"},
]


# ── CS Score (replica di _cs_score in scanner.py) ────────────────────────────

def _cs_score(abs_delta: float, vega: float, dte: int, spread_pct: float, oi: int) -> int:
    """Calcola il Coiled Spring Score.

    Identico alla funzione _cs_score in app/routers/scanner.py.
    Score < 75  → Yellow; Score ≥ 75 → Green (solo se DTE ≥ 300).
    """
    if   0.18 <= abs_delta <= 0.25: ds = 100
    elif 0.25 < abs_delta  <= 0.30: ds = 95
    elif 0.15 <= abs_delta <  0.18: ds = 90
    elif 0.30 < abs_delta  <= 0.35: ds = 85
    elif 0.10 <= abs_delta <  0.15: ds = 70
    elif 0.35 < abs_delta  <= 0.40: ds = 65
    elif abs_delta < 0.10:          ds = 30
    else:                            ds = 25

    dte_s = min(dte / 730, 1) * 100
    sp_comp = max(0.0, 1 - spread_pct / 100)
    if oi == 0:
        liq_s = sp_comp * 100
    else:
        raw_liq = sp_comp * 60 + min(oi / 500, 1) * 40
        liq_s = min(raw_liq, 39) if oi < 100 else raw_liq

    vega_s = min(vega / 1.0, 1) * 100
    raw_score = round(vega_s * 0.35 + dte_s * 0.30 + liq_s * 0.20 + ds * 0.15)
    return min(raw_score, 69) if dte < 300 else raw_score


# ── Filtro sniper ─────────────────────────────────────────────────────────────

def _passes_level(snap: models.HVSnapshot, level: dict) -> bool:
    """Controlla se uno snapshot passa il filtro sniper a un dato livello."""
    if any(v is None for v in [snap.hv20, snap.hv60, snap.hv252, snap.hv_rank]):
        return False
    if not (snap.hv20 < snap.hv60 < snap.hv252):           # triple compression
        return False
    if snap.hv_rank >= level["hv_rank_max"]:                # HV Rank
        return False
    if snap.hv20 > snap.hv252 * level["depth_factor"]:     # depth
        return False
    if (snap.compression_streak or 0) < level["streak_min"]:  # duration
        return False
    return True


def _bonus_flags(snap: models.HVSnapshot, spy_rank: Optional[float]) -> list[str]:
    """Restituisce i flag bonus attivi per prioritizzazione."""
    flags = []
    # Parkinson divergence: intraday range > close-to-close
    if snap.hv30 and snap.hv30_parkinson and snap.hv30 > 0:
        if snap.hv30_parkinson / snap.hv30 > 1.3:
            flags.append("Parkinson>1.3")
    # Relative HV: mercato alto, ticker compresso
    if spy_rank is not None and spy_rank > 35:
        flags.append("SPY_HV_high")
    return flags


def _get_eligible(
    snapshots: list[models.HVSnapshot],
    spy_rank: Optional[float],
    blocked_tickers: set[str],
) -> tuple[list[models.HVSnapshot], dict]:
    """Applica il filtro sniper con tightening dinamico.

    Restituisce (lista_eleggibili, info_livello_usato).
    Se dopo tutti i livelli ci sono ancora >MAX_ELIGIBLE ticker,
    prende i migliori MAX_ELIGIBLE per (hv_rank ASC, depth ASC).
    """
    # Pre-filtra ticker bloccati (già posizione aperta o in pausa)
    available = [s for s in snapshots if s.ticker not in blocked_tickers]

    for level in TIGHTENING_LEVELS:
        eligible = [s for s in available if _passes_level(s, level)]
        if len(eligible) <= MAX_ELIGIBLE:
            return eligible, level

    # Last resort: usa L3 e prende i top MAX_ELIGIBLE
    level = TIGHTENING_LEVELS[-1]
    eligible = [s for s in available if _passes_level(s, level)]
    eligible.sort(key=lambda s: (s.hv_rank or 999, (s.hv20 or 999) / (s.hv252 or 1)))
    return eligible[:MAX_ELIGIBLE], {**level, "label": f"{level['label']}+top{MAX_ELIGIBLE}"}


# ── Fetching opzioni ──────────────────────────────────────────────────────────

def _fetch_best_put_leaps(ticker: str) -> Optional[dict]:
    """Cerca la migliore PUT LEAPS OTM con CS Green e OI ≥ MIN_OI.

    Usa yfinance. Ritorna None se non trovata o errore.
    """
    from app.services.market_data import bs_greeks

    try:
        t = yf.Ticker(ticker)
        price = t.fast_info.last_price
        if not price or price <= 0:
            logger.warning(f"[PT] {ticker}: no price from yfinance")
            return None

        today = date.today()
        best: Optional[dict] = None
        best_cs = -1

        for exp_str in (t.options or []):
            exp_date = date.fromisoformat(exp_str)
            dte = (exp_date - today).days
            if dte < LEAPS_DTE_MIN or dte > LEAPS_DTE_MAX:
                continue

            try:
                chain = t.option_chain(exp_str)
                puts = chain.puts
            except Exception:
                continue

            for _, row in puts.iterrows():
                strike = float(row.get("strike", 0) or 0)
                if strike <= 0 or strike >= price:          # OTM PUT: strike < price
                    continue

                bid    = float(row.get("bid", 0) or 0)
                ask    = float(row.get("ask", 0) or 0)
                oi     = int(row.get("openInterest", 0) or 0)
                iv_raw = float(row.get("impliedVolatility", 0) or 0)

                if oi < MIN_OI:
                    continue
                if bid <= 0 or ask <= 0 or iv_raw <= 0:
                    continue
                if iv_raw > 5.0:    # filtro IV anomala
                    continue

                mid = (bid + ask) / 2
                spread_pct = (ask - bid) / mid * 100 if mid > 0 else 100
                T_yr = dte / 365.0

                _, delta, _, vega, _ = bs_greeks(price, strike, T_yr, 0.05, iv_raw, False)
                cs = _cs_score(abs(delta), vega, dte, spread_pct, oi)

                if cs < CS_GREEN:
                    continue

                # Selezione: massimo CS Score; a parità di CS, massimo vega
                is_better = cs > best_cs or (cs == best_cs and best is not None and vega > best["vega"])
                if is_better:
                    best_cs = cs
                    symbol_key = str(row.get("contractSymbol", f"{ticker}_{exp_str}_{strike}P"))
                    best = {
                        "ticker":       ticker,
                        "current_price": round(price, 2),
                        "strike":       strike,
                        "expiration":   exp_str,
                        "dte":          dte,
                        "bid":          round(bid, 4),
                        "ask":          round(ask, 4),
                        "mid":          round(mid, 4),
                        "spread_pct":   round(spread_pct, 1),
                        "iv":           round(iv_raw, 4),
                        "delta":        round(delta, 4),
                        "vega":         round(vega, 4),
                        "oi":           oi,
                        "cs_score":     cs,
                        "symbol_key":   symbol_key,
                    }

        return best

    except Exception as e:
        logger.error(f"[PT] {ticker}: error fetching options: {e}")
        return None


def _get_current_option_price(ticker: str, expiration: str, strike: float) -> Optional[float]:
    """Fetch il prezzo mid corrente di una PUT specifica. None se non disponibile."""
    try:
        t = yf.Ticker(ticker)
        chain = t.option_chain(expiration)
        puts = chain.puts
        row = puts[abs(puts["strike"] - strike) < 0.01]
        if row.empty:
            return None
        r = row.iloc[0]
        bid = float(r.get("bid", 0) or 0)
        ask = float(r.get("ask", 0) or 0)
        last = float(r.get("lastPrice", 0) or 0)
        if bid > 0 and ask > 0:
            return (bid + ask) / 2
        return last if last > 0 else None
    except Exception:
        return None


def _get_option_cs_score(ticker: str, expiration: str, strike: float) -> Optional[int]:
    """Calcola il CS Score corrente di una PUT specifica. None se errore."""
    from app.services.market_data import bs_greeks

    try:
        t = yf.Ticker(ticker)
        price = t.fast_info.last_price
        if not price or price <= 0:
            return None

        chain = t.option_chain(expiration)
        puts = chain.puts
        row = puts[abs(puts["strike"] - strike) < 0.01]
        if row.empty:
            return None
        r = row.iloc[0]

        today = date.today()
        exp_date = date.fromisoformat(expiration)
        dte = (exp_date - today).days
        if dte <= 0:
            return 0

        bid    = float(r.get("bid", 0) or 0)
        ask    = float(r.get("ask", 0) or 0)
        oi     = int(r.get("openInterest", 0) or 0)
        iv_raw = float(r.get("impliedVolatility", 0) or 0)

        if iv_raw <= 0 or (bid <= 0 and ask <= 0):
            return None

        mid = (bid + ask) / 2 if (bid > 0 and ask > 0) else float(r.get("lastPrice", 1))
        spread_pct = (ask - bid) / mid * 100 if mid > 0 else 100
        T_yr = dte / 365.0
        _, delta, _, vega, _ = bs_greeks(price, strike, T_yr, 0.05, iv_raw, False)
        return _cs_score(abs(delta), vega, dte, spread_pct, oi)

    except Exception:
        return None


# ── Money management ──────────────────────────────────────────────────────────

def _compute_current_equity(db, portfolio_id: int) -> float:
    """Stima l'equity corrente (simulata).

    Equity = INITIAL_EQUITY + somma PNL realizzati (positivi e negativi) + PNL unrealizzati.
    Per semplicità: INITIAL_EQUITY + sum(realized_pnl di trades chiusi).
    I PNL unrealizzati non vengono calcolati real-time per performance.
    """
    closed = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.status == "closed",
            models.PortfolioTrade.realized_pnl.isnot(None),
        )
        .all()
    )
    realized_total = sum(float(t.realized_pnl or 0) for t in closed)
    return INITIAL_EQUITY + realized_total


def _can_open_position(db, portfolio_id: int) -> tuple[bool, str]:
    """Controlla se è possibile aprire una nuova posizione rispettando il drawdown cap.

    Ritorna (True, "") se ok, (False, motivo) se bloccato.
    """
    equity = _compute_current_equity(db, portfolio_id)
    cap = equity * MAX_DRAWDOWN_PCT

    open_trades = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.status == "open",
        )
        .count()
    )

    used_loss = open_trades * MAX_LOSS_PER_POS
    new_used = used_loss + MAX_LOSS_PER_POS

    if new_used > cap:
        return False, (
            f"Drawdown cap: {open_trades} posizioni aperte × €{MAX_LOSS_PER_POS:.0f} + "
            f"nuova €{MAX_LOSS_PER_POS:.0f} = €{new_used:.0f} > 20% equity (€{cap:.0f})"
        )
    return True, ""


# ── Portfolio e portfolio trade helpers ───────────────────────────────────────

def _get_or_create_portfolio(db) -> models.Portfolio:
    """Restituisce il portfolio HV Long PUT LEAPS per l'utente target.

    Crea utente (se non esiste) e portfolio al primo avvio.
    """
    user = db.query(models.User).filter_by(email=USER_EMAIL).first()
    if not user:
        raise RuntimeError(
            f"[PT] Utente {USER_EMAIL} non trovato nel DB. "
            "Assicurati che l'account sia registrato."
        )

    portfolio = (
        db.query(models.Portfolio)
        .filter_by(user_id=user.id, name=PORTFOLIO_NAME)
        .first()
    )
    if not portfolio:
        portfolio = models.Portfolio(user_id=user.id, name=PORTFOLIO_NAME)
        db.add(portfolio)
        db.flush()
        logger.info(f"[PT] Portfolio '{PORTFOLIO_NAME}' creato per {USER_EMAIL}")

    return portfolio


def _get_or_create_contract(db, opt: dict) -> models.OptionContract:
    """Restituisce l'OptionContract esistente o lo crea."""
    contract = (
        db.query(models.OptionContract)
        .filter_by(symbol_key=opt["symbol_key"])
        .first()
    )
    if not contract:
        contract = models.OptionContract(
            underlying=opt["ticker"],
            option_type="put",
            expiration=date.fromisoformat(opt["expiration"]),
            strike=opt["strike"],
            symbol_key=opt["symbol_key"],
        )
        db.add(contract)
        db.flush()
    return contract


def _open_trade(db, portfolio: models.Portfolio, opt: dict, signal_details: dict,
                roll_count: int = 0) -> models.PortfolioTrade:
    """Crea un PortfolioTrade e il corrispondente PaperTradingPosition."""
    contract = _get_or_create_contract(db, opt)

    # Numero contratti: budget / (mid * 100), min 1
    qty = max(1, int(MAX_POSITION_USD // (opt["mid"] * 100)))

    trade = models.PortfolioTrade(
        portfolio_id=portfolio.id,
        option_contract_id=contract.id,
        direction="long",
        quantity=qty,
        entry_price=opt["mid"],
        status="open",
        notes=(
            f"PT|cs={opt['cs_score']}|oi={opt['oi']}|"
            f"hv_rank={signal_details.get('hv_rank', '?')}|"
            f"streak={signal_details.get('compression_streak', '?')}|"
            f"roll={roll_count}"
        ),
    )
    db.add(trade)
    db.flush()

    # PaperTradingPosition: upsert
    pos = (
        db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id, ticker=opt["ticker"])
        .first()
    )
    if pos:
        pos.trade_id = trade.id
        pos.roll_count = roll_count
        pos.pause_until = None
        pos.signal_details = signal_details
    else:
        pos = models.PaperTradingPosition(
            portfolio_id=portfolio.id,
            ticker=opt["ticker"],
            trade_id=trade.id,
            roll_count=roll_count,
            pause_until=None,
            signal_details=signal_details,
        )
        db.add(pos)

    return trade


def _close_trade(db, trade: models.PortfolioTrade, close_price: float,
                 reason: str) -> float:
    """Chiude un trade calcolando il PNL realizzato."""
    sign = 1 if trade.direction == "long" else -1
    pnl = (close_price - float(trade.entry_price)) * 100 * trade.quantity * sign
    trade.status = "closed"
    trade.close_price = close_price
    trade.realized_pnl = pnl
    trade.closed_at = datetime.now(timezone.utc)
    if trade.notes:
        trade.notes += f"|close={reason}"
    else:
        trade.notes = f"close={reason}"
    return pnl


# ── Manutenzione posizioni aperte ─────────────────────────────────────────────

def _maintain_open_positions(db, portfolio: models.Portfolio) -> dict:
    """Controlla SL/TP/Roll per tutte le posizioni aperte.

    Ritorna un dizionario con i risultati: {sl_closed, tp_closed, rolled, paused, errors}.
    Include ticker flaggati per roll (da riaprire nella fase di nuove entrate).
    """
    stats = {
        "sl_closed": [],
        "tp_closed": [],
        "rolled":    [],     # (ticker, new_roll_count) da riaprire
        "paused":    [],
        "errors":    [],
    }

    open_trades = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio.id,
            models.PortfolioTrade.status == "open",
        )
        .all()
    )

    for trade in open_trades:
        contract = trade.option_contract
        ticker = contract.underlying
        expiration = contract.expiration.isoformat()
        strike = float(contract.strike)

        # PaperTradingPosition associata
        pos = (
            db.query(models.PaperTradingPosition)
            .filter_by(portfolio_id=portfolio.id, ticker=ticker)
            .first()
        )

        try:
            current_price = _get_current_option_price(ticker, expiration, strike)
            if current_price is None:
                logger.warning(f"[PT] {ticker}: prezzo corrente non disponibile — skip")
                stats["errors"].append({"ticker": ticker, "reason": "no_price"})
                continue

            entry_price = float(trade.entry_price)
            ratio = current_price / entry_price

            # ── Take Profit ──────────────────────────────────────────────────
            if ratio >= TP_MULTIPLIER:
                pnl = _close_trade(db, trade, current_price, "TP")
                if pos:
                    pos.trade_id = None
                stats["tp_closed"].append({
                    "ticker": ticker, "pnl": round(pnl, 2),
                    "entry": entry_price, "close": current_price,
                    "gain_pct": round((ratio - 1) * 100, 1),
                })
                logger.info(f"[PT] TP {ticker}: +{pnl:.0f} USD ({ratio:.1%})")
                continue

            # ── Stop Loss ────────────────────────────────────────────────────
            if ratio <= SL_MULTIPLIER:
                pnl = _close_trade(db, trade, current_price, "SL")
                if pos:
                    pos.trade_id = None
                    # Non imposta pausa: SL → ticker torna eligible il giorno dopo
                stats["sl_closed"].append({
                    "ticker": ticker, "pnl": round(pnl, 2),
                    "entry": entry_price, "close": current_price,
                    "loss_pct": round((1 - ratio) * 100, 1),
                })
                logger.info(f"[PT] SL {ticker}: {pnl:.0f} USD ({ratio:.1%})")
                continue

            # ── Roll check: CS scende da Green a Yellow ──────────────────────
            current_cs = _get_option_cs_score(ticker, expiration, strike)
            if current_cs is not None and current_cs < CS_GREEN:
                roll_count = pos.roll_count if pos else 0
                pnl = _close_trade(db, trade, current_price, f"ROLL_{roll_count + 1}")

                if roll_count >= MAX_ROLLS:
                    # Dopo 2 roll: chiudi e metti in pausa
                    if pos:
                        pos.trade_id = None
                        pos.pause_until = date.today() + timedelta(days=PAUSE_CALENDAR_DAYS)
                        pos.roll_count = 0
                    stats["paused"].append({
                        "ticker": ticker, "pnl": round(pnl, 2),
                        "pause_until": (
                            date.today() + timedelta(days=PAUSE_CALENDAR_DAYS)
                        ).isoformat(),
                    })
                    logger.info(f"[PT] PAUSE {ticker}: 2 roll esauriti → pausa {PAUSE_CALENDAR_DAYS}gg")
                else:
                    # Roll: chiudi e flagga per riapertura
                    if pos:
                        pos.trade_id = None
                        pos.roll_count = roll_count + 1
                    stats["rolled"].append({
                        "ticker": ticker,
                        "pnl": round(pnl, 2),
                        "new_roll_count": roll_count + 1,
                        "old_cs": current_cs,
                        "entry": entry_price,
                        "close": current_price,
                    })
                    logger.info(
                        f"[PT] ROLL {ticker}: CS {current_cs}<{CS_GREEN}, "
                        f"roll #{roll_count + 1}"
                    )

        except Exception as e:
            logger.error(f"[PT] {ticker}: errore manutenzione: {e}")
            stats["errors"].append({"ticker": ticker, "reason": str(e)})

    return stats


# ── Apertura nuove posizioni ──────────────────────────────────────────────────

def _open_new_positions(db, portfolio: models.Portfolio,
                        eligible: list[models.HVSnapshot],
                        rolls_pending: list[dict]) -> list[dict]:
    """Apre nuove posizioni per i ticker eleggibili e i roll pendenti.

    Ritorna lista di dizionari con i dettagli delle operazioni aperte.
    """
    opened = []

    # Raccoglie ticker con posizione già aperta (escludi dal loop)
    already_open = {
        pos.ticker
        for pos in db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id)
        .all()
        if pos.trade_id is not None
    }

    # Ticker con pausa attiva
    today = date.today()
    paused_tickers = {
        pos.ticker
        for pos in db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id)
        .all()
        if pos.pause_until and pos.pause_until > today
    }

    # ── Roll pending: priorità rispetto ai nuovi ingressi ────────────────────
    for roll in rolls_pending:
        ticker = roll["ticker"]
        if ticker in already_open or ticker in paused_tickers:
            continue

        can_open, reason = _can_open_position(db, portfolio.id)
        if not can_open:
            logger.info(f"[PT] {ticker} roll bloccato: {reason}")
            break

        opt = _fetch_best_put_leaps(ticker)
        if not opt:
            logger.info(f"[PT] {ticker} roll: nessuna PUT LEAPS valida trovata")
            continue

        # Recupera i signal_details dalla pos esistente
        pos = (
            db.query(models.PaperTradingPosition)
            .filter_by(portfolio_id=portfolio.id, ticker=ticker)
            .first()
        )
        signal_details = pos.signal_details if pos else {}
        signal_details["roll_from"] = roll.get("old_cs")

        trade = _open_trade(db, portfolio, opt, signal_details, roll["new_roll_count"])
        already_open.add(ticker)

        opened.append({
            "ticker":     ticker,
            "type":       f"ROLL_{roll['new_roll_count']}",
            "strike":     opt["strike"],
            "expiration": opt["expiration"],
            "dte":        opt["dte"],
            "mid":        opt["mid"],
            "cs_score":   opt["cs_score"],
            "oi":         opt["oi"],
            "trade_id":   trade.id,
        })
        logger.info(
            f"[PT] OPEN (roll#{roll['new_roll_count']}) {ticker} "
            f"P{opt['strike']} exp={opt['expiration']} cs={opt['cs_score']}"
        )

    # ── Nuovi ingressi ────────────────────────────────────────────────────────
    for snap in eligible:
        ticker = snap.ticker
        if ticker in already_open or ticker in paused_tickers:
            continue

        can_open, reason = _can_open_position(db, portfolio.id)
        if not can_open:
            logger.info(f"[PT] Drawdown cap raggiunto — stop nuovi ingressi: {reason}")
            break

        opt = _fetch_best_put_leaps(ticker)
        if not opt:
            logger.info(f"[PT] {ticker}: nessuna PUT LEAPS valida (no option con CS Green + OI≥{MIN_OI})")
            continue

        signal_details = {
            "hv20":             snap.hv20,
            "hv60":             snap.hv60,
            "hv252":            snap.hv252,
            "hv_rank":          snap.hv_rank,
            "hv30_parkinson":   snap.hv30_parkinson,
            "compression_streak": snap.compression_streak,
        }

        trade = _open_trade(db, portfolio, opt, signal_details, roll_count=0)
        already_open.add(ticker)

        opened.append({
            "ticker":     ticker,
            "type":       "NEW",
            "strike":     opt["strike"],
            "expiration": opt["expiration"],
            "dte":        opt["dte"],
            "mid":        opt["mid"],
            "cs_score":   opt["cs_score"],
            "oi":         opt["oi"],
            "trade_id":   trade.id,
            "signal": {
                "hv20":    snap.hv20,
                "hv60":    snap.hv60,
                "hv252":   snap.hv252,
                "hv_rank": snap.hv_rank,
                "streak":  snap.compression_streak,
            },
        })
        logger.info(
            f"[PT] OPEN (new) {ticker} P{opt['strike']} exp={opt['expiration']} "
            f"cs={opt['cs_score']} hv_rank={snap.hv_rank}"
        )

    return opened


# ── Diary generation ──────────────────────────────────────────────────────────

def _generate_diary(
    today: date,
    snapshots_total: int,
    eligible: list[models.HVSnapshot],
    filter_level: dict,
    maintenance: dict,
    opened: list[dict],
    spy_rank: Optional[float],
    equity: float,
    open_count: int,
    bonus_map: dict[str, list[str]],
) -> str:
    """Genera il testo Markdown del diario giornaliero."""

    lines = [
        f"# 📊 HV Long PUT LEAPS — Diario di Bordo",
        f"**Data**: {today.isoformat()}  |  **Ora scan**: 16:30 CET",
        f"",
        f"---",
        f"",
        f"## 📡 Universe & Filtro",
        f"- Ticker con dati HV: **{snapshots_total}**",
        f"- Filtro sniper applicato: **{filter_level.get('label', 'L0')}**",
        f"  - HV Rank max: {filter_level['hv_rank_max']}",
        f"  - Depth factor: {filter_level['depth_factor']} (HV20 ≤ HV252 × {filter_level['depth_factor']})",
        f"  - Streak minima: {filter_level['streak_min']} giorni",
        f"- SPY HV Rank attuale: {f'{spy_rank:.1f}' if spy_rank is not None else 'N/D'}",
        f"",
    ]

    # Eligible tickers
    lines.append(f"## 🎯 Ticker Eleggibili ({len(eligible)})")
    if eligible:
        lines.append("")
        lines.append("| Ticker | HV20 | HV60 | HV252 | HV Rank | Streak | Depth | Bonus |")
        lines.append("|--------|------|------|-------|---------|--------|-------|-------|")
        for s in eligible:
            depth = f"{(s.hv20 or 0) / (s.hv252 or 1) * 100:.0f}%" if s.hv252 else "—"
            bonuses = ", ".join(bonus_map.get(s.ticker, [])) or "—"
            lines.append(
                f"| {s.ticker} | {s.hv20 or '—'} | {s.hv60 or '—'} | "
                f"{s.hv252 or '—'} | {s.hv_rank or '—'} | "
                f"{s.compression_streak or 0}d | {depth} | {bonuses} |"
            )
    else:
        lines.append("_Nessun ticker ha superato il filtro sniper oggi._")
    lines.append("")

    # Manutenzione posizioni
    lines.append("## 🔄 Manutenzione Posizioni")
    tp_list = maintenance.get("tp_closed", [])
    sl_list = maintenance.get("sl_closed", [])
    rolled  = maintenance.get("rolled", [])
    paused  = maintenance.get("paused", [])

    if not any([tp_list, sl_list, rolled, paused]):
        lines.append("_Nessun evento di manutenzione oggi._")
    for item in tp_list:
        lines.append(
            f"- ✅ **TP** {item['ticker']}: chiuso a {item['close']:.2f} "
            f"(+{item['gain_pct']:.1f}%) → PNL **+${item['pnl']:.0f}**"
        )
    for item in sl_list:
        lines.append(
            f"- 🛑 **SL** {item['ticker']}: chiuso a {item['close']:.2f} "
            f"(-{item['loss_pct']:.1f}%) → PNL **-${abs(item['pnl']):.0f}**"
        )
    for item in rolled:
        lines.append(
            f"- 🔁 **ROLL #{item['new_roll_count']}** {item['ticker']}: "
            f"CS sceso a {item['old_cs']} → chiuso a {item['close']:.2f}, "
            f"riaperto con nuova opzione"
        )
    for item in paused:
        lines.append(
            f"- ⏸️ **PAUSA** {item['ticker']}: 2 roll esauriti → "
            f"sospeso fino al {item['pause_until']}"
        )
    lines.append("")

    # Operazioni aperte oggi
    lines.append(f"## 💼 Operazioni Aperte Oggi ({len(opened)})")
    if opened:
        lines.append("")
        lines.append("| Ticker | Tipo | Strike | Scadenza | DTE | Mid (USD) | CS | OI |")
        lines.append("|--------|------|--------|----------|-----|-----------|----|----|")
        for o in opened:
            lines.append(
                f"| {o['ticker']} | {o['type']} | {o['strike']:.0f} | "
                f"{o['expiration']} | {o['dte']}d | ${o['mid']:.2f} | "
                f"{o['cs_score']} | {o['oi']} |"
            )
    else:
        lines.append("_Nessuna nuova operazione aperta oggi._")
    lines.append("")

    # Stato portafoglio
    max_loss_open = open_count * MAX_LOSS_PER_POS
    cap = equity * MAX_DRAWDOWN_PCT
    remaining_cap = cap - max_loss_open
    max_new_positions = max(0, int(remaining_cap // MAX_LOSS_PER_POS))

    lines.extend([
        f"## 📋 Stato Portafoglio (fine sessione)",
        f"- Equity simulata: **€{equity:,.0f}**",
        f"- Posizioni aperte: **{open_count}**",
        f"- Drawdown cap (20%): €{cap:,.0f}",
        f"- Drawdown utilizzato: €{max_loss_open:,.0f} ({open_count} × €{MAX_LOSS_PER_POS:.0f})",
        f"- Capacità residua: €{remaining_cap:,.0f} → max **{max_new_positions}** nuove posizioni",
        f"",
        f"---",
        f"_Report generato automaticamente da Coiled Spring Terminal_",
    ])

    return "\n".join(lines)


# ── Entry point principale ────────────────────────────────────────────────────

def run_paper_trading_scan() -> dict:
    """Entry point del job giornaliero alle 16:30 CET.

    Esegue tutta la logica di manutenzione + nuove entrate + diary.
    Ritorna un dizionario con le statistiche della sessione.
    """
    logger.info("[PT] === START paper trading scan ===")
    db = SessionLocal()

    try:
        # ── Portafoglio target ────────────────────────────────────────────────
        portfolio = _get_or_create_portfolio(db)

        # ── HV Snapshot: carica tutti i ticker ───────────────────────────────
        snapshots = db.query(models.HVSnapshot).all()
        logger.info(f"[PT] HVSnapshot loaded: {len(snapshots)} ticker")

        # SPY HV Rank per il bonus flag
        spy_snap = next((s for s in snapshots if s.ticker == "SPY"), None)
        spy_rank = spy_snap.hv_rank if spy_snap else None

        # Ticker con posizione aperta o in pausa → bloccati per nuovi ingressi
        today = date.today()
        all_positions = (
            db.query(models.PaperTradingPosition)
            .filter_by(portfolio_id=portfolio.id)
            .all()
        )
        blocked = set()
        for pos in all_positions:
            if pos.trade_id is not None:
                blocked.add(pos.ticker)   # posizione aperta
            if pos.pause_until and pos.pause_until > today:
                blocked.add(pos.ticker)   # in pausa

        # ── Filtro sniper con tightening dinamico ────────────────────────────
        eligible, filter_level = _get_eligible(snapshots, spy_rank, blocked)
        logger.info(
            f"[PT] Eligible: {len(eligible)} ticker "
            f"(filtro {filter_level.get('label', '?')})"
        )

        # Bonus flags per prioritizzazione
        bonus_map = {s.ticker: _bonus_flags(s, spy_rank) for s in eligible}

        # Riordina: prima ticker con bonus, poi per hv_rank crescente
        eligible.sort(key=lambda s: (
            -len(bonus_map.get(s.ticker, [])),
            s.hv_rank or 999,
        ))

        # ── Manutenzione posizioni aperte ────────────────────────────────────
        maintenance = _maintain_open_positions(db, portfolio)
        db.commit()

        rolls_pending = maintenance.get("rolled", [])

        # ── Apertura nuove posizioni ─────────────────────────────────────────
        opened = _open_new_positions(db, portfolio, eligible, rolls_pending)
        db.commit()

        # ── Statistiche finali ───────────────────────────────────────────────
        equity = _compute_current_equity(db, portfolio.id)
        open_count = (
            db.query(models.PortfolioTrade)
            .filter_by(portfolio_id=portfolio.id, status="open")
            .count()
        )

        # ── Diary ────────────────────────────────────────────────────────────
        scan_details = {
            "filter_level":   filter_level,
            "eligible":       [s.ticker for s in eligible],
            "bonus_map":      bonus_map,
            "maintenance":    maintenance,
            "opened":         opened,
            "spy_rank":       spy_rank,
            "equity":         round(equity, 2),
            "open_count":     open_count,
        }

        report_md = _generate_diary(
            today=today,
            snapshots_total=len(snapshots),
            eligible=eligible,
            filter_level=filter_level,
            maintenance=maintenance,
            opened=opened,
            spy_rank=spy_rank,
            equity=equity,
            open_count=open_count,
            bonus_map=bonus_map,
        )

        # Salva o aggiorna il diary di oggi
        diary = (
            db.query(models.PaperTradingDiary)
            .filter_by(portfolio_id=portfolio.id, diary_date=today)
            .first()
        )
        if diary:
            diary.scan_details = scan_details
            diary.report_md = report_md
            diary.tickers_scanned = len(snapshots)
            diary.tickers_eligible = len(eligible)
            diary.filter_level_used = int(filter_level.get("label", "L0").replace("L", "").split("+")[0])
            diary.trades_opened = len(opened)
            diary.trades_closed_sl = len(maintenance.get("sl_closed", []))
            diary.trades_closed_tp = len(maintenance.get("tp_closed", []))
            diary.trades_rolled = len(maintenance.get("rolled", []))
        else:
            diary = models.PaperTradingDiary(
                portfolio_id=portfolio.id,
                diary_date=today,
                tickers_scanned=len(snapshots),
                tickers_eligible=len(eligible),
                filter_level_used=int(filter_level.get("label", "L0").replace("L", "").split("+")[0]),
                trades_opened=len(opened),
                trades_closed_sl=len(maintenance.get("sl_closed", [])),
                trades_closed_tp=len(maintenance.get("tp_closed", [])),
                trades_rolled=len(maintenance.get("rolled", [])),
                scan_details=scan_details,
                report_md=report_md,
            )
            db.add(diary)

        db.commit()

        summary = {
            "ok": True,
            "date": today.isoformat(),
            "snapshots_total": len(snapshots),
            "eligible": len(eligible),
            "filter_level": filter_level.get("label"),
            "trades_opened": len(opened),
            "sl_closed": len(maintenance.get("sl_closed", [])),
            "tp_closed": len(maintenance.get("tp_closed", [])),
            "rolled": len(maintenance.get("rolled", [])),
            "paused": len(maintenance.get("paused", [])),
            "open_count": open_count,
            "equity": round(equity, 2),
        }
        logger.info(f"[PT] === DONE: {summary} ===")
        return summary

    except Exception as e:
        logger.error(f"[PT] Fatal error in scan: {e}", exc_info=True)
        db.rollback()
        return {"ok": False, "error": str(e)}
    finally:
        db.close()
