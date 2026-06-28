// Reusable wrapper that gives every chart a consistent card style,
// a title, and a friendly empty-state message when there's no data.
//
// Props:
//   title        : heading above the chart
//   isEmpty      : when true, show emptyMessage instead of the chart
//   emptyMessage : text shown when isEmpty
//   children     : the actual chart
export default function ChartCard({
  title,
  isEmpty = false,
  emptyMessage = 'No data to display yet.',
  children,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      {isEmpty ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
