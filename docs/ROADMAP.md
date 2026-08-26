# PromptVault → Elite-Class: Remediation & Hardening Plan

## Context

You asked whether `server/index.ts` is perfect and whether the project is elite-class. I read the whole
repo: the server, all 10 components, `vite.config.ts`, `tsconfig.json`, `index.html`, the README, and the
deploy path.

**Verdict: the project is well above average, but it is not elite-class, and three of its central claims are
not true.** The gap is not "add more features" — it is *the app promises things it does not do*. Elite-class
means every claim on the box is verifiable in the code.

### What is already genuinely strong (keep, do not touch)

- Two-provider AI fallback with a shared prompt pipeline and a two-step analyze/improve split.
- Response caching with TTL + entry cap; per-IP rate limiting with `X-RateLimit-*` headers.
- Production CSP, HSTS, `nosniff`, `frame-ancestors 'none'`, compression, immutable asset caching,
  `no-cache` on `index.html`.
- Route-level code splitting via `lazy()`, idle-time loading of `motion` and `supabase`, inlined critical
  CSS with a post-build preload swap, non-blocking font loading.
- `ErrorBoundary`, skip-to-content link, `role="dialog"`/`aria-modal` on `Modal`, `aria-label` coverage.
- Graceful SIGTERM/SIGINT shutdown. Supabase RLS policies documented in the README.

### The three findings that define this plan

1. **"Encrypted" is false.** The vault is plaintext JSON in `localStorage`. The PIN is an *unsalted*
   SHA-256 of 4–6 digits ([src/utils/crypto.ts:10](src/utils/crypto.ts:10)) — the entire 10⁶ keyspace
   brute-forces in well under a second. Meanwhile the header badge says `Encrypted`
   ([App.tsx:876](src/App.tsx:876)), the footer says `Encrypted Storage`
   ([App.tsx:1170](src/App.tsx:1170)), Settings says `Encryption: SHA-256 Hashed PIN`
   ([App.tsx:1521](src/App.tsx:1521)), `index.html` advertises "PIN-protected encrypted vault" in JSON-LD
   and `<noscript>`, and the README says an attacker with your device "couldn't recover the original code."
   `handleExport` ([App.tsx:655](src/App.tsx:655)) also writes `pinHash` into every backup file.
2. **Cloud sync loses data.** `syncToCloud` ([App.tsx:339](src/App.tsx:339)) upserts the *entire document*
   with last-write-wins. Delete a prompt on the laptop, then edit anything on the phone → the deleted
   prompt resurrects and the laptop's edits are gone. No per-entity merge, no tombstones.
3. **Two README features do not exist.** `setSortBy` is never called and `isDarkMode` is never toggled;
   `Filter`, `ArrowUpDown`, `Moon`, `Sun`, `Heart` are imported at [App.tsx:8](src/App.tsx:8) and unused.
   The `.light` theme CSS at [index.css:48](src/index.css:48) is unreachable at runtime.

### Decisions locked in from your review

| # | Decision |
|---|---|
| A | Implement **real** AES-256-GCM at-rest encryption (PBKDF2-derived key, recovery key, schema bump) |
| B | Rewrite sync as **per-entity merge with tombstones** |
| C | **Vitest + Playwright + GitHub Actions** |
| D | **Extract** hooks and components out of the 1583-line `App.tsx` |

### Decision D1 — please confirm or override

**Cloud sync payloads stay plaintext** (Supabase RLS + TLS), while `localStorage` becomes encrypted.
Rationale: today `getSyncData` deliberately strips `pinHash` so that signing in on a *new* device gives you
a usable vault without the PIN. End-to-end-encrypting the sync payload would change that product promise —
a fresh device would show an undecryptable blob until you type the PIN. That is arguably *better* security
and it is a ~40-line delta on top of this plan, but it is a product decision, not a bug fix.
**If you want E2E sync encryption instead, say so and I will fold it into Phase 4.** The README and Settings
copy will state the actual behaviour either way.

### Threat model I will publish in the README (Phase 4)

Being honest here matters more than sounding strong. A 4–6 digit PIN is weak *even with* a strong KDF:

| Attacker | Outcome |
|---|---|
| Someone glancing at your unattended screen | Blocked by the PIN lock |
| Someone with devtools access to a **locked** vault | Sees only ciphertext (today: sees everything) |
| Offline brute-force of a **4–6 digit PIN**, GPU | ~10⁶ candidates; feasible in minutes-to-hours despite PBKDF2 |
| Offline brute-force of a **passphrase** (≥5 words) | Not feasible |

So Phase 4 ships an **optional passphrase mode** alongside the numeric PIN and says plainly in the UI which
one you chose and what it buys you. That is the difference between marketing and engineering.

---

## Phase 0 — Make the codebase checkable — ✅ DONE

Nothing else is safe to change until the type checker actually covers the code being changed.

- **`tsconfig.json`**: was `"include": ["src"]` with **no `strict`** → `server/index.ts` had *zero* type
  checking and the whole project had no null-safety. Split into `tsconfig.base.json` (shared strict
  options) + four leaf projects: `tsconfig.json` (`src`, DOM libs), `tsconfig.server.json` (`server`, node
  types), `tsconfig.node.json` (the build/test configs), `tsconfig.test.json` (`tests`). All inherit
  `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`.
- **`package.json`**: `lint` → `typecheck` (four `tsc -p` runs); added `test`, `test:watch`, `test:e2e`.
- **`vitest.config.ts`**, **`playwright.config.ts`**, **`.github/workflows/ci.yml`** (typecheck → unit →
  build, plus a parallel e2e job on push/PR).

### As built — deviations and discoveries

- **`npm run lint` was already failing on `main`.** `src/App.tsx(704,9): TS1345: An expression of type
  'void' cannot be tested for truthiness` — the Cmd+K handler was
  `getElementById('main-search-desktop')?.focus() || getElementById('main-search')?.focus()`. Because
  `focus()` returns `void`, the right-hand side always ran too, so focus landed on the *mobile* input
  whenever both were mounted. Fixed with `??` on the elements and a single `focus()` call. Worth noting:
  enabling `strictNullChecks` **masks** this error (the type widens to `void | undefined`), so it was fixed
  explicitly rather than left to the checker.
- **37 further strict errors** fixed across the four projects (26 app / 3 server / 8 node), including typed
  `GeminiGenerateContentResponse` / `GroqChatCompletionResponse` interfaces replacing `any` on both
  provider responses.
- **`exactOptionalPropertyTypes` was deliberately omitted.** It was in the approved plan, but it forces
  every optional React prop to be declared `prop?: T | undefined` and rejects the idiomatic
  `<C prop={maybeUndefined} />`. The churn is large and the safety gain is small next to
  `noUncheckedIndexedAccess`. Revisit after Phase 3, when props live in smaller components.
- **`clean` used `rm -rf dist`**, which fails in `cmd` on Windows. Replaced with a dependency-free
  `node -e` + `fs.rmSync`.
- **`vite` is listed in both `dependencies` and `devDependencies`** — it belongs only in the latter.
  Deferred to Phase 2 so this commit stays type-only.
- **Dead schema field:** `Category.isCollapsed` is written by nothing and read by nothing — no UI collapses
  categories. Remove it in the Phase 4 schema migration rather than orphaning a second version.
- **`manualChunks: {'vendor-react': ['react','react-dom']}` isn't working.** The emitted `vendor-react`
  chunk is 3.9 kB while `index` is 237.79 kB, so `react-dom` is still bundled into the entry and the
  long-lived vendor cache the split was meant to create doesn't exist. Phase 5.

### Two `test.fail` tripwires ship with this phase

Both encode a claim the product currently makes and fails to honour. Playwright reports them as *expected*
failures, so the suite is green — and each flips to a hard failure the moment its phase lands, which is
exactly the signal we want.

| Test | Fails because | Flips green in |
|---|---|---|
| `vault.spec.ts` → `a prompt survives an immediate reload` | persistence is debounced 500ms with no unload flush | Phase 2 — ✅ flipped, now a regression lock |
| `lock.spec.ts` → `a locked vault stores no plaintext prompt bodies` | the vault is plaintext JSON | Phase 4 |

Writing the E2E suite also surfaced a third defect not in the original plan: **`PinLock` is lazy-loaded
behind `Suspense` and binds its keypad to `window`**, so digits typed before the chunk mounts are dropped
while `Continue` stays `disabled`. Real users hit this by typing fast; it compounds the "no paste support,
no lockout" note already in Phase 4.

Commit: `chore: enable strict typechecking across app and server, add test + CI scaffolding`

**Gate at the end of Phase 0:** `npm run typecheck` (4 projects) ✅ · `npm test` → 5 passed ✅ ·
`npm run build` ✅ · `npx playwright test` → 7 passed, 2 expected failures, exit 0 ✅

---

## Phase 1 — `server/index.ts` hardening — ✅ DONE

Ordered by real-world impact. Every item is a concrete defect, not a style preference.

**Reliability**

1. **No upstream timeout.** `requestGemini`/`requestGroq` have no `AbortSignal`. A hung Gemini connection
   means the Groq fallback **never fires** and the request hangs until the client gives up — the single
   worst bug in the file, because it silently defeats the fallback the README advertises. Add
   `AbortSignal.timeout(GEMINI_TIMEOUT_MS)` (default 20s) to both, and treat `AbortError` as a normal
   provider failure so the fallback proceeds.
2. **No JSON mode.** Both providers are asked for JSON in prose only. Add Gemini
   `generationConfig.responseMimeType: 'application/json'` + `responseSchema`, and Groq
   `response_format: { type: 'json_object' }`. Then `extractJson` failure becomes rare instead of a 500.
3. **One repair retry.** If `extractJson` still throws, retry once with a terse "return only valid JSON"
   instruction before failing. Return **502** (upstream failure), not 500.
4. **`maxOutputTokens: 2048` with no `temperature`.** On a thinking-capable Gemini flash model, reasoning
   tokens count against the output budget, so 2048 can truncate `improve` mid-JSON. Raise the budget, set
   an explicit `temperature` to match Groq's 0.3, and pin `thinkingConfig` if the configured model
   supports it. **I will verify the exact `gemini-3.6-flash` request shape against Google's live API docs
   before changing this** rather than guessing from memory.
5. **In-flight coalescing.** N identical concurrent requests each hit the provider. Store the in-flight
   `Promise` in the cache map so duplicates await the first call.
6. **Cache key collisions.** `hashString` is a 32-bit djb2-xor; a collision serves *another user's result*
   for a different prompt. Use `crypto.createHash('sha256')`. Also promote to true LRU (delete + re-set on
   hit) — today `keys().next()` evicts FIFO, discarding hot entries.

**Security**

7. **`req.ip` with no `trust proxy`.** Behind Render / Railway / Fly / Cloudflare, `req.ip` is the *proxy's*
   address, so all users share one bucket → an effective 30 req/min global cap and a one-client DoS. Add
   `app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? (IS_PRODUCTION ? 1 : 0)))`.
8. **Gemini key in the query string.** `?key=${GEMINI_API_KEY}` leaks into proxy/CDN access logs and error
   traces. Move to the `x-goog-api-key` header.
9. **Missing `Vary: Origin`.** With `compression()` and any CDN in front, a cached response can serve one
   origin's `Access-Control-Allow-Origin` to a different origin. Add `Vary: Origin` on every CORS response.
10. **`ACAO: *` in production** when `ALLOWED_ORIGINS` is empty. Refuse to start in production without an
    explicit allowlist (matching the existing "refuse without API keys" precedent).
11. **Unbounded `categories`.** `MAX_PROMPT_LENGTH` caps only `prompt`; a client can send 10k category
    strings that get joined straight into the upstream prompt — cost amplification against *your* API
    quota. Cap count (64) and total joined length (2k).
12. **Prompt injection.** User text is concatenated raw at the end of the instruction block. Wrap it in
    `<user_prompt>` delimiters, strip any delimiter-lookalikes from the input, and instruct the model to
    treat the contents as data. Impact is low (single-user output) but it is free to fix.
13. **CSP tidy.** `'unsafe-hashes'` + `'sha256-1jAmyYX…'` appear to be dead config — the inline `onload`
    handler they covered was replaced by `public/gtag-init.js`. I will confirm by loading the built app
    with CSP reporting on, then remove both and add `base-uri 'none'`, `object-src 'none'`,
    `form-action 'self'`.

**Correctness**

14. **Non-string array items crash the client.** `normalizeAnalyzeResponse` uses
    `Array.isArray(x) ? x.filter(Boolean) : []`. If the model returns `weakSpots: [{gap: "…"}]`, an object
    reaches React's children and **throws** ("Objects are not valid as a React child"). Coerce every array
    to `string[]` (`.filter(v => typeof v === 'string' && v.trim())`) for `weakSpots`, `improvements`,
    `tags`, `improvementsMade`.
15. **Whitespace-only prompts pass validation.** Length is checked *before* `trim()`, so `"     "` is
    accepted and sent upstream as `""`. Validate the trimmed value; add a minimum length.
16. **Empty `improvedPrompt` returns 200.** `normalizeImproveResponse` yields `''` on model failure and the
    widget shows nothing with no error. Return 502 when it is empty.
17. **SPA catch-all swallows unknown API routes.** `app.get('*')` returns `index.html` for `/api/typo`, so
    clients get HTML where they expect JSON. Add a JSON 404 for `/api/*` *before* the fallback.
18. **Body-parser errors become 500s.** The global handler ignores `err.status`, so a >1mb body or malformed
    JSON reports 500 instead of 400/413. Honour `err.status`/`err.type`.
19. **`dotenv.config({ override: true })`** makes a stray `.env` beat real platform env vars — backwards for
    production. Drop `override` and document the precedence.

**Operability**

20. Add `Retry-After` on 429. `unref()` the sweep interval; clear it on shutdown; guard `shutdown()` against
    double invocation (SIGTERM then SIGINT currently arms two force-exit timers). Add `unhandledRejection`
    and `uncaughtException` handlers.
21. Log status + duration *after* the response (today the log middleware fires before, so no outcome is
    recorded). Add a request id.
22. `/api/health` hardcodes `version: '1.0.0'` — read it from `package.json`. Report cache size, uptime, and
    per-provider last-failure so the fallback is observable.
23. Split `server/index.ts` (678 lines) into `server/index.ts` (wiring), `server/middleware/`,
    `server/providers/{gemini,groq}.ts`, `server/prompts/{analyze,improve}.ts`, `server/normalize.ts`,
    `server/cache.ts`. `normalize.ts` and the prompt builders become directly unit-testable.

Commits: `fix(server): …` (reliability) · `fix(server): …` (security) · `refactor(server): …`

### As built — deviations and discoveries

All 23 items shipped. `server/index.ts` went from 678 lines of everything to 96 lines of wiring, across 18
new modules. What differs from the plan above, and why:

- **Item 4 could not be fully verified, so it was deliberately under-implemented.** The plan committed me to
  checking the exact `gemini-3.6-flash` request shape against Google's live docs before touching
  `generationConfig`. That check came back *inconclusive*: the structured-output and thinking pages now
  document the **Interactions API** rather than `generateContent`, and the `generate-content` reference page
  truncated before the `GenerationConfig` table. Rather than guess, I: (a) send only fields confirmed present
  in the `generateContent` samples — `responseMimeType`, `responseSchema`, `temperature`, `maxOutputTokens`;
  (b) **do not send `thinkingConfig`** at all, and instead detect its symptom by treating
  `finishReason === 'MAX_TOKENS'` as a provider failure so the Groq fallback fires rather than a truncated
  JSON body reaching `extractJson`; (c) added a runtime capability downgrade — if Gemini ever rejects the
  request *because of* a schema/config field (`SCHEMA_REJECTION_PATTERN`), `providers/gemini.ts` flips
  `structuredOutputSupported = false`, logs once, and retries without the schema. Without that latch, a
  future API change to a field we cannot verify would silently demote the app to Groq-only.
- **Item 2 uses Groq's `json_object`, not `json_schema`.** `llama-3.3-70b-versatile` does not support
  schema-constrained decoding; asking for it would fail every request. The prompt builders therefore still
  have to say the word "JSON" (Groq requires it in the messages), which `tests/unit/prompts.test.ts` locks in.
- **Item 8 changed more than the plan said.** Moving the key to `x-goog-api-key` was the point, but the
  reason is stronger than "leaks into logs": the query string also reaches error traces and any intermediary,
  and neither is redactable after the fact.
- **Item 13 confirmed by grep, not CSP reporting.** `'unsafe-hashes'` and `'sha256-1jAmyYX…'` covered an
  inline `onload` that no longer exists anywhere in `index.html`. A grep was conclusive, so the
  report-only-CSP round trip the plan described was unnecessary. Both are gone, plus `base-uri 'none'`,
  `object-src 'none'`, `form-action 'self'`. I also **dropped `X-XSS-Protection`** — it is a no-op in every
  current browser and its legacy XSS auditor was itself an information-disclosure vector.

### New findings from Phase 1 (not in the original plan)

1. **`/api/health` leaked upstream error bodies.** My own first cut of item 22 reported the raw provider
   failure message on an unauthenticated public endpoint — including `"API key not valid. Please pass a valid
   API key."` and the upstream's internal `@type`/`domain`/`metadata` fields. Fixed before commit by adding a
   closed `FailureKind` vocabulary (`timeout|network|auth|rate_limited|bad_request|upstream_error|truncated|
   empty_response|blocked|unknown`); health now reports only `{at, kind, status}` and the full message stays
   in the logs. Gemini reports a bad key as **400/`API_KEY_INVALID`**, not 401, so `classify()` pattern-matches
   the message before falling back to status codes — otherwise the single most likely misconfiguration files
   itself under `bad_request` and sends the operator hunting through request shapes.
2. **Express rewrites `req.url` inside a mounted router.** Logging on `res.on('finish')` therefore recorded
   `GET /health` for a request to `/api/health` — the prefix the router had already stripped. `logging.ts`
   now captures `originalUrl` before calling `next()`.
3. **`@google/genai` is imported nowhere.** A dead dependency shipping in `dependencies`. Folded into the
   Phase 2 dependency cleanup alongside the duplicate `vite`.
4. **Google now steers new work to the Interactions API** over `generateContent`. Nothing is broken and
   nothing is deprecated today, but the current call path is a future migration item. Logged in *Out of
   scope* rather than acted on — swapping API surfaces is not a hardening change.
5. **Both `test.fail` tripwires still fail as designed**, and one of them exposed a *third* bug while I was
   fixing my own flaky helper: the persistence effect runs on **mount**, so `✓ Saved` lights up ~500ms after
   every page load and stays up for 2s — announcing a save the user never made. Any test (or user) reading
   that indicator as "my change is durable" is misled. Both e2e specs now poll `localStorage` for the actual
   bytes instead. Phase 2's "stop showing Saved on failure" item is widened to "only show Saved for a write
   the user actually caused".
6. **`.env.example` documented behaviour Phase 1 removed** — "Leave empty to allow all origins" was true
   before item 10 and false after it. Updated in this commit, along with the new `GEMINI_TIMEOUT_MS`,
   `GROQ_TIMEOUT_MS`, `MAX_OUTPUT_TOKENS`, `TRUST_PROXY_HOPS` entries and the precedence note from item 19.
   The remaining `.env.example` gap — that `VITE_*` vars are baked in at **build** time — stays in Phase 2
   where the plan put it, since it is a client concern.

### Verified

`npm run typecheck` (4 projects) · `npm test` (51 unit tests) · `npm run build` ·
`npx playwright test --repeat-each=3` (21/21, tripwires failing as designed). Plus, by hand against a live
server: `/api/typo` → JSON 404 · whitespace-only prompt → 400 · malformed JSON body → 400, not 500 · bad
upstream key → 502 with a generic client message · `Vary: Origin` on preflight · `Retry-After: 57` on the
31st request in a window · `NODE_ENV=production` with no `ALLOWED_ORIGINS` → exit 1.

Not verifiable without real credentials, and therefore still unproven: verification step 6 (blackhole
`GEMINI_API_KEY` → falls back to Groq within the timeout) and any assertion that the Gemini structured-output
path returns what the schema promises. The `structuredOutputSupported` latch exists precisely because I could
not prove this one.

---

## Phase 2 — Client correctness & making the README true — ✅ DONE

1. **`handleImport` can throw mid-merge.** [App.tsx:664](src/App.tsx:664) checks only
   `importedData.schemaVersion`, then reads `.prompts` / `.categories` — a file with a version but no
   `prompts` array throws inside `setData`, and the `catch` has already returned. Validate with the existing
   `isValidVaultData` helper ([App.tsx:78](src/App.tsx:78)) and report per-field errors in-app.
2. **`localStorage.setItem` is unguarded *and* unflushed.** [App.tsx:228](src/App.tsx:228).
   Two distinct defects in one effect:
   - The write is debounced 500ms with **no flush on unload**, so creating a prompt and
     reloading or closing the tab inside that window loses it outright. This also loses a
     just-set PIN, which means the vault silently fails to lock. Proven by the two
     `test.fail` tripwires in `tests/e2e/vault.spec.ts` and `tests/e2e/lock.spec.ts`.
     Fix: flush on `pagehide` + `visibilitychange`, and write PIN changes synchronously.
   - `QuotaExceededError` is uncaught, so the write is lost *and* the "✓ Saved" indicator
     still fires — the UI actively lies about having saved. Wrap it, surface a banner, and
     stop showing "Saved" on failure.
   - The indicator also fires on **mount**, because the persistence effect runs for the
     initial state too: every page load shows "✓ Saved" ~500ms in and holds it for 2s,
     announcing a save the user never made. (Found in Phase 1 while fixing a flaky e2e
     helper that trusted it.) Only show it for a write the user actually caused.
3. **Export leaks `pinHash`** and never calls `URL.revokeObjectURL`. Strip secrets from the export; revoke.
4. **`PromptCard` shows "Copied"** ([PromptCard.tsx:24](src/components/PromptCard.tsx:24)) even when
   `onCopy` only opened the variable modal — nothing reached the clipboard. Drive the state from the
   clipboard write's resolution.
5. **`navigator.clipboard.writeText` has no `.catch`** ([App.tsx:632](src/App.tsx:632)) — a rejection (no
   permission, non-secure context) silently drops the usage-count increment with no user feedback.
6. **`googlebc237380bb232626.html` is at the repo root, not in `public/`** → `vite build` never emits it, so
   Google Search Console verification **404s in production**. Move it to `public/`.
7. **Ship the missing sort UI** (wire the existing `sortBy` state, `Filter`/`ArrowUpDown` icons) and the
   **theme toggle** (`Moon`/`Sun` → `isDarkMode`), making both README claims true. This is the smallest
   possible fix that removes two false statements.
8. **Replace `window.prompt` / `confirm` / `alert`** — category creation ([App.tsx:644](src/App.tsx:644)),
   import confirm, invalid-file alert, category delete
   ([Sidebar.tsx:80](src/components/Sidebar.tsx:80)) — with the existing `Modal`. These are blocking native
   dialogs in an otherwise carefully designed UI, and they are unstyleable and untestable.
9. **De-duplicate mobile detection**: `App.tsx` and `Sidebar.tsx` each run their own unthrottled
   `resize` listener re-rendering on every event. One `useMediaQuery` hook using `matchMedia`.
10. **`supabase.ts` builds a live client from a fake URL** when unconfigured
    ([supabase.ts:18](src/utils/supabase.ts:18) — `'http://localhost/invalid-supabase-url'`). Any code path
    that slips past an `isSupabaseConfigured` check fails as an opaque network error instead of a clear
    "sync not configured". Export `supabase` as nullable, or short-circuit at the call sites.
11. **`.env.example`** — the server-side half (`GEMINI_TIMEOUT_MS`, `GROQ_TIMEOUT_MS`, `MAX_OUTPUT_TOKENS`,
    `TRUST_PROXY_HOPS`, env precedence, and the corrected `ALLOWED_ORIGINS` note) shipped with Phase 1.
    Still outstanding here: note that `VITE_*` vars are baked in at **build** time, so setting them as
    runtime env vars on a host that doesn't rebuild has no effect (the README's current deploy section
    implies otherwise).
12. **`vite` is declared in both `dependencies` and `devDependencies`** — remove the `dependencies` entry so
    a production install doesn't drag the bundler in. Same commit: drop **`@google/genai`**, which Phase 1
    confirmed is imported nowhere (the server talks to Gemini over `fetch`).

Commits: `fix(app): …` · `feat(app): sort controls and theme toggle`

### As built — deviations and discoveries

All 12 items shipped. What differs from the plan above, and why:

- **Item 7 needed a schema-shaped decision the plan did not anticipate.** Verification step 3 says "Toggle
  the theme and each sort mode; reload. Both persist." `isDarkMode` already lived in `VaultData.settings`,
  but `sortBy` was component state, so it could not survive a reload. Rather than add a second storage key,
  `sortBy: SortOption` joins `settings` — **without a schema bump**, because `sanitizeVault` supplies
  `DEFAULT_SORT` for any vault that lacks it, so a 1.0.0 file stays readable and a downgrade just ignores the
  extra field. A bump would have forced a migration for a preference.
- **Item 7 also needed a pre-paint theme script.** Toggling to light and reloading produced a full-screen
  dark flash, because the class-toggling effect runs after hydration. `public/theme-init.js` is loaded from
  `<head>` **without `defer`** — external rather than inline so `script-src 'self'` already covers it with no
  new CSP hash. It deliberately duplicates the storage key instead of importing it: it has to run before the
  module graph exists. `tests/e2e/ui.spec.ts` asserts the class at `domcontentloaded`, before React hydrates,
  which is the only way to prove the flash is gone rather than merely brief.
- **Item 7 shipped a native `<select>` for sort, not the planned icon menu.** `Filter`/`ArrowUpDown` were the
  plan's suggestion; a `<select>` gets keyboard support, mobile pickers, and screen-reader announcement for
  free, where a custom popover would have needed a focus trap — which Phase 5 still owes `Modal`.
  `ArrowUpDown` stayed as the adjacent affordance; `Check` came out of the import (nothing to tick).
  `SORT_OPTIONS` + `isSortOption` in `types.ts` replaced what would have been `Object.keys` plus an `as`
  cast, so an unknown persisted value degrades to the default instead of rendering a blank control.
- **Item 8 moved the confirmation, not just the dialog.** `Sidebar`'s `confirm()` became an
  `onDeleteCategory(id)` callback; the parent owns the `Modal` because that is where `Modal` already lived,
  and the dialog now names the category and counts the prompts it will take with it — information the native
  `confirm` string could not carry. Deleting the selected category also falls back to "All Prompts", which
  the old inline handler did not do: it left an empty grid selected with no way back.
- **Item 4's contract is now in the type.** `onCopy` returns `Promise<boolean>` — `true` only when bytes
  reached the clipboard — so "Copied" cannot fire for a prompt that merely opened the variable modal. The
  reset timer is cleared on unmount.
- **Item 2 widened again during implementation.** Beyond the quota guard and the unload flush, the
  mount-write "✓ Saved" lie (Phase 1 finding 5) is fixed with a `hasHydratedRef`, so the indicator now tracks
  only user-caused writes. `utils/storage.ts` centralises the guarded access and distinguishes `quota` from
  `unavailable`; the store is resolved **per call**, never cached, because a user can grant storage
  permission mid-session and a cached `null` would leave the vault non-persistent for the rest of the page's
  life.
- **`tests/e2e/vault.spec.ts:88` flipped from `test.fail` to a passing test.** "A prompt survives an
  immediate reload" was a tripwire asserting the debounce data loss; item 2 fixed it, so it is now a
  regression lock with a rewritten docblock. The remaining tripwire (`lock.spec.ts:95`, "a locked vault
  stores no plaintext prompt bodies") still fails by design until Phase 4.

### New findings from Phase 2 (not in the original plan)

1. **`tsx` was in `devDependencies` but `npm start` needs it at runtime.** The start script is
   `node --import tsx server/index.ts`, so a `--omit=dev` production install — what most hosts do — would
   have crashed the server on boot. Item 12's cleanup would have *shipped* this bug had it only removed
   things: `tsx` moved **into** `dependencies` in the same commit. `@tailwindcss/vite` and
   `@vitejs/plugin-react` went the other way, into `devDependencies`, alongside the duplicate `vite` and the
   dead `@google/genai`.
2. **The import failure dialog stacks over the still-open Settings modal.** Two `aria-modal="true"` dialogs
   are visible at once, which is wrong for assistive tech even though the visual result is what you want
   (Settings is where the file picker is, and where the user returns after reading the failure). Not fixed
   here — it is the same missing focus trap Phase 5 already owns, and fixing it properly means giving `Modal`
   a stack, not special-casing this pair. Recorded so Phase 5's a11y item covers it explicitly.
3. **Sort options had no runtime guard.** A hand-edited or downgraded vault could carry
   `settings.sortBy: "MOST_LOVED"`, which typed as `SortOption` would have produced a `<select>` with no
   matching option and no selected value. `isSortOption` guards both the load path and the `onChange`.

### Verified

`npm run typecheck` (4 projects) · `npm test` (72 unit tests, 7 files) · `npm run build` (emits
`googlebc237380bb232626.html` from `public/`) · `npx playwright test --repeat-each=3` → 39/39, with
`lock.spec.ts:95` reported as an expected failure and exit 0. Verification steps 2 and 3 are now covered by
e2e rather than by hand: `an export carries no PIN hash` reads the downloaded file, and the sort/theme specs
assert both the DOM and the persisted `settings`.

Verification step 1 (devtools shows ciphertext) still fails, as it must — that is Phase 4.

---

## Phase 3 — Decompose `App.tsx` (behaviour-preserving) — ✅ DONE

Pure restructuring, its own commit, so Phase 4's real logic changes stay reviewable. Also a prerequisite:
encryption makes the initial vault load **async**, which the current synchronous `useState` initializer at
[App.tsx:105](src/App.tsx:105) cannot express.

New files under `src/`:

- `hooks/useVault.ts` — vault state, debounced persistence, quota handling, import/export, all CRUD.
- `hooks/useCloudSync.ts` — the ~150 lines of sync engine and its 8 refs
  ([App.tsx:122](src/App.tsx:122)–[App.tsx:485](src/App.tsx:485)).
- `hooks/useMediaQuery.ts`, `hooks/useLazyModule.ts` (the duplicated `requestIdleCallback` blocks at
  [App.tsx:146](src/App.tsx:146) and [App.tsx:175](src/App.tsx:175) are the same function twice).
- `components/SettingsModal.tsx`, `components/ShortcutsModal.tsx`, `components/PromptViewModal.tsx`,
  `components/AppHeader.tsx`, `components/AppFooter.tsx`.
- `utils/storage.ts` — typed, guarded `localStorage` access.

Target: `App.tsx` under ~250 lines of composition. **No behaviour change** — verified by the Phase 0
Playwright smoke test passing untouched.

Commit: `refactor(app): extract vault, sync, and layout into hooks and components`

---

## Phase 4 — Schema v2: real encryption + tombstoned sync (one migration) — ✅ DONE

Decisions A and B both bump the schema, so they share **one** migration `1.0.0 → 2.0.0`.

### 4a — Encryption at rest (`src/utils/crypto.ts`)

Replace `hashPin`/`validatePin` (they leave the vault plaintext) with:

```
deriveKey(secret, salt, iterations) -> CryptoKey     // PBKDF2-SHA-256, 600k iters, 16-byte random salt
encryptVault(vault, key)            -> EncEnvelope   // AES-256-GCM, fresh 12-byte IV per write
decryptVault(envelope, key)         -> VaultData     // GCM auth tag failure == wrong secret, no oracle
```

- On-disk shape when locked: `{ schemaVersion, enc: { v, kdf, iters, salt, iv, ct } }` — **the PIN is never
  stored in any form**, so there is nothing to brute-force offline except the ciphertext itself.
- A random 256-bit **DEK** encrypts the vault; the PIN-derived KEK wraps the DEK. This lets a PIN change
  re-wrap without re-encrypting, and lets a **recovery key** (256-bit, shown once, downloadable) wrap the
  same DEK.
- **Optional passphrase mode** next to the numeric PIN, with the honest tradeoff shown inline (see the
  threat model above). Raise the PIN cap from 6.
- **Rate-limit unlock attempts** — `PinLock` currently allows unlimited guesses with no delay
  ([PinLock.tsx:38](src/components/PinLock.tsx:38)). Add exponential backoff persisted across reloads.
- **Fix `PinLock` input capture** — the keypad binds `keydown` on `window` inside a lazily-loaded chunk, so
  digits typed before mount are silently dropped and paste is unsupported entirely. Bind to a real focused
  input (or an offscreen one) so typing and paste both work, and so the `disabled={pin.length < 4}` gate
  can never disagree with what the user typed. Found while writing the Phase 0 E2E suite.
- **Drop `Category.isCollapsed`** — dead field, written and read by nothing. This is the migration that
  should remove it.
- **Migration:** on load, a v1 plaintext vault is read, the user is prompted to set a secret (or explicitly
  decline), then it is re-written as v2. A pre-migration backup is stashed under a separate key so a failed
  migration can never destroy data. `pinHash` is dropped entirely.
- **Then, and only then, fix the copy** — the `Encrypted` badge, `Encrypted Storage` footer,
  `Encryption: SHA-256 Hashed PIN` row, the `index.html` JSON-LD `featureList` and `<noscript>` text, and
  the README's "Is My Data Safe?" table all become accurate statements, including what cloud sync does
  (Decision D1) and what a numeric PIN does *not* buy you.

### 4b — Per-entity sync merge (`src/utils/merge.ts`)

- `types.ts`: add `updatedAt` to `Category`, and `deletedAt: number | null` to both `Prompt` and `Category`.
- Deletes become **tombstones**, swept locally after 30 days.
- `mergeVaults(local, remote)` — last-write-wins **per entity** on `updatedAt`, with tombstones winning ties.
  Pure function, exhaustively unit-tested (concurrent edit, concurrent delete, delete-vs-edit, tombstone
  expiry, category delete cascading to its prompts).
- `useCloudSync` becomes pull → merge → push, replacing whole-document overwrite. `bootstrapSync`'s
  three-way timestamp comparison at [App.tsx:405](src/App.tsx:405) collapses into one merge call.
- Ship `supabase/migrations/0001_vaults.sql` — the schema and RLS policies currently exist only as a README
  code block, so nobody can reproduce or review them as code. Add the missing `delete` policy.

Commits: `feat(crypto): AES-256-GCM vault encryption with recovery key` ·
`feat(sync): per-entity merge with tombstones` · `docs: correct all security and feature claims`

### As built

- Browser storage now holds a versioned AES-256-GCM envelope. The user secret is never stored; it derives a
  PBKDF2-SHA-256 (600,000 iteration) key that unwraps a random 256-bit vault key. A separate one-time
  recovery key wraps that same vault key and is displayed in-app exactly once.
- Numeric PIN and passphrase modes are available. The UI explicitly explains that a PIN is convenient but
  weak against offline guessing; a passphrase is the recommended protection.
- Existing v1 plaintext vaults remain readable and receive a clear in-app invitation to encrypt. This avoids
  destructive automatic migration: encryption is only enabled after the user chooses a secret.
- Sync remains plaintext JSON over Supabase RLS/TLS by the locked Decision D1, so a newly signed-in device
  remains usable. `mergeVaults` now resolves records per entity, retains delete tombstones for 30 days, makes
  delete win timestamp ties, and cascades category deletion to its prompts.
- Added `supabase/migrations/0001_vaults.sql`, including the missing delete policy. The README, Settings,
  header/footer status, JSON-LD, and browser tests now reflect the actual security model.

**Verified:** `npm run typecheck` · `npm test` (73) · `npm run build` · `npm run test:e2e` (12).

---

## Phase 5 — Performance, offline, accessibility — ✅ DONE

1. **Search**: `filteredPrompts` ([App.tsx:723](src/App.tsx:723)) lowercases every prompt body on every
   keystroke. Add `useDeferredValue` + a memoized lowercased search index.
2. **Virtualization** above ~200 cards (each is a `motion.div` with `layout`, which is expensive at scale).
3. **Service worker** — the footer says `Offline-First` and `manifest.json` declares `standalone`, but there
   is **no service worker**, so a second visit with no network fails. Add a small precache + navigation
   fallback SW so the offline claim becomes true. Extend the Playwright suite with an offline-reload test.
4. **A11y**: focus trap + focus restore + `Escape` inside `Modal` (it has `role="dialog"`/`aria-modal` but
   focus stays behind it); `aria-live` on the save indicator and sync status; verify contrast on
   `text-vault-text-muted/40` and the `text-[9px]` labels. Widened by Phase 2: the import-failure dialog
   stacks over the still-open Settings modal, so **two** `aria-modal="true"` dialogs are visible at once.
   `Modal` needs a stack — whichever dialog is topmost owns focus and `Escape` — rather than a special case
   for that one pair.
5. `formatTimestamp` ([App.tsx:90](src/App.tsx:90)) → relative time ("2 minutes ago").
6. **Fix `manualChunks`.** `vendor-react` emits 3.9 kB while `index` is 237.79 kB — `react-dom` is not
   actually being split out, so the vendor chunk buys no cache longevity. Diagnose (likely the `motion`/
   `lucide-react` re-export graph pulling `react-dom` into the entry) and verify by chunk size, not config.

Commit: `perf(app): deferred search, virtualized grid, offline service worker`

### As built

- Search now uses `useDeferredValue` plus a memoized lowercase prompt index, so typing does not repeatedly
  lowercase every prompt body.
- Prompt grids above 200 cards render through a row window and disable `motion` layout on cards in that path.
  Playwright seeds a 260-prompt vault to verify the DOM stays small and the oldest prompt remains reachable
  by scrolling.
- Added a production-only service worker registration and a small offline shell worker. The worker precaches
  the navigation shell, manifest, theme script, hashed assets, and lazy chunks discovered from the built JS
  graph, then falls back to the cached shell for offline navigations.
- `Modal` now manages a stack: only the top dialog owns `aria-modal`, focus trapping, backdrop close, and
  `Escape`. Closing a dialog restores focus to its opener. The import-error flow can stack over Settings
  without exposing two active modal dialogs to assistive tech.
- Save/sync status text is announced with polite live regions, the low-opacity prompt-form counter was
  strengthened, and `formatTimestamp` now renders relative labels such as "2 minutes ago".
- Fixed `manualChunks` with module-id matching. The verified build now emits `vendor-react` at about 194 kB
  and the app entry at about 67 kB, instead of leaving React DOM in the entry chunk.

**Verified:** `npm run typecheck` · `npm test` (74) · `npm run build` · `npm run test:e2e` (15).

---

## Files at a glance

**Modified (primary):** `server/index.ts` · `src/App.tsx` · `src/utils/crypto.ts` · `src/types.ts` ·
`src/constants.ts` · `src/components/{PinLock,PromptCard,Sidebar,Modal}.tsx` · `tsconfig.json` ·
`package.json` · `index.html` · `README.md` · `.env.example`

**New:** `server/{middleware,providers,prompts}/*` · `server/{normalize,cache}.ts` ·
`src/hooks/{useVault,useCloudSync,useMediaQuery,useLazyModule}.ts` ·
`src/components/{SettingsModal,ShortcutsModal,PromptViewModal,AppHeader,AppFooter}.tsx` ·
`src/utils/{merge,storage}.ts` · `supabase/migrations/0001_vaults.sql` · `public/sw.js` ·
`tests/unit/*.test.ts` · `tests/e2e/*.spec.ts` · `.github/workflows/ci.yml` · `vitest.config.ts` ·
`playwright.config.ts`

**Moved:** `googlebc237380bb232626.html` → `public/`

---

## Verification

Run at the end of every phase; each phase's own commit must leave all of it green.

**Automated**

```bash
npm install && npm run lint && npm test && npm run build && npm run test:e2e
```

- **Unit (Vitest):** `mergeVaults` conflict matrix · `encrypt`/`decrypt` round-trip, wrong-secret rejection,
  recovery-key unwrap, v1→v2 migration · `normalize*` fed hostile model output (objects in `weakSpots`,
  score `"abc"`, `null` tags, missing fields) · `extractJson` on fenced/bare/truncated/prose-wrapped input ·
  rate limiter window rollover · cache TTL, LRU eviction, in-flight coalescing.
- **E2E (Playwright):** create → search → copy → favourite → export → reimport · set PIN → reload → wrong
  PIN rejected → correct PIN unlocks · sort + theme toggle persist across reload · offline reload serves the
  app · `/api/suggest` mocked, plus one unmocked run when keys are present.

**Manual — the claims that were false**

1. Set a PIN, reload, then read `localStorage['prompt-vault-data']` in devtools. **Expect ciphertext only.**
   This is the check that proves the `Encrypted` badge.
2. Export a backup and grep it for `pinHash` and for any prompt body. **Expect no secrets.**
3. Toggle the theme and each sort mode; reload. Both persist.
4. `curl -s localhost:3002/api/typo` → JSON 404, not HTML.
5. `curl -X POST localhost:3002/api/suggest -d '{"prompt":"   "}'` → 400.
6. Point `GEMINI_API_KEY` at a blackhole (e.g. an iptables-dropped host); confirm the request falls back to
   Groq within the timeout instead of hanging.
7. `NODE_ENV=production` with `ALLOWED_ORIGINS` unset → server refuses to start.
8. `NODE_ENV=production npm start`, then confirm `/googlebc237380bb232626.html` returns 200.

**Manual — sync (needs two browser profiles, one Supabase project)**

9. Sign in on both. Delete prompt X on A; edit prompt Y on B. Wait for both syncs.
   **Expect: X stays deleted on both, Y keeps B's edit.** This is the exact case that loses data today.
10. Edit the *same* prompt on both within one sync window → the later `updatedAt` wins, no duplicates.
11. Sign in on a third fresh profile → full vault arrives, PIN state is local-only.

---

## Out of scope (flagging, not doing)

Multi-user sharing · prompt version history · a real backend database · i18n · analytics beyond the existing
GA4 · migrating off Express · React Compiler adoption · replacing Supabase.

Added after Phase 1: **migrating Gemini from `generateContent` to the Interactions API.** Google's own docs
now steer new work there, but nothing in the current path is deprecated or broken, and swapping API surfaces
is not a hardening change. Worth a dedicated pass later, with the `structuredOutputSupported` latch in
`providers/gemini.ts` as the safety net in the meantime.

## Sequencing note

Phases are ordered so each is independently shippable and reviewable: 0 (guardrails) → 1 (server) →
2 (client bugs + honest features) → 3 (refactor) → 4 (schema v2) → 5 (perf/offline/a11y). Phase 4 is the
largest and carries the only migration; it is deliberately last-but-one so it lands on a strict-typed,
tested, decomposed codebase rather than the current one. If you want to stop after any phase, the tree is
green and the claims are accurate as of that point — except that the `Encrypted` copy stays wrong until
Phase 4, which is why I would not stop before it.
