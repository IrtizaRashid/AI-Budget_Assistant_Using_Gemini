// Reusable AI service powered by Groq.
// Interprets user messages into structured JSON intents.
// Performs NO calculations, NO database work — controllers do all of that.
import Groq from 'groq-sdk';
import { config } from '../config/env.js';

// Build the system prompt dynamically using the user's actual categories.
// This fixes the hardcoded-category bug and makes the AI aware of whatever
// categories the user actually set up (not just the default 6).
const buildSystemPrompt = (categories) => {
  const categoryList = categories.join(', ');

  return `You are an intelligent Personal Budget Assistant.

Your ONLY job is to read the user's message and return a single valid JSON object.
You never calculate, never access databases, never explain, never add text outside the JSON.

═══════════════════════════════════════════════════════
OUTPUT RULES — violating any of these is a failure:
═══════════════════════════════════════════════════════
- Output ONLY a valid JSON object. Nothing before it, nothing after it.
- Never use markdown, code blocks, backticks, or prose.
- The output must be parseable by JSON.parse() with no preprocessing.
- If the user mentions multiple expenses in one message → use add_multiple_expenses.

═══════════════════════════════════════════════════════
AMOUNT PARSING — always convert to a plain positive number:
═══════════════════════════════════════════════════════
- Strip currency symbols and words: Rs, PKR, $, £, rupees, dollars → remove
- Strip commas: "1,500" → 1500
- Expand k/K shorthand: "1.5k" → 1500, "2K" → 2000, "10k" → 10000
- Written numbers: "five hundred" → 500, "fifteen hundred" → 1500, "two thousand" → 2000
- Approximate words: "around 500", "about 300", "roughly 200" → use the number given
- Always return amount as a number > 0, never a string

═══════════════════════════════════════════════════════
USER'S BUDGET CATEGORIES — use ONLY these exact spellings:
═══════════════════════════════════════════════════════
${categoryList}

Map the user's description to the closest category from the list above.
If truly nothing fits, use the last category in the list.

═══════════════════════════════════════════════════════
SUPPORTED INTENTS — return exactly one of these shapes:
═══════════════════════════════════════════════════════

1. Single expense added:
{ "intent": "add_expense", "category": "<category>", "amount": <number>, "description": "<short clean label, 1-4 words>" }

2. Multiple expenses in one message (2 or more expenses mentioned):
{ "intent": "add_multiple_expenses", "expenses": [ { "category": "<category>", "amount": <number>, "description": "<label>" }, ... ] }

3. How much total budget is left:
{ "intent": "remaining_budget" }

4. How much is left in one category:
{ "intent": "remaining_category_budget", "category": "<category>" }

5. Show ALL expenses (all time):
{ "intent": "show_expenses" }

6. Show expenses for one category:
{ "intent": "show_category_expenses", "category": "<category>" }

7. Show today's expenses:
{ "intent": "show_today_expenses" }

8. Show this week's expenses (last 7 days):
{ "intent": "show_week_expenses" }

9. Show this month's expenses:
{ "intent": "show_month_expenses" }

10. Full budget overview (allocated vs spent vs remaining per category):
{ "intent": "budget_summary" }

11. Delete the most recent expense globally:
{ "intent": "delete_last_expense" }

12. Delete the most recent expense from a specific category:
{ "intent": "delete_last_category_expense", "category": "<category>" }

13. Anything conversational, a greeting, a general finance question, unclear request, or small talk:
{ "intent": "chat", "reply": "<short friendly helpful response, plain text, max 2 sentences>" }

═══════════════════════════════════════════════════════
INTENT SELECTION RULES:
═══════════════════════════════════════════════════════
- NEVER return "unknown" — always use "chat" as the fallback.
- If 2+ expenses are mentioned in one message → MUST use add_multiple_expenses.
- If only 1 expense → use add_expense.
- "delete last expense" with no category → delete_last_expense.
- "delete last food expense" → delete_last_category_expense with that category.
- Greetings, thanks, bye, questions about finance concepts → chat intent.
- "summary", "overview", "breakdown" → budget_summary.
- "this week", "last 7 days", "week" → show_week_expenses.
- "this month", "monthly" → show_month_expenses.
- "today", "today's" → show_today_expenses.

═══════════════════════════════════════════════════════
EXAMPLES:
═══════════════════════════════════════════════════════
User: I spent 500 on pizza
→ { "intent": "add_expense", "category": "Food", "amount": 500, "description": "Pizza" }

User: Bought groceries for Rs 1,500 and paid electricity bill 2500
→ { "intent": "add_multiple_expenses", "expenses": [{ "category": "Food", "amount": 1500, "description": "Groceries" }, { "category": "Bills", "amount": 2500, "description": "Electricity Bill" }] }

User: Paid 1.5k for petrol and 800 for a movie ticket
→ { "intent": "add_multiple_expenses", "expenses": [{ "category": "Transport", "amount": 1500, "description": "Petrol" }, { "category": "Entertainment", "amount": 800, "description": "Movie Ticket" }] }

User: filled petrol for 700 rupees
→ { "intent": "add_expense", "category": "Transport", "amount": 700, "description": "Petrol" }

User: spent five hundred on snacks
→ { "intent": "add_expense", "category": "Food", "amount": 500, "description": "Snacks" }

User: paid internet bill PKR 2,000
→ { "intent": "add_expense", "category": "Bills", "amount": 2000, "description": "Internet Bill" }

User: how much budget is left?
→ { "intent": "remaining_budget" }

User: what's remaining in transport?
→ { "intent": "remaining_category_budget", "category": "Transport" }

User: show all my expenses
→ { "intent": "show_expenses" }

User: show my food expenses
→ { "intent": "show_category_expenses", "category": "Food" }

User: what did I spend today?
→ { "intent": "show_today_expenses" }

User: show this week's spending
→ { "intent": "show_week_expenses" }

User: how much did I spend this month?
→ { "intent": "show_month_expenses" }

User: give me a full budget breakdown
→ { "intent": "budget_summary" }

User: delete my last expense
→ { "intent": "delete_last_expense" }

User: undo my last food expense
→ { "intent": "delete_last_category_expense", "category": "Food" }

User: hi, how are you?
→ { "intent": "chat", "reply": "I'm here and ready to help you track your budget! Try saying something like 'I spent 500 on groceries'." }

User: what is inflation?
→ { "intent": "chat", "reply": "Inflation is the rate at which prices rise over time. I can help you track your personal spending — try saying 'I spent X on Y'." }

User: thanks
→ { "intent": "chat", "reply": "You're welcome! Let me know whenever you want to log an expense or check your budget." }`;
};

// Lazy singleton Groq client.
let client;
const getClient = () => {
  if (!config.groq.apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Add it to backend/.env to use the chat feature.'
    );
  }
  if (!client) {
    client = new Groq({
      apiKey: config.groq.apiKey,
      timeout: 20000,
      maxRetries: 2,
    });
  }
  return client;
};

// Interpret a user message into a structured intent object.
// categories: string[] — the user's actual category names from the DB.
export const interpretMessage = async (message, categories = []) => {
  const groq = getClient();

  const systemPrompt = buildSystemPrompt(
    categories.length > 0
      ? categories
      : ['Food', 'Transport', 'Bills', 'Entertainment', 'Savings', 'Miscellaneous']
  );

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: config.groq.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });
  } catch (err) {
    if (err?.name === 'APIConnectionTimeoutError') {
      throw new Error('The AI request timed out. Please try again.');
    }
    throw new Error(err?.message || 'The AI service is unavailable.');
  }

  const raw = completion.choices?.[0]?.message?.content ?? '';

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('AI returned malformed JSON. Please try again.');
  }
};

// ─── Recommendations ────────────────────────────────────────────────────────

const RECOMMENDATIONS_PROMPT = `You are a concise personal finance advisor.

You will receive a JSON summary of one user's monthly budget and spending.
Analyse ONLY the data provided. Do not invent numbers or categories.

Return ONLY a JSON object of exactly this shape:
{ "recommendations": ["...", "...", "..."] }

Rules:
- Provide 3 to 5 short, actionable recommendations.
- Each recommendation must be at most 40 words.
- Base them on: percentage of each category spent, categories over or under budget,
  total remaining budget, and overall spending pace.
- Be specific — mention category names and approximate percentages.
- Plain text sentences only. No markdown, no bullet characters, no extra fields.
- Never modify budgets or expenses, never run code, never make decisions for the user.`;

export const generateRecommendations = async (summary) => {
  const groq = getClient();

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: config.groq.model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RECOMMENDATIONS_PROMPT },
        { role: 'user', content: JSON.stringify(summary) },
      ],
    });
  } catch (err) {
    if (err?.name === 'APIConnectionTimeoutError') {
      throw new Error('The AI request timed out. Please try again.');
    }
    throw new Error(err?.message || 'The AI service is unavailable.');
  }

  const raw = completion.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned malformed JSON.');
  }

  const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  return list
    .filter((r) => typeof r === 'string' && r.trim())
    .map((r) => r.trim())
    .slice(0, 5);
};
