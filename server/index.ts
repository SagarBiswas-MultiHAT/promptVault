/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PORT = Number(process.env.AI_PROXY_PORT || 3001);
const CACHE_TTL_MS = 1000 * 60 * 30;
const MAX_CACHE_ENTRIES = 200;
const responseCache = new Map<string, { expiresAt: number; value: any }>();

type Mode = 'analyze' | 'improve';

app.post('/api/suggest', async (req, res) => {
  const body = req.body || {};
  const { prompt, categories, mode } = body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const categoryList = Array.isArray(categories)
    ? categories.filter((item) => typeof item === 'string')
    : [];

  try {
    const result = await generateSuggestion({
      prompt: prompt.trim(),
      categories: categoryList,
      mode: mode === 'improve' ? 'improve' : 'analyze',
    });

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'AI suggestion failed.' });
  }
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'promptvault-ai-proxy' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://localhost:${PORT}`);
});

async function generateSuggestion({ prompt, categories, mode }: { prompt: string; categories: string[]; mode: Mode }) {
  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY or GROQ_API_KEY.');
  }

  const normalizedCategories = categories
    .map((item) => item.trim())
    .filter(Boolean);
  const cacheKey = getCacheKey(prompt, normalizedCategories, mode);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  const promptText = mode === 'improve'
    ? buildImprovePrompt(prompt, normalizedCategories)
    : buildAnalysisPrompt(prompt, normalizedCategories);

  if (GEMINI_API_KEY) {
    try {
      rawText = await requestGemini(promptText);
      if (rawText) {
        provider = 'gemini';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[ai-proxy] Gemini failed: ${msg}`);
    }
  }

  if (!rawText && GROQ_API_KEY) {
    try {
      rawText = await requestGroq(promptText);
      if (rawText) {
        provider = 'groq';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[ai-proxy] Groq failed: ${msg}`);
    }
  }

  if (!rawText) {
    const reason = !GEMINI_API_KEY && !GROQ_API_KEY
      ? 'No API keys configured.'
      : 'Both Gemini and Groq providers failed. Check API keys and network connectivity.';
    throw new Error(reason);
  }

  const parsed = extractJson(rawText);
  const normalized = mode === 'improve'
    ? normalizeImprove(parsed)
    : normalizeAnalysis(parsed, normalizedCategories);
  const result = { ...normalized, provider };
  setCachedResult(cacheKey, result);
  return result;
}

function buildAnalysisPrompt(prompt: string, categories: string[]) {
  const categoryLine = categories.length
    ? `Choose a category from this list only: ${categories.join(', ')}.`
    : 'If no categories are provided, use "General".';

  return [
    'You are a senior prompt engineer. Evaluate the user prompt below and return ONLY valid JSON.',
    '',
    'Score the prompt from 0.0 to 10.0 (use one decimal place) based on these criteria:',
    '- Clarity: Is the request clear and unambiguous?',
    '- Context: Does it provide enough background information?',
    '- Specificity: Are there concrete details, constraints, or requirements?',
    '- Output format: Does it describe the desired response format?',
    '- Completeness: Could an AI answer this without asking follow-up questions?',
    '',
    'Scoring guide (be honest and fair):',
    '- 0-2: Gibberish, empty, or completely unclear',
    '- 2-4: Has a basic idea but very vague, missing key details',
    '- 4-6: Decent intent with some context but needs more specificity',
    '- 6-8: Well-structured with clear intent, context, and some constraints',
    '- 8-10: Excellent prompt with detailed instructions, constraints, and output format',
    '',
    'IMPORTANT RULES:',
    '- The "title" MUST describe what the prompt is actually about. Read the full prompt content carefully.',
    '  For example: "Website Pricing Consultation", "Python Code Review Request", "Essay Writing Help".',
    '  NEVER use generic titles like "Empty Prompt" or "Untitled" if the prompt has actual content.',
    '- Tags should reflect the actual topic and intent of the prompt.',
    '- Weaknesses and improvements must be specific and actionable.',
    '',
    'Return this exact JSON structure with your assessment values:',
    '{',
    '  "rating": 8.5,',
    '  "weaknesses": ["specific weakness"],',
    '  "improvements": ["actionable suggestion"],',
    '  "title": "short descriptive title based on prompt content",',
    '  "category": "category name",',
    '  "tags": ["relevant", "topic", "tags"]',
    '}',
    'The rating MUST be a number between 0.0 and 10.0 (not a string or array). Replace all example values with your real assessment.',
    '',
    categoryLine,
    '',
    'Here is the user prompt to evaluate:',
    '',
    prompt,
  ].join('\n');
}

function buildImprovePrompt(prompt: string, categories: string[]) {
  const categoryLine = categories.length
    ? `Available categories: ${categories.join(', ')}.`
    : 'Category list is unavailable.';

  return [
    'You are a prompt quality editor. Return ONLY valid JSON.',
    '',
    'Rewrite the user prompt below to make it significantly better.',
    'Focus on: adding clarity, providing context, defining constraints, specifying output format.',
    'Preserve the original intent and topic completely.',
    '',
    'Return this exact JSON structure:',
    '{',
    '  "improvedPrompt": "the rewritten, improved prompt",',
    '  "weaknesses": ["what was wrong with the original"],',
    '  "improvements": ["what you improved and why"]',
    '}',
    '',
    categoryLine,
    '',
    'User prompt to improve:',
    '',
    prompt,
  ].join('\n');
}

async function requestGemini(promptText: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini error: ${errorBody}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part: { text?: string }) => part.text || '').join('').trim();
}

async function requestGroq(promptText: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      top_p: 0.95,
      messages: [
        { role: 'system', content: 'You are a senior prompt quality assessor. Return strict JSON only.' },
        { role: 'user', content: promptText },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq error: ${errorBody}`);
  }

  const data = await response.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

function extractJson(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1]);
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response.');
  }

  return JSON.parse(text.slice(start, end + 1));
}

function normalizeAnalysis(data: any, categories: string[]) {
  const rating = Number.isFinite(Number(data?.rating)) ? Number(data.rating) : 0;
  // Preserve one decimal place from AI assessment — do NOT round to integer
  const safeRating = Math.max(0, Math.min(10, Math.round(rating * 10) / 10));
  const weaknesses = Array.isArray(data?.weaknesses) ? data.weaknesses.filter(Boolean) : [];
  const improvements = Array.isArray(data?.improvements) ? data.improvements.filter(Boolean) : [];
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const rawCategory = typeof data?.category === 'string' ? data.category.trim() : '';
  const tags = Array.isArray(data?.tags) ? data.tags.filter(Boolean) : [];

  return {
    rating: safeRating,
    weaknesses,
    improvements,
    title: title || 'Untitled Prompt',
    category: pickCategory(rawCategory, categories),
    tags: tags.slice(0, 8),
  };
}

function normalizeImprove(data: any) {
  const weaknesses = Array.isArray(data?.weaknesses) ? data.weaknesses.filter(Boolean) : [];
  const improvements = Array.isArray(data?.improvements) ? data.improvements.filter(Boolean) : [];
  const improvedPrompt = typeof data?.improvedPrompt === 'string' ? data.improvedPrompt.trim() : '';

  return {
    improvedPrompt,
    weaknesses,
    improvements,
  };
}

function pickCategory(candidate: string, categories: string[]) {
  if (!categories.length) return 'General';
  const normalized = candidate.toLowerCase();
  const match = categories.find((cat) => cat.toLowerCase() === normalized);
  return match || categories.find((cat) => cat.toLowerCase() === 'general') || categories[0];
}

function getCacheKey(prompt: string, categories: string[], mode: Mode) {
  const categoryKey = categories.join('|').toLowerCase();
  return `${mode}:${hashString(prompt)}:${hashString(categoryKey)}`;
}

function getCachedResult(key: string) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedResult(key: string, value: any) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function hashString(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
