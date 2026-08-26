/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Turn whatever a model actually returned into the exact shape the client
 * expects. Everything here treats its input as hostile: a model is free to
 * return the wrong type, a missing field, or a nested object where a string was
 * asked for, and none of that may reach the browser.
 */

import type { AnalyzeResult, ImproveResult } from './types.ts';

const VALID_LABELS = ['EXCELLENT', 'GOOD', 'CONSIDER IMPROVING'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Coerce a model-supplied array to `string[]`.
 *
 * The previous implementation was `Array.isArray(x) ? x.filter(Boolean) : []`,
 * which passes non-strings straight through. When a model returned
 * `weakSpots: [{ gap: "…" }]` — a common and perfectly reasonable-looking
 * deviation — the object reached React's children and threw "Objects are not
 * valid as a React child", taking down the widget. Dropping the item shows an
 * incomplete list; letting it through shows nothing at all.
 */
function toStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed) result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

export function normalizeAnalyzeResponse(data: unknown, categories: string[]): AnalyzeResult {
  const record = asRecord(data);

  const rawScore = Number(record['qualityScore']);
  const qualityScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10))
    : 0;

  const rawLabel = asTrimmedString(record['scoreLabel']).toUpperCase();
  const scoreLabel = (VALID_LABELS as readonly string[]).includes(rawLabel)
    ? rawLabel
    : qualityScore >= 9
      ? 'EXCELLENT'
      : qualityScore >= 7
        ? 'GOOD'
        : 'CONSIDER IMPROVING';

  const confidence = asTrimmedString(record['confidence']).toUpperCase() === 'MEDIUM' ? 'MEDIUM' : 'HIGH';
  const title = asTrimmedString(record['title']);

  return {
    qualityScore,
    scoreLabel,
    weakSpots: toStringArray(record['weakSpots'], 5),
    improvements: toStringArray(record['improvements'], 10),
    confidence,
    confidenceNote: asTrimmedString(record['confidenceNote']),
    title: title || 'Untitled Prompt',
    category: pickCategory(asTrimmedString(record['category']), categories),
    tags: toStringArray(record['tags'], 8),
  };
}

export function normalizeImproveResponse(data: unknown): ImproveResult {
  const record = asRecord(data);
  return {
    improvedPrompt: asTrimmedString(record['improvedPrompt']),
    improvementsMade: toStringArray(record['improvementsMade'], 20),
  };
}

/**
 * Map the model's chosen category onto one the vault actually has, since the
 * client uses this value to file the prompt. Falls back to a literal "General"
 * only when no category list was supplied at all.
 */
export function pickCategory(candidate: string, categories: string[]): string {
  if (categories.length === 0) return 'General';

  const normalized = candidate.toLowerCase();
  const exact = categories.find((category) => category.toLowerCase() === normalized);
  if (exact !== undefined) return exact;

  const general = categories.find((category) => category.toLowerCase() === 'general');
  if (general !== undefined) return general;

  // Unreachable given the length guard above; keeps the return type `string`.
  return categories[0] ?? 'General';
}
