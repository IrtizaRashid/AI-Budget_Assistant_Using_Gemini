// Centralised environment-variable loading.
// Importing this module first guarantees process.env is populated
// before any other module (e.g. the database pool) reads from it.
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5001,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306, // Railway uses a custom port
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'deepseek-r1-distill-llama-70b',
  },
  // Comma-separated list of allowed frontend origins for CORS.
  // e.g. CORS_ORIGIN=https://your-app.vercel.app
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const isProduction = config.env === 'production';

export default config;
