from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey,
    Integer, Numeric, Text, Index, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False, default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    watchlists: Mapped[List["Watchlist"]] = relationship(back_populates="user")
    scan_runs: Mapped[List["ScanRun"]] = relationship(back_populates="user")


class Watchlist(Base):
    __tablename__ = "watchlists"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="watchlists_user_name_unique"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
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


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="scanner")
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    watchlist_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    option_contract_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("option_contracts.id", ondelete="CASCADE"), nullable=False)
    source_scan_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("scan_runs.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    entry_premium: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    entry_iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    entry_theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    option_contract_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("option_contracts.id", ondelete="CASCADE"), nullable=False)
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    watchlist_item_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("watchlist_items.id", ondelete="CASCADE"), nullable=False)
    alert_type: Mapped[str] = mapped_column(Text, nullable=False)
    threshold_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    watchlist_item: Mapped["WatchlistItem"] = relationship(back_populates="alerts")
