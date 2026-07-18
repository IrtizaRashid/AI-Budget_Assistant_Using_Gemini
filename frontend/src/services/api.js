import axios from 'axios';
import { supabase } from './supabase.js';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_ROOT.replace(/\/$/, '')}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase access token to every request automatically.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code;
    if (code === 'GEMINI_KEY_MISSING') {
      window.dispatchEvent(new CustomEvent('gemini-key-required', {
        detail: {
          code,
          message: error.response?.data?.error || error.response?.data?.message,
        },
      }));
    }
    return Promise.reject(error);
  }
);

const READ_CACHE_TTL_MS = 20000;
const WARM_CACHE_TTL_MS = 60000;
const CACHE_STORAGE_PREFIX = 'budget_ai_api_cache:';
const readCache = new Map();
const inflightReads = new Map();
let lastPrefetchedUserId = null;

const makeReadCacheKey = (url, config = {}) => JSON.stringify({
  url,
  params: config.params || null,
});

const getStorageKey = (key) => `${CACHE_STORAGE_PREFIX}${key}`;

const readStoredCache = (key) => {
  try {
    const raw = sessionStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.expiresAt || cached.expiresAt <= Date.now()) {
      sessionStorage.removeItem(getStorageKey(key));
      return null;
    }
    return cached;
  } catch {
    return null;
  }
};

const writeStoredCache = (key, value) => {
  try {
    sessionStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private windows; memory cache still works.
  }
};

const clearStoredCache = () => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(CACHE_STORAGE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const clearApiCache = () => {
  readCache.clear();
  inflightReads.clear();
  clearStoredCache();
  lastPrefetchedUserId = null;
};

const cachedGet = async (url, config = {}, ttl = READ_CACHE_TTL_MS) => {
  const key = makeReadCacheKey(url, config);
  const cached = readCache.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const stored = readStoredCache(key);
  if (stored) {
    readCache.set(key, stored);
    return stored.data;
  }

  if (inflightReads.has(key)) {
    return inflightReads.get(key);
  }

  const request = api.get(url, config)
    .then(({ data }) => {
      const cacheEntry = {
        data,
        expiresAt: Date.now() + ttl,
      };
      readCache.set(key, cacheEntry);
      writeStoredCache(key, cacheEntry);
      return data;
    })
    .finally(() => {
      inflightReads.delete(key);
    });

  inflightReads.set(key, request);
  return request;
};

const mutate = async (request) => {
  const { data } = await request;
  clearApiCache();
  return data;
};

supabase.auth.onAuthStateChange((event) => {
  if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
    clearApiCache();
  }
});

const onIdle = (callback) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2500 });
  } else {
    window.setTimeout(callback, 150);
  }
};

export const prefetchUserWorkspace = (userId) => {
  if (!userId || lastPrefetchedUserId === userId) return;
  lastPrefetchedUserId = userId;

  onIdle(() => {
    const requests = [
      cachedGet(`/dashboard/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/categories/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/expenses/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/statistics/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/income/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/loans/${userId}`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/loans/${userId}/summary`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/investments/${userId}/portfolio`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/investments/${userId}/summary`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/investments/${userId}/transactions`, {}, WARM_CACHE_TTL_MS),
      cachedGet(`/transactions/${userId}`, { params: { limit: 300 } }, WARM_CACHE_TTL_MS),
    ];

    Promise.allSettled(requests).catch(() => {});
  });
};

// ---- Auth endpoints ----

export const registerApi = async (payload) => {
  return mutate(api.post('/auth/register', payload));
};

export const loginApi = async (payload) => {
  return mutate(api.post('/auth/login', payload));
};

export const sendLoginCodeApi = async (payload) => {
  const { data } = await api.post('/auth/send-login-code', payload);
  return data;
};

export const verifyLoginCodeApi = async (payload) => {
  return mutate(api.post('/auth/verify-login-code', payload));
};

export const verifySignupApi = async (payload) => {
  return mutate(api.post('/auth/verify-signup', payload));
};

export const resendSignupApi = async (payload) => {
  const { data } = await api.post('/auth/resend-signup', payload);
  return data;
};

export const forgotPasswordApi = async (payload) => {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
};

export const verifyPasswordResetApi = async (payload) => {
  return mutate(api.post('/auth/verify-password-reset', payload));
};

// GET /api/auth/me
export const getMe = async () => {
  return cachedGet('/auth/me');
};

// ---- Budget setup ----

// POST /api/setup-budget
export const setupBudget = async (payload) => {
  return mutate(api.post('/setup-budget', payload));
};

// ---- Dashboard ----

// GET /api/dashboard/:userId
export const getDashboard = async (userId) => {
  return cachedGet(`/dashboard/${userId}`);
};

// ---- Categories ----

// GET /api/categories/:userId
export const getCategories = async (userId) => {
  return cachedGet(`/categories/${userId}`);
};

// ---- Expenses ----

// GET /api/expenses/:userId
export const getExpenses = async (userId) => {
  return cachedGet(`/expenses/${userId}`);
};

// DELETE /api/expenses/:expenseId
export const deleteExpense = async (expenseId) => {
  return mutate(api.delete(`/expenses/${expenseId}`));
};

// ---- Statistics ----

// GET /api/statistics/:userId
export const getStatistics = async (userId) => {
  return cachedGet(`/statistics/${userId}`);
};

// ---- AI Recommendations ----

// GET /api/ai/recommendations/:userId
export const getRecommendations = async (userId) => {
  return cachedGet(`/ai/recommendations/${userId}`, {}, 60000);
};

// ---- Budget allocation update ----

// PUT /api/budget-allocation
export const updateBudgetAllocation = async (payload) => {
  return mutate(api.put('/budget-allocation', payload));
};

// ---- Income ----

// GET /api/income/:userId
export const getIncome = async (userId) => {
  return cachedGet(`/income/${userId}`);
};

// POST /api/income
export const createIncome = async (payload) => {
  return mutate(api.post('/income', payload));
};

// DELETE /api/income/:incomeId
export const deleteIncomeRecord = async (incomeId) => {
  return mutate(api.delete(`/income/${incomeId}`));
};

// ---- Loans ----

// GET /api/loans/:userId
export const getLoans = async (userId) => {
  return cachedGet(`/loans/${userId}`);
};

// PUT /api/loans/:loanId/paid
export const markLoanPaid = async (loanId) => {
  return mutate(api.put(`/loans/${loanId}/paid`));
};

// PUT /api/loans/:loanId
export const updateLoan = async (loanId, payload) => {
  return mutate(api.put(`/loans/${loanId}`, payload));
};

// DELETE /api/loans/:loanId
export const deleteLoan = async (loanId) => {
  return mutate(api.delete(`/loans/${loanId}`));
};

// GET /api/loans/:userId/summary
export const getLoanSummary = async (userId) => {
  return cachedGet(`/loans/${userId}/summary`);
};

// GET /api/transactions/:userId
export const getTransactions = async (userId) => {
  return cachedGet(`/transactions/${userId}`, { params: { limit: 300 } });
};

// GET /api/loans/:loanId/payments
export const getLoanPayments = async (loanId) => {
  return cachedGet(`/loans/${loanId}/payments`);
};

// ---- Investments ----

// GET /api/investments/:userId/portfolio
export const getPortfolio = async (userId) => {
  return cachedGet(`/investments/${userId}/portfolio`);
};

// GET /api/investments/:userId/summary
export const getInvestmentSummary = async (userId) => {
  return cachedGet(`/investments/${userId}/summary`);
};

// GET /api/investments/:userId/transactions
export const getInvestmentTransactions = async (userId) => {
  return cachedGet(`/investments/${userId}/transactions`);
};

// ---- Universal AI Query ----

// POST /api/ai/query
export const universalQuery = async (payload) => {
  return mutate(api.post('/ai/query', payload));
};

// POST /api/loans/split
export const createSplitExpense = async (payload) => {
  return mutate(api.post('/loans/split', payload));
};

// ---- Users ----

// POST /api/users/:userId/reset-month
export const resetMonth = async (userId) => {
  return mutate(api.post(`/users/${userId}/reset-month`));
};

export const saveGeminiKey = async (apiKey) => {
  return mutate(api.put('/users/me/gemini-key', { apiKey }));
};

export default api;
