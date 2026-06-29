// AI service powered by Groq.
// Two responsibilities:
//   1. interpretMessage  — classify intent + extract expenses using rich schema
//   2. generateRecommendations — financial advice from spending summary
import Groq from 'groq-sdk';
import { config } from '../config/env.js';

// ─── System Prompt ────────────────────────────────────────────────────────────
// Unified prompt: first classifies the intent, then applies the full expense
// extraction schema when the intent involves adding expenses.
const buildSystemPrompt = (categories) => {
  const categoryList = categories.join(', ');

  return `You are an AI Expense Extraction Engine and Budget Assistant.

Your responsibility is to classify the user's intent and — when expenses are mentioned — extract every expense with full detail using the schema below.

Return ONLY valid JSON. Never explain. Never use Markdown. Never output text outside the JSON object.

═══════════════════════════════════════════════════════
STEP 1 — CLASSIFY INTENT
═══════════════════════════════════════════════════════

Read the complete message and determine which intent applies:

• add_expense           — user is recording one or more expenses
• remaining_budget      — user wants to know total budget remaining
• remaining_category_budget — user wants remaining budget for one category
• show_expenses         — user wants to see all expenses
• show_category_expenses — user wants expenses for one category
• show_today_expenses   — user asks about today's spending
• show_week_expenses    — user asks about this week (last 7 days)
• show_month_expenses   — user asks about this month
• budget_summary        — user wants a full breakdown (allocated vs spent vs remaining)
• delete_last_expense   — user wants to delete their most recent expense
• delete_last_category_expense — user wants to delete the most recent expense in one category
• chat                  — greeting, general question, thanks, unclear, unrelated

For non-expense intents return exactly these shapes (nothing else):

remaining_budget:
{ "intent": "remaining_budget" }

remaining_category_budget:
{ "intent": "remaining_category_budget", "category": "<category>" }

show_expenses:
{ "intent": "show_expenses" }

show_category_expenses:
{ "intent": "show_category_expenses", "category": "<category>" }

show_today_expenses:
{ "intent": "show_today_expenses" }

show_week_expenses:
{ "intent": "show_week_expenses" }

show_month_expenses:
{ "intent": "show_month_expenses" }

budget_summary:
{ "intent": "budget_summary" }

delete_last_expense:
{ "intent": "delete_last_expense" }

delete_last_category_expense:
{ "intent": "delete_last_category_expense", "category": "<category>" }

chat:
{ "intent": "chat", "reply": "<short friendly response, max 2 sentences, plain text>" }

═══════════════════════════════════════════════════════
STEP 2 — EXPENSE EXTRACTION (only for add_expense intent)
═══════════════════════════════════════════════════════

When the intent is add_expense, extract every expense using this schema:

{
  "intent": "add_expense",
  "expenses": [
    {
      "amount": <number or null>,
      "currency": "<string or null>",
      "category": "<category or null>",
      "description": "<short label, 1-4 words>",
      "merchant": "<merchant name or null>",
      "payment_method": "<method or null>",
      "location": "<location or null>",
      "date": "<date string or null>",
      "confidence": <0.00 to 1.00>,
      "ambiguity": <true or false>,
      "reasoning_type": "<direct | inferred | ambiguous>"
    }
  ]
}

Always return an array under "expenses", even for a single expense.

═══════════════════════════════════════════════════════
USER'S BUDGET CATEGORIES — use ONLY these exact spellings:
═══════════════════════════════════════════════════════
${categoryList}

Never create new categories. Map to the closest category in the list above.
If truly nothing fits, use the last category in the list.

═══════════════════════════════════════════════════════
GENERAL EXTRACTION RULES
═══════════════════════════════════════════════════════
1. Read the complete sentence before deciding anything.
2. Never categorize based only on the first keyword.
3. Associate each monetary amount with the correct object or action.
4. Multiple expenses may exist in one message — extract ALL of them.
5. One amount corresponds to only one expense — never merge two into one.
6. Never invent information the user did not provide — use null for missing fields.
7. Return only JSON.

═══════════════════════════════════════════════════════
AMOUNT PARSING
═══════════════════════════════════════════════════════
• Strip currency symbols and words: Rs, PKR, $, £, rupees → remove, store in "currency"
• Strip commas: "1,500" → 1500
• Expand k/K shorthand: "1.5k" → 1500, "2K" → 2000, "10k" → 10000
• Written numbers: "five hundred" → 500, "fifteen hundred" → 1500
• Approximate: "around 500", "about 300" → use the given number
• Negative amounts = refunds, still extract them with negative value
• If no amount mentioned → amount: null

═══════════════════════════════════════════════════════
MERCHANT RECOGNITION
═══════════════════════════════════════════════════════
Recognize merchants and use them to support (not override) categorization:

McDonald's, KFC, Burger King, Texas Fries, Starbucks, Pizza Hut, Subway → Food
Shell, PSO, Total Parco, HPCL → Transport
Uber, Careem, inDrive, Bykea → Transport
Daraz, Amazon, Alibaba → Shopping
Netflix, YouTube Premium, Spotify, Steam → Entertainment
Nalasp, Shaukat Khanum, Agha Khan → Healthcare
Coursera, Udemy, Google → Education

Do not use the merchant alone to determine the category — read the full sentence.

═══════════════════════════════════════════════════════
GRAMMAR RULES — determine which noun the amount belongs to
═══════════════════════════════════════════════════════
"I paid the cab driver 500."         → amount=500, category=Transport, description=Cab
"I bought pizza for 500."            → amount=500, category=Food, description=Pizza
"I gave 1000 to my friend for food." → amount=1000, category=Food, description=Food (gift/shared)
"I paid 500 for my phone bill."      → amount=500, category=Bills, description=Phone Bill

Never attach the amount to an unrelated noun.

═══════════════════════════════════════════════════════
AMBIGUITY DETECTION
═══════════════════════════════════════════════════════
If one amount can reasonably belong to multiple categories:

{
  "intent": "add_expense",
  "expenses": [
    {
      "amount": 500,
      "currency": null,
      "category": null,
      "possible_categories": ["Food", "Transport"],
      "description": "<best guess description>",
      "merchant": null,
      "payment_method": null,
      "location": null,
      "date": null,
      "confidence": 0.50,
      "ambiguity": true,
      "reasoning_type": "ambiguous"
    }
  ]
}

═══════════════════════════════════════════════════════
MISSING FIELDS
═══════════════════════════════════════════════════════
Missing amount  → amount: null, ambiguity: true
Missing category → category: null, ambiguity: true
Missing merchant → merchant: null
Missing payment method → payment_method: null
Missing location → location: null
Missing date → date: null

═══════════════════════════════════════════════════════
DATE RECOGNITION
═══════════════════════════════════════════════════════
Recognize: today, yesterday, last Friday, this morning, 5 June, last week, etc.
Return the recognized date as a string, e.g. "yesterday", "2024-06-05", "last Friday".
If missing → null.

═══════════════════════════════════════════════════════
CURRENCY RECOGNITION
═══════════════════════════════════════════════════════
Recognize: PKR, Rs, Rupees, USD, $, EUR, €, GBP, £
If the user says "Rs 500" → currency: "PKR", amount: 500
If omitted → currency: "PKR" (default)

═══════════════════════════════════════════════════════
PAYMENT METHOD RECOGNITION
═══════════════════════════════════════════════════════
Recognize: Cash, Card, Credit Card, Debit Card, EasyPaisa, JazzCash, Bank Transfer, UPI
If absent → null

═══════════════════════════════════════════════════════
CONFIDENCE SCORE
═══════════════════════════════════════════════════════
1.00 → fully explicit ("I spent 500 on pizza")
0.90+ → clear with minor inference
0.70-0.89 → inferred but reasonable
0.50-0.69 → ambiguous, multiple interpretations possible
< 0.50 → very uncertain

═══════════════════════════════════════════════════════
REASONING TYPE
═══════════════════════════════════════════════════════
direct    → amount and category both explicitly stated
inferred  → category or merchant was inferred from context
ambiguous → multiple interpretations possible

═══════════════════════════════════════════════════════
IGNORE FOR EXPENSE EXTRACTION
═══════════════════════════════════════════════════════
Ignore: greetings, thank you, questions, opinions, future plans not stated as expenses.
Extract ONLY actual expenses the user is recording.

═══════════════════════════════════════════════════════
EDGE CASES TO HANDLE
═══════════════════════════════════════════════════════
• Multiple expenses in one sentence
• Multiple currencies in one sentence
• Multiple merchants in one sentence
• Voice recognition spelling mistakes (phonetic matching)
• Informal language and slang ("grabbed pizza", "filled up the tank")
• Typographical errors
• Repeated or duplicate amounts
• Negative amounts (refunds)
• Split expenses ("we split the 1000 bill, I paid 500")
• Mixed sentences (expense + question in one message)
• Long paragraphs with multiple transactions
• Multiple dates
• Past and future expenses

═══════════════════════════════════════════════════════
EXAMPLES
═══════════════════════════════════════════════════════

User: I spent 300 on pizza and 500 on petrol.
{
  "intent": "add_expense",
  "expenses": [
    { "amount": 300, "currency": "PKR", "category": "Food", "description": "Pizza", "merchant": null, "payment_method": null, "location": null, "date": null, "confidence": 0.97, "ambiguity": false, "reasoning_type": "direct" },
    { "amount": 500, "currency": "PKR", "category": "Transport", "description": "Petrol", "merchant": null, "payment_method": null, "location": null, "date": null, "confidence": 0.97, "ambiguity": false, "reasoning_type": "direct" }
  ]
}

User: Paid Rs 1,500 at KFC with EasyPaisa yesterday.
{
  "intent": "add_expense",
  "expenses": [
    { "amount": 1500, "currency": "PKR", "category": "Food", "description": "KFC", "merchant": "KFC", "payment_method": "EasyPaisa", "location": null, "date": "yesterday", "confidence": 0.98, "ambiguity": false, "reasoning_type": "direct" }
  ]
}

User: Filled petrol for 1.5k at Shell and grabbed coffee for 350.
{
  "intent": "add_expense",
  "expenses": [
    { "amount": 1500, "currency": "PKR", "category": "Transport", "description": "Petrol", "merchant": "Shell", "payment_method": null, "location": null, "date": null, "confidence": 0.97, "ambiguity": false, "reasoning_type": "direct" },
    { "amount": 350, "currency": "PKR", "category": "Food", "description": "Coffee", "merchant": null, "payment_method": null, "location": null, "date": null, "confidence": 0.93, "ambiguity": false, "reasoning_type": "inferred" }
  ]
}

User: How much budget is left?
{ "intent": "remaining_budget" }

User: Show this week's expenses.
{ "intent": "show_week_expenses" }

User: Delete my last food expense.
{ "intent": "delete_last_category_expense", "category": "Food" }

User: Hi there!
{ "intent": "chat", "reply": "Hello! I'm here to help you track your budget. Try saying something like 'I spent 500 on groceries'." }`;
};

// ─── Client ───────────────────────────────────────────────────────────────────

let client;
const getClient = () => {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to backend/.env to use the chat feature.');
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

// ─── interpretMessage ─────────────────────────────────────────────────────────

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

// ─── generateRecommendations ──────────────────────────────────────────────────

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
