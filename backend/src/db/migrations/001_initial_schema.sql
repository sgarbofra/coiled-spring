create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  subscription_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_set_updated_at
before update on users
for each row
execute function set_updated_at();

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_watchlists_set_updated_at
before update on watchlists
for each row
execute function set_updated_at();

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references watchlists(id) on delete cascade,
  underlying text not null,
  contract_symbol text not null,
  expiry date not null,
  strike numeric(12,4) not null,
  option_type text not null,
  premium numeric(12,4),
  iv numeric(8,4),
  iv_rank numeric(8,4),
  iv_percentile numeric(8,4),
  delta numeric(8,4),
  gamma numeric(8,4),
  vega numeric(8,4),
  theta numeric(8,4),
  open_interest integer,
  volume integer,
  bid numeric(12,4),
  ask numeric(12,4),
  spread numeric(12,4),
  iv_historical_ma numeric(8,4),
  theoretical_pnl numeric(12,4),
  alert_state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (watchlist_id, contract_symbol),
  constraint watchlist_items_option_type_check check (option_type in ('call', 'put'))
);

create trigger trg_watchlist_items_set_updated_at
before update on watchlist_items
for each row
execute function set_updated_at();

create index if not exists idx_watchlists_user_id on watchlists(user_id);
create index if not exists idx_watchlists_user_active on watchlists(user_id, is_active);
create index if not exists idx_watchlist_items_watchlist_id on watchlist_items(watchlist_id);
create index if not exists idx_watchlist_items_underlying on watchlist_items(underlying);
create index if not exists idx_watchlist_items_expiry on watchlist_items(expiry);