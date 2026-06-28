// Controller for expense endpoints.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as expenseService from '../services/expenseService.js';
import * as categoryService from '../services/categoryService.js';

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

// DELETE /api/expenses/:expenseId
// Removes the expense and decrements the category's spent_amount.
export const deleteExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;

  if (!expenseId || isNaN(Number(expenseId))) {
    return res.status(400).json({ error: 'Invalid expense id.' });
  }

  const deleted = await expenseService.deleteExpenseWithCategoryUpdate(expenseId);
  if (!deleted) {
    return res.status(404).json({ error: 'Expense not found.' });
  }

  res.status(200).json({
    success: true,
    message: 'Expense deleted.',
    expense: deleted,
  });
});

// POST /api/expenses/confirm
// Resolves an over-budget expense after the user chooses how to proceed.
// Body: { userId, action, expense: { category, amount, description }, fromCategory? }
//   action = 'transfer' | 'over_budget' | 'cancel'
export const confirmExpense = asyncHandler(async (req, res) => {
  const { userId, action, expense, fromCategory } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId is required.' });
  if (!action) return res.status(400).json({ error: 'action is required.' });

  // Option 3: Cancel — make no database changes.
  if (action === 'cancel') {
    return res.status(200).json({ status: 'cancelled' });
  }

  // Validate the pending expense for the remaining actions.
  if (!expense || !expense.category || expense.amount === undefined) {
    return res.status(400).json({ error: 'Expense details are required.' });
  }
  const amount = Number(expense.amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid expense amount.' });
  }
  const description = expense.description || expense.category;

  // Option 2: Record as over-budget — insert normally; spent may exceed allocated.
  if (action === 'over_budget') {
    const saved = await expenseService.addExpenseWithCategoryUpdate({
      user_id: userId,
      category: expense.category,
      amount,
      description,
    });

    // Compute how far over the allocation we now are, for a warning message.
    const cat = await categoryService.getCategoryByName(userId, expense.category);
    const over = cat
      ? Number(cat.spent_amount) - Number(cat.allocated_amount)
      : 0;

    return res.status(201).json({
      status: 'success',
      action: 'over_budget',
      message: 'Expense recorded as over-budget.',
      warning:
        over > 0 ? `${expense.category} budget exceeded by ${over}.` : null,
      expense: saved,
    });
  }

  // Option 1: Transfer funds from another category, then record the expense.
  if (action === 'transfer') {
    if (!fromCategory) {
      return res
        .status(400)
        .json({ error: 'Please choose a category to transfer funds from.' });
    }
    if (fromCategory === expense.category) {
      return res
        .status(400)
        .json({ error: 'Cannot transfer from the same category.' });
    }

    try {
      const saved = await expenseService.transferFundsAndAddExpense({
        user_id: userId,
        toCategory: expense.category,
        fromCategory,
        amount,
        description,
      });
      return res.status(201).json({
        status: 'success',
        action: 'transfer',
        message: `Transferred PKR ${amount} from ${fromCategory} to ${expense.category}.`,
        expense: saved,
      });
    } catch (err) {
      // Insufficient source funds -> a clean 400, not a 500.
      if (err.code === 'INSUFFICIENT_FUNDS') {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }
  }

  return res.status(400).json({ error: `Unknown action: "${action}".` });
});
