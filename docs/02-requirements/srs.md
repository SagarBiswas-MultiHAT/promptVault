# Software Requirements Specification (SRS): PromptVault

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Document Type** | Software Requirements Specification (SRS) |
| **Status** | Approved (Production Baseline) |
| **Version** | v2.2.0 |
| **Owner / Lead Engineer** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Scope** | Client Web Application, Express AI Proxy, and Supabase Sync Layer |
| **Reference Documents** | [Vision & Charter](file:///o:/github/promptVault/docs/00-overview/vision-charter.md), [PRD](file:///o:/github/promptVault/docs/01-product/prd.md) |

---

## 1. Introduction & Purpose

This Software Requirements Specification (SRS) establishes the formal functional and non-functional requirements for **PromptVault v2.2.0**. It translates the high-level user needs outlined in the [Product Requirements Document (PRD)](file:///o:/github/promptVault/docs/01-product/prd.md) into quantifiable, testable engineering specifications.

This document serves as the single source of truth for software engineers, quality assurance testers, security auditors, and system architects. Every requirement defined herein is objectively verifiable with concrete metrics (e.g., millisecond latency thresholds, iteration counts, cryptographic key lengths, and availability percentages).

---

## 2. Operating Environment & System Architecture

PromptVault operates under a hybrid client-first architecture comprising three distinct runtime tiers:

| Tier | Component | Technology Stack | Runtime Environment |
| :--- | :--- | :--- | :--- |
| **Tier 1: Client Application** | Single Page Application (PWA) | React 19, TypeScript 5.8 (Strict), Vite 6, Tailwind CSS v4, Motion 12 | Evergreen Web Browsers: Chrome 110+, Safari 16+, Edge 110+, Firefox 115+, iOS Safari, Android Chrome |
| **Tier 2: Backend Proxy** | AI Suggestion & Rate-Limit Gateway | Node.js 20+ LTS, Express 5, Helmet, Compression, Express Rate Limit | Self-hosted Node.js VPS, Docker Container, or Cloud PaaS (Render, Railway, Fly.io) |
| **Tier 3: Cloud Database (Optional)** | Identity & Multi-Device Sync | Supabase (PostgreSQL 15+, GoTrue OAuth 2.0 PKCE, Row-Level Security) | Managed Supabase Cloud (AWS / GCP multi-region) |

---

## 3. Specific Functional Requirements (FR)

### FR-1: On-Device Vault Storage & Lifecycle Management
- **FR-1.1 Local Persistence Engine**: The application shall persist the entire vault state (`prompts`, `categories`, and `settings`) in the browser's `localStorage` under the storage key `prompt-vault-data`.
- **FR-1.2 Asynchronous Write Versioning**: To prevent race conditions from concurrent browser tabs or rapid typing, writes shall increment an internal integer counter (`writeVersion.current`). Out-of-order writes where `version !== writeVersion.current` shall be aborted automatically.
- **FR-1.3 Quota Monitoring & Recovery**: The client shall catch browser `QuotaExceededError` exceptions. When storage approaches browser capacity (typically 5MB - 10MB per origin), a `StorageErrorBanner` shall be displayed within 100 milliseconds, alerting the user to export or purge old data.
- **FR-1.4 Soft Deletion & Tombstones**: Prompt and category deletions shall not instantly purge raw records. Instead, the entity's `deletedAt` field shall be set to the current epoch timestamp (`Date.now()`) to enable cross-device sync propagation.

### FR-2: Client-Side Zero-Knowledge Cryptography
- **FR-2.1 Key Derivation Function (KDF)**:
  - Algorithm: PBKDF2 with HMAC-SHA-256.
  - Iteration Count: Exactly 600,000 calculation rounds (`PBKDF2_ITERATIONS = 600_000`).
  - Salt: 16 bytes (128 bits) of cryptographically secure random bytes generated via `crypto.getRandomValues`.
  - Target Derivation Latency: <= 2,500ms on modern desktop CPUs; <= 4,000ms on mobile ARM processors.
- **FR-2.2 Master Data Encryption Key (DEK)**:
  - Key Length: 32 bytes (256 bits) high-entropy AES key.
  - Key Storage: Kept exclusively in non-extractable browser memory (`CryptoKey` object held in React ref `keyRef.current`). The DEK shall never be written to disk in unencrypted form.
- **FR-2.3 Envelope Encryption Scheme**:
  - Algorithm: AES-256-GCM with a 12-byte (96-bit) random Initialization Vector (IV).
  - Dual Key Wrappers:
    1. `primary`: DEK encrypted using the user's secret-derived Key Encryption Key (KEK).
    2. `recovery`: DEK encrypted using an emergency recovery key-derived KEK.
  - Secret Constraints:
    - Numeric PIN mode: Minimum 6 digits for new vaults, maximum 12 digits (`/^[0-9]+$/`). Legacy vaults retain backward-compatible unlock at minimum 4 digits.
    - Passphrase mode: Minimum 15 characters, maximum 128 characters (default setup mode).
  - Progressive Brute-Force Delay Cooldown: The unlock UI enforces progressive cooldown delays after consecutive failed attempts (starting at 2s after 3 failures, up to 30s for repeated failures).
  - Emergency Recovery Token: Exactly 32 bytes (256 bits) of random entropy formatted as a 64-character lowercase hexadecimal string.
- **FR-2.4 Zero Plaintext at Rest**: When protection is active, 0 bytes of plaintext prompt titles, prompt bodies, tags, or PIN hashes shall exist in `localStorage`.
- **FR-2.5 Instant Memory Wipe**: When the user clicks "Lock Vault", `keyRef.current` shall be set to `null` synchronously, and decrypted prompts in React state shall be cleared within 16 milliseconds.

### FR-3: Template Variable Extraction & Smart Clipboard Copy
- **FR-3.1 Placeholder Detection**: The client shall extract variables from prompt bodies matching the double-curly brace pattern `/{{\s*([a-zA-Z0-9_-]+)\s*}}/g`.
- **FR-3.2 Interactive Variable Form**: If one or more unique variables are detected on copy, the client shall render `VariableForm` modal in <= 50ms, presenting input fields for each placeholder.
- **FR-3.3 Value Substitution**:
  - Clicking "Inject & Copy" shall replace all occurrences of `{{variable_name}}` with the user's input.
  - If a field is left empty, the tag shall fallback to bracketed notation `[variable_name]`.
  - Clicking "Skip" shall copy the original raw text without substitution.
- **FR-3.4 Clipboard Latency & Visual Feedback**:
  - Clipboard write via `navigator.clipboard.writeText()` shall execute in <= 50ms.
  - Upon success, the prompt card shall display a green "Copied!" checkmark badge for exactly 2,000ms (`setTimeout` window).
  - The prompt's `usageCount` shall increment by exactly 1, and `updatedAt` shall update to the current timestamp.
- **FR-3.5 Error Handling**: If clipboard permissions are blocked by the browser or non-HTTPS origin, a `CopyErrorToast` banner shall display: *"Could not copy to the clipboard. Your browser may have blocked it, or this page is not on HTTPS."*

### FR-4: AI Prompt Doctor (Scoring, Rewriting & Proxy Gateway)
- **FR-4.1 Quality Rubric Evaluation**:
  - Endpoint: `POST /api/suggest` with payload `{ prompt: string, categories: string[], mode: 'analyze' }`.
  - The AI shall evaluate the prompt across an 8-point rubric:
    1. Clear Objective & Goal
    2. Role & Persona Definition
    3. Essential Context & Background
    4. Explicit Constraints & Boundaries
    5. Output Format Contract (JSON, Markdown, etc.)
    6. Concrete Few-Shot Examples
    7. Edge Cases & Exception Handling
    8. Safety Guardrails & Negative Constraints
  - Output Contract: Returns a JSON object containing `qualityScore` (0.0 - 10.0), `scoreLabel` (`EXCELLENT`, `GOOD`, or `CONSIDER IMPROVING`), `weakSpots` (array of strings), `improvements` (array of strings), suggested `title`, suggested `category`, and suggested `tags`.
- **FR-4.2 Automated Prompt Engineering Rewrite**:
  - Endpoint: `POST /api/suggest` with payload `{ prompt: string, categories: string[], mode: 'improve' }`.
  - Returns `improvedPrompt` (string) with all identified defects resolved and `improvementsMade` (array of strings).
- **FR-4.3 Dual-Provider Resilience & Automatic Fallback**:
  - Primary Provider: Google Gemini (default: `gemini-3.6-flash`, configurable via `GEMINI_MODEL`).
  - Secondary Provider: Groq Cloud (default: `qwen/qwen3.8-27b`, configurable via `GROQ_MODEL`).
  - Fallback Trigger: If Gemini returns an HTTP error (429, 500, 503) or times out after 35,000ms, the proxy shall automatically switch to Groq without returning an error to the client.
- **FR-4.4 Rate Limiting & Response Caching**:
  - IP Rate Limiting: 30 requests per minute per IP, enforced via an in-memory sliding window bucket. Exceeding limits returns HTTP 429 with standard `X-RateLimit-*` and `Retry-After` headers.
  - In-Memory Cache: Stores up to 200 recent evaluation responses with a 30-minute Time-To-Live (TTL = 1,800,000ms). Cached requests shall resolve in <= 15 milliseconds.

### FR-5: Multi-Device Cloud Synchronization (Supabase)
- **FR-5.1 Authentication Flow**: Uses Supabase GoTrue with Google OAuth 2.0 PKCE flow, storing JWT access tokens in browser session storage.
- **FR-5.2 Row-Level Security (RLS)**: The `public.vaults` database table shall enforce PostgreSQL RLS policies where `auth.uid() = user_id`, guaranteeing users can query and mutate only their own record.
- **FR-5.3 Keystroke Debounce**: Local changes shall wait 1,000 milliseconds (`pushTimer` window) after the last keystroke before initiating a network push.
- **FR-5.4 Silent Background Polling**: The client shall poll `public.vaults` every 30,000 milliseconds (30 seconds) for external changes. If the remote `updated_at` is newer than `lastRemoteChangeAt`, the client shall trigger `applyRemoteData()`.
- **FR-5.5 Conflict Resolution Engine (merge.ts)**:
  - Per-entity Last-Write-Wins: Evaluates `left.updatedAt` vs `right.updatedAt`. The entity with the newer timestamp wins.
  - Tombstone Retention: Deletion records (`deletedAt != null`) shall be retained for 30 days (`30 * 86,400,000` ms = 2,592,000,000 ms) before physical sweep (`sweepTombstones`), preventing resurrected prompts.
- **FR-5.6 Echo Loop Prevention**: When applying remote changes locally, `suppressLocalChange.current` shall be set to `true`, preventing local state updates from triggering an accidental echo push back to the server.

### FR-6: Portable Backup Export & Schema-Sanitized Import
- **FR-6.1 Sanitized Export**: Clicking "Export" in Settings shall invoke `withoutSecrets(dataRef.current)` to strip all DEK/KEK credentials, triggering a direct browser download of `vault-export-YYYY-MM-DD.json`.
- **FR-6.2 Schema Validation**: When a JSON file is uploaded for import, `describeVaultProblems()` shall validate that:
  - `schemaVersion` is equal to `'2.0.0'`.
  - `prompts` is an array of objects containing valid `id`, `title`, and `body` strings.
  - `categories` is an array of objects containing valid `id` and `name` strings.
- **FR-6.3 Import Dialog Workflow**:
  - Discrepancies shall trigger `ImportErrorDialog` displaying the exact failing fields.
  - Valid files shall trigger `ImportConfirmDialog` previewing the count of incoming prompts and categories. Confirming executes `mergeVaults()` to preserve newer local edits.

### FR-7: Progressive Web App & Offline Execution Shell
- **FR-7.1 Offline Asset Caching**: The Service Worker (`sw.js`) shall pre-cache the HTML shell, compiled JavaScript bundles, CSS stylesheets, and icons.
- **FR-7.2 Theme Initialization**: `theme-init.js` shall execute in the document `<head>` before the DOM renders, preventing theme flickering (FOUC) between dark and light modes.
- **FR-7.3 Full Offline Capability**: 100% of core vault operations (creating, editing, organizing, searching, copying, encrypting, and exporting prompts) shall function normally without an internet connection.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Response Latency
- **NFR-1.1 First Contentful Paint (FCP)**: The initial client application shell shall achieve an FCP of <= 1.0 second on standard broadband connections and <= 2.0 seconds on mobile 4G networks.
- **NFR-1.2 Search Responsiveness**: In-memory search filtering across a library of 2,000 prompts shall complete in <= 16 milliseconds (maintaining a fluid 60 frames-per-second UI).
- **NFR-1.3 Initial Bundle Budget**: The gzipped production JavaScript bundle shall not exceed 150 KB. Non-critical modules (`motion` and `@supabase/supabase-js`) shall load deferred during browser idle time (`requestIdleCallback`).

### NFR-2: Security, Privacy & Compliance
- **NFR-2.1 Transport Security**: 100% of network communications (AI proxy and Supabase REST) shall be enforced over TLS 1.3 (HTTPS).
- **NFR-2.2 HTTP Security Headers**: The Express proxy server shall emit:
  - `Content-Security-Policy`: `default-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; object-src 'none'`.
  - `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
  - `X-Content-Type-Options`: `nosniff`.
  - `X-Frame-Options`: `DENY`.
- **NFR-2.3 Zero Third-Party Telemetry**: The application shall contain 0 tracking pixels, 0 analytics scripts, and 0 third-party advertising SDKs.

### NFR-3: Reliability, Availability & Fault Tolerance
- **NFR-3.1 Client Availability**: 100% offline availability for stored prompt access and encryption operations.
- **NFR-3.2 AI Proxy Service Level Objective (SLO)**: >= 99.9% uptime for `/api/suggest` requests, achieved through automatic multi-region fallback between Google Gemini and Groq Cloud.
- **NFR-3.3 Automated Test Suite**: 100% of automated unit tests (74 tests in Vitest across 9 test suites) must pass cleanly on every build. Zero test regressions or flaky tests are permitted.

### NFR-4: Accessibility & Keyboard Ergonomics (WCAG 2.1 AA)
- **NFR-4.1 Color Contrast**: Text and interactive UI elements shall meet or exceed WCAG 2.1 Level AA contrast ratios (>= 4.5:1 for normal text, >= 3:1 for large headings and input borders).
- **NFR-4.2 Keyboard Navigation**:
  - Global shortcuts shall be supported: `Cmd+K` / `Ctrl+K` (focus search), `Cmd+N` / `Ctrl+N` (new prompt), `Escape` (dismiss modals/search).
  - Modal dialogs shall trap keyboard focus inside the dialog while open and restore focus to the triggering element upon dismissal.
- **NFR-4.3 Screen Reader Compatibility**: All modal dialogs shall carry `role="dialog"`, `aria-modal="true"`, and appropriate `aria-labelledby` attributes.

---

## 5. System Constraints & Boundary Limits

| Constraint Area | System Limit | Technical Reason |
| :--- | :--- | :--- |
| **Local Storage Capacity** | ~5 MB to 10 MB per origin | Standard browser-enforced storage quota for `localStorage`. |
| **Maximum Prompts Supported** | 2,500 prompts (approx. 2.5 MB) | Ensures storage safety while maintaining 60 FPS in-memory search. |
| **Max AI Prompt Input Length** | 10,000 characters (min 3 chars) | Enforced at `/api/suggest` to prevent LLM context overflow and token exhaustion. |
| **AI Rate Limit** | 30 requests per minute per IP | Prevents abusive automated scraping and protects backend API quotas. |
| **Tombstone Retention Period** | Exactly 30 days | Balances cross-device sync propagation against local storage conservation. |
| **Minimum Secret Complexity** | PIN: 6 digits (4 digits legacy unlock); Passphrase: 15 chars | Enforces 1,000,000 keyspace for PINs and defaults to high-entropy Passphrases. |

---

## 6. Verification & Acceptance Criteria Matrix

| Requirement ID | Verification Method | Acceptance Pass Criteria |
| :--- | :--- | :--- |
| **FR-1 & FR-6** | Unit Tests (`tests/unit/storage.test.ts`) | Reads, writes, quota catches, and schema upgrades execute with 100% pass rate. |
| **FR-2** | Unit Tests (`tests/unit/crypto.test.ts`, `tests/unit/PinLock.test.tsx`, `tests/unit/useVault.test.tsx`) | Round-trips AES-256-GCM encryption with 600k PBKDF2 iterations; enforces 6-digit PIN creation, passphrase default, 4-digit unlock compatibility, progressive cooldown delays; rejects incorrect secrets; zeroes decrypted prompts upon lock; accepts 64-char recovery key. |
| **FR-3** | Unit Tests (`tests/unit/prompts.test.ts`) | Variable extraction correctly captures double-bracket placeholders; substitution replaces tags accurately. |
| **FR-4** | Integration Tests & Proxy Logs | Mode 'analyze' returns 0-10 score and rubric; mode 'improve' rewrites prompt; fallback to Groq triggers on Gemini failure. |
| **FR-5** | Unit Tests (`tests/unit/merge.test.ts`) | Last-Write-Wins resolves timestamps; tombstones win ties; sweep cleans records older than 30 days. |
| **NFR-1** | Lighthouse & Performance Profiler | Initial FCP < 1.0s; search filter across 1,000 items renders in < 16ms without frame drops. |
| **NFR-4** | a11y Automated Audit & Keyboard Test | Zero critical axe-core accessibility violations; 100% modal focus trap compliance. |

---

## 7. Technical References & Architectural Diagrams

The requirements defined in this specification directly correspond to the verified architecture diagrams in the repository:
- [System Architecture Overview](file:///o:/github/promptVault/diagrams/architecture.png): Multi-tier layout and hook composition.
- [Zero-Knowledge Encryption Workflow](file:///o:/github/promptVault/diagrams/encryption-workflow.png): Cryptographic DEK/KEK sequence and memory lifecycle.
- [Cloud Sync Lifecycle](file:///o:/github/promptVault/diagrams/cloud-sync-lifecycle.png): 1-second debounce, 30-second poll, and conflict resolution engine.
- [AI Suggestion Pipeline](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png): Rate limiting, caching, dual fallback, and rubric scoring.
- [Runtime Workflows](file:///o:/github/promptVault/diagrams/runtime-workflows.png): User interaction flows for smart copy, AI assistant, and JSON export/import.
