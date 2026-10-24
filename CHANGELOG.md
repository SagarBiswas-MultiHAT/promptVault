# Changelog

All notable changes to PromptVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-10-25

### Added
- **Manifest V3 Browser Extension:** Introduced the official PromptVault Chromium browser extension (Chrome, Edge, Brave, Opera) powered by Manifest V3 with an offline-first storage bridge.
- **In-Chat Quick Picker Overlay:** Injected floating zero-knowledge prompt search and insertion overlay into ChatGPT (`chatgpt.com`), Claude (`claude.ai`), DeepSeek (`chat.deepseek.com`), Google AI Studio (`aistudio.google.com`), and v0 (`v0.dev`), isolated in a custom Shadow DOM.
- **One-Click Context Menu Clipping:** Highlight text on any web page and right-click "Save to PromptVault" to queue or append prompts into the vault.
- **Dedicated Extension OAuth Flow:** Implemented `chrome.identity.launchWebAuthFlow` for Google OAuth with Supabase synchronization, keeping tokens and session state secure within extension storage.
- **Deterministic Cryptographic Key:** Fixed a permanent 2048-bit RSA key in `manifest.json` ensuring a consistent extension ID (`npnpfcekohdmaindglkpddodjdbhbboo`) across local development, unpacked distribution, and testing environments.
- **Session Encryption Bridge:** Secure runtime transfer of session keys between background service worker and content scripts using `chrome.storage.session`.
- **Extended Test Suite:** Expanded automated test coverage from 81 tests to 141 tests across 18 test suites (including extension host DOM matching, content injection, session key lifecycle, and pending clip queues).

### Changed
- **Settings Modal & UI Overhaul:** Redesigned Cloud Sync status card with inline sign-out, side-by-side 2-column sync telemetry, full-width sync action with live spinner, and fixed Storage Engine multi-tier alignment.
- **Responsive Dialog Viewports:** Optimized `Modal.tsx` paddings (`p-3 sm:p-4`, `px-4 sm:px-6`) for 420px browser extension popups and narrow mobile devices.
- **Strict Privacy Policy:** Established official `PRIVACY.md` defining zero prompt tracking, client-side encryption guarantees, and anonymous page-view analytics boundaries.
- **Core Decoupling:** Refactored core business logic into environment-agnostic shared modules (`src/core/`), separating web application state from extension background and content scripts.

---

## [2.2.1] - 2026-10-22

### Security
- **PIN Entropy Hardening:** Numeric PIN creation now requires a minimum of 6 digits (up from 4), increasing the keyspace from 10,000 to 1,000,000 combinations. Existing 4-digit vaults remain unlockable for full backward compatibility.
- **Progressive Cooldown Delays:** Added progressive backoff timers on repeated failed unlock attempts to mitigate brute-force attempts.
- **Active Session Memory Hygiene:** Decrypted prompts in React state and internal data references are synchronously zeroed upon manual vault lock, and all active modals and overlays are immediately reset.
- **Defensive Storage Guard:** Added a defensive check preventing accidental unencrypted data persistence when the vault is in a locked state.

### Added
- **Docs-as-Code Technical Portal:** Established a structured documentation suite in `docs/` covering Product Requirements (PRD), Software Requirements Specification (SRS), C4 Architecture, ERD Data Model, STRIDE Threat Model, OpenAPI 3.1.0 specs, Test Strategy, and Deployment Runbooks.
- **Architectural Decision Records (ADRs):** Authored formal ADRs (0001 - 0004) documenting envelope encryption, dual AI fallback, Last-Write-Wins tombstone synchronization, and backend proxy isolation.
- **Super-Ultra-High-Quality Visual Diagrams:** Generated 300% DPI (3x scale) dark-mode architecture and workflow PNG diagrams in `diagrams/` matching the core theme background (`#08090A`).
- **Memory Hygiene & PIN Unit Tests:** Added dedicated unit test suites (`PinLock.test.tsx`, `useVault.test.tsx`) bringing automated unit test coverage to 81 passing tests across 11 suites.

### Changed
- **Toolchain Security Upgrade:** Upgraded Vite to 6.4.5, achieving 0 vulnerabilities across all dependencies in `npm audit`.
- **Search Engine & Agentic Crawling:** Enriched `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` to provide full discoverability for AI agent search engines (GPTBot, ClaudeBot, PerplexityBot).

---

## [2.2.0] - 2026-08-29

### Added
- **Official Apache 2.0 Licensing & NOTICE Protection:** Standardized the repository under the Apache License 2.0 with a root NOTICE file mandating UI and documentation attribution (Section 4d), trademark protection (Section 6), and repository-wide SPDX provenance headers.
- **True Client-Side Encryption:** Vault data is protected with AES-256-GCM encryption using the Web Crypto API, derived via PBKDF2-SHA-256 with 600,000 iterations and a cryptographically random salt.
- **Envelope Encryption Architecture:** Implemented 256-bit Data Encryption Key (DEK) and Key Encryption Key (KEK) key wrapping.
- **Passphrase & PIN Modes:** Support for both high-entropy passphrase mode and convenient numeric PIN mode, with clear security trade-off explanations.
- **Emergency Recovery Key:** Generates a one-time emergency recovery key during vault lock setup to prevent permanent data loss if credentials are forgotten.
- **Resilient Cloud Sync:** Per-entity Last-Write-Wins (LWW) synchronization algorithm with 30-day tombstones, preventing deleted prompts from resurrecting across devices.
- **Dual AI Provider Proxy:** Express proxy with dual-provider architecture (Google Gemini primary, Groq high-speed fallback), structured JSON schema enforcement, in-flight request coalescing, and SHA-256 response caching.
- **Key Health Diagnostics:** Added `npm run test:keys` and `npm run test:keys:wait` zero-token diagnostic scripts for API key authentication and cooldown testing.
- **Instant Paint Optimization:** Inlined critical CSS, pre-paint theme initialization to prevent dark/light flash, and non-blocking font preconnections.
- **Comprehensive Test Suite:** Added Vitest unit test suite (74 tests) and Playwright browser end-to-end testing pipeline.
- **Strict Multi-Project Typechecking:** Enforced TypeScript strict mode across four separate project configurations (application, proxy server, build tooling, and test suites).

### Changed
- Upgraded frontend framework to React 19.0.
- Upgraded styling pipeline to Tailwind CSS v4.
- Migrated bundler to Vite 6 with code splitting and optimized dynamic imports.
- Updated documentation with step-by-step VPS deployment and single-command update instructions.

### Fixed
- Fixed prompt leak vulnerability where vaults marked as locked previously remained in plaintext browser storage.
- Fixed search shortcut handler focus conflict between desktop and mobile input elements.
- Fixed cloud synchronization race condition where full-document upserts could overwrite concurrent edits on secondary devices.

---

## [2.1.0] - 2026-06-15

### Added
- **AI Proxy Server:** Dedicated local Express proxy that securely houses AI API keys on the server, eliminating any exposure to client browsers.
- **Dynamic Variable Injection:** Parameterized prompt templates supporting `{{variable}}` syntax with automatic fill-in modal forms before clipboard copying.
- **Rate Limiting & Security Headers:** Integrated express-rate-limit (30 requests/minute), HSTS, nosniff, and strict Content Security Policy.
- **Response Caching:** In-memory LRU cache storing normalized AI responses to conserve API rate limits.

### Changed
- Redesigned prompt card UI with improved category pill tags, star ratings, and quick copy actions.
- Improved dark and light theme contrast and token consistency.

---

## [2.0.0] - 2026-04-10

### Added
- **Supabase Cloud Sync:** Optional cross-device synchronization backed by Supabase PostgreSQL and Google OAuth authentication.
- **Row Level Security:** Strict database access control ensuring authenticated users can only query and mutate their own vault records.
- **Full Vault Portability:** JSON backup export and import with structural validation and schema sanitization.
- **Usage Metrics Dashboard:** Real-time analytics tracking most-used prompts, category distributions, and copy frequency.

### Changed
- Migrated storage layer to an offline-first architecture with proactive local caching.

---

## [1.0.0] - 2026-01-20

### Added
- Initial open-source release of PromptVault.
- Local browser prompt library with category filtering and real-time search.
- AI prompt improvement and scoring assistant powered by Google Gemini.
- Responsive mobile and desktop layout with dark mode support.
- One-click clipboard copy and tag management.
