import { formatPKR } from '../utils/format.js';

// Responsive category table for the dashboard.
// `overflow-x-auto` lets the table scroll horizontally on small screens
// instead of breaking the layout.
//
// Props:
//   categories : [{ category, allocated, spent, remaining }]
export default function CategoryTable({ categories }) {
  // Categories whose spending has exceeded their allocation (remaining < 0).
  const exceeded = categories.filter((c) => c.remaining < 0);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Budget Categories
        </h2>
      </div>

      {/* Over-budget warning banner */}
      {exceeded.length > 0 && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700">
          {exceeded.map((c) => (
            <p key={c.category}>
              ⚠️ {c.category} budget exceeded by {formatPKR(Math.abs(c.remaining))}.
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 text-right font-medium">Allocated</th>
              <th className="px-6 py-3 text-right font-medium">Spent</th>
              <th className="px-6 py-3 text-right font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((c) => (
              <tr key={c.category} className="transition hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-700">
                  {c.category}
                </td>
                <td className="px-6 py-4 text-right text-slate-600">
                  {formatPKR(c.allocated)}
                </td>
                <td className="px-6 py-4 text-right text-slate-600">
                  {formatPKR(c.spent)}
                </td>
                {/* Negative remaining (over budget) is highlighted in red */}
                <td
                  className={`px-6 py-4 text-right font-semibold ${
                    c.remaining < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatPKR(c.remaining)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Friendly empty state */}
      {categories.length === 0 && (
        <p className="px-6 py-10 text-center text-slate-400">
          No categories found for this user.
        </p>
      )}
    </div>
  );
}
