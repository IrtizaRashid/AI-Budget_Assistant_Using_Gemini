// Supabase Postgres connection pool with a mysql2-compatible surface.
//
// The services were written against mysql2/promise (`?` placeholders,
// `[rows]` destructuring, `result.insertId` / `result.affectedRows`,
// `getConnection()` transactions). This module keeps that exact call
// shape on top of `pg`, so the data-access code stays unchanged:
//   · `?`  → `$1..$n`
//   · INSERTs get ` RETURNING id` appended → mapped to `insertId`
//   · SELECT/WITH return `[rows]`; writes return `[{insertId, affectedRows}]`
import pg from 'pg';
import { config } from '../config/env.js';

const { Pool, types } = pg;

// int8 (COUNT/SUM over ints) comes back as a string by default — parse to
// number so arithmetic in services behaves like it did with mysql2.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const pool = new Pool({
  connectionString: config.db.url,
  // Supabase requires TLS; local Postgres (if ever used) does not.
  ssl: config.db.url && !/localhost|127\.0\.0\.1/.test(config.db.url)
    ? { rejectUnauthorized: false }
    : false,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.idleTimeoutMs,
  connectionTimeoutMillis: config.db.connectionTimeoutMs,
});

// Convert mysql-style `?` placeholders to Postgres `$1..$n`.
const toPg = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

const isSelect = (sql) => /^\s*(select|with)/i.test(sql);
const isInsert = (sql) => /^\s*insert/i.test(sql);

const run = async (executor, sql, params = []) => {
  let text = toPg(sql);
  if (isInsert(text) && !/returning/i.test(text)) text += ' RETURNING id';
  const res = await executor.query(text, params);
  if (isSelect(sql)) return [res.rows];
  return [{
    insertId: res.rows?.[0]?.id,
    affectedRows: res.rowCount ?? 0,
    rows: res.rows,
  }];
};

const db = {
  execute: (sql, params) => run(pool, sql, params),
  query: (sql, params) => run(pool, sql, params),

  // Transaction support with the mysql2 connection API.
  getConnection: async () => {
    const client = await pool.connect();
    return {
      execute: (sql, params) => run(client, sql, params),
      query: (sql, params) => run(client, sql, params),
      beginTransaction: async () => { await client.query('BEGIN'); },
      commit: async () => { await client.query('COMMIT'); },
      rollback: async () => { await client.query('ROLLBACK'); },
      release: () => client.release(),
      ping: async () => { await client.query('SELECT 1'); },
    };
  },
};

// Optional, non-fatal connectivity check at startup.
export const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Supabase Postgres connected');
  } catch (error) {
    console.warn('⚠️  Postgres not connected:', error.message);
  }
};

export default db;
