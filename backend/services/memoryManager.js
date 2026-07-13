// Memory Manager — the single brain of the AI memory system.
//
// Responsibilities (per the feature spec):
//   · Load memory before every AI request (long-term prefs + session summary
//     + recent messages + a financial snapshot).
//   · Store new messages (user + assistant turns).
//   · Update/roll up the session summary when a conversation grows large.
//   · Save reusable long-term preferences and learn from corrections.
//
// The AI never touches the DB. This module gathers exactly the context the
// model needs and hands back plain strings the controller passes to Gemini.
import * as mem from './chatMemoryService.js';
import { geminiText } from './aiService.js';
import * as userService from './userService.js';
import * as expenseService from './expenseService.js';
import * as categoryService from './categoryService.js';

const RECENT_LIMIT = 20;         // Layer 1: short-term window sent to Gemini
const SUMMARIZE_AFTER = 30;      // roll older messages into a summary past this

// ─── Layer 3: long-term memory as a compact prompt block ──────────────────
const buildMemoryBlock = async (userId) => {
  const rows = await mem.getMemories(userId);
  if (!rows.length) return '';
  const lines = rows
    .filter((r) => Number(r.confidence) >= 0.5)
    .map((r) => `  - ${r.memory_type}/${r.key}: ${r.value}`);
  return lines.length ? `KNOWN USER PREFERENCES (apply unless the message clearly says otherwise):\n${lines.join('\n')}` : '';
};

// ─── A small live financial snapshot so the AI is always current ──────────
const buildFinancialSnapshot = async (userId) => {
  try {
    const user = await userService.findUserById(userId);
    if (!user) return '';
    const totalSpent = await expenseService.getTotalSpentByUser(userId);
    const cats = await categoryService.getCategoriesByUser(userId);
    const catLine = (cats || [])
      .map((c) => `${c.category_name} ${Number(c.spent_amount)}/${Number(c.allocated_amount)}`)
      .join(', ');
    const remaining = Number(user.monthly_budget) - Number(totalSpent);
    return `CURRENT FINANCES: monthly budget Rs${Number(user.monthly_budget)}, spent Rs${totalSpent}, remaining Rs${remaining}. Categories (spent/allocated): ${catLine}`;
  } catch {
    return '';
  }
};

// ─── Layer 1 + 2: recent transcript + session summary as one context blob ──
// This is prepended to the user's message so pronouns ("he", "it") resolve and
// the conversation continues naturally — WITHOUT altering the classifier's
// system prompt (the 7-stage pipeline stays byte-identical).
export const buildConversationContext = async (userId, sessionId) => {
  const parts = [];

  const memoryBlock = await buildMemoryBlock(userId);
  if (memoryBlock) parts.push(memoryBlock);

  const session = sessionId ? await mem.getSession(userId, sessionId) : null;
  if (session?.summary) {
    parts.push(`CONVERSATION SUMMARY (earlier in this chat):\n${session.summary}`);
  }

  if (sessionId) {
    const recent = await mem.getRecentMessages(sessionId, RECENT_LIMIT);
    if (recent.length) {
      const transcript = recent
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      parts.push(`RECENT CONVERSATION:\n${transcript}`);
    }
  }

  const snapshot = await buildFinancialSnapshot(userId);
  if (snapshot) parts.push(snapshot);

  if (!parts.length) return '';
  return (
    `${parts.join('\n\n')}\n\n` +
    `Use the context above to resolve references like "he", "she", "it", "that", ` +
    `and to continue the conversation naturally. Now handle the new message below.\n\n` +
    `NEW MESSAGE: `
  );
};

// ─── Ensure a session exists; create one lazily on the first message ──────
export const ensureSession = async (userId, sessionId) => {
  if (sessionId) {
    const s = await mem.getSession(userId, sessionId);
    if (s) return s;
  }
  return mem.createSession(userId);
};

// ─── Persist one user turn and one assistant turn ─────────────────────────
export const saveTurn = async (userId, sessionId, userText, assistantText) => {
  await mem.addMessage(sessionId, 'user', userText);
  if (assistantText) await mem.addMessage(sessionId, 'assistant', assistantText);
  await mem.touchSession(userId, sessionId);
};

// ─── Auto-title a brand-new session from its first message ────────────────
export const autoTitleIfNeeded = async (userId, sessionId, firstMessage) => {
  const session = await mem.getSession(userId, sessionId);
  if (!session || (session.title && session.title !== 'New chat')) return;
  // Cheap, deterministic title: first few words. (No extra AI call.)
  const title = String(firstMessage).trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 60) || 'New chat';
  await mem.renameSession(userId, sessionId, title);
};

// ─── Summarize older messages when the conversation grows large ───────────
// Keeps the recent window intact; folds everything older into session.summary.
export const maybeSummarize = async (userId, sessionId, apiKey) => {
  const count = await mem.countMessages(sessionId);
  if (count < SUMMARIZE_AFTER) return;

  const older = await mem.getOlderMessages(sessionId, RECENT_LIMIT);
  if (older.length < 4) return;

  const session = await mem.getSession(userId, sessionId);
  const transcript = older.map((m) => `${m.role}: ${m.content}`).join('\n');
  const prompt =
    'Summarize the following budgeting conversation into 4-8 short bullet points capturing ' +
    'durable facts and decisions (recurring income, split preferences, loans given/taken, ' +
    'investment habits, budgeting style). Be concise. Output bullets only.';
  const input = `${session?.summary ? `Existing summary:\n${session.summary}\n\n` : ''}Conversation:\n${transcript}`;

  try {
    const summary = await geminiText(prompt, input, 0.2, apiKey);
    if (summary && summary.trim()) {
      await mem.setSessionSummary(userId, sessionId, summary.trim().slice(0, 4000));
    }
  } catch {
    // Summarization is best-effort; never block the chat if it fails.
  }
};

// ─── Learn from a correction: merchant → user's preferred category ────────
// Called when we can see the user overrode the AI's category for a merchant.
export const learnMerchantCategory = async (userId, merchant, category) => {
  if (!merchant || !category) return;
  await mem.upsertMemory(userId, 'merchant_category', merchant, category, 0.6);
};

// Generic preference setter (currency, split style, budget style, etc.).
export const rememberPreference = async (userId, key, value) => {
  if (!key || value == null) return;
  await mem.upsertMemory(userId, 'preference', key, value, 0.7);
};

export { mem };
