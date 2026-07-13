// AI intent test-case runner.
//
// Sends a battery of natural-language messages through the live chat
// pipeline (interpretMessage → Gemini → parsed JSON) and checks that the
// AI classified each one correctly. Does NOT touch the database — it calls
// the interpreter directly, so it only needs a working Gemini API key.
//
// Usage:
//   node scripts/ai-test-cases.mjs <GEMINI_API_KEY>
// or set GEMINI_API_KEY in the environment and run without an argument.
import { interpretMessage } from '../services/groqService.js';

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Provide a Gemini API key: node scripts/ai-test-cases.mjs <key>');
  process.exit(1);
}

// The user's category set (mirrors the default budget setup).
const CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Savings', 'Miscellaneous'];
// Pretend the user has one active loan so repayment detection can be tested.
const ACTIVE_LOANS = [{ type: 'given', person_name: 'Ali', amount: 1000 }];

// Each case: the message, and a predicate that returns '' on pass or a
// reason string on fail. Kept loose where the model has latitude.
const CASES = [
  {
    name: 'THE STATEMENT — 3 expenses (food 500, petrol 300, shopping 600)',
    msg: 'I went to eat food for 500 and put petrol for 300 and did shopping for 600',
    check: (r) => {
      if (r.intent !== 'add_expense') return `intent=${r.intent}, expected add_expense`;
      const ex = r.expenses || [];
      if (ex.length !== 3) return `got ${ex.length} expenses, expected 3`;
      const byAmt = Object.fromEntries(ex.map((e) => [Number(e.amount), e.category]));
      if (!byAmt[500]) return 'missing the 500 expense';
      if (!byAmt[300]) return 'missing the 300 expense';
      if (!byAmt[600]) return 'missing the 600 expense';
      return '';
    },
  },
  {
    name: 'Single expense',
    msg: 'I spent 500 on pizza',
    check: (r) =>
      r.intent === 'add_expense' && r.expenses?.length === 1 && Number(r.expenses[0].amount) === 500
        ? '' : `got ${JSON.stringify(r).slice(0, 120)}`,
  },
  {
    name: 'Income received',
    msg: 'I got my salary of 50000 today',
    check: (r) =>
      r.intent === 'income_received' && Number(r.amount) === 50000 ? '' : `intent=${r.intent}, amount=${r.amount}`,
  },
  {
    name: 'Loan given (new)',
    msg: 'I lent Ahmed 3000',
    check: (r) =>
      r.intent === 'loan_given' && r.person === 'Ahmed' && Number(r.amount) === 3000
        ? '' : `got ${JSON.stringify(r).slice(0, 120)}`,
  },
  {
    name: 'Loan repaid (Ali is an active debtor)',
    msg: 'Ali returned 500',
    check: (r) =>
      r.intent === 'loan_repaid' && r.direction === 'received' ? '' : `intent=${r.intent}, direction=${r.direction}`,
  },
  {
    name: 'Investment buy',
    msg: 'I invested 5000 in Apple',
    check: (r) =>
      r.intent === 'investment_buy' && Number(r.amount) === 5000 ? '' : `got ${JSON.stringify(r).slice(0, 120)}`,
  },
  {
    name: 'Budget query (analytical → ai_query)',
    msg: 'How much did I spend on food last month?',
    check: (r) => (r.intent === 'ai_query' ? '' : `intent=${r.intent}, expected ai_query`),
  },
  {
    name: 'Ambiguity — cab or food? should flag or ask',
    msg: 'I went to Texas Fries on a cab for 500',
    check: (r) => {
      // Acceptable: ambiguity flagged, or a single expense (model picks one).
      // Fail only if it silently invents two 500 expenses.
      const ex = r.expenses || [];
      const doubled = ex.filter((e) => Number(e.amount) === 500).length > 1;
      return doubled ? 'invented two 500 expenses for one amount' : '';
    },
  },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const run = async () => {
  let pass = 0;
  for (const c of CASES) {
    try {
      const r = await interpretMessage(c.msg, CATEGORIES, ACTIVE_LOANS, apiKey);
      const reason = c.check(r);
      if (reason) {
        console.log(`FAIL  ${c.name}\n        ${reason}\n        raw: ${JSON.stringify(r).slice(0, 200)}`);
      } else {
        pass++;
        console.log(`PASS  ${c.name}`);
      }
    } catch (e) {
      console.log(`ERROR ${c.name}\n        ${String(e.message || e).slice(0, 160)}`);
    }
    // Free tier allows ~20 requests/minute — space calls out to stay under it.
    await sleep(4000);
  }
  console.log(`\n${pass}/${CASES.length} passed`);
  process.exit(pass === CASES.length ? 0 : 1);
};

run();
