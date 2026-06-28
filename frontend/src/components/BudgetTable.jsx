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
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Percentage</th>
              <th className="px-4 py-3 font-semibold">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.category}>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {row.category}
                </td>
                <td className="px-4 py-3 text-slate-500">{row.percentage}%</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={(e) => onAmountChange(index, e.target.value)}
                    className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Running total row — turns green when it matches the budget */}
          <tfoot>
            <tr className="bg-slate-50 font-semibold text-slate-700">
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td
                className={`px-4 py-3 ${
                  balanced ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {total.toLocaleString()} / {budget.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!balanced && (
        <p className="mt-2 text-xs text-red-500">
          Amounts must add up to your monthly budget ({budget.toLocaleString()}{' '}
          PKR) before you can continue.
        </p>
      )}
    </div>
  );
}
