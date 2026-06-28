// Reusable confirmation modal.
// Renders nothing unless `open` is true.
//
// Props:
//   open       : boolean
//   title      : heading text
//   message    : body text
//   confirmText: label for the confirm button (default "Confirm")
//   loading    : disables buttons while an action runs
//   onConfirm  : () => void
//   onCancel   : () => void
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
