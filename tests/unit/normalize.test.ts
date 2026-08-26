import { describe, expect, it } from 'vitest';
import {
  normalizeAnalyzeResponse,
  normalizeImproveResponse,
  pickCategory,
} from '../../server/normalize.ts';

const CATEGORIES = ['Writing', 'Coding', 'General'];

describe('normalizeAnalyzeResponse', () => {
  it('passes a well-formed response through', () => {
    const result = normalizeAnalyzeResponse(
      {
        qualityScore: 7.5,
        scoreLabel: 'GOOD',
        weakSpots: ['no role'],
        improvements: ['add a role'],
        confidence: 'HIGH',
        confidenceNote: '',
        title: 'Summarise text',
        category: 'Writing',
        tags: ['summary', 'text'],
      },
      CATEGORIES
    );

    expect(result).toEqual({
      qualityScore: 7.5,
      scoreLabel: 'GOOD',
      weakSpots: ['no role'],
      improvements: ['add a role'],
      confidence: 'HIGH',
      confidenceNote: '',
      title: 'Summarise text',
      category: 'Writing',
      tags: ['summary', 'text'],
    });
  });

  /**
   * The bug this file exists for. `weakSpots: [{gap: "…"}]` is a plausible model
   * deviation, and the old `.filter(Boolean)` let the object through to React,
   * which threw "Objects are not valid as a React child" and killed the widget.
   */
  it('drops non-string array items instead of letting them reach React', () => {
    const result = normalizeAnalyzeResponse(
      {
        weakSpots: [{ gap: 'missing role' }, 'real string', null, 42, ['nested']],
        improvements: [{ suggestion: 'add a role' }],
        tags: [{ name: 'x' }, 'valid'],
      },
      CATEGORIES
    );

    expect(result.weakSpots).toEqual(['real string']);
    expect(result.improvements).toEqual([]);
    expect(result.tags).toEqual(['valid']);
  });

  it('drops whitespace-only array items', () => {
    const result = normalizeAnalyzeResponse({ weakSpots: ['  ', '\n', 'kept'] }, CATEGORIES);
    expect(result.weakSpots).toEqual(['kept']);
  });

  it('caps weakSpots at 5 and tags at 8', () => {
    const result = normalizeAnalyzeResponse(
      {
        weakSpots: Array.from({ length: 20 }, (_, i) => `spot ${i}`),
        tags: Array.from({ length: 20 }, (_, i) => `tag ${i}`),
      },
      CATEGORIES
    );

    expect(result.weakSpots).toHaveLength(5);
    expect(result.tags).toHaveLength(8);
  });

  it('coerces a non-numeric score to 0 and clamps out-of-range scores', () => {
    expect(normalizeAnalyzeResponse({ qualityScore: 'abc' }, CATEGORIES).qualityScore).toBe(0);
    expect(normalizeAnalyzeResponse({ qualityScore: 99 }, CATEGORIES).qualityScore).toBe(10);
    expect(normalizeAnalyzeResponse({ qualityScore: -5 }, CATEGORIES).qualityScore).toBe(0);
    expect(normalizeAnalyzeResponse({ qualityScore: 7.44 }, CATEGORIES).qualityScore).toBe(7.4);
  });

  it('derives a missing label from the score', () => {
    expect(normalizeAnalyzeResponse({ qualityScore: 9.5 }, CATEGORIES).scoreLabel).toBe('EXCELLENT');
    expect(normalizeAnalyzeResponse({ qualityScore: 7 }, CATEGORIES).scoreLabel).toBe('GOOD');
    expect(normalizeAnalyzeResponse({ qualityScore: 3 }, CATEGORIES).scoreLabel).toBe('CONSIDER IMPROVING');
  });

  it('rejects an invented label but accepts a lowercase valid one', () => {
    expect(normalizeAnalyzeResponse({ qualityScore: 9.9, scoreLabel: 'AMAZING' }, CATEGORIES).scoreLabel).toBe(
      'EXCELLENT'
    );
    expect(normalizeAnalyzeResponse({ scoreLabel: 'good' }, CATEGORIES).scoreLabel).toBe('GOOD');
  });

  it('defaults confidence to HIGH for anything but MEDIUM', () => {
    expect(normalizeAnalyzeResponse({ confidence: 'medium' }, CATEGORIES).confidence).toBe('MEDIUM');
    expect(normalizeAnalyzeResponse({ confidence: 'LOW' }, CATEGORIES).confidence).toBe('HIGH');
    expect(normalizeAnalyzeResponse({ confidence: null }, CATEGORIES).confidence).toBe('HIGH');
  });

  it('survives null, a string, and an array as the whole response', () => {
    for (const hostile of [null, undefined, 'nope', 42, []]) {
      const result = normalizeAnalyzeResponse(hostile, CATEGORIES);
      expect(result.qualityScore).toBe(0);
      expect(result.title).toBe('Untitled Prompt');
      expect(result.weakSpots).toEqual([]);
    }
  });
});

describe('normalizeImproveResponse', () => {
  it('trims the improved prompt and filters the change list', () => {
    const result = normalizeImproveResponse({
      improvedPrompt: '  rewritten  ',
      improvementsMade: ['added a role', { change: 'nope' }, ''],
    });

    expect(result).toEqual({ improvedPrompt: 'rewritten', improvementsMade: ['added a role'] });
  });

  it('reports an empty prompt as empty so the caller can turn it into a 502', () => {
    expect(normalizeImproveResponse({}).improvedPrompt).toBe('');
    expect(normalizeImproveResponse({ improvedPrompt: '   ' }).improvedPrompt).toBe('');
    expect(normalizeImproveResponse({ improvedPrompt: 42 }).improvedPrompt).toBe('');
  });
});

describe('pickCategory', () => {
  it('matches case-insensitively and returns the vault\'s own casing', () => {
    expect(pickCategory('writing', CATEGORIES)).toBe('Writing');
  });

  it('falls back to General when the model invents a category', () => {
    expect(pickCategory('Astrophysics', CATEGORIES)).toBe('General');
  });

  it('falls back to the first category when there is no General', () => {
    expect(pickCategory('Astrophysics', ['Writing', 'Coding'])).toBe('Writing');
  });

  it('returns a literal General when no categories exist', () => {
    expect(pickCategory('anything', [])).toBe('General');
  });
});
