-- ============================================================
--  AI Personal Budget Assistant — Database Schema
-- ============================================================
--  This script creates the tables only. The target database is
--  selected by the CONNECTION (so it works on Railway, which gives
--  you a pre-created database such as "railway").
--
--  Local MySQL:
--    mysql -u root -p budget_ai < schema.sql
--    (create the database first: CREATE DATABASE budget_ai;)
--
--  Railway:
--    Connect with the Railway connection string and run this file,
--    e.g. mysql -h <host> -P <port> -u <user> -p<password> <db> < schema.sql
--    or paste it into the Railway database "Query" tab.
-- ============================================================

-- ------------------------------------------------------------
--  Table 1: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT             NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255)    NOT NULL,
  monthly_budget  DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
--  Table 2: budget_categories
--  spent_amount is a STORED snapshot updated as expenses change.
--  (Remaining = allocated - spent is CALCULATED, never stored.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_categories (
  id               INT            NOT NULL AUTO_INCREMENT,
  user_id          INT            NOT NULL,
  category_name    VARCHAR(255)   NOT NULL,
  allocated_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  spent_amount     DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_categories_user (user_id)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
--  Table 3: expenses
--  expense_date defaults to NOW() so the request body need not supply it.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id           INT            NOT NULL AUTO_INCREMENT,
  user_id      INT            NOT NULL,
  category     VARCHAR(255)   NOT NULL,
  amount       DECIMAL(12, 2) NOT NULL,
  description  VARCHAR(255)   NULL,
  expense_date DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_expenses_user (user_id),
  INDEX idx_expenses_date (expense_date),
  -- Speeds up per-category lookups and duplicate detection.
  INDEX idx_expenses_user_category (user_id, category)
) ENGINE = InnoDB;
