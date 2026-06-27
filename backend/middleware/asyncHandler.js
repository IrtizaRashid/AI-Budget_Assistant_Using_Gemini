// Wraps an async controller so any thrown/rejected error is
// automatically forwarded to the central errorHandler middleware.
// This removes the need for a try/catch in every controller.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
