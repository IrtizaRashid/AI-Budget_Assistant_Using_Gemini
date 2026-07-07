import pool from '../database/db.js';

export const addIncome = async ({
  userId, amount, source = null, description = null,
  receivedDate = null, receivedTime = null, recurring = false,
}) => {
  const date = receivedDate || new Date().toISOString().split('T')[0];
  const [result] = await pool.execute(
    `INSERT INTO income (user_id, amount, source, description, recurring, received_date, received_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, amount, source, description, Boolean(recurring), date, receivedTime || null]
  );
  const [rows] = await pool.execute(
    `SELECT id, user_id, amount, source, description, recurring, received_date, received_time, created_at
       FROM income WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
};

export const getIncomeByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, amount, source, description, recurring, received_date, received_time, created_at
       FROM income
      WHERE user_id = ?
      ORDER BY received_date DESC, received_time DESC, created_at DESC`,
    [userId]
  );
  return rows;
};

export const deleteIncomeById = async (incomeId) => {
  const [result] = await pool.execute(
    `DELETE FROM income WHERE id = ?`,
    [incomeId]
  );
  return result.affectedRows > 0;
};
