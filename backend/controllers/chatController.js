// Chat controller — the heart of Step 5.
//
// Flow:  React -> here -> OpenAI (interpret only) -> VALIDATE -> DB -> React
//
// The AI ONLY classifies the message into an intent JSON. Every validation,
// calculation, and database write happens HERE, in our own code.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as openaiService from '../services/openaiService.js';
import * as expenseService from '../services/expenseService.js';
import * as userService from '../services/userService.js';
import * as categoryService from '../services/categoryService.js';
import { buildBudgetWarning } from '../utils/budgetWarning.js';

// The only categories we accept (defends against AI hallucinating new ones).
const SUPPORTED_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Entertainment',
  'Savings',
  'Miscellaneous',
];

// POST /api/chat   body: { userId, message }
export const chat = asyncHandler(async (req, res) => {
  const { userId, message } = req.body;

  // --- Basic request validation ---
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }

  // --- Step 1: Ask OpenAI to interpret the message into an intent ---
  // Any OpenAI failure (network, bad key, malformed JSON) is handled here.
  let intent;
  try {
    intent = await openaiService.interpretMessage(message);
  } catch (err) {
    return res
      .status(502)
      .json({ error: err.message || 'The AI service is unavailable.' });
  }

  // --- Step 2: Validate the parsed intent object ---
  if (!intent || typeof intent !== 'object' || !intent.intent) {
    return res
      .status(422)
      .json({ error: 'Sorry, I could not understand that request.' });
  }

  // --- Step 3: Act on the intent (our code does all the real work) ---
  switch (intent.intent) {
    // ----------------------------------------------------------------
    case 'add_expense': {
      const { category, amount, description } = intent;

      // Reject unknown categories.
      if (!SUPPORTED_CATEGORIES.includes(category)) {
        return res
          .status(422)
          .json({ error: `Unknown category: "${category}".` });
      }
      // Reject missing amount.
      if (amount === undefined || amount === null || isNaN(Number(amount))) {
        return res.status(422).json({ error: 'The amount is missing.' });
      }
      // Reject negative / zero amount.
      if (Number(amount) <= 0) {
        return res
          .status(422)
          .json({ error: 'The amount must be greater than zero.' });
      }

      const amt = Number(amount);
      const desc = description || category;

      // --- Duplicate detection ---
      // If a near-identical expense was recorded in the last 10 minutes,
      // DO NOT insert. Ask the user whether to add it anyway.
      const duplicate = await expenseService.findRecentDuplicate(
        userId,
        category,
        amt,
        desc
      );
      if (duplicate) {
        return res.status(200).json({
          status: 'duplicate_detected',
          message: 'A similar expense was recently recorded.',
          existingExpense: { category, amount: amt, description: desc },
        });
      }

      // --- Insufficient category budget check ---
      // If the category doesn't have enough remaining, DO NOT insert.
      // Ask the user how to proceed instead (transfer / over-budget / cancel).
      const cat = await categoryService.getCategoryByName(userId, category);
      const remaining = cat
        ? Number(cat.allocated_amount) - Number(cat.spent_amount)
        : Infinity; // no category row -> nothing to exhaust

      if (amt > remaining) {
        return res.status(200).json({
          status: 'confirmation_required',
          message:
            remaining <= 0
              ? `Your ${category} budget has been exhausted.`
              : `Your ${category} budget only has ${remaining} remaining.`,
          expense: { category, amount: amt, description: desc },
          options: [
            { id: 1, title: 'Transfer money from another category' },
            { id: 2, title: 'Record as an over-budget expense' },
            { id: 3, title: 'Cancel this expense' },
          ],
        });
      }

      // Enough budget — insert expense + update spent_amount (transaction).
      const expense = await expenseService.addExpenseWithCategoryUpdate({
        user_id: userId,
        category,
        amount: amt,
        description: desc,
      });

      // After recording, evaluate the category's remaining budget for a warning.
      const updatedCat = await categoryService.getCategoryByName(userId, category);
      const budgetWarning = updatedCat
        ? buildBudgetWarning(
            category,
            Number(updatedCat.allocated_amount),
            Number(updatedCat.spent_amount)
          )
        : null;

      return res.status(201).json({
        intent: 'add_expense',
        success: true,
        category,
        amount: amt,
        description: expense.description,
        expense,
        budgetWarning, // null or { warning, level, message }
      });
    }

    // ----------------------------------------------------------------
    case 'remaining_budget': {
      const user = await userService.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // remainingBudget = monthlyBudget - SUM(all expenses)   (calculated)
      const totalSpent = await expenseService.getTotalSpentByUser(userId);
      const remainingBudget = Number(user.monthly_budget) - totalSpent;

      return res.status(200).json({
        intent: 'remaining_budget',
        remainingBudget,
      });
    }

    // ----------------------------------------------------------------
    case 'remaining_category_budget': {
      const { category } = intent;

      if (!SUPPORTED_CATEGORIES.includes(category)) {
        return res
          .status(422)
          .json({ error: `Unknown category: "${category}".` });
      }

      const cat = await categoryService.getCategoryByName(userId, category);
      if (!cat) {
        return res
          .status(404)
          .json({ error: `No "${category}" category found for this user.` });
      }

      // remaining = allocated - spent   (calculated, never stored)
      const remaining =
        Number(cat.allocated_amount) - Number(cat.spent_amount);

      return res.status(200).json({
        intent: 'remaining_category_budget',
        category,
        remaining,
      });
    }

    // ----------------------------------------------------------------
    case 'show_expenses': {
      const expenses = await expenseService.getExpensesByUser(userId);
      return res.status(200).json({
        intent: 'show_expenses',
        expenses, // already sorted newest-first by the service
      });
    }

    // ----------------------------------------------------------------
    case 'show_category_expenses': {
      const { category } = intent;
      if (!SUPPORTED_CATEGORIES.includes(category)) {
        return res
          .status(422)
          .json({ error: `Unknown category: "${category}".` });
      }
      const expenses = await expenseService.getExpensesByCategory(
        userId,
        category
      );
      return res
        .status(200)
        .json({ intent: 'show_category_expenses', category, expenses });
    }

    // ----------------------------------------------------------------
    case 'show_today_expenses': {
      const expenses = await expenseService.getTodayExpensesByUser(userId);
      return res
        .status(200)
        .json({ intent: 'show_today_expenses', expenses });
    }

    // ----------------------------------------------------------------
    case 'delete_last_expense': {
      const last = await expenseService.getLatestExpense(userId);
      if (!last) {
        return res
          .status(404)
          .json({ error: 'You have no expenses to delete.' });
      }
      // Delete it and roll back spent_amount (same transaction as manual delete).
      await expenseService.deleteExpenseWithCategoryUpdate(last.id);
      return res.status(200).json({
        intent: 'delete_last_expense',
        success: true,
        deleted: last,
      });
    }

    // ----------------------------------------------------------------
    // The AI couldn't map the message to a supported action.
    case 'unknown':
      return res.status(200).json({
        intent: 'unknown',
        message:
          "I can help you add expenses, check your remaining budget, or show/delete expenses. Try: \"I spent 500 on pizza\".",
      });

    // ----------------------------------------------------------------
    default:
      return res
        .status(422)
        .json({ error: `Unsupported intent: "${intent.intent}".` });
  }
});
