// Controller for user endpoints. Handles req/res + validation;
// delegates all DB work to userService.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as userService from '../services/userService.js';

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
