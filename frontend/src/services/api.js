// Central Axios instance and API helpers.
// Keeping all HTTP calls here (instead of scattered across components)
// makes the app modular: future endpoints (budgets, expenses, AI) just
// add a function in this file.
import axios from 'axios';

// Backend base URL comes from the VITE_API_URL environment variable so the
// same build works against any backend (local, Render, etc.). Falls back to
// the local dev server when the variable is not set.
//   e.g. VITE_API_URL=https://your-backend.onrender.com
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_ROOT.replace(/\/$/, '')}/api`, // tolerate a trailing slash
  headers: { 'Content-Type': 'application/json' },
});

// POST /api/setup-budget
// payload: { name, monthlyBudget, categories: [{ category, allocatedAmount }] }
export const setupBudget = async (payload) => {
  const { data } = await api.post('/setup-budget', payload);
  return data;
};

// GET /api/dashboard/:userId
// -> { monthlyBudget, totalSpent, remainingBudget }
export const getDashboard = async (userId) => {
  const { data } = await api.get(`/dashboard/${userId}`);
  return data;
};

// GET /api/categories/:userId
// -> [{ category, allocated, spent, remaining }]
export const getCategories = async (userId) => {
  const { data } = await api.get(`/categories/${userId}`);
  return data;
};

// GET /api/expenses/:userId  -> [{ id, category, amount, description, expense_date }]
export const getExpenses = async (userId) => {
  const { data } = await api.get(`/expenses/${userId}`);
  return data;
};

// DELETE /api/expenses/:expenseId
export const deleteExpense = async (expenseId) => {
  const { data } = await api.delete(`/expenses/${expenseId}`);
  return data;
};

// GET /api/statistics/:userId
// -> { allocated[], spent[], remaining[], expenseCount }
export const getStatistics = async (userId) => {
  const { data } = await api.get(`/statistics/${userId}`);
  return data;
};

// GET /api/ai/recommendations/:userId -> { recommendations: [...] }
export const getRecommendations = async (userId) => {
  const { data } = await api.get(`/ai/recommendations/${userId}`);
  return data;
};

export default api;
