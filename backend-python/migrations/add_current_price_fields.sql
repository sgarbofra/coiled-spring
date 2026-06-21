-- Migration: Add current_* fields to watchlist_items table
-- Run this SQL against your database (SQLite, PostgreSQL, etc.)

ALTER TABLE watchlist_items ADD COLUMN current_bid NUMERIC(12, 4);
ALTER TABLE watchlist_items ADD COLUMN current_ask NUMERIC(12, 4);
ALTER TABLE watchlist_items ADD COLUMN current_last_price NUMERIC(12, 4);
ALTER TABLE watchlist_items ADD COLUMN current_premium NUMERIC(12, 4);
ALTER TABLE watchlist_items ADD COLUMN current_iv NUMERIC(8, 4);
ALTER TABLE watchlist_items ADD COLUMN current_delta NUMERIC(8, 4);
ALTER TABLE watchlist_items ADD COLUMN current_gamma NUMERIC(8, 4);
ALTER TABLE watchlist_items ADD COLUMN current_vega NUMERIC(8, 4);
ALTER TABLE watchlist_items ADD COLUMN current_theta NUMERIC(8, 4);
ALTER TABLE watchlist_items ADD COLUMN last_refreshed_at TIMESTAMP WITH TIME ZONE;

-- Note: For SQLite, run these commands one at a time
-- SQLite doesn't support multiple ALTER TABLE in a single statement
