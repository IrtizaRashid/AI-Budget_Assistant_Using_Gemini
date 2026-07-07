export function authErrorMessage(err, fallback) {
  if (!err) return fallback;
  const apiMessage = err.response?.data?.error || err.response?.data?.message;
  if (apiMessage) return apiMessage;
  if (typeof err === 'string') {
    return err === '{}' ? 'Network error: Supabase Auth server is unreachable (504 Gateway Timeout).' : err;
  }
  const message = err.message || err.error_description;
  if (message) {
    if (
      message === '{}' ||
      message.toLowerCase().includes('failed to fetch') ||
      message.toLowerCase().includes('load failed')
    ) {
      return 'Network error: Supabase Auth server is unreachable. Please verify your internet connection or check if your Supabase project is active.';
    }
    return message;
  }
  return fallback;
}
