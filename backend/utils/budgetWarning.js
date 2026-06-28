// Reusable budget-warning calculator.
//
// Given a category's allocated and spent amounts, returns a warning object
// based on how much budget remains, or `null` when no warning applies.
//
//   Remaining % = (remaining / allocated) * 100
//
//   remaining < 0        -> danger  ("exceeded")
//   remaining % < 10     -> high    ("less than 10%")
//   remaining % < 20     -> medium  ("less than 20%")
//   otherwise            -> null    (no warning)
export const buildBudgetWarning = (category, allocated, spent) => {
  // Avoid division by zero / nonsensical percentages.
  if (!allocated || allocated <= 0) return null;

  const remaining = allocated - spent;
  const remainingPct = (remaining / allocated) * 100;

  if (remaining < 0) {
    return {
      warning: true,
      level: 'danger',
      message: `You have exceeded your ${category} budget.`,
    };
  }
  if (remainingPct < 10) {
    return {
      warning: true,
      level: 'high',
      message: `Critical: You have less than 10% of your ${category} budget remaining.`,
    };
  }
  if (remainingPct < 20) {
    return {
      warning: true,
      level: 'medium',
      message: `Warning: You have less than 20% of your ${category} budget remaining.`,
    };
  }

  return null;
};
