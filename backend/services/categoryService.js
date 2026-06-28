// Data-access layer for the `budget_categories` table.
import pool from '../database/db.js';

// Bulk-INSERT an array of categories in one query.
// `pool.query` (not execute) is used because it supports the
// nested-array bulk-insert form: VALUES ?  ->  [[...], [...]]
export const createCategories = async (categories) => {
  const values = categories.map((c) => [
    c.user_id,
    c.category_name,
    c.allocated_amount ?? 0,
    c.spent_amount ?? 0,
  ]);

  const [result] = await pool.query(
    `INSERT INTO budget_categories
       (user_id, category_name, allocated_amount, spent_amount)
     VALUES ?`,
    [values]
  );

  return result.affectedRows;
};

// SELECT a single category for a user by its name (or undefined).
export const getCategoryByName = async (userId, categoryName) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category_name, allocated_amount, spent_amount
       FROM budget_categories
      WHERE user_id = ? AND category_name = ?
      LIMIT 1`,
    [userId, categoryName]
  );
  return rows[0];
};

// SELECT all categories for a user (raw stored values).
export const getCategoriesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, category_name, allocated_amount, spent_amount
       FROM budget_categories
      WHERE user_id = ?
      ORDER BY id ASC`,
    [userId]
  );
  return rows;
};
