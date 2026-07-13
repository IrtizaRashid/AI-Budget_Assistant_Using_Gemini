// Controller for AI chat sessions & history.
// All actions are scoped to the authenticated user (req.user.userId) and
// validate ownership before reading or mutating any session.
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as mem from '../services/chatMemoryService.js';

// GET /api/ai/sessions  → list for the history sidebar (grouped client-side)
export const listSessions = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const sessions = await mem.listSessions(userId);
  res.status(200).json({ sessions });
});

// GET /api/ai/sessions/latest  → most recent active session + its messages
// Used to restore the conversation on page load / refresh.
export const getLatest = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const session = await mem.getLatestActiveSession(userId);
  if (!session) return res.status(200).json({ session: null, messages: [] });
  const messages = await mem.getAllMessages(session.id);
  res.status(200).json({ session, messages });
});

// POST /api/ai/sessions  → start a new chat (keeps old ones in history)
export const createSession = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const session = await mem.createSession(userId, 'New chat');
  res.status(201).json({ session, messages: [] });
});

// GET /api/ai/sessions/:id  → one conversation's full message history
export const getSessionMessages = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const sessionId = Number(req.params.id);
  const session = await mem.getSession(userId, sessionId); // ownership check
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  const messages = await mem.getAllMessages(sessionId);
  res.status(200).json({ session, messages });
});

// PATCH /api/ai/sessions/:id  → rename
export const renameSession = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const sessionId = Number(req.params.id);
  const { title } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required.' });
  const owned = await mem.getSession(userId, sessionId);
  if (!owned) return res.status(404).json({ error: 'Session not found.' });
  const session = await mem.renameSession(userId, sessionId, title.trim());
  res.status(200).json({ session });
});

// DELETE /api/ai/sessions/:id  → delete a conversation (and its messages)
export const deleteSession = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const sessionId = Number(req.params.id);
  const ok = await mem.deleteSession(userId, sessionId); // scoped by user_id
  if (!ok) return res.status(404).json({ error: 'Session not found.' });
  res.status(200).json({ success: true });
});
