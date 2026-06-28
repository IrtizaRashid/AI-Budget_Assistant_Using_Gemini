import { useState } from 'react';
import { confirmExpenseAction } from '../services/chatService.js';
import { formatPKR } from '../utils/format.js';

// Interactive card shown inside the chat when a category has insufficient
// budget. It walks the user through the choices and performs NO action until
// the user selects one.
//
// Props:
//   userId     : current user
//   expense    : { category, amount, description } (the pending expense)
//   categories : [{ category, allocated, spent, remaining }] (for transfer)
//   onChanged  : called after a successful action to refresh the dashboard
//   onWarning  : called with a budget warning (if any) after recording
export default function ConfirmationCard({
  userId,
  expense,
  categories = [],
  onChanged,
  onWarning,
}) {
  // step: 'options' | 'source' | 'done'
  const [step, setStep] = useState('options');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null); // { text, warning } | { error }

  // Categories the user can transfer FROM: not the target, and with funds left.
  // Categories the user can transfer FROM: not the target, with funds left.
  const funded = categories.filter(
    (c) => c.category !== expense.category && Number(c.remaining) > 0
  );

  // Calls the backend and records the outcome.
  const resolve = async (action, fromCategory) => {
    setBusy(true);
    setOutcome((o) => (o?.error ? null : o)); // clear a prior error
    try {
      const res = await confirmExpenseAction({
        userId,
        action,
        expense,
        fromCategory,
      });

      if (res.status === 'cancelled') {
        setOutcome({ text: 'Expense cancelled. No changes were made.' });
      } else if (action === 'over_budget') {
        setOutcome({
          text: `Recorded ${expense.category} ${formatPKR(
            expense.amount
          )} as an over-budget expense.`,
          warning: res.warning,
        });
        onChanged?.();
      } else if (action === 'transfer') {
        setOutcome({ text: res.message });
        onChanged?.();
      }
      // Surface any budget warning returned with the insert.
      if (res.budgetWarning) onWarning?.(res.budgetWarning);
      setStep('done');
    } catch (err) {
      // Stay on the current step so the user can retry / pick another option.
      setOutcome({
        error: err.response?.data?.error || 'Action failed. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  // ---- Final outcome ----
  if (step === 'done') {
    return (
      <div className="space-y-1">
        <p>{outcome.text}</p>
        {outcome.warning && (
          <p className="font-medium text-red-300">⚠️ {outcome.warning}</p>
        )}
      </div>
    );
  }

  const btn =
    'rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-2">
      <p className="font-medium text-slate-100">
        ⚠️ {`Your ${expense.category} budget can't cover ${formatPKR(
          expense.amount
        )}.`}
      </p>

      {outcome?.error && <p className="text-red-300">{outcome.error}</p>}

      {/* Step 1: the three options */}
      {step === 'options' && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStep('source')}
              disabled={busy || funded.length === 0}
              title={funded.length === 0 ? 'No category has spare funds' : ''}
              className={`${btn} bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:from-fuchsia-500 hover:to-pink-500`}
            >
              Transfer Money
            </button>
            <button
              onClick={() => resolve('over_budget')}
              disabled={busy}
              className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}
            >
              Record as Over Budget
            </button>
            <button
              onClick={() => resolve('cancel')}
              disabled={busy}
              className={`${btn} border border-white/20 text-slate-300 hover:bg-white/10`}
            >
              Cancel
            </button>
          </div>
          {funded.length === 0 && (
            <p className="text-xs text-slate-400">
              No other category has spare funds to transfer from.
            </p>
          )}
        </>
      )}

      {/* Step 2: choose a source category to transfer from */}
      {step === 'source' && (
        <div className="space-y-2">
          <p className="text-slate-300">Which category should the funds come from?</p>
          <div className="flex flex-col gap-2">
            {funded.map((c) => (
              <button
                key={c.category}
                onClick={() => resolve('transfer', c.category)}
                disabled={busy}
                className={`${btn} border border-white/20 text-left text-slate-200 hover:bg-white/10`}
              >
                {c.category}{' '}
                <span className="text-slate-400">
                  (Remaining {formatPKR(c.remaining)})
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('options')}
            disabled={busy}
            className={`${btn} text-slate-400 hover:bg-white/10`}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
