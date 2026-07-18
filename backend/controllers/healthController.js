import { config } from '../config/env.js';

// Controllers hold the business logic for a route.
// Keeping handlers here (instead of inline in routes) makes the
// codebase modular and easy to test/extend.

// GET /api/health
export const getHealth = async (req, res) => {
  res.status(200).json({ status: 'Server Running' });
};

// GET /api/health/ai
export const getAiHealth = async (req, res) => {
  res.status(200).json({
    ok: true,
    providers: {
      gemini: {
        keys: config.gemini.apiKeys.length,
        model: config.gemini.model,
      },
      groq: {
        keys: config.groq.apiKeys.length,
        model: config.groq.model,
      },
      openRouter: {
        keys: config.openRouter.apiKeys.length,
        model: config.openRouter.model,
      },
    },
    fallbackOrder: ['userGeminiKey', 'gemini', 'groq', 'openRouter'],
  });
};

// GET /api/health/supabase
export const getSupabaseHealth = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(500).json({
      status: 'Supabase config missing',
      hasUrl: Boolean(url),
      hasAnonKey: Boolean(anonKey),
    });
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    const body = await response.json().catch(() => ({}));
    return res.status(response.ok ? 200 : response.status).json({
      status: response.ok ? 'Supabase reachable' : 'Supabase returned an error',
      ok: response.ok,
      settings: body,
    });
  } catch (error) {
    return res.status(502).json({
      status: 'Supabase unreachable from backend',
      error: error.message,
    });
  }
};
