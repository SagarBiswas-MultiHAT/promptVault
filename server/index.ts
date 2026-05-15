/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PORT = Number(process.env.AI_PROXY_PORT || process.env.PORT || 3002);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];

const CACHE_TTL_MS = 1000 * 60 * 30;
const MAX_CACHE_ENTRIES = 200;
const MAX_PROMPT_LENGTH = 10_000;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window per IP

const responseCache = new Map<string, { expiresAt: number; value: any }>();

type Mode = 'analyze' | 'improve';

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

if (!GEMINI_API_KEY && !GROQ_API_KEY) {
  console.error('[ai-proxy] ⚠  No API keys configured. Set GEMINI_API_KEY or GROQ_API_KEY in your .env file.');
  if (IS_PRODUCTION) {
    console.error('[ai-proxy] Refusing to start in production without API keys.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Gzip / Brotli compression
app.use(compression());

// JSON body parser
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-hashes' 'sha256-1jAmyYXcRq6zFldLe/GCgIDJBiOONdXjTLgEFMDnDSM=' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com https://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://*.analytics.google.com https://cloudflareinsights.com",
      "frame-ancestors 'none'",
    ].join('; '));
  }
  next();
});

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!IS_PRODUCTION || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Request logging
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
  }
  next();
});

// Rate limiting (simple in-memory, per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
    });
  }

  next();
}

// Periodically clean up expired rate-limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS);

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.post('/api/suggest', rateLimiter, async (req, res) => {
  const body = req.body || {};
  const { prompt, categories, mode } = body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.` });
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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    providers: {
      gemini: GEMINI_API_KEY ? 'configured' : 'missing',
      groq: GROQ_API_KEY ? 'configured' : 'missing',
    },
  });
});

// ---------------------------------------------------------------------------
// Production: serve static frontend
// ---------------------------------------------------------------------------

if (IS_PRODUCTION) {
  const distPath = path.resolve(__dirname, '..', 'dist');

  // Hashed assets (JS/CSS with content hashes) — aggressive immutable caching
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));

  // Other static files (logo, manifest, og-image) — moderate caching
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // Never cache index.html — ensures users always get the latest version
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      // Long cache for stable assets that rarely change
      if (/\.(svg|png|ico|json|webmanifest)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    },
  }));

  // SPA fallback — serve index.html for any unmatched route
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log(`[ai-proxy] Serving static frontend from ${distPath}`);
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'promptvault-ai-proxy' });
  });
}

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ai-proxy] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://localhost:${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[ai-proxy] ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('[ai-proxy] Server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[ai-proxy] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Core pipeline — two-step: analyze (score) then improve (rewrite)
// ---------------------------------------------------------------------------

async function generateSuggestion({ prompt, categories, mode }: { prompt: string; categories: string[]; mode: Mode }) {
  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY or GROQ_API_KEY.');
  }

  let rawText = '';
  let provider = '';

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
    : buildAnalyzePrompt(prompt, normalizedCategories);

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
    ? normalizeImproveResponse(parsed)
    : normalizeAnalyzeResponse(parsed, normalizedCategories);
  const result = { ...normalized, provider };
  setCachedResult(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// ANALYZE prompt — Steps 1–3 of the template: Understand, Score, Decide
// Scores the prompt, identifies weak spots, suggests metadata. No rewrite.
// ---------------------------------------------------------------------------

function buildAnalyzePrompt(prompt: string, categories: string[]) {
  const categoryLine = categories.length
    ? `Available categories to choose from: ${categories.join(', ')}.`
    : 'No categories provided — use "General".';

  return [
    'IDENTITY',
    'You are the PromptVault AI Librarian — a world-class prompt engineer and quality analyst.',
    'Your task is to EVALUATE and SCORE the user\'s prompt. Do NOT rewrite or improve the prompt.',
    '',
    'You are precise, direct, and inference-first. You never pad responses.',
    '',
    'YOUR EVALUATION PIPELINE',
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
    'STEP 3 — IDENTIFY GAPS',
    'List specific weak spots and what could be improved (but do NOT write the improved prompt).',
    '',
    'STRICT OUTPUT FORMAT',
    '',
    'You MUST return ONLY valid JSON. No markdown, no explanation, no preamble.',
    'Return this exact JSON structure:',
    '{',
    '  "qualityScore": 7.5,',
    '  "scoreLabel": "GOOD",',
    '  "weakSpots": ["specific gap #1", "specific gap #2"],',
    '  "improvements": ["actionable suggestion for what could be improved"],',
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
    '- weakSpots: array of strings, max 5. Specific gaps in the prompt.',
    '- improvements: array of strings. Actionable suggestions for what could be improved.',
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
// IMPROVE prompt — Full template pipeline: Steps 1–5
// Rewrites the prompt using Fixes A–H and the quality contract.
// ---------------------------------------------------------------------------

function buildImprovePrompt(prompt: string, categories: string[]) {
  const categoryLine = categories.length
    ? `Available categories: ${categories.join(', ')}.`
    : 'Category list is unavailable.';

  return [
    'IDENTITY',
    'You are the PromptVault AI Librarian — a world-class prompt engineer and quality analyst.',
    'Your sole purpose is to rewrite the user\'s prompt into a superior, production-ready version.',
    '',
    'You are precise, direct, and inference-first. You never pad responses.',
    'You never guess wildly. You improve what you can from context.',
    '',
    'YOUR IMPROVEMENT PIPELINE (run every step, in order)',
    '',
    'STEP 1 — UNDERSTAND',
    'Read the user\'s prompt carefully. Identify:',
    '• What is the user ultimately trying to accomplish?',
    '• What AI model/task type is this for?',
    '• What is currently weak, missing, or ambiguous?',
    '',
    'STEP 2 — DECIDE: ASK OR INFER?',
    'If you can infer missing context: do so silently and note the assumption inline.',
    '',
    'STEP 3 — IMPROVE',
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
    'STEP 4 — SELF-CHECK',
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
    'STRICT OUTPUT FORMAT',
    '',
    'You MUST return ONLY valid JSON. No markdown, no explanation, no preamble.',
    'Return this exact JSON structure:',
    '{',
    '  "improvedPrompt": "the full rewritten prompt here",',
    '  "improvementsMade": ["what you added/changed and why — one line each"]',
    '}',
    '',
    'FIELD RULES:',
    '- improvedPrompt: the full rewritten prompt. Immediately usable — paste and run.',
    '- improvementsMade: array of strings. Each describes one specific change and why.',
    '',
    'Replace ALL example values. Do NOT include any text outside the JSON.',
    '',
    categoryLine,
    '',
    'User prompt to improve:',
    '',
    prompt,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Response normalizers
// ---------------------------------------------------------------------------

function normalizeAnalyzeResponse(data: any, categories: string[]) {
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
  const improvements = Array.isArray(data?.improvements) ? data.improvements.filter(Boolean) : [];

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
    improvements,
    confidence,
    confidenceNote,
    title: title || 'Untitled Prompt',
    category: pickCategory(rawCategory, categories),
    tags,
  };
}

function normalizeImproveResponse(data: any) {
  const improvedPrompt = typeof data?.improvedPrompt === 'string' ? data.improvedPrompt.trim() : '';
  const improvementsMade = Array.isArray(data?.improvementsMade) ? data.improvementsMade.filter(Boolean) : [];

  return {
    improvedPrompt,
    improvementsMade,
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
