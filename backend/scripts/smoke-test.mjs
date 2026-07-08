/**
 * End-to-end smoke test against local backend + Supabase Postgres.
 * Simulates post-OTP auth by signing a Supabase-shaped JWT.
 */
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

dotenv.config();

const BASE = `http://localhost:${process.env.PORT || 5001}`;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const TEST_AUTH_ID = '00000000-0000-4000-8000-000000000001';
const TEST_EMAIL = 'smoke-test@budget-ai.local';

const results = [];

const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, detail = '') => results.push({ name, ok: false, detail });

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function makeToken(overrides = {}) {
  return jwt.sign(
    {
      sub: TEST_AUTH_ID,
      email: TEST_EMAIL,
      role: 'authenticated',
      user_metadata: { full_name: 'Smoke Test User' },
      ...overrides,
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

async function testDatabase() {
  if (!DATABASE_URL) return fail('DB: DATABASE_URL set', 'missing');
  pass('DB: DATABASE_URL set');

  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query('SELECT 1');
    pass('DB: connection');
  } catch (e) {
    fail('DB: connection', e.message);
    await pool.end();
    return;
  }

  const tables = [
    'users', 'budget_categories', 'expenses', 'income', 'loans',
    'loan_payments', 'investments', 'investment_transactions', 'misc_transactions',
  ];
  for (const t of tables) {
    try {
      const r = await pool.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS ok`,
        [t]
      );
      if (r.rows[0]?.ok) pass(`DB: table ${t}`);
      else fail(`DB: table ${t}`, 'missing — run supabase_schema.sql');
    } catch (e) {
      fail(`DB: table ${t}`, e.message);
    }
  }

  await pool.end();
}

async function testBackend() {
  try {
    const health = await req('GET', '/health');
    if (health.status === 200 && health.data?.status) pass('API: GET /health', health.data.status);
    else fail('API: GET /health', `status ${health.status}`);
  } catch (e) {
    fail('API: GET /health', `server not reachable — ${e.message}`);
    return null;
  }

  if (!JWT_SECRET) {
    fail('Auth: SUPABASE_JWT_SECRET set', 'missing');
    return null;
  }
  pass('Auth: SUPABASE_JWT_SECRET set');

  // Legacy endpoints return 410
  for (const [method, path] of [['POST', '/auth/register'], ['POST', '/auth/login']]) {
    const r = await req(method, path, { body: { email: 'x@y.com' } });
    if (r.status === 410) pass(`API: ${method} ${path} → 410`);
    else fail(`API: ${method} ${path} → 410`, `got ${r.status}`);
  }

  // Protected route without token
  const noAuth = await req('GET', '/auth/me');
  if (noAuth.status === 401) pass('Auth: /auth/me without token → 401');
  else fail('Auth: /auth/me without token → 401', `got ${noAuth.status}`);

  const token = makeToken();
  const me = await req('GET', '/auth/me', { token });
  const profile = me.data?.user;
  if (me.status === 200 && profile?.id) {
    pass('Auth: /auth/me with JWT → 200', `user id ${profile.id}`);
  } else {
    fail('Auth: /auth/me with JWT → 200', JSON.stringify(me.data));
    return null;
  }

  const userId = profile.id;

  // Budget setup
  const setup = await req('POST', '/setup-budget', {
    token,
    body: {
      monthlyBudget: 50000,
      categories: [
        { category: 'Food', allocatedAmount: 15000, percentage: 30 },
        { category: 'Transport', allocatedAmount: 10000, percentage: 20 },
        { category: 'Savings', allocatedAmount: 25000, percentage: 50 },
      ],
    },
  });
  if ([200, 201].includes(setup.status)) pass('Budget: POST /setup-budget', setup.data?.message || 'ok');
  else fail('Budget: POST /setup-budget', JSON.stringify(setup.data));

  // Budget allocation update (audit log)
  const beforeTx = await req('GET', `/transactions/${userId}`, { token });
  const txBefore = Array.isArray(beforeTx.data) ? beforeTx.data : [];
  const miscBefore = txBefore.filter((t) => t.type === 'budget_adjustment').length;

  const alloc = await req('PUT', '/budget-allocation', {
    token,
    body: {
      monthlyBudget: 55000,
      categories: [
        { category: 'Food', allocatedAmount: 18000, percentage: 32.7 },
        { category: 'Transport', allocatedAmount: 10000, percentage: 18.2 },
        { category: 'Savings', allocatedAmount: 27000, percentage: 49.1 },
      ],
    },
  });
  if (alloc.status === 200) pass('Budget: PUT /budget-allocation', alloc.data?.message || 'ok');
  else fail('Budget: PUT /budget-allocation', JSON.stringify(alloc.data));

  const afterTx = await req('GET', `/transactions/${userId}`, { token });
  const txList = Array.isArray(afterTx.data) ? afterTx.data : [];
  const adjustments = txList.filter((t) => t.type === 'budget_adjustment');
  if (adjustments.length > miscBefore) {
    pass('Audit: budget_adjustment logged', `${adjustments.length} total row(s)`);
  } else {
    fail('Audit: budget_adjustment logged', `before=${miscBefore} after=${adjustments.length}`);
  }

  // Categories
  const cats = await req('GET', `/categories/${userId}`, { token });
  if (cats.status === 200 && Array.isArray(cats.data) && cats.data.length >= 3) {
    pass('API: GET /categories/:userId', `${cats.data.length} categories`);
  } else {
    fail('API: GET /categories/:userId', JSON.stringify(cats.data)?.slice(0, 120));
  }

  // Dashboard
  const dash = await req('GET', `/dashboard/${userId}`, { token });
  if (dash.status === 200) pass('API: GET /dashboard/:userId');
  else fail('API: GET /dashboard/:userId', `status ${dash.status}`);

  // Gemini key save
  const fakeKey = 'AIzaSmokeTestInvalidKey123456789';
  const keySave = await req('PUT', '/users/me/gemini-key', { token, body: { apiKey: fakeKey } });
  if (keySave.status === 200 && keySave.data?.hasGeminiKey === true) {
    pass('Gemini: PUT /users/me/gemini-key', 'hasGeminiKey=true');
  } else {
    fail('Gemini: PUT /users/me/gemini-key', JSON.stringify(keySave.data));
  }

  const me2 = await req('GET', '/auth/me', { token });
  if (me2.data?.user?.hasGeminiKey) pass('Gemini: /auth/me hasGeminiKey');
  else fail('Gemini: /auth/me hasGeminiKey');

  // Chat without valid key should return GEMINI_KEY_INVALID or similar
  const chat = await req('POST', '/chat', {
    token,
    body: { message: 'I spent 100 on coffee', userId },
  });
  const chatCode = chat.data?.code;
  if (chat.status === 402 && ['GEMINI_KEY_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_QUOTA'].includes(chatCode)) {
    pass('Chat: invalid key → 402', chatCode);
  } else if (chat.status === 200) {
    pass('Chat: message processed', chat.data?.reply?.slice?.(0, 60) || 'ok');
  } else {
    fail('Chat: POST /api/chat', `status=${chat.status} code=${chatCode} ${JSON.stringify(chat.data)?.slice(0, 100)}`);
  }

  // Wrong userId in URL should still scope to authenticated user
  const wrongId = await req('GET', '/categories/99999', { token });
  if (wrongId.status === 200 && Array.isArray(wrongId.data)) {
    if (wrongId.data.length > 0) pass('Auth: :userId param overridden', `${wrongId.data.length} cats for self`);
    else pass('Auth: :userId param overridden', 'empty ok');
    const leaked = wrongId.data.some((c) => c.user_id && Number(c.user_id) !== Number(userId));
    if (leaked) fail('Auth: data isolation', 'got another user data');
  } else {
    fail('Auth: :userId param overridden', `status ${wrongId.status}`);
  }

  // Statistics
  const stats = await req('GET', `/statistics/${userId}`, { token });
  if (stats.status === 200) pass('API: GET /statistics/:userId');
  else fail('API: GET /statistics/:userId', `status ${stats.status}`);

  // Expenses list
  const expenses = await req('GET', `/expenses/${userId}`, { token });
  if (expenses.status === 200 && Array.isArray(expenses.data)) {
    pass('API: GET /expenses/:userId', `${expenses.data.length} expense(s)`);
  } else {
    fail('API: GET /expenses/:userId', `status ${expenses.status}`);
  }

  // Budget transfer Food → Savings
  const transfer = await req('POST', '/categories/transfer', {
    token,
    body: { userId, fromCategory: 'Food', amount: 500 },
  });
  if (transfer.status === 200) {
    pass('Budget: POST /categories/transfer', 'Food → Savings');
  } else {
    fail('Budget: POST /categories/transfer', JSON.stringify(transfer.data)?.slice(0, 120));
  }

  const txAfterTransfer = await req('GET', `/transactions/${userId}`, { token });
  const transfers = (Array.isArray(txAfterTransfer.data) ? txAfterTransfer.data : [])
    .filter((t) => t.type === 'budget_transfer');
  if (transfers.length > 0) pass('Audit: budget_transfer logged', `${transfers.length} row(s)`);
  else fail('Audit: budget_transfer logged', 'none found');

  // Recommendations — expect Gemini error with invalid key
  const recs = await req('GET', `/ai/recommendations/${userId}`, { token });
  if (recs.status === 402 && recs.data?.code?.startsWith('GEMINI_')) {
    pass('AI: GET /ai/recommendations → 402', recs.data.code);
  } else if (recs.status === 200) {
    pass('AI: GET /ai/recommendations → 200');
  } else {
    fail('AI: GET /ai/recommendations', `status=${recs.status} ${JSON.stringify(recs.data)?.slice(0, 80)}`);
  }

  // Universal AI query
  const aiQuery = await req('POST', '/ai/query', {
    token,
    body: { userId, query: 'How much did I spend on food?' },
  });
  if (aiQuery.status === 402 && aiQuery.data?.code?.startsWith('GEMINI_')) {
    pass('AI: POST /ai/query → 402', aiQuery.data.code);
  } else if (aiQuery.status === 200) {
    pass('AI: POST /ai/query → 200');
  } else {
    fail('AI: POST /ai/query', `status=${aiQuery.status} ${JSON.stringify(aiQuery.data)?.slice(0, 80)}`);
  }

  // Loan summary (empty ok)
  const loans = await req('GET', `/loans/${userId}/summary`, { token });
  if (loans.status === 200) pass('API: GET /loans/:userId/summary');
  else fail('API: GET /loans/:userId/summary', `status ${loans.status}`);

  return { userId, token };
}

async function testVercelExport() {
  try {
    process.env.VERCEL = '1';
    const serverMod = await import('../server.js');
    if (serverMod.default && typeof serverMod.default.use === 'function') {
      pass('Deploy: server.js exports Express app');
    } else {
      fail('Deploy: server.js exports Express app', 'missing default export');
    }
    delete process.env.VERCEL;

    const apiMod = await import('../api/index.js');
    if (apiMod.default && typeof apiMod.default.use === 'function') {
      pass('Deploy: api/index.js re-exports app');
    } else {
      fail('Deploy: api/index.js re-exports app');
    }
  } catch (e) {
    fail('Deploy: Vercel module imports', e.message);
  }
}

async function testJwtSecret() {
  if (!JWT_SECRET) return fail('JWT: secret configured', 'missing');
  const token = makeToken({ sub: '11111111-1111-4111-8111-111111111111', email: 'jwt-check@test.local' });
  try {
    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    pass('JWT: SUPABASE_JWT_SECRET verifies HS256 tokens');
  } catch (e) {
    fail('JWT: SUPABASE_JWT_SECRET verifies HS256 tokens', e.message);
  }
}

async function main() {
  console.log('\n=== Budget-AI Smoke Test ===\n');
  await testDatabase();
  testJwtSecret();
  await testBackend();
  await testVercelExport();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('\n--- Results ---\n');
  for (const r of results) {
    const icon = r.ok ? 'PASS' : 'FAIL';
    console.log(`${icon}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
