import { asyncHandler } from '../middleware/asyncHandler.js';
import { analyzeQuery } from '../services/queryAnalyzer.js';
import { collectQueryData } from '../services/queryDataCollector.js';
import { answerQuery } from '../services/aiQueryService.js';
import * as userService from '../services/userService.js';

export const universalQuery = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const userId = req.user.userId;

  if (!query || !String(query).trim()) {
    return res.status(400).json({ message: 'query is required.' });
  }

  // 1. Analyze — determine modules and context
  const { modules, dateRange, person } = analyzeQuery(String(query));

  // 2. Collect — fetch only required structured data
  const structuredData = await collectQueryData(Number(userId), modules, dateRange, person);

  // 3. Answer — send to AI for natural language response
  const geminiApiKey = await userService.getGeminiApiKey(userId);
  let answer;
  try {
    answer = await answerQuery(query, structuredData, dateRange, person, geminiApiKey);
  } catch (err) {
    const status = err.code?.startsWith('GEMINI_') ? 402 : 502;
    return res.status(status).json({
      message: err.message || 'AI query is unavailable.',
      code: err.code,
    });
  }

  return res.status(200).json({
    intent: 'ai_query',
    success: true,
    answer,
    meta: { modules, dateRange: dateRange?.label || null, person: person || null },
  });
});
