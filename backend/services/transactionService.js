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

const emptyOnMissingOptionalTable = (promise) => promise.then(([rows]) => rows).catch(() => []);

export const getTransactionHistory = async (userId, options = {}) => {
  const id = Number(userId);
  const limit = Math.min(Math.max(Number(options.limit) || 300, 1), 1000);

  const expensesQuery = pool.execute(
    `SELECT
       'expense' AS type,
       e.id,
       e.amount,
       e.category,
       e.description,
       NULL AS person,
       NULL AS investment_name,
       NULL AS loan_id,
       NULL AS investment_id,
       e.expense_date AS date,
       NULL AS time,
       e.expense_date AS created_at
     FROM expenses e
     WHERE e.user_id = ?
     ORDER BY e.expense_date DESC, e.id DESC
     LIMIT ?`,
    [id, limit]
  ).then(([rows]) => rows);

  const incomeQuery = pool.execute(
    `SELECT
       'income' AS type,
       id,
       amount,
       source AS category,
       description,
       NULL AS person,
       NULL AS investment_name,
       NULL AS loan_id,
       NULL AS investment_id,
       received_date AS date,
       received_time AS time,
       created_at
     FROM income
     WHERE user_id = ?
     ORDER BY received_date DESC, received_time DESC, created_at DESC
     LIMIT ?`,
    [id, limit]
  ).then(([rows]) => rows);

  const loansGivenQuery = pool.execute(
    `SELECT
       'loan_given' AS type,
       id,
       original_amount AS amount,
       'Loan Given' AS category,
       description,
       person_name AS person,
       NULL AS investment_name,
       id AS loan_id,
       NULL AS investment_id,
       loan_date AS date,
       loan_time AS time,
       created_at
     FROM loans
     WHERE user_id = ? AND type = 'given'
     ORDER BY loan_date DESC, created_at DESC
     LIMIT ?`,
    [id, limit]
  ).then(([rows]) => rows);

  const loansTakenQuery = pool.execute(
    `SELECT
       'loan_taken' AS type,
       id,
       original_amount AS amount,
       'Loan Taken' AS category,
       description,
       person_name AS person,
       NULL AS investment_name,
       id AS loan_id,
       NULL AS investment_id,
       loan_date AS date,
       loan_time AS time,
       created_at
     FROM loans
     WHERE user_id = ? AND type = 'taken'
     ORDER BY loan_date DESC, created_at DESC
     LIMIT ?`,
    [id, limit]
  ).then(([rows]) => rows);

  const repaymentsReceivedQuery = emptyOnMissingOptionalTable(pool.execute(
    `SELECT
       'repayment_received' AS type,
       lp.id,
       lp.amount,
       'Repayment Received' AS category,
       COALESCE(lp.notes, CONCAT('Repayment from ', l.person_name)) AS description,
       l.person_name AS person,
       NULL AS investment_name,
       lp.loan_id,
       NULL AS investment_id,
       lp.payment_date AS date,
       lp.payment_time AS time,
       lp.created_at
     FROM loan_payments lp
     JOIN loans l ON lp.loan_id = l.id
     WHERE l.user_id = ? AND l.type = 'given'
     ORDER BY lp.payment_date DESC, lp.created_at DESC
     LIMIT ?`,
    [id, limit]
  ));

  const repaymentsMadeQuery = emptyOnMissingOptionalTable(pool.execute(
    `SELECT
       'repayment_made' AS type,
       lp.id,
       lp.amount,
       'Repayment Made' AS category,
       COALESCE(lp.notes, CONCAT('Repayment to ', l.person_name)) AS description,
       l.person_name AS person,
       NULL AS investment_name,
       lp.loan_id,
       NULL AS investment_id,
       lp.payment_date AS date,
       lp.payment_time AS time,
       lp.created_at
     FROM loan_payments lp
     JOIN loans l ON lp.loan_id = l.id
     WHERE l.user_id = ? AND l.type = 'taken'
     ORDER BY lp.payment_date DESC, lp.created_at DESC
     LIMIT ?`,
    [id, limit]
  ));

  const investmentQuery = emptyOnMissingOptionalTable(pool.execute(
    `SELECT
       it.type AS raw_type,
       it.id,
       it.amount,
       i.type AS category,
       i.name AS description,
       NULL AS person,
       i.name AS investment_name,
       NULL AS loan_id,
       it.investment_id,
       it.transaction_date AS date,
       it.transaction_time AS time,
       it.created_at
     FROM investment_transactions it
     JOIN investments i ON it.investment_id = i.id
     WHERE it.user_id = ?
     ORDER BY COALESCE(it.transaction_date, it.created_at) DESC, it.created_at DESC
     LIMIT ?`,
    [id, limit]
  )).then((rows) => {
    const typeMap = {
      purchase: 'investment_buy',
      sale: 'investment_sell',
      dividend: 'investment_dividend',
      interest: 'investment_interest',
      capital_gain: 'investment_gain',
      capital_loss: 'investment_loss',
    };
    return rows.map((row) => ({
      ...row,
      type: typeMap[row.raw_type] || row.raw_type,
      raw_type: undefined,
    }));
  });

  const miscQuery = emptyOnMissingOptionalTable(pool.execute(
    `SELECT
       type,
       id,
       amount,
       category,
       description,
       person,
       investment_name,
       loan_id,
       investment_id,
       tx_date AS date,
       tx_time AS time,
       created_at
     FROM misc_transactions
     WHERE user_id = ?
     ORDER BY tx_date DESC, created_at DESC
     LIMIT ?`,
    [id, limit]
  ));

  const groups = await Promise.all([
    expensesQuery,
    incomeQuery,
    loansGivenQuery,
    loansTakenQuery,
    repaymentsReceivedQuery,
    repaymentsMadeQuery,
    investmentQuery,
    miscQuery,
  ]);

  const all = groups.flat().map((row) => ({
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

  all.sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(a.created_at);
    const db = b.date ? new Date(b.date) : new Date(b.created_at);
    if (db - da !== 0) return db - da;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return all.slice(0, limit);
};
