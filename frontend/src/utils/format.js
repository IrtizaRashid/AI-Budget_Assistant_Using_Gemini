// Formats a number as a PKR currency string, e.g. 50000 -> "PKR 50,000".
// Used across the dashboard so currency display stays consistent.
export const formatPKR = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;
