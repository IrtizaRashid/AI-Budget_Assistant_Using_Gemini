// Data-access layer for the first-time budget setup.
//
// This is the one place in the app that performs a MULTI-step write
// (create user  +  insert many categories), so it uses a DATABASE
// TRANSACTION: either every row is saved, or nothing is — there is no
// half-finished state where a user exists without their categories.
import pool from '../database/db.js';

export const setupBudget = async ({ name, monthlyBudget, categories }) => {
  // A dedicated connection is required so all statements run in the
  // same transaction (the shared pool could otherwise hand out a
  // different connection per query).
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1 + 2. Create the user and store their monthly budget.
    const [userResult] = await connection.execute(
      'INSERT INTO users (name, monthly_budget) VALUES (?, ?)',
      [name, monthlyBudget]
    );
    const userId = userResult.insertId;

    // 3 + 4. Insert every category in one bulk query, spent_amount = 0.
    const values = categories.map((c) => [
      userId,
      c.category,
      c.allocatedAmount,
      0, // spent_amount always starts at 0 on setup
    ]);

    await connection.query(
      `INSERT INTO budget_categories
         (user_id, category_name, allocated_amount, spent_amount)
       VALUES ?`,
      [values]
    );

    // Commit — make all changes permanent together.
    await connection.commit();

    return { userId };
  } catch (error) {
    // Any failure rolls back the whole thing (no partial saves).
    await connection.rollback();
    throw error;
  } finally {
    // Always return the connection to the pool.
    connection.release();
  }
};
