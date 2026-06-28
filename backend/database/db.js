// MySQL connection pool.
//
// A pool (rather than a single connection) is used so the app can serve
// many concurrent requests efficiently. Every value comes from environment
// variables via config/env.js — no secrets are hard-coded. Works against a
// local MySQL or a managed provider (e.g. Railway, which uses a custom port).
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true, // keep pooled connections healthy on hosted DBs
});

// Optional, non-fatal connectivity check at startup.
// The server still runs even if MySQL is not available yet,
// so you can build the frontend before configuring the database.
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL connected');
  } catch (error) {
    console.warn('⚠️  MySQL not connected:', error.message);
  }
};

export default pool;
