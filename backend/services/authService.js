import pool from '../database/db.js';

export const getUserById = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT id, auth_id, name, email, monthly_budget, gemini_api_key, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );
  return rows[0];
};
