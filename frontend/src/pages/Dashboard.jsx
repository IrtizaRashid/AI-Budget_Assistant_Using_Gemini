import { useEffect, useState, useCallback } from 'react';
import { getDashboard, getCategories } from '../services/api.js';
import SummaryCard from '../components/SummaryCard.jsx';
import CategoryTable from '../components/CategoryTable.jsx';
import ChatBox from '../components/ChatBox.jsx';
import { formatPKR } from '../utils/format.js';

export default function Dashboard() {
  // The current user's id is saved to localStorage after budget setup (Step 3).
  // Fall back to user 1 so the dashboard is testable directly.
  const userId = localStorage.getItem('budgetUserId') || 1;

  const [summary, setSummary] = useState(null); // { monthlyBudget, totalSpent, remainingBudget }
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load both endpoints in parallel. Wrapped in useCallback so the
  // "Retry" button can re-run it without duplicating the logic.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [dash, cats] = await Promise.all([
        getDashboard(userId),
        getCategories(userId),
      ]);
      setSummary(dash);
      setCategories(cats);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to load dashboard data. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch automatically when the dashboard opens.
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Welcome to your Budget Dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Here&apos;s an overview of your monthly budget.
          </p>
        </header>

        {/* ---- Loading state ---- */}
        {loading && (
          <div className="flex items-center justify-center rounded-2xl bg-white py-20 shadow-sm ring-1 ring-slate-200/70">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
            <span className="ml-3 text-slate-500">Loading your dashboard…</span>
          </div>
        )}

        {/* ---- Error state ---- */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ---- Loaded content ---- */}
        {!loading && !error && summary && (
          <>
            {/* Summary cards: 1 column on mobile, 3 across on desktop */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <SummaryCard
                label="Monthly Budget"
                value={formatPKR(summary.monthlyBudget)}
                accent="bg-indigo-500"
              />
              <SummaryCard
                label="Total Spent"
                value={formatPKR(summary.totalSpent)}
                accent="bg-amber-500"
              />
              <SummaryCard
                label="Remaining Budget"
                value={formatPKR(summary.remainingBudget)}
                accent="bg-emerald-500"
              />
            </section>

            {/* Category table + AI chat side by side on desktop, stacked on mobile */}
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <CategoryTable categories={categories} />
              </section>

              <section className="lg:col-span-1">
                {/* onExpenseAdded={loadData} re-fetches cards + table after an
                    expense is added via chat — no page refresh. */}
                <ChatBox userId={userId} onExpenseAdded={loadData} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
