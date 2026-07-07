import pool from '../database/db.js';
import { increaseBudget, decreaseBudget } from './userService.js';

export const addLoan = async ({ userId, type, personName, amount, description = null, loanDate = null, loanTime = null }) => {
  const date = loanDate || new Date().toISOString().split('T')[0];
  const [result] = await pool.execute(
    `INSERT INTO loans (user_id, type, person_name, amount, original_amount, description, loan_date, loan_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, personName, amount, amount, description, date, loanTime || null]
  );
  const [rows] = await pool.execute(`SELECT * FROM loans WHERE id = ?`, [result.insertId]);
  return rows[0];
};

export const getLoansByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM loans WHERE user_id = ? ORDER BY loan_date DESC, created_at DESC`,
    [userId]
  );
  return rows;
};

export const getLoanById = async (loanId) => {
  const [rows] = await pool.execute(`SELECT * FROM loans WHERE id = ?`, [loanId]);
  return rows[0] || null;
};

export const markLoanPaid = async (loanId) => {
  const today = new Date().toISOString().split('T')[0];
  await pool.execute(
    `UPDATE loans SET status = 'paid', paid_date = ?, amount = 0 WHERE id = ?`,
    [today, loanId]
  );
};

export const updateLoan = async (loanId, fields) => {
  const allowed = ['person_name', 'amount', 'description', 'status', 'paid_date', 'notes'];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (!sets.length) return;
  vals.push(loanId);
  await pool.execute(`UPDATE loans SET ${sets.join(', ')} WHERE id = ?`, vals);
};

export const deleteLoan = async (loanId) => {
  const [result] = await pool.execute(`DELETE FROM loans WHERE id = ?`, [loanId]);
  return result.affectedRows > 0;
};

export const getLoanSummaryByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN amount ELSE 0 END), 0) AS owed_to_me,
       COALESCE(SUM(CASE WHEN type='taken' AND status='active' THEN amount ELSE 0 END), 0) AS i_owe,
       SUM(CASE WHEN type='given' AND status='active' THEN 1 ELSE 0 END) AS given_count,
       SUM(CASE WHEN type='taken' AND status='active' THEN 1 ELSE 0 END) AS taken_count
     FROM loans WHERE user_id = ?`,
    [userId]
  );
  return {
    owed_to_me: Number(rows[0].owed_to_me),
    i_owe: Number(rows[0].i_owe),
    given_count: Number(rows[0].given_count),
    taken_count: Number(rows[0].taken_count),
  };
};

// Record a repayment against a loan.
// Validates amount, records in loan_payments, updates loan balance & status,
// and increases the user's monthly_budget (cash recovery — not income).
// Returns { loan, payment, remaining, newBudget, fullyPaid }
export const repayLoan = async (loanId, repaidAmount, { paymentDate = null, paymentTime = null, paymentMethod = null, notes = null } = {}) => {
  const loan = await getLoanById(loanId);
  if (!loan) throw new Error('Loan not found.');

  const repaid = Number(repaidAmount);
  const currentRemaining = Number(loan.amount);

  if (repaid <= 0) throw new Error('Repayment amount must be greater than zero.');
  if (repaid > currentRemaining) {
    throw new Error(
      `The repayment amount (Rs ${repaid.toLocaleString()}) exceeds the remaining outstanding balance (Rs ${currentRemaining.toLocaleString()}).`
    );
  }

  const date = paymentDate || new Date().toISOString().split('T')[0];
  const newRemaining = Number((currentRemaining - repaid).toFixed(2));
  const fullyPaid = newRemaining <= 0;
  const today = new Date().toISOString().split('T')[0];

  // Record the payment
  const [ins] = await pool.execute(
    `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_time, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [loanId, repaid, date, paymentTime || null, paymentMethod || null, notes || null]
  );

  // Update the loan
  if (fullyPaid) {
    await pool.execute(
      `UPDATE loans SET amount=0, status='paid', paid_date=? WHERE id=?`,
      [today, loanId]
    );
  } else {
    await pool.execute(`UPDATE loans SET amount=? WHERE id=?`, [newRemaining, loanId]);
  }

  // loan_given repaid → cash comes back → increase budget
  // loan_taken repaid → cash goes out → decrease budget
  const newBudget = loan.type === 'given'
    ? await increaseBudget(loan.user_id, repaid)
    : await decreaseBudget(loan.user_id, repaid);

  const [paymentRow] = await pool.execute(`SELECT * FROM loan_payments WHERE id=?`, [ins.insertId]);
  const updatedLoan = await getLoanById(loanId);

  return {
    loan: updatedLoan,
    payment: paymentRow[0],
    remaining: fullyPaid ? 0 : newRemaining,
    originalAmount: Number(loan.original_amount),
    newBudget,
    fullyPaid,
  };
};

// Get full repayment history for a loan.
export const getLoanPayments = async (loanId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_date DESC, created_at DESC`,
    [loanId]
  );
  return rows;
};
