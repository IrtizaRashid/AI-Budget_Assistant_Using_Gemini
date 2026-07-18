// AI service powered by Google Gemini via @google/genai.
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

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

const groqFetch = async (systemPrompt, userContent, { temperature, json }) => {
  const MAX_ATTEMPTS = 3;
  let lastKeyError = null;

  for (const key of config.groq.apiKeys) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.groq.model,
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
        clearTimeout(timer);

        if (!response.ok) {
          const message = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
          const classified = classifyProviderError('Groq', `${response.status} ${message}`);
          if (classified?.code === 'GEMINI_QUOTA' || classified?.code === 'GEMINI_KEY_INVALID') {
            lastKeyError = classified;
            break;
          }
          if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
            await sleep(700 * attempt);
            continue;
          }
          if (classified) {
            lastKeyError = classified;
            break;
          }
          throw new Error(`Groq error: ${message}`);
        }

        return data.choices?.[0]?.message?.content || '';
      } catch (err) {
        clearTimeout(timer);
        const msg = String(err?.message || err);
        const classified = classifyProviderError('Groq', msg);
        if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
          await sleep(700 * attempt);
          continue;
        }
        if (classified) {
          lastKeyError = classified;
          break;
        }
        throw new Error(`Groq error: ${msg}`);
      }
    }
  }

  throw lastKeyError || providerError('Groq', 'GEMINI_UNAVAILABLE', 'Groq is unavailable.');
};

const openRouterFetch = async (systemPrompt, userContent, { temperature, json }) => {
  const MAX_ATTEMPTS = 3;
  let lastKeyError = null;

  for (const key of config.openRouter.apiKeys) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            ...(config.openRouter.referer ? { 'HTTP-Referer': config.openRouter.referer } : {}),
            ...(config.openRouter.title ? { 'X-OpenRouter-Title': config.openRouter.title } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.openRouter.model,
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
        clearTimeout(timer);

        if (!response.ok) {
          const message = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
          const classified = classifyProviderError('OpenRouter', `${response.status} ${message}`);
          if (classified?.code === 'GEMINI_QUOTA' || classified?.code === 'GEMINI_KEY_INVALID') {
            lastKeyError = classified;
            break;
          }
          if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
            await sleep(700 * attempt);
            continue;
          }
          if (classified) {
            lastKeyError = classified;
            break;
          }
          throw new Error(`OpenRouter error: ${message}`);
        }

        return data.choices?.[0]?.message?.content || '';
      } catch (err) {
        clearTimeout(timer);
        const msg = String(err?.message || err);
        const classified = classifyProviderError('OpenRouter', msg);
        if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
          await sleep(700 * attempt);
          continue;
        }
        if (classified) {
          lastKeyError = classified;
          break;
        }
        throw new Error(`OpenRouter error: ${msg}`);
      }
    }
  }

  throw lastKeyError || providerError('OpenRouter', 'GEMINI_UNAVAILABLE', 'OpenRouter is unavailable.');
};

const geminiFetch = async (systemPrompt, userContent, { temperature, json, apiKey }) => {
  const apiKeys = getApiKeyCandidates(apiKey);
  if (apiKeys.length === 0 && config.groq.apiKeys.length === 0 && config.openRouter.apiKeys.length === 0) {
    throw makeGeminiError('GEMINI_KEY_MISSING', 'No AI API keys are configured on the server.');
  }

  const MAX_ATTEMPTS = 3;
  let lastKeyError = null;

  for (const key of apiKeys) {
    const ai = getClient(key);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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

        if (classified?.code === 'GEMINI_QUOTA') {
          lastKeyError = classified;
          break;
        }
        if (classified?.code === 'GEMINI_KEY_INVALID') {
          lastKeyError = classified;
          break;
        }

        if (classified?.code === 'GEMINI_UNAVAILABLE' && attempt < MAX_ATTEMPTS) {
          await sleep(700 * attempt);
          continue;
        }
        if (classified) {
          lastKeyError = classified;
          break;
        }
        throw new Error(`Gemini error: ${msg}`);
      }
    }
  }

  if (config.groq.apiKeys.length > 0) {
    try {
      return await groqFetch(systemPrompt, userContent, { temperature, json });
    } catch (err) {
      lastKeyError = err;
    }
  }

  if (config.openRouter.apiKeys.length > 0) {
    try {
      return await openRouterFetch(systemPrompt, userContent, { temperature, json });
    } catch (err) {
      lastKeyError = err;
    }
  }

  throw lastKeyError || makeGeminiError('GEMINI_UNAVAILABLE', 'The AI service is unavailable.');
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
