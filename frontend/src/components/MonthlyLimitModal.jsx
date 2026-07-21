import { formatPKR } from '../utils/format.js';

// Modal shown when an expense is rejected for exceeding the total monthly
// budget. Purely presentational — the backend already rejected the expense.
//
// Props:
//   open    : boolean
//   data    : { monthlyBudget, totalSpent, remainingBudget, requestedExpense }
//   onClose : () => void
export default function MonthlyLimitModal({ open, data, onClose }) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-red-500 border-opacity-30 bg-[#15101f] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 bg-opacity-15 text-2xl">
          🚫
        </div>
        <h3 className="text-lg font-bold text-white">
          Monthly Budget Limit Reached
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          You only have{' '}
          <span className="font-semibold text-red-300">
            {formatPKR(data.remainingBudget)}
          </span>{' '}
          remaining in your monthly budget. This expense requires{' '}
          <span className="font-semibold text-red-300">
            {formatPKR(data.requestedExpense)}
          </span>
          . The expense cannot be recorded because it exceeds your total monthly
          budget.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-fuchsia-500 hover:to-pink-500"
        >
          OK
        </button>
      </div>
    </div>
  );
}
