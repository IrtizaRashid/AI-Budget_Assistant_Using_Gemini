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
    <div className="overflow-hidden rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] backdrop-blur-sm">
      <div className="border-b border-white border-opacity-10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Budget Categories</h2>
      </div>

      {/* Over-budget warning banner */}
      {exceeded.length > 0 && (
        <div className="border-b border-red-500 border-opacity-20 bg-red-500 bg-opacity-10 px-6 py-2 text-sm text-red-300">
          {exceeded.map((c) => (
            <p key={c.category}>
              ⚠️ {c.category} budget exceeded by {formatPKR(Math.abs(c.remaining))}.
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-white bg-opacity-5 text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 text-right font-medium">Allocated</th>
              <th className="px-6 py-3 text-right font-medium">Spent</th>
              <th className="px-6 py-3 text-right font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white divide-opacity-5">
            {categories.map((c) => {
              // Highlight categories nearing / over their limit.
              const pct = c.allocated > 0 ? (c.remaining / c.allocated) * 100 : 100;
              let remainColor = 'text-emerald-400';
              let badge = null;
              if (c.remaining < 0) {
                remainColor = 'text-red-400';
                badge = { text: 'Over', cls: 'bg-red-500 bg-opacity-20 text-red-300' };
              } else if (pct < 10) {
                remainColor = 'text-orange-400';
                badge = { text: 'Critical', cls: 'bg-orange-500 bg-opacity-20 text-orange-300' };
              } else if (pct < 20) {
                remainColor = 'text-amber-400';
                badge = { text: 'Low', cls: 'bg-amber-500 bg-opacity-20 text-amber-300' };
              }

              return (
                <tr key={c.category} className="transition hover:bg-white hover:bg-opacity-5">
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {c.category}
                    {badge && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    {formatPKR(c.allocated)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    {formatPKR(c.spent)}
                  </td>
                  {/* Remaining is coloured by severity */}
                  <td className={`px-6 py-4 text-right font-semibold ${remainColor}`}>
                    {formatPKR(c.remaining)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Friendly empty state */}
      {categories.length === 0 && (
        <p className="px-6 py-10 text-center text-slate-500">
          No categories found for this user.
        </p>
      )}
    </div>
  );
}
