// Total monthly budget limit helpers.
//
// The total monthly budget is a HARD cap that takes priority over category
// budgets: an expense is rejected if it would push total spending past the
// monthly budget, even if its category still has room.

// Would adding `amount` exceed the remaining monthly budget?
// (1e-6 tolerance guards against floating-point noise.)
export const exceedsMonthlyBudget = (monthlyBudget, totalSpent, amount) =>
  totalSpent + Number(amount) > Number(monthlyBudget) + 1e-6;

// The standard payload returned when an expense exceeds the monthly budget.
export const monthlyBudgetExceeded = (monthlyBudget, totalSpent, requestedExpense) => ({
  status: 'monthly_budget_exceeded',
  message: 'This expense exceeds your remaining monthly budget.',
  monthlyBudget: Number(monthlyBudget),
  totalSpent: Number(totalSpent),
  remainingBudget: Number(monthlyBudget) - Number(totalSpent),
  requestedExpense: Number(requestedExpense),
});
