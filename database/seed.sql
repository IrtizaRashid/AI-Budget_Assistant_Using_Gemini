-- ============================================================
--  Optional sample data for the AI Personal Budget Assistant.
--  Run AFTER schema.sql if you want a demo user to start with.
--    mysql -u root -p budget_ai < seed.sql
-- ============================================================

-- A demo user with a 50,000 monthly budget.
INSERT INTO users (name, monthly_budget) VALUES ('Demo User', 50000.00);
SET @uid = LAST_INSERT_ID();

-- Recommended category split (spent_amount starts at 0).
INSERT INTO budget_categories (user_id, category_name, allocated_amount, spent_amount) VALUES
  (@uid, 'Food',          15000.00, 0.00),
  (@uid, 'Transport',      7500.00, 0.00),
  (@uid, 'Bills',         10000.00, 0.00),
  (@uid, 'Entertainment',  5000.00, 0.00),
  (@uid, 'Savings',       10000.00, 0.00),
  (@uid, 'Miscellaneous',  2500.00, 0.00);

-- A couple of sample expenses (and matching spent_amount updates).
INSERT INTO expenses (user_id, category, amount, description) VALUES
  (@uid, 'Food',  500.00, 'Pizza'),
  (@uid, 'Bills', 2000.00, 'Electricity Bill');

UPDATE budget_categories SET spent_amount = 500.00  WHERE user_id = @uid AND category_name = 'Food';
UPDATE budget_categories SET spent_amount = 2000.00 WHERE user_id = @uid AND category_name = 'Bills';
