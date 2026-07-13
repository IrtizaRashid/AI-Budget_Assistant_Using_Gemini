// Memory-system test suite (data layer + context assembly).
//
// Creates a throwaway user, exercises every memory capability, and cleans up.
// Runs WITHOUT the Gemini API (no quota needed): the AI-dependent behaviours
// (pronoun resolution, intent classification) are verified separately via
// scripts/ai-test-cases.mjs and the live chat endpoint.
//
//   node scripts/memory-test.mjs
import db from '../database/db.js';
import * as mem from '../services/chatMemoryService.js';
import * as mm from '../services/memoryManager.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
};

const run = async () => {
  // ── Setup: a throwaway user (unique auth_id/email) ──
  const uid = 'mem-test-' + Date.now();
  const [ins] = await db.execute(
    `INSERT INTO users (auth_id, name, email, monthly_budget)
     VALUES (gen_random_uuid(), 'Memory Test', ?, 20000)`,
    [`${uid}@test.local`]
  );
  const userId = ins.insertId;
  // A couple of categories so the financial snapshot has content.
  await db.execute(`INSERT INTO budget_categories (user_id, category_name, allocated_amount) VALUES (?, 'Food', 10000), (?, 'Transport', 5000)`, [userId, userId]);

  try {
    // ── 1. Session create / get / ownership ──
    const s1 = await mem.createSession(userId, 'First chat');
    check('createSession returns a row with id + title', s1 && s1.id && s1.title === 'First chat');

    const otherUserSees = await mem.getSession(userId + 999999, s1.id);
    check('ownership: another user cannot read the session', otherUserSees === null);

    // ── 2. Messages: add + recent ordering (oldest-first) ──
    await mem.addMessage(s1.id, 'user', 'I gave Ali 5000');
    await mem.addMessage(s1.id, 'assistant', 'Loan recorded — Ali owes you Rs 5,000.');
    await mem.addMessage(s1.id, 'user', 'he returned 500');
    const recent = await mem.getRecentMessages(s1.id, 20);
    check('messages return oldest-first', recent.length === 3 && recent[0].content === 'I gave Ali 5000' && recent[2].content === 'he returned 500');

    // ── 3. Session isolation: a second session has its own transcript ──
    const s2 = await mem.createSession(userId, 'Second chat');
    await mem.addMessage(s2.id, 'user', 'I spent 300 on petrol');
    const s1msgs = await mem.getAllMessages(s1.id);
    const s2msgs = await mem.getAllMessages(s2.id);
    check('sessions are isolated', s1msgs.length === 3 && s2msgs.length === 1 && s2msgs[0].content === 'I spent 300 on petrol');

    // ── 4. Latest active session = most recently touched ──
    await mem.touchSession(userId, s1.id);
    const latest = await mem.getLatestActiveSession(userId);
    check('latest active session follows last_activity', latest && latest.id === s1.id);

    // ── 5. Long-term memory: upsert + confidence bump + retrieval ──
    await mm.learnMerchantCategory(userId, 'Texas Fries', 'Food');
    let mc = await mem.getMerchantCategory(userId, 'texas fries', 0.5);
    const firstConf = mc?.confidence;
    check('merchant learned (case-insensitive lookup)', mc && mc.category === 'Food');
    await mm.learnMerchantCategory(userId, 'Texas Fries', 'Entertainment'); // a correction
    mc = await mem.getMerchantCategory(userId, 'Texas Fries', 0.5);
    check('correction overwrites value and bumps confidence', mc && mc.category === 'Entertainment' && mc.confidence > firstConf,
      `value=${mc?.category} conf ${firstConf} -> ${mc?.confidence}`);

    // ── 6. Context assembly contains every layer ──
    const ctx = await mm.buildConversationContext(userId, s1.id);
    check('context includes long-term prefs', /KNOWN USER PREFERENCES/.test(ctx));
    check('context includes recent conversation', /RECENT CONVERSATION[\s\S]*Ali/.test(ctx));
    check('context includes financial snapshot', /CURRENT FINANCES/.test(ctx));
    check('context ends with the NEW MESSAGE marker', /NEW MESSAGE:\s*$/.test(ctx));

    // ── 7. New-chat isolation: a fresh session carries no prior transcript ──
    const s3 = await mem.createSession(userId);
    const ctx3 = await mm.buildConversationContext(userId, s3.id);
    check('a new chat has no recent-conversation transcript', !/RECENT CONVERSATION/.test(ctx3));
    check('but still carries long-term prefs across sessions', /KNOWN USER PREFERENCES/.test(ctx3));

    // ── 8. Summarization does not fire below the threshold ──
    const before = await mem.getSession(userId, s1.id);
    await mm.maybeSummarize(userId, s1.id, null); // 3 messages < SUMMARIZE_AFTER
    const after = await mem.getSession(userId, s1.id);
    check('no summary created below threshold', !before.summary && !after.summary);

    // ── 9. Delete cascades to messages ──
    await mem.deleteSession(userId, s2.id);
    const gone = await mem.getSession(userId, s2.id);
    const [[{ c }]] = [await db.execute('SELECT COUNT(*) AS c FROM ai_messages WHERE session_id = ?', [s2.id]).then(r => r[0])];
    check('deleting a session removes it and its messages', gone === null && Number(c) === 0);

  } finally {
    // ── Cleanup: remove the throwaway user (cascades to all its data) ──
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

run().catch((e) => { console.error('SUITE ERROR:', e.message); process.exit(1); });
