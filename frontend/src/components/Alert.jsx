// Small reusable message banner used for validation errors and success.
// type: 'error' | 'success'
export default function Alert({ type = 'error', children }) {
  if (!children) return null;

  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}
