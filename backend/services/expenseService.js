// Data-access layer for the `expenses` table.
import pool from '../database/db.js';

// INSERT a new expense, then return the full saved row.
// expense_date is optional — the column defaults to NOW().
export const createExpense = async ({
  user_id,
  category,
  amount,
  description = null,
  expense_date,
}) => {
  let result;

  if (expense_date) {
    [result] = await pool.execute(
      `INSERT INTO expenses (user_id, category, amount, description, expense_date)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, category, amount, description, expense_date]
    );
  } else {
    [result] = await pool.execute(
      `INSERT INTO expenses (user_id, category, amount, description)
       VALUES (?, ?, ?, ?)`,
      [user_id, category, amount, description]
    );
  }

  return findExpenseById(result.insertId);
};

export const findExpenseById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category, amount, description, expense_date
       FROM expenses WHERE id = ?`,
    [id]
  );
  return rows[0];
};

// SELECT all expenses for a user, latest first.
export const getExpensesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category, amount, description, expense_date
       FROM expenses
      WHERE user_id = ?
      ORDER BY expense_date DESC, id DESC`,
    [userId]
  );
  return rows;
};

// SUM of all expense amounts for a user (returns a Number).
// COALESCE guarantees 0 (not NULL) when the user has no expenses.
export const getTotalSpentByUser = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT COALESCE(SUM(amount), 0) AS totalSpent FROM expenses WHERE user_id = ?',
    [userId]
  );
  // mysql2 returns DECIMAL/SUM as a string — convert to a real number.
  return Number(rows[0].totalSpent);
};
