-- ============================================================
--  AI Personal Budget Assistant — Supabase Postgres Schema
-- ============================================================
--  Run this once in the Supabase Dashboard → SQL Editor.
--
--  Notes:
--  · The Express backend connects directly (transaction pooler,
--    port 6543) and bypasses RLS. RLS is enabled with no policies
--    so the tables are NOT reachable through Supabase's auto REST
--    API with the anon key.
--  · users.auth_id links each app user to Supabase Auth
--    (auth.users.id). The row is auto-created on first API call.
-- ============================================================

-- ------------------------------------------------------------
--  updated_at trigger helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
--  Table 1: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_id         UUID           NOT NULL UNIQUE,
  name            VARCHAR(255)   NOT NULL DEFAULT '',
  email           VARCHAR(255)   NOT NULL UNIQUE,
  monthly_budget  NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  gemini_api_key  TEXT           NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
--  Table 2: budget_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_categories (
  id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_name    VARCHAR(255)   NOT NULL,
  allocated_amount NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  spent_amount     NUMERIC(12,2)  NOT NULL DEFAULT 0.00
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON budget_categories(user_id);

-- ------------------------------------------------------------
--  Table 3: expenses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     VARCHAR(255)   NOT NULL,
  amount       NUMERIC(12,2)  NOT NULL,
  description  VARCHAR(255)   NULL,
  expense_date TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user          ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category);

-- ------------------------------------------------------------
--  Table 4: income
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
  id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2)  NOT NULL,
  source        VARCHAR(100)   NULL,
  description   VARCHAR(255)   NULL,
  recurring     BOOLEAN        NOT NULL DEFAULT FALSE,
  received_date DATE           NOT NULL,
  received_time TIME           NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id);

-- ------------------------------------------------------------
--  Table 5: loans
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loans (
  id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(10)    NOT NULL CHECK (type IN ('given','taken')),
  person_name     VARCHAR(255)   NOT NULL,
  amount          NUMERIC(12,2)  NOT NULL,
  original_amount NUMERIC(12,2)  NOT NULL,
  description     VARCHAR(255)   NULL,
  status          VARCHAR(10)    NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid')),
  loan_date       DATE           NOT NULL,
  loan_time       TIME           NULL,
  paid_date       DATE           NULL,
  notes           TEXT           NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
DROP TRIGGER IF EXISTS trg_loans_updated_at ON loans;
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
--  Table 6: loan_payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_payments (
  id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_id        INT            NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2)  NOT NULL,
  payment_date   DATE           NOT NULL,
  payment_time   TIME           NULL,
  payment_method VARCHAR(100)   NULL,
  notes          TEXT           NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

-- ------------------------------------------------------------
--  Table 7: investments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investments (
  id                 INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(255)   NOT NULL,
  type               VARCHAR(100)   NOT NULL DEFAULT 'Other',
  invested_amount    NUMERIC(15,2)  NOT NULL DEFAULT 0,
  current_value      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  quantity           NUMERIC(15,6)  NULL,
  avg_purchase_price NUMERIC(15,2)  NULL,
  status             VARCHAR(10)    NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','closed')),
  purchase_date      DATE           NULL,
  purchase_time      TIME           NULL,
  notes              TEXT           NULL,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
DROP TRIGGER IF EXISTS trg_investments_updated_at ON investments;
CREATE TRIGGER trg_investments_updated_at BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
--  Table 8: investment_transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_transactions (
  id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  investment_id    INT            NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id          INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(20)    NOT NULL CHECK (type IN ('purchase','sale','dividend','interest','capital_gain','capital_loss')),
  amount           NUMERIC(15,2)  NOT NULL,
  quantity         NUMERIC(15,6)  NULL,
  price_per_unit   NUMERIC(15,2)  NULL,
  profit_loss      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  transaction_date DATE           NULL,
  transaction_time TIME           NULL,
  notes            TEXT           NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_tx_user       ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_investment ON investment_transactions(investment_id);

-- ------------------------------------------------------------
--  Table 9: misc_transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS misc_transactions (
  id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(64)    NOT NULL,
  amount          NUMERIC(12,2)  NOT NULL DEFAULT 0,
  category        VARCHAR(255)   NULL,
  description     VARCHAR(512)   NULL,
  person          VARCHAR(255)   NULL,
  investment_name VARCHAR(255)   NULL,
  loan_id         INT            NULL,
  investment_id   INT            NULL,
  currency        VARCHAR(8)     NOT NULL DEFAULT 'PKR',
  notes           TEXT           NULL,
  tx_date         DATE           NOT NULL,
  tx_time         TIME           NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_misc_tx_user ON misc_transactions(user_id);

-- ------------------------------------------------------------
--  Lock the tables away from Supabase's auto REST API.
--  (RLS on + no policies = anon/authenticated keys get nothing;
--   the backend's direct Postgres connection is unaffected.)
-- ------------------------------------------------------------
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE income                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE misc_transactions       ENABLE ROW LEVEL SECURITY;
