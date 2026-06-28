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
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
      <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3>
      {isEmpty ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
