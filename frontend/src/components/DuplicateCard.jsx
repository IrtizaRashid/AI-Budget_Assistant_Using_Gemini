import { useState } from 'react';
import { confirmExpenseAction } from '../services/chatService.js';
import { formatPKR } from '../utils/format.js';

// Interactive card shown inside the chat when the backend flags a likely
// duplicate expense. No expense is inserted until the user clicks "Add Anyway".
//
// Props:
//   userId    : current user
//   expense   : { category, amount, description } (the pending expense)
//   onChanged : called after a successful insert to refresh the dashboard
//   onWarning : called with a budget warning (if any) after recording
export default function DuplicateCard({ userId, expense, onChanged, onWarning }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null); // { text } | { error }
  const [done, setDone] = useState(false);

  const resolve = async (action) => {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await confirmExpenseAction({ userId, action, expense });
      if (res.status === 'cancelled') {
        setOutcome({ text: 'Okay, the duplicate was not added.' });
      } else {
        setOutcome({
          text: `Added ${expense.category} ${formatPKR(expense.amount)}${
            expense.description ? ` — ${expense.description}` : ''
          }.`,
        });
        onChanged?.();
        if (res.budgetWarning) onWarning?.(res.budgetWarning);
      }
      setDone(true);
    } catch (err) {
      setOutcome({
        error: err.response?.data?.error || 'Action failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <p>{outcome.text}</p>;
  }

  const btn =
    'rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-100">
        ⚠️ A similar expense was found. Would you like to continue?
      </p>

      {outcome?.error && <p className="text-red-300">{outcome.error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => resolve('add_anyway')}
          disabled={busy}
          className={`${btn} bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:from-fuchsia-500 hover:to-pink-500`}
        >
          Add Anyway
        </button>
        <button
          onClick={() => resolve('cancel')}
          disabled={busy}
          className={`${btn} border border-white/20 text-slate-300 hover:bg-white/10`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
