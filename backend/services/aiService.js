// AI service — powered by Google Gemini (gemini-2.5-flash).
// Single responsibility: send a prompt to Gemini and return parsed JSON.
// All prompt engineering lives in groqService.js (unchanged public API).
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

let _client = null;

const getClient = () => {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it to backend/.env');
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return _client;
};

// Attempt to extract valid JSON from a string that may contain extra text
// or markdown code fences.
const extractJSON = (raw) => {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from AI');

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  // Try the stripped version first, then the raw string
  for (const candidate of [fenceStripped, raw.trim()]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // continue to next candidate
    }
  }

  // Last resort: find the first {...} or [{...}] block in the string
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // fall through
    }
  }

  throw new Error('AI returned invalid JSON that could not be repaired.');
};

// Send a chat request to Gemini and return a parsed JS object.
//
// Parameters:
//   systemPrompt : string  — the system / role instructions
//   userContent  : string  — the user's message
//   temperature  : number  — 0 (deterministic) … 1 (creative)
export const geminiChat = async (systemPrompt, userContent, temperature = 0) => {
  const client = getClient();

  let response;
  try {
    response = await client.models.generateContent({
      model: config.gemini.model,
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        responseMimeType: 'application/json',
      },
    });
  } catch (err) {
    const msg = err?.message ?? '';

    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env');
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      throw new Error('Gemini rate limit exceeded. Please wait and try again.');
    }
    if (msg.includes('fetch') || msg.includes('ENOTFOUND') || msg.includes('network')) {
      throw new Error('Network error reaching Gemini API. Check your internet connection.');
    }

    throw new Error(`Gemini API error: ${msg || 'Unknown error'}`);
  }

  const raw = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const parsed = extractJSON(raw);

  // Basic sanity check — must be a non-null object
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a valid JSON object.');
  }

  return parsed;
};
