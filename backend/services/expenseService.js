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

// Insert an expense AND increment the matching category's spent_amount,
// in a single transaction so the two stay consistent (both succeed or
// both roll back). Used by the AI chat add_expense intent.
export const addExpenseWithCategoryUpdate = async ({
  user_id,
  category,
  amount,
  description = null,
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert the expense (expense_date defaults to NOW()).
    const [ins] = await connection.execute(
      `INSERT INTO expenses (user_id, category, amount, description)
       VALUES (?, ?, ?, ?)`,
      [user_id, category, amount, description]
    );

    // 2. Add the amount to that category's running spent_amount.
    await connection.execute(
      `UPDATE budget_categories
          SET spent_amount = spent_amount + ?
        WHERE user_id = ? AND category_name = ?`,
      [amount, user_id, category]
    );

    await connection.commit();

    // Return the saved expense row.
    const [rows] = await connection.execute(
      `SELECT id, user_id, category, amount, description, expense_date
         FROM expenses WHERE id = ?`,
      [ins.insertId]
    );
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Delete an expense AND subtract its amount from the matching category's
// spent_amount, in one transaction. Returns the deleted expense, or null
// if no expense with that id exists. Used by DELETE and delete_last_expense.
export const deleteExpenseWithCategoryUpdate = async (expenseId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Look up the expense first so we know which category/amount to adjust.
    const [rows] = await connection.execute(
      'SELECT id, user_id, category, amount, description, expense_date FROM expenses WHERE id = ?',
      [expenseId]
    );
    const expense = rows[0];
    if (!expense) {
      await connection.rollback();
      return null; // invalid id
    }

    // Remove the expense.
    await connection.execute('DELETE FROM expenses WHERE id = ?', [expenseId]);

    // Subtract from spent_amount. GREATEST(...,0) guards against going negative.
    await connection.execute(
      `UPDATE budget_categories
          SET spent_amount = GREATEST(spent_amount - ?, 0)
        WHERE user_id = ? AND category_name = ?`,
      [expense.amount, expense.user_id, expense.category]
    );

    await connection.commit();
    return expense;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// SELECT expenses for a user filtered by category, latest first.
export const getExpensesByCategory = async (userId, category) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category, amount, description, expense_date
       FROM expenses
      WHERE user_id = ? AND category = ?
      ORDER BY expense_date DESC, id DESC`,
    [userId, category]
  );
  return rows;
};

// SELECT today's expenses for a user, latest first.
export const getTodayExpensesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category, amount, description, expense_date
       FROM expenses
      WHERE user_id = ? AND DATE(expense_date) = CURDATE()
      ORDER BY expense_date DESC, id DESC`,
    [userId]
  );
  return rows;
};

// SELECT the single most recent expense for a user (or undefined).
export const getLatestExpense = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category, amount, description, expense_date
       FROM expenses
      WHERE user_id = ?
      ORDER BY expense_date DESC, id DESC
      LIMIT 1`,
    [userId]
  );
  return rows[0];
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
