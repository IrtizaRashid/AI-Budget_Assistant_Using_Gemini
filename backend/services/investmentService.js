// Investment service — portfolio management, buy/sell, dividends, budget sync.

import pool from '../database/db.js';
import {
  getSavingsRemaining,
  deductFromSavings,
  creditToSavings,
} from './categoryService.js';
import { decreaseBudget, increaseBudget } from './userService.js';

// ─── VALID TYPES ─────────────────────────────────────────────────────────────

export const INVESTMENT_TYPES = [
  'Stocks', 'Mutual Funds', 'ETFs', 'Cryptocurrency',
  'Gold', 'Silver', 'Savings Certificates',
  'Real Estate', 'Fixed Deposits', 'Bonds', 'Other',
];

export const normalizeType = (raw) => {
  if (!raw) return 'Other';
  const r = String(raw).trim().toLowerCase();
  const match = INVESTMENT_TYPES.find(t => t.toLowerCase() === r);
  if (match) return match;
  // Fuzzy matches
  if (r.includes('stock') || r.includes('share') || r.includes('equity')) return 'Stocks';
  if (r.includes('mutual') || r.includes('fund')) return 'Mutual Funds';
  if (r.includes('etf')) return 'ETFs';
  if (r.includes('crypto') || r.includes('bitcoin') || r.includes('eth') || r.includes('coin')) return 'Cryptocurrency';
  if (r.includes('gold')) return 'Gold';
  if (r.includes('silver')) return 'Silver';
  if (r.includes('bond')) return 'Bonds';
  if (r.includes('real estate') || r.includes('property') || r.includes('plot') || r.includes('land')) return 'Real Estate';
  if (r.includes('fd') || r.includes('fixed deposit') || r.includes('term deposit')) return 'Fixed Deposits';
  if (r.includes('certificate') || r.includes('saving cert') || r.includes('nsc')) return 'Savings Certificates';
  return 'Other';
};

// ─── BUY ─────────────────────────────────────────────────────────────────────

export const buyInvestment = async ({
  userId, name, type, amount, quantity = null,
  purchaseDate = null, purchaseTime = null, notes = null,
  skipSavingsCheck = false,   // true when called after a transfer has already been confirmed
}) => {
  const investType = normalizeType(type || name);
  const amt = Number(amount);
  const qty = quantity ? Number(quantity) : null;
  const avgPrice = (qty && qty > 0) ? Number((amt / qty).toFixed(2)) : amt;

  // ── 1. Validate Savings ───────────────────────────────────────────────────
  if (!skipSavingsCheck) {
    const { remaining, category } = await getSavingsRemaining(userId);
    if (!category) {
      throw Object.assign(
        new Error('No Savings category found. Please add a Savings allocation to your budget.'),
        { code: 'NO_SAVINGS_CATEGORY' }
      );
    }
    if (remaining < amt) {
      throw Object.assign(
        new Error(`Insufficient savings`),
        {
          code: 'INSUFFICIENT_SAVINGS',
          available: remaining,
          required: amt,
          savingsCategory: category.category_name,
        }
      );
    }
  }

  // ── 2. Deduct from Savings ────────────────────────────────────────────────
  const { remaining: savingsAfter } = await deductFromSavings(userId, amt);

  // ── 3. Create / top-up investment record ─────────────────────────────────
  const [existing] = await pool.execute(
    `SELECT * FROM investments WHERE user_id = ? AND LOWER(name) = LOWER(?) AND status = 'active' LIMIT 1`,
    [userId, name]
  );

  let investment;
  if (existing.length > 0) {
    const prev = existing[0];
    const newInvested = Number(prev.invested_amount) + amt;
    const newQty = qty !== null ? (Number(prev.quantity || 0) + qty) : prev.quantity;
    const newAvgPrice = newQty ? Number((newInvested / newQty).toFixed(2)) : Number(prev.avg_purchase_price);
    await pool.execute(
      `UPDATE investments
         SET invested_amount = ?, current_value = ?, quantity = ?, avg_purchase_price = ?, updated_at = NOW()
       WHERE id = ?`,
      [newInvested, newInvested, newQty, newAvgPrice, prev.id]
    );
    const [[updated]] = await pool.execute('SELECT * FROM investments WHERE id = ?', [prev.id]);
    investment = updated;
  } else {
    const [result] = await pool.execute(
      `INSERT INTO investments
         (user_id, name, type, invested_amount, current_value, quantity, avg_purchase_price, status, purchase_date, purchase_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [userId, name, investType, amt, amt, qty, avgPrice, purchaseDate, purchaseTime, notes]
    );
    const [[created]] = await pool.execute('SELECT * FROM investments WHERE id = ?', [result.insertId]);
    investment = created;
  }

  // ── 4. Log transaction ────────────────────────────────────────────────────
  await pool.execute(
    `INSERT INTO investment_transactions
       (investment_id, user_id, type, amount, quantity, price_per_unit, profit_loss, transaction_date, transaction_time, notes)
     VALUES (?, ?, 'purchase', ?, ?, ?, 0, ?, ?, ?)`,
    [investment.id, userId, amt, qty, avgPrice, purchaseDate, purchaseTime, notes]
  );

  // ── 5. Reduce available balance ───────────────────────────────────────────
  const newBudget = await decreaseBudget(userId, amt);

  return { investment, newBudget, savingsAfter };
};

// ─── SELL ─────────────────────────────────────────────────────────────────────

export const sellInvestment = async ({
  investmentId, userId, saleAmount, saleQuantity = null,
  saleDate = null, saleTime = null, notes = null,
}) => {
  const [[inv]] = await pool.execute('SELECT * FROM investments WHERE id = ? AND user_id = ?', [investmentId, userId]);
  if (!inv) throw new Error('Investment not found.');
  if (inv.status !== 'active') throw new Error('Investment is already sold/closed.');

  const saleAmt = Number(saleAmount);
  const totalInvested = Number(inv.invested_amount);
  const totalQty = Number(inv.quantity || 0);

  // Determine how much of the position is being sold
  let soldQty = saleQuantity ? Number(saleQuantity) : null;
  let costBasis;
  let isFullSale;

  if (soldQty && totalQty > 0) {
    const fraction = Math.min(soldQty / totalQty, 1);
    isFullSale = fraction >= 0.999;
    costBasis = totalInvested * fraction;
  } else {
    // No quantity info — treat as full sale
    isFullSale = true;
    soldQty = totalQty || null;
    costBasis = totalInvested;
  }

  const profitLoss = Number((saleAmt - costBasis).toFixed(2));
  const txType = profitLoss >= 0 ? 'sale' : 'sale';

  if (isFullSale) {
    await pool.execute(
      `UPDATE investments SET status = 'sold', current_value = ?, updated_at = NOW() WHERE id = ?`,
      [saleAmt, investmentId]
    );
  } else {
    const remainQty = totalQty - soldQty;
    const remainCost = totalInvested - costBasis;
    await pool.execute(
      `UPDATE investments
         SET invested_amount = ?, current_value = ?, quantity = ?, updated_at = NOW()
       WHERE id = ?`,
      [remainCost, remainCost, remainQty, investmentId]
    );
  }

  await pool.execute(
    `INSERT INTO investment_transactions
       (investment_id, user_id, type, amount, quantity, price_per_unit, profit_loss, transaction_date, transaction_time, notes)
     VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?)`,
    [investmentId, userId, saleAmt, soldQty,
     soldQty ? Number((saleAmt / soldQty).toFixed(2)) : null,
     profitLoss, saleDate, saleTime, notes]
  );

  // Return cash to available balance AND credit back into Savings
  const newBudget = await increaseBudget(userId, saleAmt);
  const savingsResult = await creditToSavings(userId, saleAmt);
  const savingsAfter = savingsResult?.remaining ?? null;

  const [[updated]] = await pool.execute('SELECT * FROM investments WHERE id = ?', [investmentId]);
  return { investment: updated, profitLoss, newBudget, isFullSale, costBasis, savingsAfter };
};

// ─── DIVIDEND / INTEREST ─────────────────────────────────────────────────────

export const addDividend = async ({
  userId, investmentId = null, investmentName = null,
  amount, type = 'dividend',
  txDate = null, txTime = null, notes = null,
}) => {
  const amt = Number(amount);

  // Resolve investmentId from name if not provided
  let invId = investmentId;
  if (!invId && investmentName) {
    const [rows] = await pool.execute(
      `SELECT id FROM investments WHERE user_id = ? AND LOWER(name) = LOWER(?) AND status = 'active' LIMIT 1`,
      [userId, investmentName]
    );
    if (rows.length > 0) invId = rows[0].id;
  }

  // If still no match, use a generic placeholder investment
  if (!invId) {
    const [rows] = await pool.execute(
      `SELECT id FROM investments WHERE user_id = ? AND name = 'Dividends & Returns' LIMIT 1`,
      [userId]
    );
    if (rows.length > 0) {
      invId = rows[0].id;
    } else {
      const [res] = await pool.execute(
        `INSERT INTO investments (user_id, name, type, invested_amount, current_value, status) VALUES (?, 'Dividends & Returns', 'Other', 0, 0, 'active')`,
        [userId]
      );
      invId = res.insertId;
    }
  }

  const txTypeNorm = ['dividend', 'interest', 'capital_gain', 'capital_loss'].includes(type) ? type : 'dividend';

  await pool.execute(
    `INSERT INTO investment_transactions
       (investment_id, user_id, type, amount, profit_loss, transaction_date, transaction_time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [invId, userId, txTypeNorm, amt, amt, txDate, txTime, notes]
  );

  // Dividends increase available balance
  const newBudget = await increaseBudget(userId, amt);

  return { newBudget, amount: amt };
};

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const getPortfolio = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(r => ({
    ...r,
    invested_amount: Number(r.invested_amount),
    current_value: Number(r.current_value),
    quantity: r.quantity !== null ? Number(r.quantity) : null,
    avg_purchase_price: r.avg_purchase_price !== null ? Number(r.avg_purchase_price) : null,
    profit_loss: Number(r.current_value) - Number(r.invested_amount),
    return_pct: Number(r.invested_amount) > 0
      ? Number((((Number(r.current_value) - Number(r.invested_amount)) / Number(r.invested_amount)) * 100).toFixed(2))
      : 0,
  }));
};

export const getInvestmentById = async (id, userId) => {
  const [[row]] = await pool.execute(
    'SELECT * FROM investments WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row || null;
};

export const findActiveByName = async (userId, name) => {
  const [rows] = await pool.execute(
    `SELECT * FROM investments WHERE user_id = ? AND LOWER(name) = LOWER(?) AND status = 'active' LIMIT 1`,
    [userId, name]
  );
  return rows[0] || null;
};

export const getInvestmentTransactions = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT it.*, i.name AS investment_name, i.type AS investment_type
       FROM investment_transactions it
       JOIN investments i ON it.investment_id = i.id
      WHERE it.user_id = ?
      ORDER BY COALESCE(it.transaction_date, it.created_at) DESC, it.created_at DESC`,
    [userId]
  );
  return rows.map(r => ({ ...r, amount: Number(r.amount), profit_loss: Number(r.profit_loss) }));
};

export const getInvestmentSummary = async (userId) => {
  const [[row]] = await pool.execute(
    `WITH
      active AS (
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(invested_amount), 0) AS total_invested,
          COALESCE(SUM(current_value), 0) AS total_current_value
          FROM investments
         WHERE user_id = ? AND status = 'active'
      ),
      tx AS (
        SELECT
          COALESCE(SUM(CASE WHEN type = 'sale' THEN profit_loss ELSE 0 END), 0) AS realized,
          COALESCE(SUM(CASE WHEN type IN ('dividend','interest') THEN amount ELSE 0 END), 0) AS dividends
          FROM investment_transactions
         WHERE user_id = ?
      )
      SELECT active.*, tx.realized, tx.dividends
        FROM active
        CROSS JOIN tx`,
    [userId, userId]
  );

  const totalInvested = Number(row.total_invested);
  const totalCurrentValue = Number(row.total_current_value);
  const unrealizedGL = totalCurrentValue - totalInvested;
  const totalReturn = totalInvested > 0 ? Number(((unrealizedGL / totalInvested) * 100).toFixed(2)) : 0;
  const realizedPL = Number(row.realized);
  const dividends = Number(row.dividends);

  return {
    activeCount: Number(row.count),
    totalInvested,
    totalCurrentValue,
    unrealizedGL,
    totalReturn,
    realizedPL,
    dividends,
    totalPL: unrealizedGL + realizedPL,
  };
};
