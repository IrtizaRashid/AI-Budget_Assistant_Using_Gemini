// AI Recommendations card for the dashboard.
// Purely presentational — the Dashboard owns the data + loading/error state
// and re-fetches whenever an expense changes.
//
// Props:
//   recommendations : string[]
//   loading         : boolean
//   error           : boolean (true => show the unavailable message)
export default function AIRecommendations({
  recommendations = [],
  loading = false,
  error = false,
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-purple-600 p-[1.5px] shadow-[0_0_30px_-8px_rgba(217,70,239,0.5)]">
      <div className="rounded-[15px] bg-[#130d1d] p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 text-base shadow">
            🤖
          </span>
          <h2 className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-lg font-bold text-transparent">
            AI Recommendations
          </h2>
        </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-4 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-fuchsia-500" />
          <span className="text-sm">Analysing your spending…</span>
        </div>
      )}

      {/* Error / unavailable */}
      {!loading && error && (
        <p className="py-2 text-sm text-slate-500">
          AI recommendations are temporarily unavailable.
        </p>
      )}

      {/* Empty */}
      {!loading && !error && recommendations.length === 0 && (
        <p className="py-2 text-sm text-slate-500">
          Add a few expenses to get personalised advice.
        </p>
      )}

      {/* Recommendations as bullet points */}
      {!loading && !error && recommendations.length > 0 && (
        <ul className="space-y-2">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-500" />
              <span>{rec}</span>
            </li>
          ))}
          </ul>
        )}
      </div>
    </div>
  );
}
