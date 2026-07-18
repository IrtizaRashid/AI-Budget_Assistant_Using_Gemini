import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Add it to backend/.env first.');
  process.exit(1);
}

const sqlPath = join(__dirname, '..', 'database', 'performance-indexes.sql');
const sql = await readFile(sqlPath, 'utf8');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: false },
});

try {
  await pool.query(sql);
  console.log('Performance indexes are ready.');
} finally {
  await pool.end();
}
