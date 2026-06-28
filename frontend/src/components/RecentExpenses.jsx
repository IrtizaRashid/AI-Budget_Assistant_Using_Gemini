import { formatPKR, formatDate } from '../utils/format.js';

// Read-only table of the latest 5 expenses (shown below the charts).
// Expenses arrive already sorted newest-first from the backend.
//
// Props:
//   expenses : [{ id, category, amount, description, expense_date }]
export default function RecentExpenses({ expenses = [] }) {
  const recent = expenses.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">Recent Expenses</h2>
      </div>

      {recent.length === 0 ? (
        <p className="px-6 py-10 text-center text-slate-400">
          No expenses yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((e) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
