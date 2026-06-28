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
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    // Groq is OpenAI-compatible; this is its API base URL.
    baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  },
};

export default config;
