-- Performance indexes for the main app pages.
-- Safe to run more than once. Missing optional tables/columns are skipped.

CREATE OR REPLACE FUNCTION public.create_index_if_columns_exist(
  p_index_name text,
  p_table_name text,
  p_columns_sql text,
  p_column_names text[]
) RETURNS void AS $$
DECLARE
  missing_columns integer;
BEGIN
  IF to_regclass(format('public.%I', p_table_name)) IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
    INTO missing_columns
    FROM unnest(p_column_names) AS required_column(column_name)
   WHERE NOT EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = p_table_name
         AND column_name = required_column.column_name
   );

  IF missing_columns = 0 THEN
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)',
      p_index_name,
      p_table_name,
      p_columns_sql
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Users and auth lookup.
SELECT public.create_index_if_columns_exist('idx_users_auth_id', 'users', 'auth_id', ARRAY['auth_id']);
SELECT public.create_index_if_columns_exist('idx_users_email', 'users', 'email', ARRAY['email']);

-- Dashboard, budget, and category pages.
SELECT public.create_index_if_columns_exist('idx_budget_categories_user_id', 'budget_categories', 'user_id', ARRAY['user_id']);
SELECT public.create_index_if_columns_exist('idx_budget_categories_user_category', 'budget_categories', 'user_id, category_name', ARRAY['user_id', 'category_name']);

-- Expense and transaction history.
SELECT public.create_index_if_columns_exist('idx_expenses_user_date_id', 'expenses', 'user_id, expense_date DESC, id DESC', ARRAY['user_id', 'expense_date', 'id']);
SELECT public.create_index_if_columns_exist('idx_expenses_user_category_date', 'expenses', 'user_id, category, expense_date DESC', ARRAY['user_id', 'category', 'expense_date']);
SELECT public.create_index_if_columns_exist('idx_expenses_recent_duplicate', 'expenses', 'user_id, category, amount, description, expense_date DESC', ARRAY['user_id', 'category', 'amount', 'description', 'expense_date']);

-- Income page and transaction rollups.
SELECT public.create_index_if_columns_exist('idx_income_user_received', 'income', 'user_id, received_date DESC, received_time DESC, created_at DESC', ARRAY['user_id', 'received_date', 'received_time', 'created_at']);

-- Loans and loan payments.
SELECT public.create_index_if_columns_exist('idx_loans_user_date', 'loans', 'user_id, loan_date DESC, created_at DESC', ARRAY['user_id', 'loan_date', 'created_at']);
SELECT public.create_index_if_columns_exist('idx_loans_user_type_status', 'loans', 'user_id, type, status', ARRAY['user_id', 'type', 'status']);
SELECT public.create_index_if_columns_exist('idx_loans_user_type_date', 'loans', 'user_id, type, loan_date DESC, created_at DESC', ARRAY['user_id', 'type', 'loan_date', 'created_at']);
SELECT public.create_index_if_columns_exist('idx_loan_payments_loan_date', 'loan_payments', 'loan_id, payment_date DESC, created_at DESC', ARRAY['loan_id', 'payment_date', 'created_at']);

-- Investment portfolio and investment transaction pages.
SELECT public.create_index_if_columns_exist('idx_investments_user_status_created', 'investments', 'user_id, status, created_at DESC', ARRAY['user_id', 'status', 'created_at']);
SELECT public.create_index_if_columns_exist('idx_investments_user_name_status', 'investments', 'user_id, lower(name), status', ARRAY['user_id', 'name', 'status']);
SELECT public.create_index_if_columns_exist('idx_investment_transactions_user_date', 'investment_transactions', 'user_id, transaction_date DESC, created_at DESC', ARRAY['user_id', 'transaction_date', 'created_at']);
SELECT public.create_index_if_columns_exist('idx_investment_transactions_investment_id', 'investment_transactions', 'investment_id', ARRAY['investment_id']);

-- Misc/manual transaction feed.
SELECT public.create_index_if_columns_exist('idx_misc_transactions_user_date', 'misc_transactions', 'user_id, transaction_date DESC, created_at DESC', ARRAY['user_id', 'transaction_date', 'created_at']);
SELECT public.create_index_if_columns_exist('idx_misc_transactions_user_tx_date', 'misc_transactions', 'user_id, tx_date DESC, created_at DESC', ARRAY['user_id', 'tx_date', 'created_at']);

-- AI chat memory.
SELECT public.create_index_if_columns_exist('idx_ai_sessions_user_status_activity', 'ai_sessions', 'user_id, status, last_activity DESC', ARRAY['user_id', 'status', 'last_activity']);
SELECT public.create_index_if_columns_exist('idx_ai_messages_session_created', 'ai_messages', 'session_id, created_at DESC, id DESC', ARRAY['session_id', 'created_at', 'id']);
SELECT public.create_index_if_columns_exist('idx_ai_memory_user_type_updated', 'ai_memory', 'user_id, memory_type, confidence DESC, updated_at DESC', ARRAY['user_id', 'memory_type', 'confidence', 'updated_at']);

DROP FUNCTION public.create_index_if_columns_exist(text, text, text, text[]);
