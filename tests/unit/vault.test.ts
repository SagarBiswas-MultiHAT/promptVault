import { describe, expect, it, vi } from 'vitest';

import {formatTimestamp} from '../../src/utils/vault.ts';

describe('formatTimestamp', () => {
  it('formats recent sync times relatively', () => {
    vi.setSystemTime(new Date('2026-08-27T12:00:00Z'));
    expect(formatTimestamp(new Date('2026-08-27T11:58:00Z').getTime())).toBe('2 minutes ago');
    expect(formatTimestamp(new Date('2026-08-28T12:00:00Z').getTime())).toBe('tomorrow');
    expect(formatTimestamp(null)).toBe('Never');
    vi.useRealTimers();
  });
});
