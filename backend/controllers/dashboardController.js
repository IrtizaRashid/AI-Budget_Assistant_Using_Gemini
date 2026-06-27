// Controller for the dashboard summary endpoint.
// Combines data from userService + expenseService and computes
// the remaining budget on the fly (never stored in the DB).
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as userService from '../services/userService.js';
import * as expenseService from '../services/expenseService.js';

// GET /api/dashboard/:userId
// Returns { monthlyBudget, totalSpent, remainingBudget }
export const getDashboard = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await userService.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const monthlyBudget = Number(user.monthly_budget);
  const totalSpent = await expenseService.getTotalSpentByUser(userId);

  // Remaining Budget = Monthly Budget − Sum(All Expenses)
  const remainingBudget = monthlyBudget - totalSpent;

  res.status(200).json({
    monthlyBudget,
    totalSpent,
    remainingBudget,
  });
});
