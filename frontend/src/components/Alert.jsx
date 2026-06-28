// Small reusable message banner used for validation errors and success.
// type: 'error' | 'success'
export default function Alert({ type = 'error', children }) {
  if (!children) return null;

  const styles = {
    error: 'bg-red-500/10 text-red-300 border-red-500/30',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}
