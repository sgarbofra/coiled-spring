-- Migration: Add email verification fields to users table
-- Run this SQL against your database (SQLite, PostgreSQL, etc.)

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;

-- Note: For SQLite, run these commands one at a time
-- SQLite doesn't support multiple ALTER TABLE in a single statement
