// API service for the AI chat feature.
// Reuses the shared Axios instance from api.js.
import api from './api.js';

// POST /api/chat
// Sends the user's natural-language message; the backend returns a
// structured result (intent + data) which the ChatBox renders.
// sessionId ties the message to a conversation for memory/continuity.
export const sendChatMessage = async (userId, message, sessionId = null) => {
  const { data } = await api.post('/chat', { userId, message, sessionId });
  return data;
};

// ─── AI chat sessions / history ─────────────────────────────────────────────

// The most recent active session + all its messages (restore on load/refresh).
export const getLatestSession = async () => {
  const { data } = await api.get('/ai/sessions/latest');
  return data; // { session, messages }
};

// All sessions for the history sidebar.
export const listSessions = async () => {
  const { data } = await api.get('/ai/sessions');
  return data.sessions || [];
};

// Start a brand-new chat (keeps old ones in history).
export const createSession = async () => {
  const { data } = await api.post('/ai/sessions');
  return data; // { session, messages }
};

// Load one conversation's full history.
export const getSessionMessages = async (sessionId) => {
  const { data } = await api.get(`/ai/sessions/${sessionId}`);
  return data; // { session, messages }
};

export const renameSession = async (sessionId, title) => {
  const { data } = await api.patch(`/ai/sessions/${sessionId}`, { title });
  return data.session;
};

export const deleteSession = async (sessionId) => {
  const { data } = await api.delete(`/ai/sessions/${sessionId}`);
  return data;
};

// POST /api/expenses/confirm
// Resolves an over-budget expense after the user picks an option.
// action = 'transfer' | 'over_budget' | 'cancel'
export const confirmExpenseAction = async ({
  userId,
  action,
  expense,
  fromCategory,
}) => {
  const { data } = await api.post('/expenses/confirm', {
    userId,
    action,
    expense,
    fromCategory,
  });
  return data;
};
