// Editable recommendation table.
// Columns: Category | Percentage | Amount (editable).
// Percentages are FIXED; only the amount inputs can be changed.
//
// Props:
//   rows           : [{ category, percentage, amount }]
//   onAmountChange : (index, value) => void
//   total          : current sum of all amounts (number)
//   budget         : the user's monthly budget (number)
export default function BudgetTable({ rows, onAmountChange, total, budget }) {
  // Difference highlights whether the edited amounts still match the budget.
  const balanced = Math.abs(total - budget) < 0.01;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-white border-opacity-10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white bg-opacity-5 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Percentage</th>
              <th className="px-4 py-3 font-semibold">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white divide-opacity-5">
            {rows.map((row, index) => (
              <tr key={row.category}>
                <td className="px-4 py-3 font-medium text-slate-200">
                  {row.category}
                </td>
                <td className="px-4 py-3 text-slate-400">{row.percentage}%</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={(e) => onAmountChange(index, e.target.value)}
                    className="w-32 rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-1.5 text-white focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Running total row — turns green when it matches the budget */}
          <tfoot>
            <tr className="bg-white bg-opacity-5 font-semibold text-slate-200">
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td
                className={`px-4 py-3 ${
                  balanced ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {total.toLocaleString()} / {budget.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!balanced && (
        <p className="mt-2 text-xs text-red-400">
          Amounts must add up to your monthly budget ({budget.toLocaleString()}{' '}
          PKR) before you can continue.
        </p>
      )}
    </div>
  );
}
