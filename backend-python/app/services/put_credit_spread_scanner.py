"""
Bull Put Credit Spread Scanner — Paper Trading
Coiled Spring Terminal

Strategia: Vendita di Bull Put Credit Spread su ETF liquidi
  - Short PUT a ~15 delta, 28–35 DTE
  - Long PUT $5 più bassa della short (stessa scadenza)
  - Stop Loss:   chiudi quando valore spread ≥ 3× credito iniziale (= perdita 2× credito)
  - Take Profit: chiudi quando valore spread ≤ 0.5× credito iniziale (50% del profitto incassato)
  - Scadenza naturale: se DTE ≤ 0 → chiudi a valore residuo (spesso $0 → profitto massimo)

Regole money management:
  - Capitale simulato: $25,000
  - Max 1 posizione per sottostante (niente piramidatura)
  - Max 10% del capitale per posizione in notional
  - SL riferito al credito ricevuto, non al notional

Eseguito ogni giorno alle 15:30 CET (09:30 ET, apertura mercato US).
"""

from __future__ import annotations

import json
import logging
import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import yfinance as yf

from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# ── Costanti strategia ────────────────────────────────────────────────────────

PORTFOLIO_NAME    = "BULL PUT CREDIT SPREAD"
USER_EMAIL        = "francesco.sgarbossa@yahoo.com"
INITIAL_EQUITY    = 25_000.0    # USD simulati (≈ €25.000)
MAX_POSITION_PCT  = 0.10        # 10% del capitale per posizione
TARGET_DELTA      = 0.15        # delta target per la short put
DELTA_TOLERANCE   = 0.06        # accetta delta 0.09 – 0.21
DTE_MIN           = 28          # DTE minimo all'ingresso
DTE_MAX           = 35          # DTE massimo all'ingresso
SL_MULTIPLIER     = 3.0         # SL: chiudi se spread ≥ 3× credito (= perdita 2× credito)
TP_MULTIPLIER     = 0.5         # TP: chiudi se spread ≤ 50% credito
MIN_CREDIT_PCT    = 0.05        # credito minimo = 5% della larghezza spread
MAX_CREDIT_PCT    = 0.45        # credito massimo = 45% (evita spread troppo ATM)
MIN_OI            = 50          # open interest minimo per la short leg
MIN_IV            = 0.05        # IV minima (evita dati anomali)
MAX_IV            = 2.00        # IV massima (evita dati anomali)

# Universo ETF (dal trading journal 2023-2026)
UNIVERSE = [
    "SPY",   # S&P 500
    "QQQ",   # Nasdaq 100
    "IWM",   # Russell 2000
    "DIA",   # Dow Jones
    "GLD",   # Gold
    "TLT",   # Treasury Bond 20Y
    "SMH",   # Semiconductors
    "XBI",   # Biotech
    "XLU",   # Utilities
    "IYR",   # Real Estate
    "VNQ",   # REIT
    "USO",   # Oil
    "IBIT",  # Bitcoin ETF
    "GDX",   # Gold miners (bonus diversification)
]


# ── Black-Scholes helpers ──────────────────────────────────────────────────────

def _norm_cdf(x: float) -> float:
    """Approssimazione CDF normale standard (Abramowitz & Stegun)."""
    if x < 0:
        return 1.0 - _norm_cdf(-x)
    t = 1.0 / (1.0 + 0.2316419 * x)
    poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937
            + t * (-1.821255978 + t * 1.330274429))))
    return 1.0 - (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x * x) * poly


def _bs_put_delta(S: float, K: float, T: float, r: float, sigma: float) -> float:
    """Delta di una PUT europea (Black-Scholes). Ritorna 0 se errore."""
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    try:
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        return _norm_cdf(d1) - 1.0   # delta put = N(d1) - 1  (negativo)
    except Exception:
        return 0.0


# ── Spread width dinamica ──────────────────────────────────────────────────────

def _spread_width(price: float) -> float:
    """Larghezza ottimale dello spread in base al prezzo del sottostante."""
    if price >= 500:
        return 10.0
    elif price >= 100:
        return 5.0
    elif price >= 50:
        return 2.5
    else:
        return 1.0


# ── Option chain fetching ──────────────────────────────────────────────────────

def _find_credit_spread(ticker: str) -> Optional[dict]:
    """Cerca il Bull Put Credit Spread ottimale per il ticker dato.

    Criteri:
    - Scadenza tra DTE_MIN e DTE_MAX giorni
    - Short PUT con |delta| più vicino a TARGET_DELTA (tolleranza ±DELTA_TOLERANCE)
    - Long PUT a SPREAD_WIDTH punti sotto la short
    - Credito netto positivo tra MIN_CREDIT_PCT e MAX_CREDIT_PCT della larghezza
    - OI short put ≥ MIN_OI

    Ritorna un dizionario con tutti i parametri del trade, o None se non trovato.
    """
    try:
        t = yf.Ticker(ticker)
        price = t.fast_info.last_price
        if not price or price <= 0:
            logger.warning(f"[CS] {ticker}: prezzo non disponibile")
            return None

        today = date.today()
        width = _spread_width(price)

        best: Optional[dict] = None
        best_delta_dist = float("inf")

        for exp_str in (t.options or []):
            try:
                exp_date = date.fromisoformat(exp_str)
            except ValueError:
                continue

            dte = (exp_date - today).days
            if dte < DTE_MIN or dte > DTE_MAX:
                continue

            try:
                chain = t.option_chain(exp_str)
                puts = chain.puts
            except Exception as e:
                logger.debug(f"[CS] {ticker} {exp_str}: chain error {e}")
                continue

            if puts.empty:
                continue

            T_yr = dte / 365.0

            # Scansiona puts OTM (strike < price)
            otm_puts = puts[puts["strike"] < price].copy()
            if otm_puts.empty:
                continue

            for _, row in otm_puts.iterrows():
                strike = float(row.get("strike", 0) or 0)
                if strike <= 0:
                    continue

                bid    = float(row.get("bid",  0) or 0)
                ask    = float(row.get("ask",  0) or 0)
                oi     = int(row.get("openInterest", 0) or 0)
                iv_raw = float(row.get("impliedVolatility", 0) or 0)

                if oi < MIN_OI:
                    continue
                if bid <= 0 or ask <= 0:
                    continue
                if iv_raw < MIN_IV or iv_raw > MAX_IV:
                    continue

                delta = _bs_put_delta(price, strike, T_yr, 0.05, iv_raw)
                abs_delta = abs(delta)

                # Filtra per delta accettabile
                if abs_delta < TARGET_DELTA - DELTA_TOLERANCE:
                    continue
                if abs_delta > TARGET_DELTA + DELTA_TOLERANCE:
                    continue

                dist = abs(abs_delta - TARGET_DELTA)
                if dist >= best_delta_dist:
                    continue

                # Cerca la long leg (strike - width)
                long_target = strike - width
                long_candidates = puts[abs(puts["strike"] - long_target) <= 1.01]
                if long_candidates.empty:
                    continue

                long_row = long_candidates.iloc[0]
                long_bid = float(long_row.get("bid", 0) or 0)
                long_ask = float(long_row.get("ask", 0) or 0)
                long_mid = (long_bid + long_ask) / 2 if (long_bid > 0 and long_ask > 0) else 0

                if long_mid <= 0:
                    continue

                short_mid = (bid + ask) / 2
                net_credit = short_mid - long_mid

                if net_credit <= 0:
                    continue

                # Filtro credito percentuale
                credit_pct = net_credit / width
                if credit_pct < MIN_CREDIT_PCT or credit_pct > MAX_CREDIT_PCT:
                    continue

                # Questo è il miglior spread finora
                best_delta_dist = dist
                best = {
                    "ticker":         ticker,
                    "current_price":  round(price, 2),
                    "expiration":     exp_str,
                    "dte":            dte,
                    "spread_width":   width,
                    # Short leg
                    "short_strike":   strike,
                    "short_bid":      round(bid, 4),
                    "short_ask":      round(ask, 4),
                    "short_mid":      round(short_mid, 4),
                    "short_delta":    round(delta, 4),
                    "short_iv":       round(iv_raw, 4),
                    "short_oi":       oi,
                    # Long leg
                    "long_strike":    float(long_row["strike"]),
                    "long_bid":       round(long_bid, 4),
                    "long_ask":       round(long_ask, 4),
                    "long_mid":       round(long_mid, 4),
                    # Spread summary
                    "net_credit":     round(net_credit, 4),
                    "max_loss":       round(width - net_credit, 4),
                    "credit_pct":     round(credit_pct * 100, 1),
                }

        return best

    except Exception as e:
        logger.error(f"[CS] {ticker}: errore fetch: {e}")
        return None


def _get_current_spread_value(
    ticker: str, expiration: str, short_strike: float, long_strike: float
) -> Optional[float]:
    """Fetch il valore corrente netto dello spread (costo per chiudere).

    Spread value = short_put_ask - long_put_bid
    (= quanto paghi per comprare la short e vendere la long)
    Se <= 0 o dati mancanti, ritorna None.
    """
    try:
        exp_date = date.fromisoformat(expiration)
        dte = (exp_date - date.today()).days

        # Scaduta o in scadenza oggi: valore residuo = max(0, short_intrinsic - long_intrinsic)
        if dte <= 0:
            t = yf.Ticker(ticker)
            price = t.fast_info.last_price or 0
            short_iv = max(0, short_strike - price)
            long_iv  = max(0, long_strike - price)
            return round(max(0, short_iv - long_iv), 4)

        t = yf.Ticker(ticker)
        chain = t.option_chain(expiration)
        puts = chain.puts

        # Short put: costo per riacquistare (ask della short)
        short_rows = puts[abs(puts["strike"] - short_strike) < 0.01]
        # Long put: provento dalla vendita (bid della long)
        long_rows  = puts[abs(puts["strike"] - long_strike) < 0.01]

        if short_rows.empty or long_rows.empty:
            return None

        short_ask = float(short_rows.iloc[0].get("ask", 0) or 0)
        long_bid  = float(long_rows.iloc[0].get("bid", 0) or 0)

        # Fallback su lastPrice se bid/ask non disponibili
        if short_ask <= 0:
            short_ask = float(short_rows.iloc[0].get("lastPrice", 0) or 0)
        if long_bid <= 0:
            long_bid = 0.0

        spread_value = max(0.0, short_ask - long_bid)
        return round(spread_value, 4)

    except Exception as e:
        logger.debug(f"[CS] {ticker}: errore prezzo spread corrente: {e}")
        return None


# ── Money management ───────────────────────────────────────────────────────────

def _compute_equity(db, portfolio_id: int) -> float:
    """Equity simulata = capitale iniziale + PNL realizzati chiusi."""
    closed = (
        db.query(models.PortfolioTrade)
        .filter(
            models.PortfolioTrade.portfolio_id == portfolio_id,
            models.PortfolioTrade.status == "closed",
            models.PortfolioTrade.realized_pnl.isnot(None),
        )
        .all()
    )
    realized = sum(float(t.realized_pnl or 0) for t in closed)
    return INITIAL_EQUITY + realized


def _compute_qty(equity: float, width: float) -> int:
    """Numero di contratti per posizione.

    Budget per posizione = MAX_POSITION_PCT × equity
    Max loss per contratto = spread_width × 100 (worst case teorico)
    qty = floor(budget / max_loss_per_contract), minimo 1
    """
    budget = equity * MAX_POSITION_PCT
    max_loss_per_contract = width * 100  # spread width × moltiplicatore 100
    qty = max(1, int(budget // max_loss_per_contract))
    return qty


# ── Portfolio helpers ──────────────────────────────────────────────────────────

def _get_or_create_portfolio(db) -> models.Portfolio:
    """Restituisce o crea il portfolio BULL PUT CREDIT SPREAD per l'utente."""
    user = db.query(models.User).filter_by(email=USER_EMAIL).first()
    if not user:
        raise RuntimeError(
            f"[CS] Utente {USER_EMAIL} non trovato nel DB. "
            "Assicurarsi che l'account sia registrato."
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
        logger.info(f"[CS] Portfolio '{PORTFOLIO_NAME}' creato per {USER_EMAIL}")

    return portfolio


def _get_or_create_short_contract(db, spread: dict) -> models.OptionContract:
    """Restituisce o crea l'OptionContract per la short PUT (gamba principale)."""
    symbol_key = (
        f"{spread['ticker']}_{spread['expiration']}_"
        f"{spread['short_strike']:.2f}P_CS"
    )
    contract = (
        db.query(models.OptionContract)
        .filter_by(symbol_key=symbol_key)
        .first()
    )
    if not contract:
        contract = models.OptionContract(
            underlying=spread["ticker"],
            option_type="put",
            expiration=date.fromisoformat(spread["expiration"]),
            strike=spread["short_strike"],
            multiplier=100,
            symbol_key=symbol_key,
        )
        db.add(contract)
        db.flush()
    return contract


def _encode_spread_notes(spread: dict, qty: int, reason: str = "OPEN") -> str:
    """Serializza i dettagli dello spread nel campo notes del PortfolioTrade."""
    return json.dumps({
        "strategy":     "bull_put_cs",
        "reason":       reason,
        "short_strike": spread["short_strike"],
        "long_strike":  spread["long_strike"],
        "width":        spread["spread_width"],
        "expiration":   spread["expiration"],
        "dte_entry":    spread["dte"],
        "net_credit":   spread["net_credit"],
        "short_mid":    spread.get("short_mid"),   # prezzo mid della short put (gamba venduta)
        "long_mid":     spread.get("long_mid"),    # prezzo mid della long put (gamba comprata)
        "max_loss":     spread["max_loss"],
        "credit_pct":   spread["credit_pct"],
        "short_delta":  spread["short_delta"],
        "short_iv":     spread["short_iv"],
        "qty":          qty,
    })


def _open_spread(
    db, portfolio: models.Portfolio, spread: dict, equity: float
) -> models.PortfolioTrade:
    """Apre un nuovo trade di Bull Put Credit Spread."""
    contract = _get_or_create_short_contract(db, spread)
    qty = _compute_qty(equity, spread["spread_width"])

    trade = models.PortfolioTrade(
        portfolio_id=portfolio.id,
        option_contract_id=contract.id,
        direction="short",           # credit spread = vendiamo
        quantity=qty,
        entry_price=spread["net_credit"],  # prezzo = credito netto
        status="open",
        notes=_encode_spread_notes(spread, qty),
    )
    db.add(trade)
    db.flush()

    # PaperTradingPosition: upsert per ticker
    pos = (
        db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id, ticker=spread["ticker"])
        .first()
    )
    if pos:
        pos.trade_id = trade.id
        pos.roll_count = 0
        pos.pause_until = None
        pos.signal_details = {
            "net_credit":   spread["net_credit"],
            "short_strike": spread["short_strike"],
            "long_strike":  spread["long_strike"],
            "expiration":   spread["expiration"],
            "short_delta":  spread["short_delta"],
            "credit_pct":   spread["credit_pct"],
        }
    else:
        pos = models.PaperTradingPosition(
            portfolio_id=portfolio.id,
            ticker=spread["ticker"],
            trade_id=trade.id,
            roll_count=0,
            pause_until=None,
            signal_details={
                "net_credit":   spread["net_credit"],
                "short_strike": spread["short_strike"],
                "long_strike":  spread["long_strike"],
                "expiration":   spread["expiration"],
                "short_delta":  spread["short_delta"],
                "credit_pct":   spread["credit_pct"],
            },
        )
        db.add(pos)

    return trade


def _close_spread(
    db, trade: models.PortfolioTrade, close_value: float, reason: str
) -> float:
    """Chiude un credit spread e calcola il PNL realizzato.

    PNL (short direction) = (entry_price - close_price) * 100 * qty
    entry_price = credito iniziale
    close_price = valore dello spread al momento della chiusura
    """
    entry = float(trade.entry_price)
    pnl = (entry - close_value) * 100 * trade.quantity
    trade.status = "closed"
    trade.close_price = close_value
    trade.realized_pnl = pnl
    trade.closed_at = datetime.now(timezone.utc)

    # Aggiorna notes con motivo di chiusura
    try:
        notes_data = json.loads(trade.notes or "{}")
    except Exception:
        notes_data = {}
    notes_data["close_reason"] = reason
    notes_data["close_value"] = close_value
    trade.notes = json.dumps(notes_data)

    return pnl


# ── Manutenzione posizioni aperte ─────────────────────────────────────────────

def _maintain_positions(db, portfolio: models.Portfolio) -> dict:
    """Controlla SL/TP/Scadenza per tutte le posizioni aperte.

    Ritorna dict con: sl_closed, tp_closed, expired, errors
    """
    stats: dict = {"sl_closed": [], "tp_closed": [], "expired": [], "errors": []}

    open_trades = (
        db.query(models.PortfolioTrade)
        .filter_by(portfolio_id=portfolio.id, status="open")
        .all()
    )

    for trade in open_trades:
        contract = trade.option_contract
        ticker = contract.underlying
        expiration = contract.expiration.isoformat()

        try:
            notes_data = json.loads(trade.notes or "{}")
        except Exception:
            notes_data = {}

        short_strike = float(contract.strike)
        long_strike  = notes_data.get("long_strike", short_strike - 5.0)
        entry_credit = float(trade.entry_price)

        pos = (
            db.query(models.PaperTradingPosition)
            .filter_by(portfolio_id=portfolio.id, ticker=ticker)
            .first()
        )

        try:
            exp_date = date.fromisoformat(expiration)
            dte_remaining = (exp_date - date.today()).days

            # ── Scadenza naturale ────────────────────────────────────────────
            if dte_remaining <= 0:
                close_val = _get_current_spread_value(
                    ticker, expiration, short_strike, long_strike
                ) or 0.0
                pnl = _close_spread(db, trade, close_val, "EXPIRE")
                if pos:
                    pos.trade_id = None
                stats["expired"].append({
                    "ticker":    ticker,
                    "pnl":       round(pnl, 2),
                    "entry":     entry_credit,
                    "close":     close_val,
                    "gain_pct":  round((entry_credit - close_val) / entry_credit * 100, 1)
                                 if entry_credit > 0 else 0,
                })
                logger.info(f"[CS] EXPIRE {ticker}: PNL ${pnl:.0f}")
                continue

            # ── Prezzo corrente spread ────────────────────────────────────────
            current_val = _get_current_spread_value(
                ticker, expiration, short_strike, long_strike
            )
            if current_val is None:
                logger.warning(f"[CS] {ticker}: prezzo spread non disponibile — skip")
                stats["errors"].append({"ticker": ticker, "reason": "no_price"})
                continue

            ratio = current_val / entry_credit if entry_credit > 0 else 0

            # ── Take Profit: spread vale ≤ 50% del credito ────────────────────
            if ratio <= TP_MULTIPLIER:
                pnl = _close_spread(db, trade, current_val, "TP")
                if pos:
                    pos.trade_id = None
                stats["tp_closed"].append({
                    "ticker":    ticker,
                    "pnl":       round(pnl, 2),
                    "entry":     entry_credit,
                    "close":     current_val,
                    "gain_pct":  round((entry_credit - current_val) / entry_credit * 100, 1),
                    "dte_left":  dte_remaining,
                })
                logger.info(f"[CS] TP {ticker}: +${pnl:.0f} (spread {current_val:.2f} = {ratio:.0%} credito)")
                continue

            # ── Stop Loss: spread vale ≥ 3× il credito ────────────────────────
            if ratio >= SL_MULTIPLIER:
                pnl = _close_spread(db, trade, current_val, "SL")
                if pos:
                    pos.trade_id = None
                stats["sl_closed"].append({
                    "ticker":    ticker,
                    "pnl":       round(pnl, 2),
                    "entry":     entry_credit,
                    "close":     current_val,
                    "loss_pct":  round((current_val - entry_credit) / entry_credit * 100, 1),
                    "dte_left":  dte_remaining,
                })
                logger.info(f"[CS] SL {ticker}: -${abs(pnl):.0f} (spread {current_val:.2f} = {ratio:.0%} credito)")
                continue

            logger.debug(
                f"[CS] HOLD {ticker}: spread={current_val:.2f}, "
                f"ratio={ratio:.0%}, DTE={dte_remaining}"
            )

        except Exception as e:
            logger.error(f"[CS] {ticker}: errore manutenzione: {e}", exc_info=True)
            stats["errors"].append({"ticker": ticker, "reason": str(e)})

    return stats


# ── Apertura nuove posizioni ──────────────────────────────────────────────────

def _open_new_positions(
    db, portfolio: models.Portfolio, equity: float
) -> list[dict]:
    """Scansiona l'universo ETF e apre Bull Put Credit Spread dove possibile."""

    opened: list[dict] = []

    # Ticker con posizione già aperta
    already_open = {
        pos.ticker
        for pos in db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id)
        .all()
        if pos.trade_id is not None
    }

    # Ticker in pausa (dopo SL — logica conservativa, facoltativa)
    today = date.today()
    paused = {
        pos.ticker
        for pos in db.query(models.PaperTradingPosition)
        .filter_by(portfolio_id=portfolio.id)
        .all()
        if pos.pause_until and pos.pause_until > today
    }

    for ticker in UNIVERSE:
        if ticker in already_open or ticker in paused:
            logger.debug(f"[CS] {ticker}: skip (già aperta o in pausa)")
            continue

        spread = _find_credit_spread(ticker)
        if not spread:
            logger.info(f"[CS] {ticker}: nessun spread valido trovato")
            continue

        trade = _open_spread(db, portfolio, spread, equity)
        qty   = trade.quantity
        already_open.add(ticker)

        opened.append({
            "ticker":       ticker,
            "short_strike": spread["short_strike"],
            "long_strike":  spread["long_strike"],
            "expiration":   spread["expiration"],
            "dte":          spread["dte"],
            "net_credit":   spread["net_credit"],
            "max_loss":     spread["max_loss"],
            "credit_pct":   spread["credit_pct"],
            "short_delta":  spread["short_delta"],
            "qty":          qty,
            "trade_id":     trade.id,
        })
        logger.info(
            f"[CS] OPEN {ticker} "
            f"P{spread['short_strike']:.0f}/{spread['long_strike']:.0f} "
            f"exp={spread['expiration']} credit=${spread['net_credit']:.2f} "
            f"delta={spread['short_delta']:.2f} qty={qty}"
        )

    return opened


# ── Diary generation ───────────────────────────────────────────────────────────

def _generate_diary(
    today: date,
    maintenance: dict,
    opened: list[dict],
    equity: float,
    open_count: int,
) -> str:
    """Genera il report Markdown giornaliero."""

    sl_list  = maintenance.get("sl_closed", [])
    tp_list  = maintenance.get("tp_closed", [])
    exp_list = maintenance.get("expired",   [])
    err_list = maintenance.get("errors",    [])

    lines = [
        "# 🐻 Bull Put Credit Spread — Diario di Bordo",
        f"**Data**: {today.isoformat()}  |  **Ora scan**: 15:30 CET",
        f"**Equity simulata**: ${equity:,.0f}  |  **Posizioni aperte**: {open_count}",
        "",
        "---",
        "",
    ]

    # Manutenzione
    lines.append("## 🔄 Manutenzione Posizioni")
    if not any([sl_list, tp_list, exp_list]):
        lines.append("_Nessun evento di manutenzione oggi._")
    for item in tp_list:
        lines.append(
            f"- ✅ **TP** {item['ticker']}: chiuso a ${item['close']:.2f} "
            f"(+{item['gain_pct']:.0f}% del credito) → PNL **+${item['pnl']:.0f}**  "
            f"DTE rimanente: {item['dte_left']}gg"
        )
    for item in sl_list:
        lines.append(
            f"- 🛑 **SL** {item['ticker']}: chiuso a ${item['close']:.2f} "
            f"(-{item['loss_pct']:.0f}% del credito) → PNL **-${abs(item['pnl']):.0f}**  "
            f"DTE rimanente: {item['dte_left']}gg"
        )
    for item in exp_list:
        gain_sign = "+" if item["pnl"] >= 0 else ""
        lines.append(
            f"- ⏰ **EXPIRE** {item['ticker']}: scaduto a ${item['close']:.2f} "
            f"→ PNL **{gain_sign}${item['pnl']:.0f}**"
        )
    if err_list:
        lines.append(f"- ⚠️ Errori: {', '.join(e['ticker'] for e in err_list)}")
    lines.append("")

    # Nuove operazioni
    lines.append(f"## 💼 Nuove Operazioni ({len(opened)})")
    if opened:
        lines.append("")
        lines.append("| Ticker | Short | Long | Scadenza | DTE | Credito | Credit% | Delta | Qty |")
        lines.append("|--------|-------|------|----------|-----|---------|---------|-------|-----|")
        for o in opened:
            lines.append(
                f"| {o['ticker']} | {o['short_strike']:.0f} | {o['long_strike']:.0f} | "
                f"{o['expiration']} | {o['dte']}d | ${o['net_credit']:.2f} | "
                f"{o['credit_pct']:.1f}% | {o['short_delta']:.2f} | {o['qty']} |"
            )
    else:
        lines.append("_Nessuna nuova operazione aperta oggi._")
    lines.append("")

    # Stato portfolio
    max_loss_open = sum(
        float(json.loads(t.notes or "{}").get("max_loss", 5)) * 100 * t.quantity
        for t in []  # calcolato nel chiamante
    )
    lines.extend([
        "## 📋 Stato Portfolio",
        f"- Capitale iniziale: ${INITIAL_EQUITY:,.0f}",
        f"- Equity corrente:   ${equity:,.0f}",
        f"- P&L netto:         ${equity - INITIAL_EQUITY:+,.0f}",
        f"- Posizioni aperte:  {open_count}",
        "",
        "---",
        "_Report generato da Coiled Spring Terminal — Bull Put Credit Spread Bot_",
    ])

    return "\n".join(lines)


# ── Entry point principale ────────────────────────────────────────────────────

def run_credit_spread_scan() -> dict:
    """Entry point del job giornaliero alle 15:30 CET.

    1. Manutenzione posizioni aperte (SL / TP / Scadenza)
    2. Apertura nuove posizioni su ETF non già coperti
    3. Diary entry giornaliero
    """
    logger.info("[CS] === START bull put credit spread scan ===")
    db = SessionLocal()

    try:
        portfolio = _get_or_create_portfolio(db)

        # ── Manutenzione ────────────────────────────────────────────────────────
        maintenance = _maintain_positions(db, portfolio)
        db.commit()

        # ── Equity aggiornata post-manutenzione ──────────────────────────────
        equity = _compute_equity(db, portfolio.id)

        # ── Nuove posizioni ──────────────────────────────────────────────────
        opened = _open_new_positions(db, portfolio, equity)
        db.commit()

        # ── Statistiche finali ───────────────────────────────────────────────
        equity = _compute_equity(db, portfolio.id)
        open_count = (
            db.query(models.PortfolioTrade)
            .filter_by(portfolio_id=portfolio.id, status="open")
            .count()
        )

        # ── Diary ────────────────────────────────────────────────────────────
        today = date.today()
        report_md = _generate_diary(
            today=today,
            maintenance=maintenance,
            opened=opened,
            equity=equity,
            open_count=open_count,
        )

        scan_details = {
            "maintenance": maintenance,
            "opened":      opened,
            "equity":      round(equity, 2),
            "open_count":  open_count,
        }

        diary = (
            db.query(models.PaperTradingDiary)
            .filter_by(portfolio_id=portfolio.id, diary_date=today)
            .first()
        )
        if diary:
            diary.scan_details  = scan_details
            diary.report_md     = report_md
            diary.tickers_scanned   = len(UNIVERSE)
            diary.tickers_eligible  = len(opened)
            diary.filter_level_used = 0
            diary.trades_opened     = len(opened)
            diary.trades_closed_sl  = len(maintenance.get("sl_closed", []))
            diary.trades_closed_tp  = len(maintenance.get("tp_closed", []))
            diary.trades_rolled     = len(maintenance.get("expired", []))
        else:
            diary = models.PaperTradingDiary(
                portfolio_id=portfolio.id,
                diary_date=today,
                tickers_scanned=len(UNIVERSE),
                tickers_eligible=len(opened),
                filter_level_used=0,
                trades_opened=len(opened),
                trades_closed_sl=len(maintenance.get("sl_closed", [])),
                trades_closed_tp=len(maintenance.get("tp_closed", [])),
                trades_rolled=len(maintenance.get("expired", [])),
                scan_details=scan_details,
                report_md=report_md,
            )
            db.add(diary)

        db.commit()

        summary = {
            "ok":           True,
            "date":         today.isoformat(),
            "universe":     len(UNIVERSE),
            "opened":       len(opened),
            "sl_closed":    len(maintenance.get("sl_closed", [])),
            "tp_closed":    len(maintenance.get("tp_closed", [])),
            "expired":      len(maintenance.get("expired", [])),
            "open_count":   open_count,
            "equity":       round(equity, 2),
        }
        logger.info(f"[CS] === DONE: {summary} ===")
        return summary

    except Exception as e:
        logger.error(f"[CS] Fatal error: {e}", exc_info=True)
        db.rollback()
        return {"ok": False, "error": str(e)}
    finally:
        db.close()
