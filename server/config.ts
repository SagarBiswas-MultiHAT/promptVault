/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Every tunable in one place, resolved once at import time.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Deliberately NOT `{ override: true }`.
 *
 * With `override`, a stray or stale `.env` left in the deploy image beats the
 * real platform environment variables — exactly backwards for production, where
 * the host is the source of truth. Precedence is now:
 *
 *   process environment  >  .env file  >  the defaults in this module
 *
 * `quiet` suppresses dotenv's promotional startup banner, which otherwise
 * prefixes every boot — including every CI run — with tips.
 */
dotenv.config({ quiet: true });

const serverDir = path.dirname(fileURLToPath(import.meta.url));

/** Repository root — the parent of `server/`. */
export const ROOT_DIR = path.resolve(serverDir, '..');
/** Where `vite build` puts the client bundle. */
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Parse a numeric env var, falling back when it is absent, blank, or not a
 * finite non-negative number. `Number('')` is `0`, so the blank check matters.
 */
function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Read the real version from package.json instead of hardcoding one that drifts. */
function readPackageVersion(): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    if (typeof parsed === 'object' && parsed !== null) {
      const { version } = parsed as { version?: unknown };
      if (typeof version === 'string' && version) return version;
    }
  } catch {
    // An unreadable package.json must never stop the server from booting.
  }
  return '0.0.0';
}

export const VERSION = readPackageVersion();

// --- Providers -------------------------------------------------------------

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
export const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Upstream request deadlines. Without these a hung connection to the primary
 * provider means the fallback never fires and the request hangs until the
 * client gives up — which silently defeats the whole point of having two
 * providers.
 */
export const GEMINI_TIMEOUT_MS = num(process.env.GEMINI_TIMEOUT_MS, 20_000);
export const GROQ_TIMEOUT_MS = num(process.env.GROQ_TIMEOUT_MS, 20_000);

/**
 * Generation budget. Reasoning-capable models spend tokens on thoughts that are
 * billed as output, so a tight budget can truncate a JSON response mid-object.
 * Truncation is detected explicitly (see `providers/gemini.ts`) rather than
 * being left to fail as a parse error.
 */
export const MAX_OUTPUT_TOKENS = num(process.env.MAX_OUTPUT_TOKENS, 8_192);

/** Both providers share this so the two upstreams behave comparably. */
export const TEMPERATURE = 0.3;

// --- Server ----------------------------------------------------------------

export const PORT = num(process.env.AI_PROXY_PORT ?? process.env.PORT, 3002);

/**
 * Number of trusted reverse proxies in front of this server.
 *
 * Behind Render / Railway / Fly / Cloudflare, `req.ip` without this is the
 * *proxy's* address, so every user shares one rate-limit bucket — an effective
 * 30 req/min cap for the entire deployment, and a trivial one-client DoS.
 * Raise it if you add another hop; keep it exact, since over-trusting lets a
 * client spoof `X-Forwarded-For` and escape its own bucket.
 */
export const TRUST_PROXY_HOPS = num(process.env.TRUST_PROXY_HOPS, IS_PRODUCTION ? 1 : 0);

export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// --- Cache -----------------------------------------------------------------

export const CACHE_TTL_MS = 1000 * 60 * 30;
export const MAX_CACHE_ENTRIES = 200;

// --- Request limits --------------------------------------------------------

export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 10_000;

/**
 * `MAX_PROMPT_LENGTH` used to be the only input cap, leaving `categories`
 * unbounded — a client could post thousands of category strings that get joined
 * straight into the upstream prompt, amplifying cost against *our* API quota.
 */
export const MAX_CATEGORIES = 64;
export const MAX_CATEGORIES_TOTAL_LENGTH = 2_000;

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 30;

// --- Startup validation ----------------------------------------------------

/**
 * Fail fast on configurations that are unsafe in production, rather than
 * booting into a subtly broken state. Only exits in production; development
 * gets warnings so the app stays easy to run without keys.
 */
export function validateConfig(): void {
  const fatal: string[] = [];

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    const message = 'No API keys configured. Set GEMINI_API_KEY or GROQ_API_KEY in your .env file.';
    if (IS_PRODUCTION) fatal.push(message);
    else console.error(`[ai-proxy] ⚠  ${message} The AI Librarian will not work.`);
  }

  // Previously an empty allowlist fell back to `Access-Control-Allow-Origin: *`
  // in production, which is the opposite of what an empty allowlist implies.
  // Refusing to start matches the existing "refuse without API keys" precedent.
  if (IS_PRODUCTION && ALLOWED_ORIGINS.length === 0) {
    fatal.push(
      'ALLOWED_ORIGINS is empty. Set an explicit comma-separated origin allowlist; ' +
        'the server will not fall back to "Access-Control-Allow-Origin: *" in production.'
    );
  }

  if (fatal.length > 0) {
    for (const message of fatal) console.error(`[ai-proxy] ✖  ${message}`);
    console.error('[ai-proxy] Refusing to start in production with the configuration above.');
    process.exit(1);
  }
}
