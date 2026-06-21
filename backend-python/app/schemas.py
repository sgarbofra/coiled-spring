from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    plan: str = "pro"    # beta gratuita: tutti partono con Pro
    ai_api_key: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    plan: str
    is_active: bool
    has_broker: bool = False
    has_ai_key: bool = False
    ai_queries_today: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}

class UserPlanUpdate(BaseModel):
    plan: str
    ai_api_key: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Broker ────────────────────────────────────────────────────────────────────

class BrokerSave(BaseModel):
    broker: str
    config: dict

class BrokerOut(BaseModel):
    id: int
    broker: str
    config: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Watchlists ────────────────────────────────────────────────────────────────

class WatchlistCreate(BaseModel):
    name: str

class WatchlistUpdate(BaseModel):
    name: Optional[str] = None

class WatchlistOut(BaseModel):
    id: int
    user_id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Option contracts ──────────────────────────────────────────────────────────

class OptionContractCreate(BaseModel):
    underlying: str
    option_type: str
    expiration: date
    strike: Decimal
    multiplier: int = 100
    exchange: Optional[str] = None
    symbol_key: str

class OptionContractOut(BaseModel):
    id: int
    underlying: str
    option_type: str
    expiration: date
    strike: Decimal
    multiplier: int
    exchange: Optional[str]
    symbol_key: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Watchlist items ───────────────────────────────────────────────────────────

class WatchlistItemCreate(BaseModel):
    option_contract: OptionContractCreate
    source_scan_id: Optional[int] = None
    entry_premium: Optional[Decimal] = None
    entry_iv: Optional[Decimal] = None
    entry_delta: Optional[Decimal] = None
    entry_gamma: Optional[Decimal] = None
    entry_vega: Optional[Decimal] = None
    entry_theta: Optional[Decimal] = None
    quantity: int = 1
    notes: Optional[str] = None

class WatchlistItemUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[int] = None

class WatchlistItemOut(BaseModel):
    id: int
    watchlist_id: int
    option_contract_id: int
    option_contract: OptionContractOut
    status: str
    entry_premium: Optional[Decimal]
    entry_iv: Optional[Decimal]
    entry_delta: Optional[Decimal]
    entry_gamma: Optional[Decimal]
    entry_vega: Optional[Decimal]
    entry_theta: Optional[Decimal]
    current_bid: Optional[Decimal]
    current_ask: Optional[Decimal]
    current_last_price: Optional[Decimal]
    current_premium: Optional[Decimal]
    current_iv: Optional[Decimal]
    current_delta: Optional[Decimal]
    current_gamma: Optional[Decimal]
    current_vega: Optional[Decimal]
    current_theta: Optional[Decimal]
    quantity: int
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_refreshed_at: Optional[datetime]
    model_config = {"from_attributes": True}

class BulkAddItems(BaseModel):
    items: List[WatchlistItemCreate]

class BulkRemoveItems(BaseModel):
    item_ids: List[int]

class MoveItems(BaseModel):
    item_ids: List[int]
    target_watchlist_id: int


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    alert_type: str
    threshold_value: Optional[Decimal] = None
    is_enabled: bool = True

class AlertUpdate(BaseModel):
    alert_type: Optional[str] = None
    threshold_value: Optional[Decimal] = None
    is_enabled: Optional[bool] = None

class AlertOut(BaseModel):
    id: int
    watchlist_item_id: int
    alert_type: str
    threshold_value: Optional[Decimal]
    is_enabled: bool
    last_triggered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
