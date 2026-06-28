// Centralised environment-variable loading.
// Importing this module first guarantees process.env is populated
// before any other module (e.g. the database pool) reads from it.
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5001,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    // Optional: point the OpenAI SDK at a compatible provider (e.g. Groq).
    // Blank/undefined = use the real OpenAI endpoint.
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  },
};

export default config;
