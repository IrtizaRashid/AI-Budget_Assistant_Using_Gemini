// Central error-handling middleware.
// Express recognises this as an error handler because it has 4 arguments.
// Registering it last (after routes) lets every route funnel errors here
// instead of duplicating try/catch response logic.
import { isProduction } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  // Always log the full error server-side for debugging.
  console.error('❌ Error:', err.stack || err.message);

  // In production, never leak internal error details for 500s.
  const message =
    status >= 500 && isProduction
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
};

// 404 handler for unknown routes.
export const notFound = (req, res) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};
