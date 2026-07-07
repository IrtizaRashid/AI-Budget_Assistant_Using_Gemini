// AI service — powered by Google Gemini via @google/genai.
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

// Attempt to close truncated JSON so partial responses don't hard-fail.
const repairJSON = (raw) => {
  let s = raw.trim();
  // Remove trailing comma before repair
  s = s.replace(/,\s*$/, '');
  const opens = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  const arrOpens = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  s += ']'.repeat(Math.max(0, arrOpens)) + '}'.repeat(Math.max(0, opens));
  return s;
};

const extractJSON = (raw) => {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from AI');

  const candidates = [
    raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim(),
    raw.trim(),
  ];

  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* try next */ }
    try { return JSON.parse(repairJSON(c)); } catch { /* try next */ }
  }

  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch { /* fall through */ }
    try { return JSON.parse(repairJSON(jsonMatch[1])); } catch { /* fall through */ }
  }

  throw new Error('AI returned invalid JSON that could not be repaired.');
};

// Lazily construct the client so a missing key fails at call time with a
// clear message instead of crashing the server on boot.
const clients = new Map();
const makeGeminiError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

const getClient = (apiKey) => {
  const key = apiKey || config.gemini.apiKey;
  if (!key) {
    throw makeGeminiError('GEMINI_KEY_MISSING', 'Please add your Gemini API key to use AI features.');
  }
  if (!clients.has(key)) clients.set(key, new GoogleGenAI({ apiKey: key }));
  return clients.get(key);
};

// Shared request helper
const geminiFetch = async (systemPrompt, userContent, { temperature, json, apiKey }) => {
  const ai = getClient(apiKey);
  let response;
  try {
    response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
      throw makeGeminiError('GEMINI_QUOTA', 'Your Gemini key quota is exhausted. Paste a new key or try again later.');
    }
    if (/API key|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg)) {
      throw makeGeminiError('GEMINI_KEY_INVALID', 'Your Gemini API key is invalid. Please paste a valid key.');
    }
    throw new Error(`Gemini error: ${msg}`);
  }
  return response.text ?? '';
};

// JSON-output call — used by intent classifier and recommendation engine.
export const geminiChat = async (systemPrompt, userContent, temperature = 0, apiKey = null) => {
  const raw = await geminiFetch(systemPrompt, userContent, { temperature, json: true, apiKey });
  const parsed = extractJSON(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('AI response was not a valid JSON object.');
  return parsed;
};

// Plain-text call — used by the Universal Query Engine for natural-language answers.
// Returns a raw string, not JSON.
export const geminiText = async (systemPrompt, userContent, temperature = 0.3, apiKey = null) => {
  const raw = await geminiFetch(systemPrompt, userContent, { temperature, json: false, apiKey });
  return raw.trim();
};
