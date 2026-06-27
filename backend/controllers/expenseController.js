// Controller for expense endpoints.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as expenseService from '../services/expenseService.js';

// POST /api/expenses
// Body: { user_id, category, amount, description?, expense_date? }
export const createExpense = asyncHandler(async (req, res) => {
  const { user_id, category, amount, description, expense_date } = req.body;

  if (!user_id || !category || amount === undefined) {
    return res
      .status(400)
      .json({ error: 'user_id, category and amount are required' });
  }

  if (isNaN(Number(amount)) || Number(amount) <= 0) {
    return res
      .status(400)
      .json({ error: 'amount must be a positive number' });
  }

  const expense = await expenseService.createExpense({
    user_id,
    category,
    amount,
    description,
    expense_date,
  });

  res.status(201).json(expense);
});

// GET /api/expenses/:userId  — latest first.
export const getExpenses = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const expenses = await expenseService.getExpensesByUser(userId);
  res.status(200).json(expenses);
});
