/**
 * test-api-keys.ts
 *
 * Standalone script to verify every API key in .env is working.
 * Tests all GEMINI_API_KEYS (pool) and GROQ_API_KEY individually using
 * lightweight metadata endpoints (no tokens consumed, no thinking budget).
 *
 * Usage:
 *   npx tsx scripts/test-api-keys.ts          # normal run
 *   npx tsx scripts/test-api-keys.ts --wait   # retry rate-limited keys after 60s cooldown
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// 1. Parse CLI flags & load .env
// ---------------------------------------------------------------------------

const WAIT_MODE = process.argv.includes('--wait');

/**
 * Minimal .env parser — reads key=value pairs, strips quotes, skips comments.
 * Intentionally self-contained: no dependency on dotenv.
 */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const envPath = resolve(process.cwd(), '.env');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  } catch {
    console.error(`\u274c  Could not read .env from ${envPath}`);
    process.exit(1);
  }
  return env;
}

// ---------------------------------------------------------------------------
// 2. Types
// ---------------------------------------------------------------------------

type Status =
  | 'ok'
  | 'auth'
  | 'rate_limited'
  | 'bad_request'
  | 'model_not_found'
  | 'network'
  | 'timeout'
  | 'unknown';

interface KeyResult {
  provider: 'gemini' | 'groq';
  label: string;
  keyPreview: string;
  status: Status;
  latencyMs: number | null;
  httpStatus: number | null;
  detail: string;
}

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------

/** Default 25s — generous enough for slow responses, well under server's 35s. */
const DEFAULT_TIMEOUT_MS = 25_000;

function preview(key: string): string {
  if (key.length <= 14) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function classifyStatus(httpStatus: number | null, body: string): Status {
  // Auth patterns — Gemini reports invalid keys as 400 with API_KEY_INVALID
  if (/API_KEY_INVALID|API key not valid|invalid_api_key|Incorrect API key/i.test(body)) {
    return 'auth';
  }
  if (httpStatus === 401 || httpStatus === 403) return 'auth';
  if (httpStatus === 429)                        return 'rate_limited';
  // Gemini returns 404 when the model is not available to the key's project
  if (httpStatus === 404)                        return 'model_not_found';
  if (httpStatus != null && httpStatus >= 500)   return 'unknown';
  if (httpStatus != null && httpStatus >= 400)   return 'bad_request';
  if (/timed out|timeout|AbortError/i.test(body)) return 'timeout';
  if (/network|ECONNRESET|ENOTFOUND|ECONNREFUSED|fetch failed/i.test(body)) return 'network';
  return 'unknown';
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('AbortError') || msg.includes('TimeoutError')) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function truncate(s: string, maxLen: number): string {
  // Collapse whitespace for cleaner single-line display
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > maxLen ? flat.slice(0, maxLen) + '\u2026' : flat;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 4. Dev server detection
// ---------------------------------------------------------------------------

/**
 * Check if the PromptVault API server is running on the configured port.
 * If it is, its rate-limit usage will contaminate our results.
 */
async function detectDevServer(port: number): Promise<boolean> {
  try {
    const resp = await fetchWithTimeout(
      `http://localhost:${port}/api/health`,
      { method: 'GET' },
      2_000
    );
    return resp.ok || resp.status < 500; // any response = something is listening
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 5. Provider test functions — metadata-only endpoints
// ---------------------------------------------------------------------------

/**
 * Test a Gemini key using the lightweight models.get endpoint.
 *
 * `GET /v1beta/models/{model}` is a metadata-only call: no tokens consumed,
 * no thinking budget, ~200ms response. It surfaces the same auth / quota /
 * access errors as generateContent, making it ideal for key validation.
 */
async function testGeminiKey(
  apiKey: string,
  index: number,
  model: string,
  timeoutMs: number
): Promise<KeyResult> {
  const label = `gemini[${index}]`;
  const keyPreview = preview(apiKey);
  const t0 = Date.now();

  try {
    const resp = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
      {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey },
      },
      timeoutMs
    );

    const latencyMs = Date.now() - t0;
    const httpStatus = resp.status;

    if (!resp.ok) {
      let body = '';
      try { body = await resp.text(); } catch { /* ignore */ }
      const status = classifyStatus(httpStatus, body);
      return { provider: 'gemini', label, keyPreview, status, latencyMs, httpStatus, detail: truncate(body, 120) };
    }

    // Parse model info for a useful detail line
    let detail = 'Key valid, model accessible';
    try {
      const data = (await resp.json()) as { displayName?: string; name?: string };
      const name = data.displayName || data.name || model;
      detail = `Key valid \u2014 model: ${name}`;
    } catch { /* ignore */ }

    return { provider: 'gemini', label, keyPreview, status: 'ok', latencyMs, httpStatus, detail };
  } catch (err: unknown) {
    const latencyMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    const status = classifyStatus(null, msg);
    return {
      provider: 'gemini', label, keyPreview, status,
      latencyMs: status === 'timeout' ? latencyMs : null,
      httpStatus: null,
      detail: msg,
    };
  }
}

/**
 * Wrapper: test a Gemini key with automatic retry on rate-limit or timeout.
 *
 * - Rate-limited: retry after 3s (or 60s in --wait mode).
 * - Timeout: retry once immediately — transient slowness shouldn't condemn a key.
 */
async function testGeminiKeyWithRetry(
  apiKey: string,
  index: number,
  model: string,
  timeoutMs: number
): Promise<KeyResult> {
  const first = await testGeminiKey(apiKey, index, model, timeoutMs);

  if (first.status === 'rate_limited') {
    const waitSecs = WAIT_MODE ? 60 : 3;
    process.stdout.write(
      `    ${COLORS.dim}(gemini[${index}] rate-limited, retrying in ${waitSecs}s\u2026)${COLORS.reset}\r`
    );
    await sleep(waitSecs * 1_000);
    const retry = await testGeminiKey(apiKey, index, model, timeoutMs);
    process.stdout.write(' '.repeat(70) + '\r');
    if (retry.status === 'ok') {
      return { ...retry, detail: `${retry.detail} (recovered after ${waitSecs}s cooldown)` };
    }
    return retry;
  }

  if (first.status === 'timeout') {
    process.stdout.write(
      `    ${COLORS.dim}(gemini[${index}] timed out, retrying once\u2026)${COLORS.reset}\r`
    );
    const retry = await testGeminiKey(apiKey, index, model, timeoutMs);
    process.stdout.write(' '.repeat(70) + '\r');
    if (retry.status === 'ok') {
      return { ...retry, detail: `${retry.detail} (first attempt timed out \u2014 intermittent)` };
    }
    return retry;
  }

  return first;
}

/**
 * Test a Groq key using the models list endpoint.
 *
 * `GET /openai/v1/models` is a lightweight auth check — it returns the list
 * of available models. If the key is invalid, it returns 401. If the model
 * we need isn't in the list, we flag it.
 */
async function testGroqKey(
  apiKey: string,
  model: string,
  timeoutMs: number
): Promise<KeyResult> {
  const label = 'groq';
  const keyPreview = preview(apiKey);
  const t0 = Date.now();

  try {
    const resp = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    }, timeoutMs);

    const latencyMs = Date.now() - t0;
    const httpStatus = resp.status;

    if (!resp.ok) {
      let body = '';
      try { body = await resp.text(); } catch { /* ignore */ }
      const status = classifyStatus(httpStatus, body);
      return { provider: 'groq', label, keyPreview, status, latencyMs, httpStatus, detail: truncate(body, 120) };
    }

    // Check if the configured model is in the available models list
    let detail = 'Key valid';
    try {
      const data = (await resp.json()) as { data?: Array<{ id?: string }> };
      const models = data.data ?? [];
      const hasModel = models.some((m) => m.id === model);
      if (hasModel) {
        detail = `Key valid \u2014 model "${model}" available (${models.length} models total)`;
      } else {
        detail = `Key valid \u2014 but model "${model}" NOT in available models (${models.length} listed)`;
      }
    } catch { /* ignore */ }

    return { provider: 'groq', label, keyPreview, status: 'ok', latencyMs, httpStatus, detail };
  } catch (err: unknown) {
    const latencyMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    const status = classifyStatus(null, msg);
    return {
      provider: 'groq', label, keyPreview, status,
      latencyMs: status === 'timeout' ? latencyMs : null,
      httpStatus: null,
      detail: msg,
    };
  }
}

// ---------------------------------------------------------------------------
// 6. Output / Reporting
// ---------------------------------------------------------------------------

const ICONS: Record<Status, string> = {
  ok:              '\u2705',
  rate_limited:    '\u23f3',
  auth:            '\ud83d\udd11',
  bad_request:     '\u26a0\ufe0f ',
  model_not_found: '\ud83d\udd0d',
  network:         '\ud83c\udf10',
  timeout:         '\u23f1\ufe0f ',
  unknown:         '\u2753',
};

const COLORS = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
};

function colorForStatus(s: Status): string {
  if (s === 'ok')           return COLORS.green;
  if (s === 'rate_limited') return COLORS.yellow;
  return COLORS.red;
}

function printResult(r: KeyResult): void {
  const icon   = ICONS[r.status];
  const color  = colorForStatus(r.status);
  const latStr = r.latencyMs != null ? `${r.latencyMs}ms` : 'N/A';
  const http   = r.httpStatus != null ? `HTTP ${r.httpStatus}` : '';
  const statusLabel = r.status.toUpperCase().replace('_', ' ');

  console.log(
    `  ${icon}  ${COLORS.bold}${r.label.padEnd(12)}${COLORS.reset}` +
    `${color}${statusLabel.padEnd(16)}${COLORS.reset}` +
    `${COLORS.dim}${r.keyPreview.padEnd(20)}${COLORS.reset}` +
    `${COLORS.cyan}${latStr.padEnd(10)}${COLORS.reset}` +
    `${COLORS.dim}${http.padEnd(10)}${COLORS.reset}` +
    `${r.detail}`
  );
}

function printSummary(results: KeyResult[]): void {
  const ok           = results.filter((r) => r.status === 'ok');
  const rateLimited  = results.filter((r) => r.status === 'rate_limited');
  const authFailed   = results.filter((r) => r.status === 'auth');
  const broken       = results.filter((r) => !['ok', 'rate_limited'].includes(r.status));

  // Keys that should definitely be removed
  const toRemove = results.filter((r) =>
    r.status === 'auth' ||
    r.status === 'bad_request' ||
    r.status === 'unknown' ||
    r.status === 'timeout' ||           // timed out twice — consistently dead
    r.status === 'model_not_found'      // key's project can't access the model
  );

  console.log(`\n${COLORS.bold}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501${COLORS.reset}`);
  console.log(`${COLORS.bold}Summary${COLORS.reset}`);
  console.log(`  ${COLORS.green}\u2705  Working        : ${ok.length}${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}\u23f3  Rate-limited   : ${rateLimited.length}${COLORS.reset}`);
  console.log(`  ${COLORS.red}\u274c  Broken         : ${broken.length}${COLORS.reset}`);

  // --- Rate-limited advice ---
  if (rateLimited.length > 0) {
    console.log(`\n${COLORS.yellow}${COLORS.bold}\u26a0\ufe0f  ${rateLimited.length} key(s) are rate-limited (HTTP 429).${COLORS.reset}`);
    console.log(`${COLORS.yellow}   These keys are VALID (authentication passed) but their per-minute${COLORS.reset}`);
    console.log(`${COLORS.yellow}   quota is currently exhausted. They will auto-recover within ~60s.${COLORS.reset}`);
    if (!WAIT_MODE) {
      console.log(`${COLORS.yellow}   \u2192 Re-run with ${COLORS.bold}--wait${COLORS.reset}${COLORS.yellow} to pause 60s and retry for a definitive result:${COLORS.reset}`);
      console.log(`${COLORS.yellow}     npx tsx scripts/test-api-keys.ts --wait${COLORS.reset}`);
    }
    console.log();
    for (const r of rateLimited) {
      console.log(`  ${COLORS.yellow}\u2022 ${r.label.padEnd(14)}${COLORS.reset}${COLORS.dim}(${r.keyPreview}) \u2014 temporarily throttled, valid key${COLORS.reset}`);
    }
  }

  // --- Removal recommendations ---
  if (toRemove.length > 0) {
    console.log(`\n${COLORS.bold}${COLORS.red}\ud83d\uddd1\ufe0f  Recommended removals (${toRemove.length} key${toRemove.length > 1 ? 's' : ''}):${COLORS.reset}`);
    for (const r of toRemove) {
      const reason =
        r.status === 'auth'            ? 'INVALID / REVOKED \u2014 key failed authentication'                    :
        r.status === 'model_not_found' ? `MODEL NOT FOUND \u2014 this key's project cannot access the model`     :
        r.status === 'timeout'         ? 'TIMEOUT \u00d72 \u2014 consistently unresponsive, will hang the server' :
        r.status === 'bad_request'     ? 'BAD REQUEST \u2014 key format or configuration issue'                   :
                                         'UNKNOWN ERROR \u2014 investigate manually';
      console.log(`  ${COLORS.red}\u2022 ${r.label.padEnd(14)}${COLORS.reset}${COLORS.dim}(${r.keyPreview}) \u2014 ${reason}${COLORS.reset}`);
    }
    console.log(`\n  ${COLORS.dim}To remove: edit GEMINI_API_KEYS in .env and delete the failing key value.${COLORS.reset}`);
  }

  // --- Auth failure guidance ---
  if (authFailed.length > 0) {
    console.log(`\n${COLORS.bold}Tip \u2014 Auth failures explained:${COLORS.reset}`);
    console.log('  \u2022 The key was deleted or regenerated in AI Studio / Google Cloud Console.');
    console.log('  \u2022 The associated Google Cloud project was suspended or billing-disabled.');
    console.log('  \u2022 The key has API restrictions that exclude the Generative Language API.');
    console.log(`  \u2022 Get a valid key at: ${COLORS.cyan}https://aistudio.google.com/app/apikey${COLORS.reset}`);
  }

  // --- Final status line ---
  if (ok.length === 0 && rateLimited.length === 0) {
    console.log(`\n${COLORS.red}${COLORS.bold}\ud83d\udea8  No working keys found! The app cannot generate suggestions.${COLORS.reset}`);
  } else if (ok.length > 0) {
    const avgLatency = Math.round(ok.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / ok.length);
    console.log(`\n${COLORS.green}\u2705  ${ok.length} key(s) fully operational. Avg latency: ${avgLatency}ms${COLORS.reset}`);
  }

  console.log(`${COLORS.bold}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501${COLORS.reset}\n`);
}

// ---------------------------------------------------------------------------
// 7. Main
// ---------------------------------------------------------------------------

// Defaults match server/config.ts — keep in sync.
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const DEFAULT_GROQ_MODEL   = 'qwen/qwen3.8-27b';

async function main(): Promise<void> {
  console.log(`\n${COLORS.bold}${COLORS.magenta}\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}\u2502      PromptVault \u2014 API Key Health Check             \u2502${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.magenta}\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518${COLORS.reset}`);

  if (WAIT_MODE) {
    console.log(`  ${COLORS.cyan}--wait mode${COLORS.reset}: rate-limited keys will be retried after a 60s cooldown.\n`);
  } else {
    console.log(`  Testing all keys from ${COLORS.cyan}.env${COLORS.reset} using lightweight metadata endpoints.\n`);
  }

  const env = loadEnv();

  // --- Parse config (mirrors server/config.ts logic) ---
  const geminiRaw    = env['GEMINI_API_KEYS'] ?? '';
  const geminiKeys   = geminiRaw.split(',').map((k) => k.trim()).filter(Boolean);
  const groqKey      = env['GROQ_API_KEY'] ?? '';
  const geminiModel  = env['GEMINI_MODEL']  || DEFAULT_GEMINI_MODEL;
  const groqModel    = env['GROQ_MODEL']    || DEFAULT_GROQ_MODEL;
  const apiPort      = parseInt(env['AI_PROXY_PORT'] ?? '3002', 10) || 3002;

  // Read timeout from env if configured, otherwise use our default
  const geminiTimeout = parseInt(env['GEMINI_TIMEOUT_MS'] ?? '', 10) || DEFAULT_TIMEOUT_MS;
  const groqTimeout   = parseInt(env['GROQ_TIMEOUT_MS']   ?? '', 10) || DEFAULT_TIMEOUT_MS;

  if (geminiKeys.length === 0 && !groqKey) {
    console.error('\u274c  No API keys found in .env. Set GEMINI_API_KEYS and/or GROQ_API_KEY.');
    process.exit(1);
  }

  // --- Dev server detection ---
  const serverRunning = await detectDevServer(apiPort);
  if (serverRunning) {
    console.log(`${COLORS.yellow}${COLORS.bold}\u26a0\ufe0f  Dev server detected on port ${apiPort}!${COLORS.reset}`);
    console.log(`${COLORS.yellow}   The running server may have exhausted rate limits on some keys.${COLORS.reset}`);
    console.log(`${COLORS.yellow}   For the most accurate results: stop the server, wait ~1 min, re-run.${COLORS.reset}\n`);
  }

  // --- Print config ---
  console.log(`${COLORS.bold}Gemini keys   : ${geminiKeys.length}${COLORS.reset}`);
  console.log(`${COLORS.bold}Gemini model  : ${geminiModel}${COLORS.reset}  ${COLORS.dim}(timeout: ${geminiTimeout}ms)${COLORS.reset}`);
  console.log(`${COLORS.bold}Groq key      : ${groqKey ? 'yes' : 'no'}${COLORS.reset}`);
  if (groqKey) {
    console.log(`${COLORS.bold}Groq model    : ${groqModel}${COLORS.reset}  ${COLORS.dim}(timeout: ${groqTimeout}ms)${COLORS.reset}`);
  }

  // --- Column headers ---
  console.log(`\n  ${'  '}  ${'KEY'.padEnd(12)}${'STATUS'.padEnd(16)}${'KEY (PREVIEW)'.padEnd(20)}${'LATENCY'.padEnd(10)}${'HTTP'.padEnd(10)}DETAIL`);
  console.log(`  ${'─'.repeat(90)}`);

  const results: KeyResult[] = [];

  // --- Test Gemini keys sequentially ---
  if (geminiKeys.length > 0) {
    console.log(`\n${COLORS.bold}  Gemini (${geminiModel}) \u2014 testing sequentially via GET /v1beta/models/${geminiModel}${COLORS.reset}`);
    for (let i = 0; i < geminiKeys.length; i++) {
      const r = await testGeminiKeyWithRetry(geminiKeys[i]!, i, geminiModel, geminiTimeout);
      printResult(r);
      results.push(r);
      // Small gap between keys to avoid hammering the same rate-limit window.
      if (i < geminiKeys.length - 1) await sleep(300);
    }
  }

  // --- Test Groq key ---
  if (groqKey) {
    console.log(`\n${COLORS.bold}  Groq \u2014 testing via GET /openai/v1/models${COLORS.reset}`);
    const groqResult = await testGroqKey(groqKey, groqModel, groqTimeout);
    printResult(groqResult);
    results.push(groqResult);
  }

  // --- Summary ---
  printSummary(results);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
