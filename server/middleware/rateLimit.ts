/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RequestHandler } from 'express';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '../config.ts';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  middleware: RequestHandler;
  /** Stop the cleanup timer. Called on shutdown. */
  stop(): void;
  /** Number of buckets currently tracked. */
  readonly size: number;
}

export function createRateLimiter(
  options: { windowMs: number; max: number } = { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }
): RateLimiter {
  const { windowMs, max } = options;
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, windowMs);

  // Housekeeping for an in-memory map must not be a reason the process refuses
  // to exit. Without this, the interval keeps the event loop alive and the
  // graceful-shutdown path always fell through to the force-exit timer.
  sweep.unref();

  const middleware: RequestHandler = (req, res, next) => {
    // Correct only because `trust proxy` is configured — see TRUST_PROXY_HOPS.
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      // Tell the client exactly how long to wait instead of making it guess.
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
      return;
    }

    next();
  };

  return {
    middleware,
    stop() {
      clearInterval(sweep);
    },
    get size() {
      return buckets.size;
    },
  };
}
