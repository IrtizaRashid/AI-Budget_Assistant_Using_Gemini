// Controller for dashboard statistics (charts data).
// Assembles allocated / spent / remaining arrays per category plus the
// total expense count. All amounts are CALCULATED here from stored data.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as categoryService from '../services/categoryService.js';
import * as expenseService from '../services/expenseService.js';

// GET /api/statistics/:userId
export const getStatistics = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const cats = await categoryService.getCategoriesByUser(userId);

  // Build the three per-category series the charts need.
  const allocated = cats.map((c) => ({
    category: c.category_name,
    amount: Number(c.allocated_amount),
  }));

  const spent = cats.map((c) => ({
    category: c.category_name,
    amount: Number(c.spent_amount),
  }));

  // remaining = allocated - spent (calculated, never stored)
  const remaining = cats.map((c) => ({
    category: c.category_name,
    amount: Number(c.allocated_amount) - Number(c.spent_amount),
  }));

  const expenseCount = await expenseService.getExpenseCountByUser(userId);

  res.status(200).json({ allocated, spent, remaining, expenseCount });
});
