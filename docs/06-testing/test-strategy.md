# Quality Assurance & Test Strategy: PromptVault

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Document Type** | Comprehensive Test Strategy, Quality Assurance & Verification Plan |
| **Status** | Approved (Production Baseline) |
| **Version** | v2.2.0 |
| **Owner / Lead Architect** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Reference Documents** | [SRS](file:///o:/github/promptVault/docs/02-requirements/srs.md), [Architecture Blueprint](file:///o:/github/promptVault/docs/03-architecture/architecture.md), [Threat Model](file:///o:/github/promptVault/docs/04-security/threat-model.md) |

---

## 1. Testing in Plain English (Executive Overview)

When you buy a car, you trust that the brakes will stop the vehicle every time you press the pedal, that the seatbelts will lock instantly during a sudden stop, and that the car has survived rigorous crash-testing before ever entering a showroom.

In software, **automated tests are our safety crash tests**.

PromptVault is not an ordinary note-taking app. It is a **zero-knowledge privacy vault** designed to store confidential business logic, creative drafts, and private AI prompts. Because users trust PromptVault with their most valuable intellectual property:
1. **A bug cannot simply be an annoyance**: If encryption fails, private data is exposed. If cloud sync behaves incorrectly, valuable work is lost. If an unexpected power outage or browser reload occurs during saving, unsaved drafts could vanish.
2. **We test continuously and automatically**: Every time a line of code is written or modified, an army of automated robots runs through dozens of scenarios in fractions of a second to prove that the application still behaves with 100% mathematical reliability.

### The Testing Pyramid
PromptVault organizes testing into three focused tiers:

```
          / \
         / E2E \        Level 3: Full Browser End-to-End Tests (Playwright)
        / Tests \       Realistic user journeys, clicks, encryption UI, offline mode.
       /---------\
      / Component \     Level 2: React Component & Hook Tests (JSDOM)
     /   & Hooks   \    UI state changes, dark theme detection, storage listeners.
    /---------------\
   /   Unit Tests    \  Level 1: Fast Cryptographic & Logic Tests (Vitest)
  /-------------------\ Math, AES-256-GCM, PBKDF2 hashing, LWW merge engine.
```

- **Unit Tests (Fast & Mathematical)**: Test the raw engine gears (encryption math, timestamp comparison, JSON data parsing). They run in less than 4 seconds.
- **Component & Hook Tests (Interactive)**: Test whether buttons, color themes, and input forms respond accurately to user interactions.
- **End-to-End Tests (Full System)**: Launch a real, headless Google Chrome browser, navigate through the app, simulate internet disconnection, test clipboard copying, and verify encrypted storage.

---

## 2. Core Quality Invariants (What We Guarantee)

Our test suite exists to defend five inviolable product rules:

| Invariant Name | What It Means | How It Is Verified |
| :--- | :--- | :--- |
| **1. The Zero-Plaintext Invariant** | Plaintext prompts, secret tags, and PIN hashes must never touch the physical computer disk. | Automated tests inspect the browser's raw `localStorage` disk files after encryption and assert that the prompt text is completely undetectable. |
| **2. The Zero-Data-Loss Invariant** | Closing a tab or clicking reload immediately after typing a prompt must never lose the typed text. | Automated tests simulate immediate browser reloads during the debounce window, proving that the `pagehide` and `visibilitychange` emergency flushes persist data instantly. |
| **3. The Offline-First Invariant** | The application must load, view, search, and edit prompts even when the computer has no internet connection. | Playwright cuts off the network connection (`context.setOffline(true)`) and confirms the Service Worker shell serves the app from cache. |
| **4. The Memory-Zeroing Invariant** | Clicking "Lock Vault" must immediately scrub the encryption key and all decrypted prompts from computer memory. | Unit tests in `useVault.test.tsx` verify that `keyRef.current` is set to `null` and decrypted prompt arrays in React state and `dataRef` are completely zeroed. |
| **5. The Hostile-AI Invariant** | An upstream AI returning malformed JSON, strange arrays, or network errors must never crash the web app. | Normalization tests feed broken, incomplete, or corrupted responses to the parser, confirming that safe fallback defaults are always rendered. |

---

## 3. Test Levels & Suite Architecture

### Level 1: Unit & Cryptographic Tests ([tests/unit/](file:///o:/github/promptVault/tests/unit))
Built with **Vitest v4**, running directly in a high-speed Node.js 18+ runtime with native WebCrypto APIs.

- **[crypto.test.ts](file:///o:/github/promptVault/tests/unit/crypto.test.ts)**:
  - Generates 600,000-iteration PBKDF2 keys using SHA-256.
  - Verifies AES-256-GCM encryption produces a randomized 12-byte IV and 16-byte authentication tag per save.
  - Proves that a wrong PIN fails decryption cleanly with an `OperationError`.
  - Verifies that the 64-character Emergency Recovery Key successfully recovers the vault.
- **[merge.test.ts](file:///o:/github/promptVault/tests/unit/merge.test.ts)**:
  - Verifies the Last-Write-Wins (LWW) conflict reconciliation engine.
  - Ensures that when two devices edit the same prompt simultaneously, the latest millisecond timestamp (`updatedAt`) wins deterministically.
  - Tests 30-day deletion tombstones, proving deleted prompts stay deleted across synchronizations.
- **[normalize.test.ts](file:///o:/github/promptVault/tests/unit/normalize.test.ts)**:
  - Feeds hostile, malformed payloads into the AI response normalizer.
  - Ensures scores are clamped between 0.0 and 10.0, labels match valid categories, and missing categories fall back cleanly to "General".
- **[cache.test.ts](file:///o:/github/promptVault/tests/unit/cache.test.ts)**:
  - Tests 30-minute in-memory response caching and request deduplication.
  - Proves that identical requests in flight share a single network call.
- **[storage.test.ts](file:///o:/github/promptVault/tests/unit/storage.test.ts)**:
  - Tests local storage serialization, schema versioning, and quota overflow handling (`QuotaExceededError`).
- **[json.test.ts](file:///o:/github/promptVault/tests/unit/json.test.ts)**:
  - Tests extraction of JSON objects from markdown code fences and automatic repair of truncated JSON strings.
- **[useMediaQuery.test.tsx](file:///o:/github/promptVault/tests/unit/useMediaQuery.test.tsx)**:
  - Uses JSDOM to test system dark-mode preference listeners and responsive layout triggers.
- **[PinLock.test.tsx](file:///o:/github/promptVault/tests/unit/PinLock.test.tsx)**:
  - Uses JSDOM to verify PIN and Passphrase protection setup, validation, and unlock flows.
  - Confirms Passphrase is the recommended default tab on vault creation.
  - Verifies minimum 6-digit PIN enforcement on creation and rejects non-numeric inputs.
  - Confirms backward compatibility allowing 4-digit PIN unlock for legacy vaults.
  - Tests progressive cooldown delay timers and submission blocking after consecutive failed unlock attempts.
- **[useVault.test.tsx](file:///o:/github/promptVault/tests/unit/useVault.test.tsx)**:
  - Uses JSDOM to test active session memory hygiene upon manual lock.
  - Verifies `keyRef.current` is wiped synchronously and decrypted prompts in React state and `dataRef` are replaced with an empty vault.
  - Confirms the encrypted envelope in `localStorage` is preserved and not overwritten by empty state.
  - Verifies unlocking cleanly restores the decrypted prompts.

---

### Level 2: End-to-End Browser Tests ([tests/e2e/](file:///o:/github/promptVault/tests/e2e))
Built with **Playwright v1.62**, running against the real, optimized production build (`dist/`) served over HTTP on port 4173.

- **[lock.spec.ts](file:///o:/github/promptVault/tests/e2e/lock.spec.ts)**:
  - **Full Vault Protection Workflow**: Creates a prompt with a secret canary string, sets a 6-digit PIN (complying with the 6-digit creation rule), confirms recovery key display, and verifies the raw `localStorage` disk file contains zero traces of the secret canary string.
  - **Reload & Unlock Workflow**: Reloads the page, verifies the PIN lock dialog appears, inputs an incorrect PIN ('987654') and asserts that an "Incorrect pin" error alert is shown, then enters the valid PIN and verifies prompt decryption.
  - **Manual Session Lock Workflow**: Tests clicking the header lock button without reloading, verifying the vault locks immediately, prompts disappear from view, and unlocking restores them.
- **[vault.spec.ts](file:///o:/github/promptVault/tests/e2e/vault.spec.ts)**:
  - **CRUD Operations**: Creates, edits, and reads prompts from the UI grid.
  - **Instant Search**: Types into search and proves unrelated prompts are filtered out in real time.
  - **Virtual Scrolling**: Injects 260 prompts into storage and verifies that fewer than 80 DOM nodes are rendered at once, keeping scroll rendering fast.
  - **Clipboard Integration**: Verifies that clicking "Copy" writes the prompt body directly into the system clipboard.
  - **Immediate Reload Persistence**: Verifies that refreshing immediately after a save preserves all text, confirming emergency unload handlers function properly.
  - **Offline PWA Capability**: Tests loading the app, turning network off (`context.setOffline(true)`), and refreshing the page to verify that the Service Worker shell renders normally.
- **[ui.spec.ts](file:///o:/github/promptVault/tests/e2e/ui.spec.ts)**:
  - **Sort Ordering**: Tests sorting by Recently Added, Recently Updated, and Alphabetical (A to Z), verifying sort order persists across reloads.
  - **Theme Toggling**: Flips between dark and light themes, verifying that `theme-init.js` sets the correct HTML class before first paint to prevent white flash.
  - **Accessible In-App Dialogs**: Verifies that category creation and deletion use accessible modal dialogs with focus trapping and Escape-key closing, replacing legacy browser popup prompts.
  - **Schema-Validated File Import**: Uploads corrupted JSON files and verifies that field-by-field diagnostic errors appear on screen instead of generic crash dialogs.
  - **Sanitized Backup Export**: Downloads an unencrypted JSON backup and proves that PIN hashes, recovery keys, and internal secrets are excluded from the exported file.

---

### Level 3: Static Analysis & Type Safety
- **Multi-Project TypeScript Verification (`npm run typecheck`)**:
  - Compiles four independent TypeScript projects simultaneously:
    1. Client code (`tsconfig.json`)
    2. Express API server (`tsconfig.server.json`)
    3. Vite and build configuration (`tsconfig.node.json`)
    4. Test suites and mocks (`tsconfig.test.json`)
  - Ensures zero type coercion bugs, missing properties, or invalid function parameters exist anywhere in the repository.

---

### Level 4: Live AI Key Health Suite ([scripts/test-api-keys.ts](file:///o:/github/promptVault/scripts/test-api-keys.ts))
- Runs lightweight metadata requests (`GET /v1beta/models/{model}`) against all configured Google Gemini keys in the pool and Groq Cloud.
- Validates key authenticity, model availability, network latency, and quota exhaustion without consuming user tokens or generation budgets.
- Includes an automated `--wait` mode to pause for 60 seconds and retest rate-limited keys.

---

## 4. Test Environment Matrix & Tooling

| Test Level | Tool / Framework | Runtime Environment | Execution Trigger | Average Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Type Check** | TypeScript `tsc` (v5.8) | Node.js (CLI) | Pre-commit / CI | ~1.8 seconds |
| **Unit Tests** | Vitest (v4.1) | Node.js 18+ & JSDOM | Every code change / CI | ~3.6 seconds |
| **E2E Tests** | Playwright (v1.62) | Headless Chromium | Pull Requests / Releases | ~18 seconds |
| **Key Diagnostics** | Custom TypeScript Runner | Standalone HTTP Fetch | Operations / Key Rotation | ~2.5 seconds |

---

## 5. Pass/Fail Acceptance Criteria

For any build, pull request, or release to be certified as production-ready, it must achieve a 100% pass mark against the following checklist:

1. **Unit Test Pass Rate**: 74 out of 74 unit tests must pass with zero failures and zero skipped tests.
2. **Type Check Cleanliness**: `npm run typecheck` must exit with return code `0` and zero warnings or errors across all four `tsconfig` files.
3. **E2E Browser Pass Rate**: All 11 browser test scenarios across `lock.spec.ts`, `vault.spec.ts`, and `ui.spec.ts` must pass in an isolated Chromium context.
4. **Zero-Plaintext Compliance**: Automated assertion `expect(localStorage.getItem('prompt-vault-data')).not.toContain(SECRET)` must succeed.
5. **Zero Flakiness Rule**: Any test that exhibits intermittent timing failures is investigated and rewritten using deterministic polling (`expect.poll()`) rather than arbitrary wait timers.

---

## 6. How to Run the Tests (Operator Guide)

### Running Fast Unit Tests
To run all 74 unit tests once:
```bash
npm test
```

To run unit tests in interactive watch mode (automatically re-running when files change):
```bash
npm run test:watch
```

### Running Static Type Verification
To verify full TypeScript correctness across client, server, and tests:
```bash
npm run typecheck
```

### Running Full Browser End-to-End Tests
To compile the production bundle and run Playwright tests in headless Chromium:
```bash
npm run test:e2e
```

To open the interactive Playwright visual test UI:
```bash
npx playwright test --ui
```

### Checking AI Provider API Keys
To verify every API key in your `.env` file without spending tokens:
```bash
npm run test:keys
```

To automatically wait out rate-limit cooldown windows during testing:
```bash
npm run test:keys:wait
```

---

## 7. Regression Prevention History

Our test strategy is grounded in lessons learned during development. Several key test cases exist specifically to lock in past bug fixes permanently:

1. **Debounce Tab-Close Bug**:
   - *Past Problem*: PromptVault used a 500ms debounce timer before saving to local storage. If a user typed a prompt and immediately closed or refreshed the tab, the save was canceled and work was lost.
   - *Permanent Regression Lock*: `tests/e2e/vault.spec.ts` ("a prompt survives an immediate reload") immediately triggers a browser reload without waiting, proving the `pagehide` flush works.
2. **Window.prompt Playwright Disconnect**:
   - *Past Problem*: Legacy browser `window.prompt` and `window.confirm` dialogs were blocked by modern popup blockers and could not be tested by automated tools.
   - *Permanent Regression Lock*: `tests/e2e/ui.spec.ts` validates that all prompts and confirmations render within accessible in-app modal components.
3. **Model Output Structure Drift**:
   - *Past Problem*: Upstream LLMs occasionally returned an array of objects `[{ gap: "missing details" }]` instead of an array of strings `["missing details"]`, which caused React rendering crashes.
   - *Permanent Regression Lock*: `tests/unit/normalize.test.ts` feeds deeply nested hostile objects into the normalizer and asserts that clean string arrays are always produced.
