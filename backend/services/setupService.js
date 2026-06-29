// Data-access layer for the first-time budget setup.
// Works with an already-authenticated user — updates their budget
// and replaces their categories in a single transaction.
import pool from '../database/db.js';

export const setupBudgetForUser = async ({ userId, monthlyBudget, categories }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update the user's monthly budget.
    await connection.execute(
      'UPDATE users SET monthly_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [monthlyBudget, userId]
    );

    // Remove any existing categories so re-setup is idempotent.
    await connection.execute(
      'DELETE FROM budget_categories WHERE user_id = ?',
      [userId]
    );

    // Also reset expenses when re-doing setup (fresh start).
    // Remove this block if you want to keep historical expenses on re-setup.
    // await connection.execute('DELETE FROM expenses WHERE user_id = ?', [userId]);

    // Insert all new categories.
    const values = categories.map((c) => [
      userId,
      c.category,
      c.allocatedAmount,
      0,
    ]);

    await connection.query(
      `INSERT INTO budget_categories
         (user_id, category_name, allocated_amount, spent_amount)
       VALUES ?`,
      [values]
    );

    await connection.commit();
    return { userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Add income to the user's monthly budget and proportionally scale
// every category's allocation to match the new total.
export const addIncomeForUser = async ({ userId, incomeAmount }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Read current budget + categories.
    const [userRows] = await connection.execute(
      'SELECT monthly_budget FROM users WHERE id = ?',
      [userId]
    );
    const currentBudget = Number(userRows[0]?.monthly_budget ?? 0);
    const newBudget = currentBudget + incomeAmount;

    const [cats] = await connection.execute(
      'SELECT category_name, allocated_amount FROM budget_categories WHERE user_id = ?',
      [userId]
    );

    // 2. Update the monthly budget.
    await connection.execute(
      'UPDATE users SET monthly_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newBudget, userId]
    );

    // 3. Proportionally scale every category's allocation.
    if (currentBudget > 0 && cats.length > 0) {
      for (const cat of cats) {
        const ratio = Number(cat.allocated_amount) / currentBudget;
        const newAllocation = Math.round(ratio * newBudget * 100) / 100;
        await connection.execute(
          'UPDATE budget_categories SET allocated_amount = ? WHERE user_id = ? AND category_name = ?',
          [newAllocation, userId, cat.category_name]
        );
      }
    }

    await connection.commit();

    // Return updated categories for the response.
    const [updatedCats] = await connection.execute(
      'SELECT category_name, allocated_amount, spent_amount FROM budget_categories WHERE user_id = ?',
      [userId]
    );

    return { previousBudget: currentBudget, newBudget, categories: updatedCats };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateBudgetAllocationForUser = async ({ userId, monthlyBudget, categories }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      'UPDATE users SET monthly_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [monthlyBudget, userId]
    );

    for (const category of categories) {
      await connection.execute(
        `UPDATE budget_categories
            SET allocated_amount = ?
          WHERE user_id = ? AND category_name = ?`,
        [category.allocatedAmount, userId, category.category]
      );
    }

    await connection.commit();
    return { userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
