import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getPortfolio, getInvestmentSummary } from '../services/api.js';
import { formatPKR } from '../utils/format.js';

export default function InvestmentsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const [portfolioData, summaryData] = await Promise.all([
        getPortfolio(userId).catch(() => []),
        getInvestmentSummary(userId).catch(() => ({})),
      ]);
      setPortfolio(Array.isArray(portfolioData) ? portfolioData : []);
      setSummary(summaryData || {});
    } catch (error) {
      console.error('Failed to load investments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, [userId]);

  const totalInvested = Number(summary.totalInvested ?? summary.total_invested ?? 0);
  const currentValue = Number(summary.totalCurrentValue ?? summary.current_value ?? 0);
  const totalReturn = Number(summary.totalPL ?? summary.unrealizedGL ?? currentValue - totalInvested);
  const returnPercentage = Number(summary.totalReturn ?? (totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0)).toFixed(2);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Investments</h1>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-xl">
              💰
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Invested</p>
              <p className="text-2xl font-bold text-white">{formatPKR(totalInvested)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xl">
              📊
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-white">{formatPKR(currentValue)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-xl">
              📈
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total Return</p>
              <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalReturn >= 0 ? '+' : ''}{formatPKR(totalReturn)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-xl">
              %
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Return %</p>
              <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalReturn >= 0 ? '+' : ''}{returnPercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio List */}
      <div className="rounded-2xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] backdrop-blur-sm">
        <div className="border-b border-white border-opacity-10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Portfolio</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-opacity-10 border-t-fuchsia-500" />
          </div>
        ) : portfolio.length === 0 ? (
          <p className="px-6 py-10 text-center text-slate-500">No investments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white bg-opacity-5 text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Investment</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Invested</th>
                  <th className="px-6 py-3 font-medium">Value</th>
                  <th className="px-6 py-3 font-medium">P&L</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-5">
                {portfolio.map((investment) => {
                  const invested = Number(investment.invested_amount || 0);
                  const value = Number(investment.current_value || 0);
                  const returnVal = Number(investment.profit_loss ?? value - invested);
                  const returnPct = Number(investment.return_pct ?? (invested > 0 ? (returnVal / invested) * 100 : 0)).toFixed(2);
                  
                  return (
                    <tr key={investment.id} className="transition hover:bg-white hover:bg-opacity-5">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{investment.name}</p>
                        {investment.quantity !== null && investment.quantity !== undefined && (
                          <p className="text-xs text-slate-500">
                            Qty {investment.quantity}
                            {investment.avg_purchase_price ? ` at ${formatPKR(investment.avg_purchase_price)}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{investment.type || 'Other'}</td>
                      <td className="px-6 py-4 text-slate-400">{formatPKR(invested)}</td>
                      <td className="px-6 py-4 font-semibold text-white">{formatPKR(value)}</td>
                      <td className={`px-6 py-4 font-semibold ${returnVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {returnVal >= 0 ? '+' : ''}{formatPKR(returnVal)} ({returnPct}%)
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          investment.status === 'active'
                            ? 'bg-emerald-500 bg-opacity-15 text-emerald-300'
                            : 'bg-slate-500 bg-opacity-15 text-slate-300'
                        }`}>
                          {investment.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
