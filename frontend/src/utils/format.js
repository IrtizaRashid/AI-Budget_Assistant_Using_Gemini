// Formats a number as a PKR currency string, e.g. 50000 -> "PKR 50,000".
// Used across the dashboard so currency display stays consistent.
export const formatPKR = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;

// Formats a date/datetime string into a short readable date+time,
// e.g. "28 Jun 2026, 6:14 PM".
export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
