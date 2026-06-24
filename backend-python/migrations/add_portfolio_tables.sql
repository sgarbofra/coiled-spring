-- Migration: add portfolio tables
-- Run: python run_migration.py migrations/add_portfolio_tables.sql

-- ── portfolios ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, name)
);

-- ── portfolio_trades ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_trades (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id        INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    option_contract_id  INTEGER NOT NULL REFERENCES option_contracts(id) ON DELETE CASCADE,
    direction           TEXT    NOT NULL CHECK (direction IN ('long', 'short')),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    entry_price         NUMERIC(12,4) NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    close_price         NUMERIC(12,4),
    realized_pnl        NUMERIC(14,4),
    closed_at           DATETIME,
    notes               TEXT,
    created_at          DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at          DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS portfolio_trades_portfolio_idx
    ON portfolio_trades (portfolio_id, status, created_at);

CREATE INDEX IF NOT EXISTS portfolio_trades_contract_idx
    ON portfolio_trades (option_contract_id, portfolio_id, status);
