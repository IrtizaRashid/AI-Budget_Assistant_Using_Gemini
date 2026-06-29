-- ============================================================
--  Railway Production Migration — Auth System
--  Safe to run on an existing database.
--  Does NOT delete any existing users, budgets, or expenses.
--  Uses IF NOT EXISTS / column existence checks so it is
--  idempotent (safe to run more than once).
-- ============================================================

-- Step 1: Add email column if it does not already exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NOT NULL DEFAULT '' AFTER name;

-- Step 2: Add password_hash column if it does not already exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email;

-- Step 3: Add updated_at column if it does not already exist
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    AFTER created_at;

-- Step 4: Add index on email for fast lookups (ignore error if already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
--  Verification — run this after migration to confirm columns
-- ============================================================
-- SHOW COLUMNS FROM users;
-- Expected columns: id, name, email, password_hash, monthly_budget, created_at, updated_at
