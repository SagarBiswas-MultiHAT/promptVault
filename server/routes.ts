/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import {
  GEMINI_MODEL,
  GROQ_MODEL,
  MAX_CATEGORIES,
  MAX_CATEGORIES_TOTAL_LENGTH,
  MAX_PROMPT_LENGTH,
  MIN_PROMPT_LENGTH,
  VERSION,
} from './config.ts';
import { HttpError } from './errors.ts';
import { isStructuredOutputEnabled } from './providers/gemini.ts';
import { getCacheStats, getProviderStatus, generateSuggestion } from './suggest.ts';
import type { Mode } from './types.ts';

/**
 * Validate and clamp the request body.
 *
 * @throws HttpError with a 400 for anything a client can fix itself.
 */
function parseSuggestBody(body: unknown): { prompt: string; categories: string[]; mode: Mode } {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const rawPrompt = record['prompt'];
  if (typeof rawPrompt !== 'string') {
    throw new HttpError(400, 'Prompt is required.');
  }

  // Validate the *trimmed* value. Length used to be checked before trimming, so
  // "     " passed validation and was sent upstream as an empty prompt — we paid
  // for a request guaranteed to produce nonsense.
  const prompt = rawPrompt.trim();
  if (prompt.length < MIN_PROMPT_LENGTH) {
    throw new HttpError(400, `Prompt must be at least ${MIN_PROMPT_LENGTH} characters.`);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new HttpError(400, `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.`);
  }

  // `categories` was entirely unbounded while `prompt` was capped. Since the list
  // is joined straight into the upstream prompt, a client could inflate one
  // request into a very expensive one against our own API quota.
  const rawCategories = Array.isArray(record['categories']) ? (record['categories'] as unknown[]) : [];
  const categories: string[] = [];
  let totalLength = 0;
  for (const item of rawCategories) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (totalLength + trimmed.length > MAX_CATEGORIES_TOTAL_LENGTH) break;
    categories.push(trimmed);
    totalLength += trimmed.length;
    if (categories.length >= MAX_CATEGORIES) break;
  }

  return { prompt, categories, mode: record['mode'] === 'improve' ? 'improve' : 'analyze' };
}

export function createApiRouter(): Router {
  const router = Router();

  router.post('/suggest', async (req, res, next) => {
    try {
      res.json(await generateSuggestion(parseSuggestBody(req.body)));
    } catch (error) {
      // Hand every failure to the error middleware, which owns status mapping.
      // Provider failures surface as 502/503 rather than the previous blanket
      // 500, so a client can tell "upstream is down" from "this server is broken".
      next(error);
    }
  });

  router.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      cache: getCacheStats(),
      models: { gemini: GEMINI_MODEL, groq: GROQ_MODEL },
      geminiStructuredOutput: isStructuredOutputEnabled(),
      providers: getProviderStatus(),
    });
  });

  return router;
}
