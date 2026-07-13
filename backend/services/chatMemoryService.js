// Data-access layer for the AI memory system.
// Three concerns, one file: sessions, messages, and long-term memory.
// Every function is user-scoped — a userId is always required and
// ownership is validated before any read/write on a session.
import pool from '../database/db.js';

// ─── Sessions ──────────────────────────────────────────────────────────────

// Create a new chat session for a user.
export const createSession = async (userId, title = 'New chat') => {
  const [res] = await pool.execute(
    `INSERT INTO ai_sessions (user_id, title) VALUES (?, ?)`,
    [userId, title]
  );
  return getSession(userId, res.insertId);
};

// Fetch one session, but only if it belongs to the user (ownership check).
export const getSession = async (userId, sessionId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, title, summary, status, created_at, updated_at, last_activity
       FROM ai_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  return rows[0] || null;
};

// List a user's sessions, newest activity first (for the history sidebar).
export const listSessions = async (userId, { includeArchived = false } = {}) => {
  const [rows] = await pool.execute(
    `SELECT id, title, summary, status, created_at, updated_at, last_activity
       FROM ai_sessions
      WHERE user_id = ? ${includeArchived ? '' : "AND status = 'active'"}
      ORDER BY last_activity DESC`,
    [userId]
  );
  return rows;
};

// The single most-recently-active session (used to restore chat on load/refresh).
export const getLatestActiveSession = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, title, summary, status, created_at, updated_at, last_activity
       FROM ai_sessions
      WHERE user_id = ? AND status = 'active'
      ORDER BY last_activity DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const renameSession = async (userId, sessionId, title) => {
  await pool.execute(
    `UPDATE ai_sessions SET title = ? WHERE id = ? AND user_id = ?`,
    [String(title).slice(0, 255), sessionId, userId]
  );
  return getSession(userId, sessionId);
};

export const setSessionSummary = async (userId, sessionId, summary) => {
  await pool.execute(
    `UPDATE ai_sessions SET summary = ? WHERE id = ? AND user_id = ?`,
    [summary, sessionId, userId]
  );
};

export const touchSession = async (userId, sessionId) => {
  await pool.execute(
    `UPDATE ai_sessions SET last_activity = NOW() WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
};

export const archiveSession = async (userId, sessionId) => {
  await pool.execute(
    `UPDATE ai_sessions SET status = 'archived' WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
};

export const deleteSession = async (userId, sessionId) => {
  const [res] = await pool.execute(
    `DELETE FROM ai_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  return res.affectedRows > 0;
};

// ─── Messages ──────────────────────────────────────────────────────────────

export const addMessage = async (sessionId, role, content) => {
  const [res] = await pool.execute(
    `INSERT INTO ai_messages (session_id, role, content) VALUES (?, ?, ?)`,
    [sessionId, role, String(content)]
  );
  return res.insertId;
};

// The N most recent messages for a session, returned oldest-first so they
// read naturally as a transcript.
export const getRecentMessages = async (sessionId, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT id, role, content, created_at FROM (
       SELECT id, role, content, created_at
         FROM ai_messages WHERE session_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
     ) t ORDER BY created_at ASC, id ASC`,
    [sessionId, limit]
  );
  return rows;
};

// All messages for a session, oldest-first (used to reload a conversation).
export const getAllMessages = async (sessionId) => {
  const [rows] = await pool.execute(
    `SELECT id, role, content, created_at FROM ai_messages
      WHERE session_id = ? ORDER BY created_at ASC, id ASC`,
    [sessionId]
  );
  return rows;
};

export const countMessages = async (sessionId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM ai_messages WHERE session_id = ?`,
    [sessionId]
  );
  return Number(rows[0].c);
};

// Messages older than the most recent `keepRecent`, for summarization.
export const getOlderMessages = async (sessionId, keepRecent = 20) => {
  const [rows] = await pool.execute(
    `SELECT role, content FROM ai_messages
      WHERE session_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT GREATEST((SELECT COUNT(*) FROM ai_messages WHERE session_id = ?) - ?, 0)`,
    [sessionId, sessionId, keepRecent]
  );
  return rows;
};

// ─── Long-term memory ────────────────────────────────────────────────────

// Insert or update a preference. On conflict we bump confidence toward 1.0
// and overwrite the value (the newest correction wins).
export const upsertMemory = async (userId, memoryType, key, value, confidence = 0.6) => {
  await pool.execute(
    `INSERT INTO ai_memory (user_id, memory_type, key, value, confidence)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, memory_type, key)
     DO UPDATE SET value = EXCLUDED.value,
                   confidence = LEAST(ai_memory.confidence + 0.1, 1.0),
                   updated_at = NOW()`,
    [userId, memoryType, String(key).slice(0, 255), String(value), confidence]
  );
};

export const getMemories = async (userId, memoryType = null) => {
  const [rows] = await pool.execute(
    `SELECT memory_type, key, value, confidence
       FROM ai_memory
      WHERE user_id = ? ${memoryType ? 'AND memory_type = ?' : ''}
      ORDER BY confidence DESC, updated_at DESC`,
    memoryType ? [userId, memoryType] : [userId]
  );
  return rows;
};

// Look up a single learned merchant→category preference (confidence-gated).
export const getMerchantCategory = async (userId, merchant, minConfidence = 0.7) => {
  if (!merchant) return null;
  const [rows] = await pool.execute(
    `SELECT value, confidence FROM ai_memory
      WHERE user_id = ? AND memory_type = 'merchant_category'
        AND LOWER(key) = LOWER(?) AND confidence >= ?
      LIMIT 1`,
    [userId, merchant, minConfidence]
  );
  return rows[0] ? { category: rows[0].value, confidence: Number(rows[0].confidence) } : null;
};
