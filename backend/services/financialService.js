import pool from '../database/db.js';

export const getFinancialSnapshot = async (userId) => {
  const [rows] = await pool.execute(
    `WITH
      income_totals AS (
        SELECT COALESCE(SUM(amount), 0) AS total
          FROM income
         WHERE user_id = ?
      ),
      expense_totals AS (
        SELECT COALESCE(SUM(amount), 0) AS total
          FROM expenses
         WHERE user_id = ?
      ),
      user_budget AS (
        SELECT COALESCE(monthly_budget, 0) AS monthly_budget
          FROM users
         WHERE id = ?
      ),
      loan_totals AS (
        SELECT
          COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN amount ELSE 0 END), 0) AS owed_to_me,
          COALESCE(SUM(CASE WHEN type='taken' AND status='active' THEN amount ELSE 0 END), 0) AS i_owe,
          COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN original_amount ELSE 0 END), 0) AS total_lent,
          COALESCE(SUM(CASE WHEN type='taken' AND status='active' THEN original_amount ELSE 0 END), 0) AS total_borrowed,
          SUM(CASE WHEN type='given' AND status='active' THEN 1 ELSE 0 END) AS given_count,
          SUM(CASE WHEN type='taken' AND status='active' THEN 1 ELSE 0 END) AS taken_count
          FROM loans
         WHERE user_id = ?
      ),
      repayment_totals AS (
        SELECT
          COALESCE(SUM(CASE WHEN l.type='given' THEN lp.amount ELSE 0 END), 0) AS received,
          COALESCE(SUM(CASE WHEN l.type='taken' THEN lp.amount ELSE 0 END), 0) AS made
          FROM loan_payments lp
          JOIN loans l ON lp.loan_id = l.id
         WHERE l.user_id = ?
      ),
      investment_totals AS (
        SELECT
          COALESCE(SUM(invested_amount), 0) AS invested,
          COALESCE(SUM(current_value), 0) AS value,
          COUNT(*) AS cnt
          FROM investments
         WHERE user_id = ? AND status = 'active'
      )
      SELECT
        user_budget.monthly_budget,
        income_totals.total AS total_income,
        expense_totals.total AS total_expenses,
        loan_totals.owed_to_me,
        loan_totals.i_owe,
        loan_totals.total_lent,
        loan_totals.total_borrowed,
        loan_totals.given_count,
        loan_totals.taken_count,
        repayment_totals.received AS repayments_received,
        repayment_totals.made AS repayments_made,
        investment_totals.invested AS total_invested,
        investment_totals.value AS portfolio_value,
        investment_totals.cnt AS active_investments
      FROM user_budget
      CROSS JOIN income_totals
      CROSS JOIN expense_totals
      CROSS JOIN loan_totals
      CROSS JOIN repayment_totals
      CROSS JOIN investment_totals`,
    [userId, userId, userId, userId, userId, userId]
  );

  const row = rows[0] || {};
  const monthlyBudget = Number(row.monthly_budget ?? 0);
  const totalExpenses = Number(row.total_expenses ?? 0);
  const totalInvested = Number(row.total_invested ?? 0);
  const portfolioValue = Number(row.portfolio_value ?? 0);
  const availableBalance = monthlyBudget - totalExpenses;

  return {
    monthlyBudget,
    totalIncome: Number(row.total_income ?? 0),
    totalExpenses,
    totalSpent: totalExpenses,
    availableBalance,
    remainingBudget: availableBalance,
    owedToMe: Number(row.owed_to_me ?? 0),
    iOwe: Number(row.i_owe ?? 0),
    totalLent: Number(row.total_lent ?? 0),
    totalBorrowed: Number(row.total_borrowed ?? 0),
    repaymentsReceived: Number(row.repayments_received ?? 0),
    repaymentsMade: Number(row.repayments_made ?? 0),
    givenCount: Number(row.given_count ?? 0),
    takenCount: Number(row.taken_count ?? 0),
    totalInvested,
    portfolioValue,
    investmentPL: portfolioValue - totalInvested,
    activeInvestments: Number(row.active_investments ?? 0),
  };
};
