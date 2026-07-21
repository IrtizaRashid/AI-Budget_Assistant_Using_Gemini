// AI service powered by Google Gemini via @google/genai.
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

// ─── Circular Queue for API Key Rotation ─────────────────────────────────────

class ApiKeyQueue {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.initializeKeys();
  }

  initializeKeys() {
    // Combine all API keys from all providers into a single circular queue
    const geminiKeys = config.gemini.apiKeys.map(key => ({ key, provider: 'Gemini', model: config.gemini.model }));
    const groqKeys = config.groq.apiKeys.map(key => ({ key, provider: 'Groq', model: config.groq.model }));
    const openRouterKeys = config.openRouter.apiKeys.map(key => ({ key, provider: 'OpenRouter', model: config.openRouter.model }));
    
    this.keys = [...geminiKeys, ...groqKeys, ...openRouterKeys];
    this.currentIndex = 0;
  }

  getNext() {
    if (this.keys.length === 0) return null;
    
    const keyEntry = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return keyEntry;
  }

  hasNext() {
    return this.keys.length > 0;
  }

  reset() {
    this.currentIndex = 0;
  }

  size() {
    return this.keys.length;
  }
}

const apiKeyQueue = new ApiKeyQueue();

const repairJSON = (raw) => {
  let s = raw.trim();
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

const clients = new Map();

const makeGeminiError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

const getClient = (apiKey) => {
  if (!clients.has(apiKey)) clients.set(apiKey, new GoogleGenAI({ apiKey }));
  return clients.get(apiKey);
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const getApiKeyCandidates = (apiKey) => {
  const keys = [apiKey, ...config.gemini.apiKeys].filter(Boolean);
  return [...new Set(keys)];
};

const providerError = (provider, code, message) => {
  const err = makeGeminiError(code, message);
  err.provider = provider;
  return err;
};

const classifyProviderError = (provider, msg) => {
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) {
    return providerError(provider, 'GEMINI_QUOTA', `${provider} key quota or rate limit was reached.`);
  }
  if (/API key|API_KEY_INVALID|PERMISSION_DENIED|Unauthorized|401|403|forbidden/i.test(msg)) {
    return providerError(provider, 'GEMINI_KEY_INVALID', `${provider} API key was rejected.`);
  }
  if (/503|502|504|UNAVAILABLE|high demand|overloaded|fetch failed|ECONNRESET|ETIMEDOUT|abort/i.test(msg)) {
    return providerError(provider, 'GEMINI_UNAVAILABLE', `${provider} is briefly unavailable.`);
  }
  return null;
};

const geminiFetch = async (systemPrompt, userContent, { temperature, json, apiKey }) => {
  // If user provided their own API key, try it first
  if (apiKey) {
    try {
      const result = await tryGeminiKey(apiKey, systemPrompt, userContent, { temperature, json });
      return result;
    } catch (err) {
      // User's key failed, fall back to circular queue
      console.log('User API key failed, falling back to server keys');
    }
  }

  // Check if we have any server keys configured
  if (!apiKeyQueue.hasNext()) {
    throw makeGeminiError('GEMINI_KEY_MISSING', 'No AI API keys are configured on the server.');
  }

  const MAX_ATTEMPTS = 3;
  let lastKeyError = null;
  const queueSize = apiKeyQueue.size();
  const triedKeys = new Set();

  // Try each key in the circular queue
  for (let i = 0; i < queueSize; i++) {
    const keyEntry = apiKeyQueue.getNext();
    if (!keyEntry || triedKeys.has(keyEntry.key)) continue;
    
    triedKeys.add(keyEntry.key);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await tryProviderKey(keyEntry, systemPrompt, userContent, { temperature, json });
        return result;
      } catch (err) {
        const msg = String(err?.message || err);
        const classified = classifyProviderError(keyEntry.provider, msg);

        if (classified?.code === 'GEMINI_QUOTA' || classified?.code === 'GEMINI_KEY_INVALID') {
          lastKeyError = classified;
          break; // Move to next key
        }

        if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
          await sleep(700 * attempt);
          continue; // Retry same key
        }
        
        lastKeyError = classified || err;
        break; // Move to next key
      }
    }
  }

  throw lastKeyError || makeGeminiError('GEMINI_UNAVAILABLE', 'The AI service is unavailable.');
};

const tryGeminiKey = async (apiKey, systemPrompt, userContent, { temperature, json }) => {
  const ai = getClient(apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await ai.models.generateContent({
      model: config.gemini.model,
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        abortSignal: controller.signal,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    clearTimeout(timer);
    return response.text ?? '';
  } catch (err) {
    clearTimeout(timer);
    const msg = String(err?.message || err);
    const classified = classifyProviderError('Gemini', msg);
    
    if (classified) throw classified;
    throw new Error(`Gemini error: ${msg}`);
  }
};

const tryProviderKey = async (keyEntry, systemPrompt, userContent, { temperature, json }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    let result;
    
    if (keyEntry.provider === 'Gemini') {
      const ai = getClient(keyEntry.key);
      const response = await ai.models.generateContent({
        model: keyEntry.model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature,
          abortSignal: controller.signal,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      });
      result = response.text ?? '';
    } else if (keyEntry.provider === 'Groq') {
      result = await fetchGroq(keyEntry.key, keyEntry.model, systemPrompt, userContent, { temperature, json, controller });
    } else if (keyEntry.provider === 'OpenRouter') {
      result = await fetchOpenRouter(keyEntry.key, keyEntry.model, systemPrompt, userContent, { temperature, json, controller });
    }
    
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

const fetchGroq = async (apiKey, model, systemPrompt, userContent, { temperature, json, controller }) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: json ? `${systemPrompt}\n\nReturn only valid JSON. Do not wrap it in markdown.` : systemPrompt,
        },
        { role: 'user', content: userContent },
      ],
      temperature,
      stream: false,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
    throw new Error(`Groq error: ${message}`);
  }

  return data.choices?.[0]?.message?.content || '';
};

const fetchOpenRouter = async (apiKey, model, systemPrompt, userContent, { temperature, json, controller }) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(config.openRouter.referer ? { 'HTTP-Referer': config.openRouter.referer } : {}),
      ...(config.openRouter.title ? { 'X-OpenRouter-Title': config.openRouter.title } : {}),
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: json ? `${systemPrompt}\n\nReturn only valid JSON. Do not wrap it in markdown.` : systemPrompt,
        },
        { role: 'user', content: userContent },
      ],
      temperature,
      stream: false,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
    throw new Error(`OpenRouter error: ${message}`);
  }

  return data.choices?.[0]?.message?.content || '';
};

export const geminiChat = async (systemPrompt, userContent, temperature = 0, apiKey = null) => {
  const raw = await geminiFetch(systemPrompt, userContent, { temperature, json: true, apiKey });
  const parsed = extractJSON(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('AI response was not a valid JSON object.');
  return parsed;
};

export const geminiText = async (systemPrompt, userContent, temperature = 0.3, apiKey = null) => {
  const raw = await geminiFetch(systemPrompt, userContent, { temperature, json: false, apiKey });
  return raw.trim();
};
