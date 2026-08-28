/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The suggestion pipeline: cache → provider chain → parse (with one repair
 * retry) → normalize.
 */

import { CACHE_TTL_MS, GEMINI_API_KEYS, HAS_GEMINI, GROQ_API_KEY, MAX_CACHE_ENTRIES } from './config.ts';
import { createResponseCache, hashKey } from './cache.ts';
import { HttpError, ProviderError, UpstreamError } from './errors.ts';
import { extractJson } from './json.ts';
import { normalizeAnalyzeResponse, normalizeImproveResponse } from './normalize.ts';
import { buildAnalyzePrompt } from './prompts/analyze.ts';
import { buildImprovePrompt } from './prompts/improve.ts';
import { ANALYZE_SCHEMA, IMPROVE_SCHEMA, REPAIR_NOTICE } from './prompts/shared.ts';
import { GEMINI, requestGemini } from './providers/gemini.ts';
import { GROQ, requestGroq } from './providers/groq.ts';
import type { Mode, SuggestionResult } from './types.ts';

const cache = createResponseCache<SuggestionResult>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: MAX_CACHE_ENTRIES,
});

export interface ProviderStatus {
  configured: boolean;
  lastFailure: { at: string; kind: FailureKind; status: number | null } | null;
}

type FailureKind =
  | 'timeout'
  | 'network'
  | 'auth'
  | 'rate_limited'
  | 'bad_request'
  | 'upstream_error'
  | 'truncated'
  | 'empty_response'
  | 'blocked'
  | 'unknown';

/**
 * Classify a provider failure into a fixed vocabulary.
 *
 * `/api/health` is unauthenticated and served publicly in production, so it must
 * not echo raw upstream error bodies — those contain provider-internal detail and
 * whatever else the upstream chose to put in a 400. A closed set of reasons is
 * just as useful for diagnosing a degraded provider and leaks nothing. The full
 * message still goes to the logs.
 */
function classify(error: unknown): { kind: FailureKind; status: number | null } {
  if (!(error instanceof ProviderError)) return { kind: 'unknown', status: null };

  const status = error.status ?? null;
  const message = error.message;

  if (message.includes('timed out')) return { kind: 'timeout', status };
  if (message.startsWith('network error')) return { kind: 'network', status };
  if (message.includes('truncated')) return { kind: 'truncated', status };
  if (message.includes('blocked')) return { kind: 'blocked', status };
  if (message.includes('empty response')) return { kind: 'empty_response', status };

  // Gemini reports a bad key as 400/API_KEY_INVALID rather than 401, so a status
  // check alone would file the single most likely misconfiguration under
  // "bad_request" and send the operator hunting through request shapes.
  if (/API_KEY_INVALID|API key not valid|invalid_api_key|Incorrect API key/i.test(message)) {
    return { kind: 'auth', status };
  }

  if (status === 401 || status === 403) return { kind: 'auth', status };
  if (status === 429) return { kind: 'rate_limited', status };
  if (status !== null && status >= 500) return { kind: 'upstream_error', status };
  if (status !== null && status >= 400) return { kind: 'bad_request', status };

  return { kind: 'unknown', status };
}

const lastFailures = new Map<string, { at: string; kind: FailureKind; status: number | null }>();

/**
 * Circuit-breaker state for rate-limited providers / Gemini key slots.
 *
 * When a provider returns HTTP 429 the API response often includes a
 * "retry in N seconds" hint. We honour that hint by refusing to call the
 * slot again until the deadline passes, avoiding a stream of instant
 * 429 round-trips that burn quota on every incoming request.
 *
 * For the Gemini key pool each slot is keyed as "gemini[0]", "gemini[1]", …
 * so that independent keys have independent cooldowns.
 */
const rateLimitedUntil = new Map<string, number>(); // slot → epoch ms

/** Extract the "retry in X seconds" value from a Gemini 429 body, if present. */
function parseRetryAfterSeconds(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? parseFloat(match[1]!) : null;
}

/** True when `slot` is currently in its rate-limit cooldown window. */
function isRateLimited(slot: string): boolean {
  const until = rateLimitedUntil.get(slot);
  if (until === undefined) return false;
  if (Date.now() < until) return true;
  rateLimitedUntil.delete(slot); // cooldown expired — reset
  return false;
}

/**
 * Record a rate-limit cooldown for `slot`.
 *
 * Falls back to a 60-second window when the error body does not carry an
 * explicit retry-after hint — the free-tier window is always ≤ 60 s so
 * this is a safe upper bound.
 */
function markRateLimited(slot: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const retrySecs = parseRetryAfterSeconds(message) ?? 60;
  const until = Date.now() + retrySecs * 1_000;
  rateLimitedUntil.set(slot, until);
  console.warn(
    `[ai-proxy] ${slot} rate-limited; skipping for ${Math.ceil(retrySecs)}s ` +
      `(until ${new Date(until).toISOString()})`
  );
}

/**
 * Snapshot for `/api/health`. Reporting the last failure per provider/slot is
 * what makes a degraded primary provider visible — otherwise a permanently
 * broken Gemini key looks perfectly healthy because Groq keeps answering.
 */
export function getProviderStatus(): Record<string, ProviderStatus> {
  const result: Record<string, ProviderStatus> = {};

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const slot = geminiSlot(i);
    result[slot] = { configured: true, lastFailure: lastFailures.get(slot) ?? null };
  }
  if (!HAS_GEMINI) {
    result[GEMINI] = { configured: false, lastFailure: null };
  }

  result[GROQ] = { configured: Boolean(GROQ_API_KEY), lastFailure: lastFailures.get(GROQ) ?? null };
  return result;
}

/** Stable label for a Gemini key slot used in logs and health status. */
function geminiSlot(index: number): string {
  return GEMINI_API_KEYS.length === 1 ? GEMINI : `${GEMINI}[${index}]`;
}

export function getCacheStats(): { entries: number; pending: number } {
  return { entries: cache.size, pending: cache.pending };
}

function recordFailure(provider: string, error: unknown): void {
  const { kind, status } = classify(error);
  lastFailures.set(provider, { at: new Date().toISOString(), kind, status });
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[ai-proxy] ${provider} failed (${kind}): ${message}`);
}

interface ProviderOutcome {
  provider: string;
  rawText: string;
}

/**
 * Try each Gemini key in order, then Groq.
 *
 * Per-key circuit breakers ("gemini[0]", "gemini[1]", …) mean a rate-limited
 * key is skipped instantly — no network round-trip — while keys that still
 * have quota continue to serve requests. Only when every Gemini key is
 * exhausted does the chain fall through to Groq.
 */
async function callProviders(promptText: string, schema: unknown): Promise<ProviderOutcome> {
  const failures: string[] = [];

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const slot = geminiSlot(i);
    const apiKey = GEMINI_API_KEYS[i]!;

    if (isRateLimited(slot)) {
      const until = rateLimitedUntil.get(slot)!;
      const remainingSecs = Math.ceil((until - Date.now()) / 1_000);
      console.info(`[ai-proxy] ${slot} still rate-limited; skipping (${remainingSecs}s remaining)`);
      failures.push(`${slot}: rate-limited (cooldown active)`);
      continue;
    }

    try {
      return { provider: slot, rawText: await requestGemini(promptText, schema, apiKey) };
    } catch (error) {
      if (error instanceof ProviderError) {
        if (error.status === 429) {
          // Honour the retry-after hint from the 429 body.
          markRateLimited(slot, error);
        } else if (
          error.message.includes('timed out') ||
          (error.status != null && error.status >= 500)
        ) {
          // Timeout or upstream 5xx: back off for 60 s so we don't repeatedly
          // spend the full GEMINI_TIMEOUT_MS on a key that is clearly unhealthy.
          rateLimitedUntil.set(slot, Date.now() + 60_000);
          console.warn(`[ai-proxy] ${slot} unhealthy (${error.message.includes('timed out') ? 'timeout' : `HTTP ${error.status}`}); backing off 60s`);
        }
      }
      recordFailure(slot, error);
      failures.push(describe(slot, error));
    }
  }

  if (GROQ_API_KEY) {
    try {
      return { provider: GROQ, rawText: await requestGroq(promptText) };
    } catch (error) {
      recordFailure(GROQ, error);
      failures.push(describe(GROQ, error));
    }
  }

  if (failures.length === 0) {
    // 503, not 502: nothing upstream was even attempted, and the fix is
    // configuration on our side.
    throw new HttpError(503, 'The AI service is not configured on this server.');
  }

  throw new UpstreamError(
    'Every AI provider failed. Check API keys, quota, and network connectivity.',
    { cause: new Error(failures.join(' | ')) }
  );
}

function describe(provider: string, error: unknown): string {
  if (error instanceof ProviderError) return `${provider}: ${error.message}`;
  return `${provider}: ${error instanceof Error ? error.message : String(error)}`;
}

export async function generateSuggestion(input: {
  prompt: string;
  categories: string[];
  mode: Mode;
}): Promise<SuggestionResult> {
  const { prompt, mode } = input;
  const categories = input.categories.map((category) => category.trim()).filter(Boolean);

  const cacheKey = hashKey(mode, prompt, categories.join('|').toLowerCase());
  return cache.resolve(cacheKey, () => produce(prompt, categories, mode));
}

async function produce(prompt: string, categories: string[], mode: Mode): Promise<SuggestionResult> {
  const promptText =
    mode === 'improve' ? buildImprovePrompt(prompt, categories) : buildAnalyzePrompt(prompt, categories);
  const schema = mode === 'improve' ? IMPROVE_SCHEMA : ANALYZE_SCHEMA;

  const first = await callProviders(promptText, schema);

  let outcome = first;
  let parsed: unknown;
  try {
    parsed = extractJson(first.rawText);
  } catch (firstError) {
    // One repair retry. JSON mode makes unparsable output rare, but "rare" is
    // not "never" — and a single terse retry is far cheaper than surfacing an
    // error to the user for something the model can usually fix on request.
    console.warn(`[ai-proxy] ${first.provider} returned unparsable JSON; retrying once.`);
    const retry = await callProviders(`${promptText}\n\n${REPAIR_NOTICE}`, schema);
    try {
      parsed = extractJson(retry.rawText);
      outcome = retry;
    } catch (retryError) {
      throw new UpstreamError('The AI provider did not return valid JSON.', {
        cause: new AggregateError([firstError, retryError], 'JSON extraction failed twice'),
      });
    }
  }

  if (mode === 'improve') {
    const improved = normalizeImproveResponse(parsed);
    // Previously this returned 200 with an empty string and the widget rendered
    // nothing at all, with no error — the worst kind of failure.
    if (!improved.improvedPrompt) {
      throw new UpstreamError('The AI provider returned an empty improved prompt.');
    }
    return { ...improved, provider: outcome.provider };
  }

  return { ...normalizeAnalyzeResponse(parsed, categories), provider: outcome.provider };
}
