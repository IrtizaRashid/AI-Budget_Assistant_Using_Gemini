// Controller for user endpoints. Handles req/res + validation;
// delegates all DB work to userService.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as userService from '../services/userService.js';
import * as expenseService from '../services/expenseService.js';

// POST /api/users
// Body: { name, monthly_budget }
export const createUser = asyncHandler(async (req, res) => {
  const { name, monthly_budget } = req.body;

  if (!name || monthly_budget === undefined) {
    return res
      .status(400)
      .json({ error: 'name and monthly_budget are required' });
  }

  if (isNaN(Number(monthly_budget)) || Number(monthly_budget) < 0) {
    return res
      .status(400)
      .json({ error: 'monthly_budget must be a non-negative number' });
  }

  const user = await userService.createUser({ name, monthly_budget });
  res.status(201).json(user);
});

// POST /api/users/:userId/reset-month
// Starts a new month: clears all expenses and resets category spending to 0,
// keeping the user's budget and category allocations.
export const resetMonth = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await userService.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  await expenseService.resetMonthForUser(userId);
  res.status(200).json({
    success: true,
    message: 'New month started. Expenses cleared and category spending reset.',
  });
});

export const saveGeminiKey = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { apiKey } = req.body;

  if (!apiKey || !String(apiKey).trim()) {
    return res.status(400).json({ error: 'Gemini API key is required.' });
  }

  await userService.saveGeminiApiKey(userId, String(apiKey).trim());
  res.status(200).json({ success: true, hasGeminiKey: true });
});
