import pool from '../database/db.js';

const EPSILON = 0.01;

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

const makeIncomeDeleteError = (code, message, details = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
};

const buildReducedAllocations = (categories, newBudget) => {
  if (categories.length === 0) return [];

  const toCents = (value) => Math.round(Number(value || 0) * 100);
  const fromCents = (value) => Number((value / 100).toFixed(2));

  const budgetCents = toCents(newBudget);
  const totalSpentCents = categories.reduce(
    (sum, category) => sum + toCents(category.spent_amount),
    0
  );
  const flexibleBudgetCents = Math.max(budgetCents - totalSpentCents, 0);
  const currentFlexibleCents = categories.reduce((sum, category) => {
    const remaining = toCents(category.allocated_amount) - toCents(category.spent_amount);
    return sum + Math.max(remaining, 0);
  }, 0);

  let assignedFlexibleCents = 0;
  return categories.map((category, index) => {
    const spentCents = toCents(category.spent_amount);
    const isLast = index === categories.length - 1;
    let flexibleShareCents;

    if (isLast) {
      flexibleShareCents = flexibleBudgetCents - assignedFlexibleCents;
    } else {
      const remaining = Math.max(
        toCents(category.allocated_amount) - spentCents,
        0
      );
      const share = currentFlexibleCents > 0
        ? remaining / currentFlexibleCents
        : 1 / categories.length;
      flexibleShareCents = Math.round(flexibleBudgetCents * share);
      flexibleShareCents = Math.min(
        flexibleShareCents,
        flexibleBudgetCents - assignedFlexibleCents
      );
    }

    assignedFlexibleCents += flexibleShareCents;
    const allocationCents = spentCents + flexibleShareCents;

    return {
      id: category.id,
      category_name: category.category_name,
      allocated_amount: fromCents(allocationCents),
      spent_amount: fromCents(spentCents),
    };
  });
};

export const deleteIncomeById = async ({ incomeId, userId }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [incomeRows] = await connection.execute(
      `SELECT id, user_id, amount, source, description, recurring, received_date, received_time, created_at
         FROM income
        WHERE id = ? AND user_id = ?
        FOR UPDATE`,
      [incomeId, userId]
    );
    const income = incomeRows[0];
    if (!income) {
      await connection.rollback();
      return null;
    }

    const [userRows] = await connection.execute(
      'SELECT monthly_budget FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    const currentBudget = Number(userRows[0]?.monthly_budget ?? 0);
    const incomeAmount = Number(income.amount || 0);
    const newBudget = Number((currentBudget - incomeAmount).toFixed(2));

    if (newBudget < -EPSILON) {
      throw makeIncomeDeleteError(
        'INCOME_DELETE_NEGATIVE_BUDGET',
        'This income cannot be deleted because it would make your monthly budget negative.',
        { currentBudget, incomeAmount, newBudget }
      );
    }

    const [expenseRows] = await connection.execute(
      'SELECT COALESCE(SUM(amount), 0) AS total_spent FROM expenses WHERE user_id = ?',
      [userId]
    );
    const totalSpent = Number(expenseRows[0]?.total_spent ?? 0);

    if (totalSpent > newBudget + EPSILON) {
      throw makeIncomeDeleteError(
        'INCOME_DELETE_SPENT_EXCEEDS_BUDGET',
        `This income cannot be deleted because you have already spent Rs ${totalSpent.toLocaleString()} and your budget would drop to Rs ${Math.max(newBudget, 0).toLocaleString()}.`,
        { currentBudget, incomeAmount, newBudget, totalSpent }
      );
    }

    const [categories] = await connection.execute(
      `SELECT id, category_name, allocated_amount, spent_amount
         FROM budget_categories
        WHERE user_id = ?
        ORDER BY id ASC
        FOR UPDATE`,
      [userId]
    );

    const categorySpent = categories.reduce(
      (sum, category) => sum + Number(category.spent_amount || 0),
      0
    );
    if (categorySpent > newBudget + EPSILON) {
      throw makeIncomeDeleteError(
        'INCOME_DELETE_CATEGORY_SPENT_EXCEEDS_BUDGET',
        'This income cannot be deleted because your category spending would exceed the new budget.',
        { currentBudget, incomeAmount, newBudget, categorySpent }
      );
    }

    const allocations = buildReducedAllocations(categories, Math.max(newBudget, 0));

    await connection.execute(
      'UPDATE users SET monthly_budget = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [Math.max(newBudget, 0), userId]
    );

    for (const allocation of allocations) {
      await connection.execute(
        'UPDATE budget_categories SET allocated_amount = ? WHERE id = ? AND user_id = ?',
        [allocation.allocated_amount, allocation.id, userId]
      );
    }

    await connection.execute(
      'DELETE FROM income WHERE id = ? AND user_id = ?',
      [incomeId, userId]
    );

    await connection.commit();

    return {
      deletedIncome: income,
      previousBudget: currentBudget,
      newBudget: Math.max(newBudget, 0),
      categories: allocations,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
