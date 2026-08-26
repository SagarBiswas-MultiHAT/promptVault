import { describe, expect, it, vi } from 'vitest';
import { createResponseCache, hashKey } from '../../server/cache.ts';

describe('hashKey', () => {
  it('is stable for the same input', () => {
    expect(hashKey('analyze', 'hello')).toBe(hashKey('analyze', 'hello'));
  });

  it('produces a full sha256 digest, not a 32-bit hash', () => {
    // The previous djb2-xor hash was 32 bits, where a collision means serving
    // another user's cached result for a different prompt.
    expect(hashKey('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cannot be confused by shifting a boundary between parts', () => {
    // Length-prefixing is what prevents ('ab','c') and ('a','bc') colliding.
    expect(hashKey('ab', 'c')).not.toBe(hashKey('a', 'bc'));
  });

  it('distinguishes mode, prompt, and categories', () => {
    expect(hashKey('analyze', 'p', 'c')).not.toBe(hashKey('improve', 'p', 'c'));
    expect(hashKey('analyze', 'p', 'c')).not.toBe(hashKey('analyze', 'p', 'd'));
  });
});

describe('createResponseCache', () => {
  it('returns the cached value without calling produce again', async () => {
    const cache = createResponseCache<number>({ ttlMs: 1000, maxEntries: 10 });
    const produce = vi.fn(async () => 1);

    expect(await cache.resolve('k', produce)).toBe(1);
    expect(await cache.resolve('k', produce)).toBe(1);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('re-runs produce once the TTL has elapsed', async () => {
    vi.useFakeTimers();
    try {
      const cache = createResponseCache<number>({ ttlMs: 1000, maxEntries: 10 });
      let next = 1;
      const produce = vi.fn(async () => next++);

      expect(await cache.resolve('k', produce)).toBe(1);
      vi.advanceTimersByTime(1001);
      expect(await cache.resolve('k', produce)).toBe(2);
      expect(produce).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * The behaviour the old cache got backwards. It evicted `keys().next()` without
   * ever re-ordering on read, which is FIFO — so a key being hit constantly was
   * evicted before a key written once and never touched again.
   */
  it('evicts the least recently USED entry, not the oldest written', async () => {
    const cache = createResponseCache<string>({ ttlMs: 60_000, maxEntries: 2 });

    await cache.resolve('a', async () => 'a');
    await cache.resolve('b', async () => 'b');

    // Touch 'a' so 'b' becomes the least recently used.
    await cache.resolve('a', async () => 'recomputed');

    await cache.resolve('c', async () => 'c');
    expect(cache.size).toBe(2);

    // 'a' must have survived; 'b' must have been evicted.
    const aProduce = vi.fn(async () => 'recomputed');
    await cache.resolve('a', aProduce);
    expect(aProduce).not.toHaveBeenCalled();

    const bProduce = vi.fn(async () => 'b again');
    await cache.resolve('b', bProduce);
    expect(bProduce).toHaveBeenCalledTimes(1);
  });

  it('does not evict when overwriting a key that is already present', async () => {
    const cache = createResponseCache<string>({ ttlMs: 60_000, maxEntries: 2 });
    await cache.resolve('a', async () => 'a');
    await cache.resolve('b', async () => 'b');
    await cache.resolve('a', async () => 'a');
    expect(cache.size).toBe(2);
  });

  it('coalesces concurrent calls for the same key into one upstream call', async () => {
    const cache = createResponseCache<number>({ ttlMs: 1000, maxEntries: 10 });
    let resolveProduce: ((value: number) => void) | undefined;
    const produce = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveProduce = resolve;
        })
    );

    const all = Promise.all([
      cache.resolve('k', produce),
      cache.resolve('k', produce),
      cache.resolve('k', produce),
    ]);

    expect(produce).toHaveBeenCalledTimes(1);
    expect(cache.pending).toBe(1);

    resolveProduce?.(7);
    expect(await all).toEqual([7, 7, 7]);
    expect(produce).toHaveBeenCalledTimes(1);
    expect(cache.pending).toBe(0);
  });

  it('does not coalesce across different keys', async () => {
    const cache = createResponseCache<string>({ ttlMs: 1000, maxEntries: 10 });
    const produce = vi.fn(async () => 'v');
    await Promise.all([cache.resolve('a', produce), cache.resolve('b', produce)]);
    expect(produce).toHaveBeenCalledTimes(2);
  });

  it('never caches a failure, and rejects every coalesced caller', async () => {
    const cache = createResponseCache<number>({ ttlMs: 1000, maxEntries: 10 });
    const failing = vi.fn(async () => {
      throw new Error('upstream down');
    });

    const results = await Promise.allSettled([cache.resolve('k', failing), cache.resolve('k', failing)]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
    expect(cache.pending).toBe(0);

    // A later caller gets a fresh attempt rather than a cached error.
    expect(await cache.resolve('k', async () => 5)).toBe(5);
  });

  it('propagates a synchronous throw from produce without leaking a pending slot', async () => {
    const cache = createResponseCache<number>({ ttlMs: 1000, maxEntries: 10 });
    await expect(
      cache.resolve('k', () => {
        throw new Error('sync boom');
      })
    ).rejects.toThrow('sync boom');
    expect(cache.pending).toBe(0);
  });
});
