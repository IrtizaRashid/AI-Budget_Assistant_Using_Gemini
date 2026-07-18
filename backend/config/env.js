import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });
dotenv.config();

const parseKeys = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((key) => key.trim())
    .filter(Boolean);

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  db: {
    url: process.env.DATABASE_URL,
    poolMax: parseInteger(process.env.DB_POOL_MAX, process.env.NODE_ENV === 'production' ? 5 : 10),
    idleTimeoutMs: parseInteger(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMs: parseInteger(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    apiKeys: [
      ...parseKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS),
    ].filter(Boolean),
    model: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  },
  groq: {
    apiKeys: parseKeys(process.env.GROQ_API_KEYS, process.env.XAI_API_KEYS, process.env.GROK_API_KEYS),
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  openRouter: {
    apiKeys: parseKeys(process.env.OPENROUTER_API_KEYS, process.env.OPEN_ROUTER_API_KEYS),
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    referer: process.env.OPENROUTER_SITE_URL || process.env.CORS_ORIGIN || '',
    title: process.env.OPENROUTER_APP_TITLE || 'Budget AI',
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const hasSystemGeminiKeys =
  config.gemini.apiKeys.length > 0 ||
  config.groq.apiKeys.length > 0 ||
  config.openRouter.apiKeys.length > 0;

export const isProduction = config.env === 'production';

export default config;
