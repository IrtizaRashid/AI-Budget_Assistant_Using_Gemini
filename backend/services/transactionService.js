import pool from '../database/db.js';

export const recordMiscTransaction = async ({
  userId,
  type,
  amount,
  category = null,
  description = null,
  person = null,
  investmentName = null,
  loanId = null,
  investmentId = null,
  notes = null,
  txDate = null,
  txTime = null,
}) => {
  const date = txDate || new Date().toISOString().split('T')[0];
  const [res] = await pool.execute(
    `INSERT INTO misc_transactions
       (user_id, type, amount, category, description, person, investment_name,
        loan_id, investment_id, notes, tx_date, tx_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      Number(amount),
      category,
      description,
      person,
      investmentName,
      loanId || null,
      investmentId || null,
      notes,
      date,
      txTime || null,
    ]
  );
  return res.insertId;
};

export const getTransactionHistory = async (userId, options = {}) => {
  const id = Number(userId);
  const limit = Math.min(Math.max(Number(options.limit) || 300, 1), 1000);

  const [rows] = await pool.execute(
    `SELECT *
       FROM (
        SELECT
          'expense' AS type,
          e.id,
          e.amount,
          e.category,
          e.description,
          NULL AS person,
          NULL AS investment_name,
          NULL::text AS loan_id,
          NULL::text AS investment_id,
          e.expense_date AS date,
          NULL AS time,
          e.expense_date AS created_at
        FROM expenses e
        WHERE e.user_id = ?

        UNION ALL

        SELECT
          'income' AS type,
          i.id,
          i.amount,
          i.source AS category,
          i.description,
          NULL AS person,
          NULL AS investment_name,
          NULL::text AS loan_id,
          NULL::text AS investment_id,
          i.received_date AS date,
          i.received_time AS time,
          i.created_at
        FROM income i
        WHERE i.user_id = ?

        UNION ALL

        SELECT
          'loan_given' AS type,
          l.id,
          l.original_amount AS amount,
          'Loan Given' AS category,
          l.description,
          l.person_name AS person,
          NULL AS investment_name,
          l.id::text AS loan_id,
          NULL::text AS investment_id,
          l.loan_date AS date,
          l.loan_time AS time,
          l.created_at
        FROM loans l
        WHERE l.user_id = ? AND l.type = 'given'

        UNION ALL

        SELECT
          'loan_taken' AS type,
          l.id,
          l.original_amount AS amount,
          'Loan Taken' AS category,
          l.description,
          l.person_name AS person,
          NULL AS investment_name,
          l.id::text AS loan_id,
          NULL::text AS investment_id,
          l.loan_date AS date,
          l.loan_time AS time,
          l.created_at
        FROM loans l
        WHERE l.user_id = ? AND l.type = 'taken'

        UNION ALL

        SELECT
          'repayment_received' AS type,
          lp.id,
          lp.amount,
          'Repayment Received' AS category,
          COALESCE(lp.notes, CONCAT('Repayment from ', l.person_name)) AS description,
          l.person_name AS person,
          NULL AS investment_name,
          lp.loan_id::text AS loan_id,
          NULL::text AS investment_id,
          lp.payment_date AS date,
          lp.payment_time AS time,
          lp.created_at
        FROM loan_payments lp
        JOIN loans l ON lp.loan_id = l.id
        WHERE l.user_id = ? AND l.type = 'given'

        UNION ALL

        SELECT
          'repayment_made' AS type,
          lp.id,
          lp.amount,
          'Repayment Made' AS category,
          COALESCE(lp.notes, CONCAT('Repayment to ', l.person_name)) AS description,
          l.person_name AS person,
          NULL AS investment_name,
          lp.loan_id::text AS loan_id,
          NULL::text AS investment_id,
          lp.payment_date AS date,
          lp.payment_time AS time,
          lp.created_at
        FROM loan_payments lp
        JOIN loans l ON lp.loan_id = l.id
        WHERE l.user_id = ? AND l.type = 'taken'

        UNION ALL

        SELECT
          CASE it.type
            WHEN 'purchase' THEN 'investment_buy'
            WHEN 'sale' THEN 'investment_sell'
            WHEN 'dividend' THEN 'investment_dividend'
            WHEN 'interest' THEN 'investment_interest'
            WHEN 'capital_gain' THEN 'investment_gain'
            WHEN 'capital_loss' THEN 'investment_loss'
            ELSE it.type
          END AS type,
          it.id,
          it.amount,
          inv.type AS category,
          inv.name AS description,
          NULL AS person,
          inv.name AS investment_name,
          NULL::text AS loan_id,
          it.investment_id::text AS investment_id,
          it.transaction_date AS date,
          it.transaction_time AS time,
          it.created_at
        FROM investment_transactions it
        JOIN investments inv ON it.investment_id = inv.id
        WHERE it.user_id = ?

        UNION ALL

        SELECT
          m.type,
          m.id,
          m.amount,
          m.category,
          m.description,
          m.person,
          m.investment_name,
          m.loan_id::text AS loan_id,
          m.investment_id::text AS investment_id,
          m.tx_date AS date,
          m.tx_time AS time,
          m.created_at
        FROM misc_transactions m
        WHERE m.user_id = ?
      ) tx
      ORDER BY tx.date DESC NULLS LAST, tx.created_at DESC NULLS LAST
      LIMIT ?`,
    [id, id, id, id, id, id, id, id, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category || null,
    description: row.description || null,
    person: row.person || null,
    investment_name: row.investment_name || null,
    loan_id: row.loan_id || null,
    investment_id: row.investment_id || null,
    date: row.date ? String(row.date).slice(0, 10) : null,
    time: row.time || null,
    created_at: row.created_at,
  }));
};
