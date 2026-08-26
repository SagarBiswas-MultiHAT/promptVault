/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RequestHandler } from 'express';
import { ALLOWED_ORIGINS, IS_PRODUCTION } from '../config.ts';

/**
 * Resolve the value to echo in `Access-Control-Allow-Origin`, or `null` to send
 * no CORS headers at all.
 */
function resolveOrigin(origin: string | undefined): string | null {
  // Same-origin requests and non-browser clients (curl, health checks) send no
  // Origin header. There is nothing to grant, and the old `origin || '*'`
  // fallback handed out a wildcard for exactly these harmless cases.
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Development convenience only. In production `validateConfig()` guarantees a
  // non-empty allowlist, so this branch cannot widen anything there.
  return IS_PRODUCTION ? null : origin;
}

export const cors: RequestHandler = (req, res, next) => {
  // Always vary on Origin, even when no CORS headers are sent.
  //
  // The response is compressed and may sit behind a CDN. Without this, a cached
  // response carries whichever `Access-Control-Allow-Origin` the first requester
  // happened to get, and serves it to every other origin — either leaking access
  // or denying it at random. `res.vary()` appends rather than overwriting, so it
  // composes with anything else that sets the header.
  res.vary('Origin');

  const allowed = resolveOrigin(req.headers.origin);
  if (allowed !== null) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    // A disallowed origin previously still got a 204, which reads as approval.
    res.sendStatus(allowed === null ? 403 : 204);
    return;
  }

  next();
};
