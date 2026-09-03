# Changelog

All notable changes to PromptVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-08-29

### Added
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
