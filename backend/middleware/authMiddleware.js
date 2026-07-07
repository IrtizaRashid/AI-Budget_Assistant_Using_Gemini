import { asyncHandler } from './asyncHandler.js';
import { config } from '../config/env.js';
import * as userService from '../services/userService.js';

const verifyWithSupabase = async (token) => {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  }

  const res = await fetch(`${config.supabase.url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: config.supabase.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;
  return res.json();
};

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await verifyWithSupabase(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid Supabase token.' });

    const authId = decoded.id || decoded.sub;
    const email = decoded.email;
    const metadata = decoded.user_metadata || {};
    const name = metadata.full_name || metadata.name || decoded.name || '';

    if (!authId || !email) {
      return res.status(401).json({ error: 'Invalid Supabase token.' });
    }

    const appUser = await userService.findOrCreateSupabaseUser({ authId, email, name });
    req.user = {
      userId: appUser.id,
      authId,
      email,
      name: appUser.name,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    req.user = await verifyWithSupabase(token);
  } catch {
    // Ignore token errors for optional auth.
  }

  next();
});

export const attachAuthenticatedUserId = (req, _res, next) => {
  if (req.user?.userId) {
    req.body = { ...(req.body || {}), userId: req.user.userId };
    if (req.params?.userId) req.params.userId = String(req.user.userId);
  }
  next();
};
