// A single budget-warning toast card. Colour depends on severity:
//   medium -> yellow, high -> orange, danger -> red.
// Auto-dismiss is handled by the parent (Dashboard).
//
// Props:
//   level   : 'medium' | 'high' | 'danger'
//   message : text to show
//   onClose : () => void
const LEVEL_STYLES = {
  medium: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  high: 'bg-orange-50 border-orange-300 text-orange-800',
  danger: 'bg-red-50 border-red-300 text-red-800',
};

export default function WarningToast({ level = 'medium', message, onClose }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-md ${
        LEVEL_STYLES[level] || LEVEL_STYLES.medium
      }`}
    >
      <span>⚠️</span>
      <p className="flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-current/60 hover:text-current"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
