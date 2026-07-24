from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey,
    Integer, JSON, Numeric, Text, Index, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False, default="free")  # free | pro | pro_byok
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ai_api_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # BYOK
    ai_queries_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_queries_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    ai_tokens_today: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_tokens_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    reset_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    watchlists: Mapped[List["Watchlist"]] = relationship(back_populates="user")
    scan_runs: Mapped[List["ScanRun"]] = relationship(back_populates="user")
    broker_config: Mapped[Optional["BrokerConfig"]] = relationship(back_populates="user", uselist=False)
    portfolios: Mapped[List["Portfolio"]] = relationship(back_populates="user")
    notes: Mapped[List["UserNote"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class BrokerConfig(Base):
    __tablename__ = "broker_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    broker: Mapped[str] = mapped_column(Text, nullable=False)  # "ibkr" | "tastytrade"
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="broker_config")


class Watchlist(Base):
    __tablename__ = "watchlists"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="watchlists_user_name_unique"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="watchlists")
    items: Mapped[List["WatchlistItem"]] = relationship(back_populates="watchlist", cascade="all, delete-orphan")


class OptionContract(Base):
    __tablename__ = "option_contracts"
    __table_args__ = (
        CheckConstraint("option_type IN ('call', 'put')", name="option_contracts_option_type_check"),
        Index("option_contracts_lookup_idx", "underlying", "option_type", "expiration", "strike"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    underlying: Mapped[str] = mapped_column(Text, nullable=False)
    option_type: Mapped[str] = mapped_column(Text, nullable=False)
    expiration: Mapped[date] = mapped_column(nullable=False)
    strike: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    multiplier: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    exchange: Mapped[Optional[str]] = mapped_column(Text)
    symbol_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    watchlist_items: Mapped[List["WatchlistItem"]] = relationship(back_populates="option_contract")
    snapshots: Mapped[List["OptionSnapshot"]] = relationship(back_populates="option_contract")
    portfolio_trades: Mapped[List["PortfolioTrade"]] = relationship(back_populates="option_contract")


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="scanner")
    filters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="scan_runs")
    watchlist_items: Mapped[List["WatchlistItem"]] = relationship(back_populates="source_scan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("watchlist_id", "option_contract_id", name="watchlist_items_unique"),
        CheckConstraint("status IN ('active', 'closed', 'archived')", name="watchlist_items_status_check"),
        Index("watchlist_items_watchlist_idx", "watchlist_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    watchlist_id: Mapped[int] = mapped_column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    option_contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("option_contracts.id", ondelete="CASCADE"), nullable=False)
    source_scan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("scan_runs.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")

    entry_premium: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    entry_iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))

    current_bid: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    current_ask: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    current_last_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    current_premium: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    current_iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    current_delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    current_gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    current_vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    current_theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    current_open_interest: Mapped[Optional[int]] = mapped_column(Integer)
    last_refreshed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    watchlist: Mapped["Watchlist"] = relationship(back_populates="items")
    option_contract: Mapped["OptionContract"] = relationship(back_populates="watchlist_items")
    source_scan: Mapped[Optional["ScanRun"]] = relationship(back_populates="watchlist_items")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="watchlist_item", cascade="all, delete-orphan")


class OptionSnapshot(Base):
    __tablename__ = "option_snapshots"
    __table_args__ = (
        Index("option_snapshots_contract_time_idx", "option_contract_id", "as_of"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    option_contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("option_contracts.id", ondelete="CASCADE"), nullable=False)
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    bid: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    ask: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    mid: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    iv_rank: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    iv_percentile: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    oi: Mapped[Optional[int]] = mapped_column(Integer)
    volume: Mapped[Optional[int]] = mapped_column(Integer)
    spread_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    hist_iv_ma: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    option_contract: Mapped["OptionContract"] = relationship(back_populates="snapshots")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("alerts_item_enabled_idx", "watchlist_item_id", "is_enabled"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    watchlist_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("watchlist_items.id", ondelete="CASCADE"), nullable=False)
    alert_type: Mapped[str] = mapped_column(Text, nullable=False)
    threshold_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    watchlist_item: Mapped["WatchlistItem"] = relationship(back_populates="alerts")


class Portfolio(Base):
    __tablename__ = "portfolios"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="portfolios_user_name_unique"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="portfolios")
    trades: Mapped[List["PortfolioTrade"]] = relationship(back_populates="portfolio", cascade="all, delete-orphan")


class PortfolioTrade(Base):
    # direction: 'long' = acquisto / 'short' = vendita allo scoperto
    # status:    'open' = posizione attiva / 'closed' = chiusa con PNL realizzato
    # PNL open   = (current_price - entry_price) * 100 * qty * sign  (sign: long=+1, short=-1)
    # PNL closed = (close_price   - entry_price) * 100 * qty * sign
    __tablename__ = "portfolio_trades"
    __table_args__ = (
        CheckConstraint("direction IN ('long', 'short')", name="portfolio_trades_direction_check"),
        CheckConstraint("status IN ('open', 'closed')", name="portfolio_trades_status_check"),
        CheckConstraint("quantity > 0", name="portfolio_trades_qty_check"),
        Index("portfolio_trades_portfolio_idx", "portfolio_id", "status", "created_at"),
        Index("portfolio_trades_contract_idx", "option_contract_id", "portfolio_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    option_contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("option_contracts.id", ondelete="CASCADE"), nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)           # 'long' | 'short'
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open")
    close_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    realized_pnl: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    portfolio: Mapped["Portfolio"] = relationship(back_populates="trades")
    option_contract: Mapped["OptionContract"] = relationship(back_populates="portfolio_trades")


class UserNote(Base):
    """Note personali dell'utente su un contratto opzione specifico."""
    __tablename__ = "user_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    strike: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    expiration: Mapped[str] = mapped_column(Text, nullable=False)  # ISO date string
    note_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="notes")


class EmailList(Base):
    __tablename__ = "email_list"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source: Mapped[str] = mapped_column(Text, nullable=False, default="web")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    unsubscribed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CancellationFeedback(Base):
    __tablename__ = "cancellation_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IVHistory(Base):
    """Storico IV ATM per ticker e DTE bucket — alimentato dal cron giornaliero
    e (bootstrap) dallo scan utente.

    dte_bucket: DTE approssimativo dell'opzione ATM usata per la misurazione.
      30  = ATM ~30d (standard per IV Rank)
      60  = ATM ~60d
      90  = ATM ~90d
      180 = ATM ~180d
    IV salvata come decimale: 0.2500 = 25% IV.
    """
    __tablename__ = "iv_history"
    __table_args__ = (
        Index("iv_history_ticker_time_idx", "ticker", "recorded_at"),
        Index("iv_history_ticker_bucket_time_idx", "ticker", "dte_bucket", "recorded_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    iv: Mapped[float] = mapped_column(nullable=False)        # es. 0.2500 = 25% IV
    dte_bucket: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class NewsletterLog(Base):
    """Log di ogni esecuzione del job newsletter settimanale.

    week_key: chiave idempotenza, formato "newsletter_YYYY_WNN" — unique per settimana.
    status:   running | success | error | skipped
    """
    __tablename__ = "newsletter_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    week_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    tickers_scanned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    setups_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tickers_published: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    substack_draft_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="running")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class HVSnapshot(Base):
    """Snapshot giornaliero di Historical Volatility per tutti i ticker dell'universo.

    Alimentato dal job APScheduler (dopo chiusura mercato US).
    Una riga per ticker \u2014 upsert giornaliero.

    hv30:           HV 30-day annualizzata (%), es. 28.5 = 28.5%
    hv_rank:        (HV_today - HV_min_52w) / (HV_max_52w - HV_min_52w) * 100
    hv_percentile:  % di giorni nelle ultime 252 sessioni con HV < HV_today
    """
    __tablename__ = "hv_snapshots"
    __table_args__ = (
        Index("hv_snapshots_rank_idx", "hv_rank"),
        Index("hv_snapshots_pct_idx", "hv_percentile"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    company_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hv30: Mapped[Optional[float]] = mapped_column(nullable=True)
    hv30_parkinson: Mapped[Optional[float]] = mapped_column(nullable=True)   # Parkinson estimator (High/Low)
    hv_rank: Mapped[Optional[float]] = mapped_column(nullable=True)
    hv_percentile: Mapped[Optional[float]] = mapped_column(nullable=True)
    hv_52w_high: Mapped[Optional[float]] = mapped_column(nullable=True)
    hv_52w_low: Mapped[Optional[float]] = mapped_column(nullable=True)
    computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# \u2500\u2500 Academy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

class QuizAttempt(Base):
    """Un tentativo di quiz per un modulo.

    question_ids: lista di 10 ID domanda selezionati da Next.js dalla question bank.
    answers:      lista di {question_id, chosen_idx, correct} \u2014 una entry per risposta data.
    status:       'open' mentre il quiz \u00e8 in corso, 'finished' quando completato.
    score/passed: valorizzati solo a status='finished'.
    """
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        Index("quiz_attempts_user_module_status_idx", "user_id", "module_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, nullable=False)
    question_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    answers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="open")  # open | finished
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class QuizResult(Base):
    """Record finale di un quiz completato. Una riga per attempt riuscito.

    Usato per determinare lo sblocco dei moduli successivi
    (modulo N+1 sbloccato se esiste almeno un QuizResult con passed=True per modulo N).
    """
    __tablename__ = "quiz_results"
    __table_args__ = (
        Index("quiz_results_user_module_idx", "user_id", "module_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, nullable=False)
    attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VideoProgress(Base):
    """Ultima posizione di riproduzione dell'utente in un video modulo.

    Una riga per (user_id, module_id, language) — upsert ad ogni checkpoint.
    position_seconds: secondi dall'inizio del video all'ultimo salvataggio.
    """
    __tablename__ = "video_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "module_id", "language", name="uq_video_progress_user_module_lang"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int] = mapped_column(Integer, nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False)          # 'en' | 'it'
    position_seconds: Mapped[float] = mapped_column(nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
