/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PromptVault AI proxy — wiring only. Behaviour lives in the modules this
 * imports, so each piece is unit-testable on its own.
 */

import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { DIST_DIR, IS_PRODUCTION, PORT, TRUST_PROXY_HOPS, validateConfig } from './config.ts';
import { apiNotFound, errorHandler } from './middleware/errors.ts';
import { cors } from './middleware/cors.ts';
import { requestLogger } from './middleware/logging.ts';
import { createRateLimiter } from './middleware/rateLimit.ts';
import { securityHeaders } from './middleware/security.ts';
import { createApiRouter } from './routes.ts';

validateConfig();

const app = express();
const rateLimiter = createRateLimiter();

// Without this, `req.ip` behind a reverse proxy is the proxy's own address, so
// every user shares a single rate-limit bucket. Must be set before any
// middleware reads `req.ip`.
app.set('trust proxy', TRUST_PROXY_HOPS);
app.disable('x-powered-by');

app.use(compression());
app.use(securityHeaders);
// CORS runs before the body parser so a preflight never pays to parse a body.
app.use(cors);
app.use(requestLogger);
app.use(express.json({ limit: '1mb' }));

app.use('/api', rateLimiter.middleware, createApiRouter());
// Before the SPA fallback, so an unknown API route returns JSON, not index.html.
app.all('/api/*', apiNotFound);

if (IS_PRODUCTION) {
  // Content-hashed bundles — safe to cache forever.
  app.use(
    '/assets',
    express.static(path.join(DIST_DIR, 'assets'), { maxAge: '1y', immutable: true })
  );

  app.use(
    express.static(DIST_DIR, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        // index.html must never be cached, or users get a stale shell pointing at
        // asset hashes that no longer exist.
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(svg|png|ico|json|webmanifest)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
      },
    })
  );

  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });

  console.log(`[ai-proxy] Serving static frontend from ${DIST_DIR}`);
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'promptvault-ai-proxy' });
  });
}

// Must be last: Express identifies error middleware by arity, and only handlers
// registered after a route can catch its errors.
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(
    `[ai-proxy] listening on http://localhost:${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`
  );
});

// ---------------------------------------------------------------------------
// Process lifecycle
// ---------------------------------------------------------------------------

let shuttingDown = false;

function shutdown(signal: string): void {
  // SIGTERM immediately followed by SIGINT used to run this twice and arm two
  // independent force-exit timers, so the second could kill the process while
  // the first was still draining connections cleanly.
  if (shuttingDown) {
    console.log(`[ai-proxy] ${signal} received while already shutting down; ignoring.`);
    return;
  }
  shuttingDown = true;

  console.log(`\n[ai-proxy] ${signal} received, shutting down gracefully...`);
  rateLimiter.stop();

  const forceExit = setTimeout(() => {
    console.error('[ai-proxy] Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10_000);

  server.close((error) => {
    clearTimeout(forceExit);
    if (error) {
      console.error('[ai-proxy] Error while closing server:', error);
      process.exit(1);
    }
    console.log('[ai-proxy] Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A rejected promise nobody awaited previously vanished without trace, taking
// the reason for a stalled request with it.
process.on('unhandledRejection', (reason) => {
  console.error('[ai-proxy] Unhandled promise rejection:', reason);
});

// An uncaught exception leaves the process in an undefined state. Log it, then
// let the shutdown path drain in-flight requests rather than continuing to serve
// from a broken process — the supervisor restarts us clean.
process.on('uncaughtException', (error) => {
  console.error('[ai-proxy] Uncaught exception:', error);
  shutdown('uncaughtException');
});
