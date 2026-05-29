create table users (
  id bigserial primary key,
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table plans (
  id bigserial primary key,
  code text not null unique,
  name text not null,
  price_cents integer not null,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  plan_id bigint not null references plans(id),
  status text not null check (status in ('active', 'past_due', 'canceled', 'expired', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_status_idx
on subscriptions (user_id, status);

create table payments (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  subscription_id bigint references subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_id text unique,
  amount_cents integer not null,
  currency text not null default 'EUR',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);