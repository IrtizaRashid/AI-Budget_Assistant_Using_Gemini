import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboard } from '../services/api.js';
import { formatPKR } from '../utils/format.js';

export default function SavingsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await getDashboard(userId);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [userId]);

  const currentSavings = summary ? Number(summary.remainingBudget || 0) * 0.3 : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Savings</h1>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-fuchsia-500" />
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl">
                $
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Current Savings</p>
                <p className="text-3xl font-bold text-white">{formatPKR(currentSavings)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
              <p className="text-sm text-slate-300">
                Savings are calculated from your budget and activity. Use the AI Assistant to record income,
                investments, and transfers.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Savings Tips</h2>
        <div className="space-y-3">
          {[
            'Set aside 20% of your income for savings each month',
            'Build an emergency fund with 3-6 months of expenses',
            'Use the AI Assistant to track investments and savings transfers',
            'Review and adjust your budget regularly to find more savings opportunities',
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                +
              </span>
              <p className="text-sm text-slate-300">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
