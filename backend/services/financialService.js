import pool from '../database/db.js';

export const getFinancialSnapshot = async (userId) => {
  const incomeQuery = pool.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE user_id = ?`,
    [userId]
  );

  const expenseQuery = pool.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?`,
    [userId]
  );

  const userQuery = pool.execute(
    `SELECT monthly_budget FROM users WHERE id = ?`,
    [userId]
  );

  const loanQuery = pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN amount ELSE 0 END), 0) AS owed_to_me,
       COALESCE(SUM(CASE WHEN type='taken' AND status='active' THEN amount ELSE 0 END), 0) AS i_owe,
       COALESCE(SUM(CASE WHEN type='given' AND status='active' THEN original_amount ELSE 0 END), 0) AS total_lent,
       COALESCE(SUM(CASE WHEN type='taken' AND status='active' THEN original_amount ELSE 0 END), 0) AS total_borrowed,
       SUM(CASE WHEN type='given' AND status='active' THEN 1 ELSE 0 END) AS given_count,
       SUM(CASE WHEN type='taken' AND status='active' THEN 1 ELSE 0 END) AS taken_count
     FROM loans WHERE user_id = ?`,
    [userId]
  );

  const repaymentQuery = pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN l.type='given' THEN lp.amount ELSE 0 END), 0) AS received,
       COALESCE(SUM(CASE WHEN l.type='taken' THEN lp.amount ELSE 0 END), 0) AS made
     FROM loan_payments lp
     JOIN loans l ON lp.loan_id = l.id
     WHERE l.user_id = ?`,
    [userId]
  )
    .then(([[row]]) => row)
    .catch(() => ({ received: 0, made: 0 }));

  const investmentQuery = pool.execute(
    `SELECT COALESCE(SUM(invested_amount),0) AS invested,
            COALESCE(SUM(current_value),0) AS value,
            COUNT(*) AS cnt
       FROM investments WHERE user_id = ? AND status = 'active'`,
    [userId]
  )
    .then(([[row]]) => row)
    .catch(() => ({ invested: 0, value: 0, cnt: 0 }));

  const [
    [[incomeRow]],
    [[expenseRow]],
    [[userRow]],
    [[loanRow]],
    repRow,
    invRow,
  ] = await Promise.all([
    incomeQuery,
    expenseQuery,
    userQuery,
    loanQuery,
    repaymentQuery,
    investmentQuery,
  ]);

  const monthlyBudget = Number(userRow?.monthly_budget ?? 0);
  const totalIncome = Number(incomeRow.total);
  const totalExpenses = Number(expenseRow.total);
  const owedToMe = Number(loanRow.owed_to_me);
  const iOwe = Number(loanRow.i_owe);
  const repaymentsReceived = Number(repRow.received);
  const repaymentsMade = Number(repRow.made);
  const totalInvested = Number(invRow.invested);
  const portfolioValue = Number(invRow.value);
  const investmentPL = portfolioValue - totalInvested;
  const activeInvestments = Number(invRow.cnt);
  const availableBalance = monthlyBudget - totalExpenses;

  return {
    monthlyBudget,
    totalIncome,
    totalExpenses,
    totalSpent: totalExpenses,
    availableBalance,
    remainingBudget: availableBalance,
    owedToMe,
    iOwe,
    totalLent: Number(loanRow.total_lent),
    totalBorrowed: Number(loanRow.total_borrowed),
    repaymentsReceived,
    repaymentsMade,
    givenCount: Number(loanRow.given_count),
    takenCount: Number(loanRow.taken_count),
    totalInvested,
    portfolioValue,
    investmentPL,
    activeInvestments,
  };
};
