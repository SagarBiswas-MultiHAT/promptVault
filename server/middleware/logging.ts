/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Log API requests once the response is done.
 *
 * The previous version logged on the way *in*, so it recorded no status and no
 * duration — it could tell you a request arrived but never whether it succeeded,
 * failed, or how slow the upstream was. Those are the only two things worth
 * logging about a proxy.
 *
 * Also stamps a request id on the response so a user-visible error can be traced
 * to a log line.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }

  const requestId = randomUUID().slice(0, 8);
  res.locals['requestId'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Capture the path now, not in the `finish` callback. Express rewrites
  // `req.url`/`req.path` while a request is inside a mounted router, so reading
  // it at finish time logged `/health` for a request to `/api/health` — the
  // prefix the router had already stripped.
  const { method, originalUrl } = req;

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(
      `[ai-proxy] ${requestId} ${method} ${originalUrl} → ${res.statusCode} in ${durationMs.toFixed(0)}ms`
    );
  });

  next();
};
