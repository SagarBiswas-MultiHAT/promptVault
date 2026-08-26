/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../errors.ts';

/**
 * JSON 404 for unmatched `/api/*` routes.
 *
 * Must be registered before the SPA catch-all. Without it, `GET /api/typo`
 * returned `index.html` with a 200 — so a client with a typo'd endpoint got a
 * page of HTML where it expected JSON, and `response.json()` threw a syntax
 * error that looked nothing like "route not found".
 */
export const apiNotFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Unknown API route: ${req.method} ${req.path}` });
};

/** Body-parser and friends attach a `status`/`statusCode` to their errors. */
function statusOf(error: unknown): number {
  if (error instanceof HttpError) return error.status;

  if (typeof error === 'object' && error !== null) {
    const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
    for (const candidate of [status, statusCode]) {
      if (typeof candidate === 'number' && candidate >= 400 && candidate <= 599) return candidate;
    }
  }

  return 500;
}

/**
 * Client-safe message for a given error. `HttpError` messages are written to be
 * shown; everything else gets a generic string so an internal failure cannot leak
 * a stack trace, a file path, or an upstream API response through the browser.
 */
function messageOf(error: unknown, status: number): string {
  if (error instanceof HttpError) return error.message;

  if (typeof error === 'object' && error !== null) {
    const { type } = error as { type?: unknown };
    if (type === 'entity.too.large') return 'Request body is too large.';
    if (type === 'entity.parse.failed') return 'Request body is not valid JSON.';
  }

  return status >= 500 ? 'Internal server error.' : 'Bad request.';
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const status = statusOf(error);

  // A 1mb+ body or malformed JSON reports 413/400 now. Previously every one of
  // these became a 500, which points the reader at the server for what is
  // squarely a client-side mistake.
  if (status >= 500) {
    // Node's inspector already unwraps and prints the `cause` chain.
    console.error('[ai-proxy] Unhandled error:', error);
  } else {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[ai-proxy] ${status}: ${detail}`);
  }

  // Headers already flushed means a stream failed mid-response; there is no
  // valid way to also send a JSON error, so drop the connection.
  if (res.headersSent) {
    res.destroy();
    return;
  }

  res.status(status).json({ error: messageOf(error, status) });
};
