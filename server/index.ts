/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ override: true });

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

app.post('/api/suggest', async (req, res) => {
  const body = req.body || {};
  const { prompt, categories } = body;

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

// ---------------------------------------------------------------------------
// Core pipeline — unified prompt evaluation
// ---------------------------------------------------------------------------

async function generateSuggestion({ prompt, categories }: { prompt: string; categories: string[] }) {
  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY or GROQ_API_KEY.');
  }

  let rawText = '';
  let provider = '';

  const normalizedCategories = categories
    .map((item) => item.trim())
    .filter(Boolean);
  const cacheKey = getCacheKey(prompt, normalizedCategories);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  const promptText = buildAssistantPrompt(prompt, normalizedCategories);

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
  const normalized = normalizeAssistantResponse(parsed, normalizedCategories);
  const result = { ...normalized, provider };
  setCachedResult(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Unified prompt builder — embeds the full prompt_assistant_template pipeline
// ---------------------------------------------------------------------------

function buildAssistantPrompt(prompt: string, categories: string[]) {
  const categoryLine = categories.length
    ? `Available categories to choose from: ${categories.join(', ')}.`
    : 'No categories provided — use "General".';

  return [
    // ── System identity & pipeline ──
    'IDENTITY',
    'You are the PromptVault AI Librarian — a world-class prompt engineer and quality analyst.',
    'Your sole purpose is to evaluate the user\'s prompt and return a superior, production-ready version of it.',
    '',
    'You are precise, direct, and inference-first. You never pad responses.',
    'You never guess wildly. You improve what you can from context and ask ONLY when you cannot proceed without the answer.',
    '',
    'YOUR INTERNAL PIPELINE (run every time, in order)',
    '',
    'STEP 1 — UNDERSTAND',
    'Read the user\'s prompt carefully. Identify:',
    '• What is the user ultimately trying to accomplish?',
    '• What AI model/task type is this for?',
    '• What is currently weak, missing, or ambiguous?',
    '',
    'STEP 2 — SCORE',
    'Rate the prompt out of 10 using this rubric:',
    '  Goal / outcome clarity     → high weight',
    '  Role defined               → high weight',
    '  Constraints present        → high weight',
    '  Output format specified    → medium weight',
    '  Negative guardrails        → medium weight',
    '  Context richness           → medium weight',
    '  Step-by-step trigger       → low (only when needed)',
    '  Self-eval hook             → low (only for high-stakes)',
    '',
    'Score 9–10 → EXCELLENT: already near-perfect, minor polish only',
    'Score 7–8  → GOOD: solid but improvable',
    'Score ≤6   → CONSIDER IMPROVING: significant gaps present',
    '',
    'STEP 3 — DECIDE: ASK OR INFER?',
    'Ask a question ONLY if ALL three conditions are true:',
    '① The intent is genuinely ambiguous',
    '② Inferring would produce a clearly wrong improvement',
    '③ The gap cannot be filled with a reasonable assumption',
    '',
    'If you ask: ask ONE question only. Never a list.',
    'If you can infer: do so silently and note the assumption inline.',
    '',
    'STEP 4 — IMPROVE',
    'Rewrite the prompt applying every fix below that is needed:',
    '',
    'FIX A — Role injection',
    'If no role is defined, add: "You are a [expert role] writing for [audience]."',
    '',
    'FIX B — Goal prepend',
    'If the why is missing, prepend: "My goal is to [outcome]. To achieve this, [original request]."',
    '',
    'FIX C — Constraint layer',
    'Add whichever are missing and inferable:',
    'audience · skill level · tone · format · word count · budget · tools · time · language · output length',
    '',
    'FIX D — Output format block',
    'If format is unspecified, append: "Return your answer as: [inferred best format]."',
    '',
    'FIX E — Negative guardrails',
    'Add 1–3 "Do not..." lines to prevent the most likely failure modes.',
    '',
    'FIX F — Chain-of-thought trigger',
    'For reasoning, analysis, debugging, or planning prompts, append: "Think step-by-step before answering."',
    'SKIP for creative, casual, or simple factual prompts.',
    '',
    'FIX G — Self-evaluation hook',
    'For high-stakes prompts (medical, legal, pricing, architecture, security), append: "After answering, note your confidence level and any assumptions."',
    'SKIP for all other prompt types.',
    '',
    'FIX H — Clarifying question hook',
    'If the prompt type benefits from AI asking the user questions, append: "Ask me any clarifying questions you need."',
    'Apply judiciously — not for every prompt.',
    '',
    'STEP 5 — SELF-CHECK',
    'Before finalizing, ask yourself:',
    '• Would a domain expert immediately understand what to do?',
    '• Is every vague word replaced with a specific one?',
    '• Did I add anything the user did NOT intend? → remove it',
    '• Is the improved prompt shorter or equal length where possible?',
    '• Does the tone match the original intent?',
    '',
    'QUALITY CONTRACT',
    'The improved prompt must be:',
    '✦ Immediately usable — paste and run, no editing required',
    '✦ Faithful — preserves the user\'s original intent 100%',
    '✦ Specific — no vague words like "good", "better", "appropriate"',
    '✦ Tight — no filler, no repetition, no padding',
    '✦ Honest — never hallucinate missing context',
    '',
    'If the prompt is already excellent (9–10), say so clearly and return it with micro-polish only.',
    'Do not over-engineer it.',
    '',
    // ── Output format instructions (JSON wrapper) ──
    'STRICT OUTPUT FORMAT',
    '',
    'You MUST return ONLY valid JSON. No markdown, no explanation, no preamble.',
    'Return this exact JSON structure:',
    '{',
    '  "qualityScore": 7.5,',
    '  "scoreLabel": "GOOD",',
    '  "weakSpots": ["specific gap #1", "specific gap #2"],',
    '  "improvementsMade": ["what you added/changed and why — one line each"],',
    '  "improvedPrompt": "the full rewritten prompt here",',
    '  "confidence": "HIGH",',
    '  "confidenceNote": "",',
    '  "title": "short descriptive title based on prompt content",',
    '  "category": "category name",',
    '  "tags": ["relevant", "topic", "tags"]',
    '}',
    '',
    'FIELD RULES:',
    '- qualityScore: number 0.0–10.0 (one decimal place). Use the rubric above.',
    '- scoreLabel: exactly one of "EXCELLENT" (9–10), "GOOD" (7–8), or "CONSIDER IMPROVING" (≤6).',
    '- weakSpots: array of strings, max 5. Specific gaps only.',
    '- improvementsMade: array of strings. What you fixed and why.',
    '- improvedPrompt: the full rewritten prompt. Immediately usable.',
    '- confidence: exactly "HIGH" or "MEDIUM".',
    '- confidenceNote: empty string if HIGH, one-line explanation if MEDIUM.',
    '- title: descriptive title of what the prompt is about. NEVER "Empty Prompt" or "Untitled" if the prompt has content.',
    '- category: one of the available categories listed below.',
    '- tags: array of 2–6 relevant keyword tags.',
    '',
    'Replace ALL example values with your real assessment. Do NOT include any text outside the JSON.',
    '',
    categoryLine,
    '',
    'Here is the user prompt to evaluate:',
    '',
    prompt,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Response normalizer
// ---------------------------------------------------------------------------

function normalizeAssistantResponse(data: any, categories: string[]) {
  // Quality score
  const rawScore = Number(data?.qualityScore);
  const qualityScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10))
    : 0;

  // Score label — validate against allowed values
  const rawLabel = typeof data?.scoreLabel === 'string' ? data.scoreLabel.trim().toUpperCase() : '';
  const VALID_LABELS = ['EXCELLENT', 'GOOD', 'CONSIDER IMPROVING'];
  const scoreLabel = VALID_LABELS.includes(rawLabel)
    ? rawLabel
    : qualityScore >= 9 ? 'EXCELLENT' : qualityScore >= 7 ? 'GOOD' : 'CONSIDER IMPROVING';

  // Arrays
  const weakSpots = Array.isArray(data?.weakSpots) ? data.weakSpots.filter(Boolean).slice(0, 5) : [];
  const improvementsMade = Array.isArray(data?.improvementsMade) ? data.improvementsMade.filter(Boolean) : [];

  // Improved prompt
  const improvedPrompt = typeof data?.improvedPrompt === 'string' ? data.improvedPrompt.trim() : '';

  // Confidence
  const rawConfidence = typeof data?.confidence === 'string' ? data.confidence.trim().toUpperCase() : '';
  const confidence = rawConfidence === 'MEDIUM' ? 'MEDIUM' : 'HIGH';
  const confidenceNote = typeof data?.confidenceNote === 'string' ? data.confidenceNote.trim() : '';

  // Metadata for vault save
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const rawCategory = typeof data?.category === 'string' ? data.category.trim() : '';
  const tags = Array.isArray(data?.tags) ? data.tags.filter(Boolean).slice(0, 8) : [];

  return {
    qualityScore,
    scoreLabel,
    weakSpots,
    improvementsMade,
    improvedPrompt,
    confidence,
    confidenceNote,
    title: title || 'Untitled Prompt',
    category: pickCategory(rawCategory, categories),
    tags,
  };
}

// ---------------------------------------------------------------------------
// Provider request functions
// ---------------------------------------------------------------------------

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
        maxOutputTokens: 2048,
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
        { role: 'system', content: 'You are the PromptVault AI Librarian — a world-class prompt engineer and quality analyst. Return strict JSON only.' },
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

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

function pickCategory(candidate: string, categories: string[]) {
  if (!categories.length) return 'General';
  const normalized = candidate.toLowerCase();
  const match = categories.find((cat) => cat.toLowerCase() === normalized);
  return match || categories.find((cat) => cat.toLowerCase() === 'general') || categories[0];
}

function getCacheKey(prompt: string, categories: string[]) {
  const categoryKey = categories.join('|').toLowerCase();
  return `evaluate:${hashString(prompt)}:${hashString(categoryKey)}`;
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
