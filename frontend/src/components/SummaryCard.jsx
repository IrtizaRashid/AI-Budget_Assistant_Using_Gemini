// Reusable summary card for the dashboard's top row.
// Props:
//   label  : card title (e.g. "Monthly Budget")
//   value  : pre-formatted string to display (e.g. "PKR 50,000")
//   accent : Tailwind bg color class for the little accent bar
export default function SummaryCard({ label, value, accent = 'bg-indigo-500' }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      {/* Small colored accent bar to differentiate cards */}
      <div className={`h-1.5 w-10 rounded-full ${accent}`} />

      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
        {value}
      </p>
    </div>
  );
}
