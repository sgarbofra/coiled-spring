create table users (
  id bigserial primary key,
  email text not null unique,
  plan text not null default 'pro',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table watchlists (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlists_user_name_unique unique (user_id, name)
);

create table option_contracts (
  id bigserial primary key,
  underlying text not null,
  option_type text not null check (option_type in ('call', 'put')),
  expiration date not null,
  strike numeric(12,4) not null,
  multiplier integer not null default 100,
  exchange text,
  symbol_key text not null unique,
  created_at timestamptz not null default now()
);

create index option_contracts_lookup_idx
on option_contracts (underlying, option_type, expiration, strike);

create table scan_runs (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  source text not null default 'scanner',
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table watchlist_items (
  id bigserial primary key,
  watchlist_id bigint not null references watchlists(id) on delete cascade,
  option_contract_id bigint not null references option_contracts(id) on delete cascade,
  source_scan_id bigint references scan_runs(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'closed', 'archived')),
  entry_premium numeric(12,4),
  entry_iv numeric(8,4),
  entry_delta numeric(8,4),
  entry_gamma numeric(8,4),
  entry_vega numeric(8,4),
  entry_theta numeric(8,4),
  quantity integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watchlist_items_unique unique (watchlist_id, option_contract_id)
);

create index watchlist_items_watchlist_idx
on watchlist_items (watchlist_id, created_at desc);

create table option_snapshots (
  id bigserial primary key,
  option_contract_id bigint not null references option_contracts(id) on delete cascade,
  as_of timestamptz not null,
  bid numeric(12,4),
  ask numeric(12,4),
  mid numeric(12,4),
  iv numeric(8,4),
  iv_rank numeric(8,4),
  iv_percentile numeric(8,4),
  delta numeric(8,4),
  gamma numeric(8,4),
  vega numeric(8,4),
  theta numeric(8,4),
  oi integer,
  volume integer,
  spread_pct numeric(8,4),
  hist_iv_ma numeric(8,4),
  created_at timestamptz not null default now()
);

create index option_snapshots_contract_time_idx
on option_snapshots (option_contract_id, as_of desc);

create table alerts (
  id bigserial primary key,
  watchlist_item_id bigint not null references watchlist_items(id) on delete cascade,
  alert_type text not null,
  threshold_value numeric(12,4),
  is_enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alerts_item_enabled_idx
on alerts (watchlist_item_id, is_enabled);