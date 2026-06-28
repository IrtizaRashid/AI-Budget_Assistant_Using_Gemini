// Controller for the first-time budget setup workflow.
// Validates the full payload, then delegates the transactional save
// to setupService.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as setupService from '../services/setupService.js';

// Floating-point tolerance so that e.g. 49999.99 vs 50000 from rounding
// doesn't wrongly fail the "sum must equal budget" check.
const EPSILON = 0.01;

// POST /api/setup-budget
export const setupBudget = asyncHandler(async (req, res) => {
  const { name, monthlyBudget, categories } = req.body;

  // --- Validate name ---
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }

  // --- Validate monthly budget > 0 ---
  const budget = Number(monthlyBudget);
  if (isNaN(budget) || budget <= 0) {
    return res
      .status(400)
      .json({ error: 'Monthly budget must be greater than zero.' });
  }

  // --- Validate categories array ---
  if (!Array.isArray(categories) || categories.length === 0) {
    return res
      .status(400)
      .json({ error: 'At least one budget category is required.' });
  }

  // --- Validate each amount and accumulate the total ---
  let total = 0;
  for (const c of categories) {
    if (!c.category || !String(c.category).trim()) {
      return res
        .status(400)
        .json({ error: 'Every category must have a name.' });
    }
    const amount = Number(c.allocatedAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        error: `Amount for "${c.category}" cannot be negative.`,
      });
    }
    total += amount;
  }

  // --- The sum of all categories must equal the monthly budget ---
  if (Math.abs(total - budget) > EPSILON) {
    return res.status(400).json({
      error: `Category amounts add up to ${total}, but your monthly budget is ${budget}. They must be equal.`,
    });
  }

  // Validation passed → save everything in one transaction.
  const { userId } = await setupService.setupBudget({
    name: String(name).trim(),
    monthlyBudget: budget,
    categories,
  });

  res.status(201).json({
    message: 'Budget setup completed successfully.',
    userId,
  });
});
