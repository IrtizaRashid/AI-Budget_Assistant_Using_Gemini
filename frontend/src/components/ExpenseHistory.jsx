import { useState, useMemo } from 'react';
import { deleteExpense } from '../services/api.js';
import { formatPKR, formatDate } from '../utils/format.js';
import ConfirmDialog from './ConfirmDialog.jsx';

// Expense history table with search + delete.
//
// Props:
//   expenses  : [{ id, category, amount, description, expense_date }]
//   onChanged : called after a successful delete so the parent can
//               silently refresh dashboard + categories + this list.
export default function ExpenseHistory({ expenses = [], onChanged }) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null); // expense or null
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  // Client-side search across category, description, amount and date.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => {
      const date = formatDate(e.expense_date).toLowerCase();
      return (
        e.category.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        String(e.amount).includes(q) ||
        date.includes(q)
      );
    });
  }, [expenses, query]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await deleteExpense(pendingDelete.id);
      setMessage('Expense deleted successfully.');
      setPendingDelete(null);
      // Tell the parent to refresh everything (no page reload).
      if (typeof onChanged === 'function') onChanged();
      // Auto-hide the success message.
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(
        err.response?.data?.error || 'Failed to delete the expense.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      {/* Header + search */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Expense History</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by category, description, date, amount…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-80"
        />
      </div>

      {/* Success / error banner */}
      {message && (
        <div className="border-b border-slate-100 bg-green-50 px-6 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* Table (scrolls horizontally on small screens) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 text-right font-medium">Amount</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <tr key={e.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-500">
                  {formatDate(e.expense_date)}
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">
                  {e.description || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {e.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-700">
                  {formatPKR(e.amount)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setPendingDelete(e)}
                    className="rounded-lg px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty states */}
      {expenses.length === 0 && (
        <p className="px-6 py-10 text-center text-slate-400">
          No expenses yet. Add one using the AI Assistant.
        </p>
      )}
      {expenses.length > 0 && filtered.length === 0 && (
        <p className="px-6 py-10 text-center text-slate-400">
          No expenses match “{query}”.
        </p>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete expense?"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.description || pendingDelete.category}" (${formatPKR(
                pendingDelete.amount
              )})? This will update your budget.`
            : ''
        }
        confirmText="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
