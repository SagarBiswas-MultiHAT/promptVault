# Product Requirements Document (PRD): PromptVault

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Document Type** | Product Requirements Document (PRD) |
| **Status** | Approved (Production Baseline) |
| **Version** | v2.2.1 |
| **Owner / Product Lead** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Target Platforms** | Web, Mobile Web, Desktop PWA (Chrome, Safari, Edge, Firefox) |
| **Reference Charter** | [Vision & Charter](file:///o:/github/promptVault/docs/00-overview/vision-charter.md) |

---

## 1. Product Overview & Purpose

PromptVault is an open-source, client-first, privacy-focused digital safe and management hub for artificial intelligence prompts. It empowers developers, prompt engineers, researchers, and content creators to organize, version, personalize, evaluate, and synchronize their prompt libraries with zero risk of proprietary data leaks.

### Core Value Proposition
- **Privacy You Can Trust**: 100% on-device zero-knowledge encryption ensures neither server hosts nor third parties can inspect your prompts.
- **Speed in Daily Work**: Global keyboard shortcuts, real-time search, and 1-click clipboard copying with dynamic template variable filling.
- **Built-in Prompt Engineering Intelligence**: An AI Prompt Doctor evaluates prompt quality against an 8-point rubric and offers automated rewrites using a resilient dual-provider engine (Gemini primary, Groq fallback).
- **Peace of Mind**: Offline-ready Progressive Web App (PWA) with conflict-free multi-device synchronization and clean JSON data portability.

---

## 2. Target User Personas & User Stories

### Persona 1: Alex - The AI Engineer & System Prompt Architect
- **Profile**: Designs complex, multi-turn system instructions, parameter schemas, and persona definitions for enterprise LLM agents.
- **Needs**: Organizing dozens of prompts by category, tracking tags, and running objective quality evaluations.
- **User Story**: *"As an AI engineer, I want to evaluate my drafted prompt against a structured rubric so that I can identify missing constraints and guardrails before deploying it to production."*

### Persona 2: Sarah - The Busy Software Developer
- **Profile**: Uses AI prompts daily for code reviews, unit test generation, regex extraction, and SQL query optimization.
- **Needs**: Instant retrieval without leaving the keyboard and quick copying into IDEs or chat windows.
- **User Story**: *"As a developer, I want to press `Cmd+K`, type a few keywords, and copy my code review prompt in under two seconds so that I never break my programming flow."*

### Persona 3: Marcus - The Content Creator & Marketer
- **Profile**: Crafts marketing copy, newsletter drafts, and social media hooks across multiple client brands.
- **Needs**: Reusable prompt templates that allow changing only specific parameters (e.g. `{{topic}}`, `{{tone}}`, `{{target_audience}}`).
- **User Story**: *"As a content creator, I want to click Copy on a prompt template and fill in a quick form with today's topic so that the final customized text is copied to my clipboard automatically."*

### Persona 4: Elena - The Privacy-Conscious Researcher
- **Profile**: Works on proprietary scientific research and sensitive customer data scenarios.
- **Needs**: An impenetrable digital lockbox that ensures confidential prompts never leak to cloud databases or training sets.
- **User Story**: *"As a researcher, I want my prompts encrypted on my device with a secret PIN so that nobody with physical or network access to my computer can read my research prompts."*

---

## 3. MoSCoW Prioritization Matrix

The features of PromptVault are prioritized according to the industry-standard MoSCoW methodology:

| Priority | Category | Feature Description |
| :--- | :--- | :--- |
| **Must Have** (Essential for v2.2.1) | Vault Core | Create, read, update, duplicate, and soft-delete prompts and categories. |
| **Must Have** | Security | WebCrypto AES-256-GCM envelope encryption with PBKDF2 (600,000 rounds) and emergency recovery key. |
| **Must Have** | Usability | Dynamic `{{variable}}` detection and interactive substitution modal on copy. |
| **Must Have** | Usability | Real-time memory search across titles, bodies, and tags; category and favorite filters. |
| **Must Have** | Reliability | 100% test coverage for cryptographic round-trips, vault sanitization, and data merging. |
| **Must Have** | Portability | Clean JSON export with secrets stripped and schema-validated merge import. |
| **Should Have** (Important Value) | AI Doctor | Automated 8-point rubric prompt evaluation and one-click rewrite via dual-provider proxy. |
| **Should Have** | Cloud Sync | Optional Supabase sync with 1s debounced push, 30s poll, and Last-Write-Wins tombstone merge. |
| **Should Have** | Performance | PWA offline caching, non-blocking font loading, and instant theme initialization. |
| **Should Have** | Accessibility | Keyboard navigation (`Cmd+K`, `Cmd+N`, `Escape`), focus traps, and WCAG AA contrast. |
| **Could Have** (Future Enhancements) | Local AI | Direct integration with local Ollama or WebLLM models for 100% on-device AI evaluation. |
| **Could Have** | Browser Tools | Lightweight Chrome/Firefox extension for rapid prompt insertion directly into web text fields. |
| **Won't Have** (Strict Non-Goals) | Social Features | No public prompt sharing feeds, social upvotes, comments, or public marketplaces. |
| **Won't Have** | Tracking | No user telemetry, marketing tracking scripts, or ad analytics. |

---

## 4. Functional Requirements & Specifications

### Feature 1: Prompt Library & Organization Core (FR-1)
- **Description**: Users can store, categorize, tag, and manage their prompt collection through a responsive, modern card grid interface.
- **Data Model**:
  - `Prompt`: `id` (UUID), `title` (string), `body` (string), `categoryId` (UUID), `tags` (string array), `isFavorite` (boolean), `usageCount` (number), `createdAt` (timestamp), `updatedAt` (timestamp), `deletedAt` (timestamp or null).
  - `Category`: `id` (UUID), `name` (string), `updatedAt` (timestamp), `deletedAt` (timestamp or null).
- **Acceptance Criteria**:
  1. Creating a prompt requires a title, body, and category; tags and favorite status are optional.
  2. Duplicating a prompt creates a clone with `(copy)` appended to the title and resets its usage count to 0.
  3. Deleting a prompt performs a soft deletion (`deletedAt = Date.now()`), removing it from the active UI while retaining its tombstone for sync.
  4. Deleting a category prompts a confirmation dialog warning the user of child prompt cascade deletions.
  5. The library supports sorting by Last Updated, Title (A-Z), and Usage Count (Most Used).

### Feature 2: Smart Copy with Dynamic Variable Injection (FR-2)
- **Description**: Prompts containing template placeholders allow users to personalize text before copying it to the clipboard.
- **Specification**:
  - Placeholders follow the double-curly brace syntax: `{{variable_name}}`.
  - When the Copy button on a prompt card is clicked:
    - If no variables are found: Raw text is written directly to `navigator.clipboard`.
    - If variables exist: The `VariableForm` modal opens, listing input fields for each unique placeholder.
  - The modal provides two actions:
    - **Skip**: Copies the raw prompt preserving the `{{tags}}`.
    - **Inject & Copy**: Substitutes every occurrence of `{{key}}` with the user's input (or fallback `[key]` if left blank) and writes to clipboard.
- **Acceptance Criteria**:
  1. Upon successful clipboard copy, the prompt card flashes a green "Copied!" checkmark badge for 2,000 milliseconds.
  2. The prompt's `usageCount` increments by 1, and `updatedAt` is refreshed to keep frequently used prompts easily accessible.
  3. If clipboard access is blocked (e.g. non-HTTPS context or denied permissions), a friendly `CopyErrorToast` banner informs the user without throwing unhandled exceptions.

### Feature 3: Zero-Knowledge On-Device Envelope Encryption (FR-3)
- **Description**: Provides military-grade, client-side protection for users storing sensitive or proprietary prompts.
- **Cryptographic Details**:
  - **Master Vault Key (DEK)**: 32-byte (256-bit) high-entropy AES key generated via `crypto.getRandomValues`.
  - **Key Wrapping (KEK)**: Derived using PBKDF2-SHA-256 with 600,000 calculation rounds and a unique 16-byte random salt.
  - **Payload Encryption**: AES-256-GCM with a 12-byte random IV encrypts the prompt library JSON.
  - **Dual Wrappers**:
    - *Primary Lock*: Wrapped using user's secret (Numeric PIN >= 6 digits for new vaults, >= 4 digits for backward-compatible unlock, or Passphrase >= 15 characters, recommended by default). Successive failed unlock attempts trigger progressive cooldown delays (starting after 3 failures).
    - *Recovery Lock*: Wrapped using an auto-generated 64-character hex Emergency Recovery Key.
- **Acceptance Criteria**:
  1. The user's secret is never stored on disk, never hashed with a weak algorithm, and never sent across the network.
  2. The Emergency Recovery Key is presented once upon encryption setup with a confirmation prompt.
  3. Locking the vault immediately zeroes the memory key (`keyRef.current = null`), scrubs all decrypted prompts from active React state and `dataRef` (replacing them with an empty vault), closes all open overlays, displays the `PinLock` overlay, and hides all prompt plaintext.
  4. An incorrect secret produces an authentication tag mismatch error, keeping the vault safely locked.
  5. Pasting the valid 64-character recovery key unwraps the vault key and unlocks the library directly.

### Feature 4: AI Prompt Doctor (FR-4)
- **Description**: An interactive floating assistant widget that scores prompt quality and offers automated prompt engineering rewrites.
- **Evaluation Engine**:
  - Analyzes the prompt against an 8-point rubric:
    1. Clear Objective & Goal
    2. Role & Persona Definition
    3. Essential Context & Background
    4. Explicit Constraints & Boundaries
    5. Output Format Contract (JSON, Markdown, etc.)
    6. Concrete Few-Shot Examples
    7. Edge Cases & Exception Handling
    8. Safety Guardrails & Negative Constraints
- **Two-Step Interaction**:
  - **Step 1 (Analyze)**: Evaluates the draft prompt, returning a Quality Score (0-10), score label (`EXCELLENT`, `GOOD`, `CONSIDER IMPROVING`), confidence level, identified weak spots, and suggested title/category/tags.
  - **Step 2 (Improve - Optional)**: User clicks "Improve" to request an automated rewrite that resolves the identified defects while maintaining the prompt's original intent.
- **Acceptance Criteria**:
  1. Clicking "Use improved prompt & re-analyze" swaps the optimized text into the editor and re-evaluates it.
  2. Clicking "Confirm" saves the title, body, category, and tags directly into the vault (`createPrompt`).
  3. Backend resilience: The server transparently switches from Google Gemini to Groq Cloud if the primary provider encounters rate limits or errors.
  4. In-memory response caching (30-minute TTL) and IP rate limiting (30 requests/minute) prevent API quota abuse.

### Feature 5: Portable Vault Backup & Schema-Sanitized Import (FR-5)
- **Description**: Complete data ownership allowing seamless backup creation and migration between devices.
- **Specification**:
  - **Export**: Generates a standard JSON file (`vault-export-YYYY-MM-DD.json`) with all encryption wrappers and credentials stripped (`withoutSecrets`).
  - **Import**: Allows selecting any JSON backup file. Validates the file structure using `describeVaultProblems()`.
- **Acceptance Criteria**:
  1. Corrupted or invalid JSON files trigger an `ImportErrorDialog` detailing the exact schema discrepancies.
  2. Valid files trigger an `ImportConfirmDialog` previewing the number of incoming prompts and categories.
  3. Confirming the import runs `mergeVaults` with Last-Write-Wins and 30-day deletion tombstones, merging new items without overwriting newer local edits.

### Feature 6: Optional Cloud Synchronization (FR-6)
- **Description**: Seamless multi-device sync for users who opt into cloud backups using their Google account.
- **Specification**:
  - Authentication: Supabase GoTrue with Google OAuth 2.0 PKCE flow.
  - Database: `public.vaults` table with PostgreSQL Row-Level Security ensuring users access only their own row (`auth.uid() = user_id`).
  - Debounced Push: 1-second debounce timer (`pushTimer`) combines rapid keystrokes into a single save.
  - Silent Background Poll: Checks remote `updated_at` every 30 seconds for external edits.
- **Acceptance Criteria**:
  1. Cloud sync is disabled while the local vault is locked to prevent syncing placeholder ciphertext.
  2. Remote updates apply smoothly via `applyRemoteData()`, setting `suppressLocalChange = true` to prevent echo push loops.
  3. Deleted prompts remain dead across all synced devices through 30-day tombstone propagation.

### Feature 7: Offline PWA & Keyboard Accessibility (FR-7)
- **Description**: Operates reliably without network connectivity and supports full keyboard workflows.
- **Specification**:
  - Service Worker (`sw.js`) caches HTML, styles, scripts, and static assets.
  - Keyboard shortcuts:
    - `Cmd+K` / `Ctrl+K`: Focus search bar.
    - `Cmd+N` / `Ctrl+N`: Open new prompt dialog.
    - `Escape`: Close active modal or dismiss search.
    - `?` / `Cmd+/`: Display keyboard shortcuts reference.
- **Acceptance Criteria**:
  1. Turning off network connectivity allows the application to launch and function normally from cache.
  2. Modals trap keyboard focus and return focus to the triggering element upon closure.
  3. The interface complies with WCAG AA contrast standards across both Dark and Light themes.

---

## 5. Non-Functional Requirements (NFRs)

| Attribute | Requirement & Standard | Verification Method |
| :--- | :--- | :--- |
| **Security & Cryptography** | PBKDF2-SHA-256 derivation with 600,000 iterations; AES-256-GCM envelope; zero plaintext on disk. | Vitest crypto unit tests (`crypto.test.ts`). |
| **Performance** | App shell First Contentful Paint < 1.0s; search filtering across 1,000 items < 16ms (60 FPS). | Chrome Lighthouse audit; memory-indexed search benchmarking. |
| **API Proxy Throughput** | AI proxy response time < 2.5s on Gemini, < 1.5s on Groq; in-memory cache hit response < 10ms. | Server-side latency logging (`server/index.ts`). |
| **Reliability & Tests** | 100% pass rate on unit test suite (81 tests); zero uncaught promise rejections. | Vitest automated test run on every GitHub Actions CI build. |
| **Compatibility** | Evergreen browser support: Chrome 110+, Safari 16+, Edge 110+, Firefox 115+, iOS Safari, Android Chrome. | BrowserStack / Playwright cross-browser test runner. |

---

## 6. Non-Goals (What PromptVault Explicitly Avoids)

To maintain architectural purity and rock-solid privacy, PromptVault intentionally excludes:
1. **No Centralized Plaintext Database**: We do not maintain a company server holding unencrypted user vaults.
2. **No Social Feed or Community Sharing**: PromptVault is not a social network with upvotes, public profiles, or prompt marketplaces.
3. **No User Analytics or Telemetry**: We do not track user typing habits, store analytics cookies, or sell behavioral data.
4. **No Proprietary Lock-In**: Exporting data never requires payment, subscription, or proprietary software.
5. **No Client-Side API Key Exposure**: Third-party LLM API keys are never bundled into client-side JavaScript.

---

## 7. Technical References & Architectural Alignment

This PRD directly aligns with the verified technical diagrams and specifications in the repository:
- [System Architecture Overview](file:///o:/github/promptVault/diagrams/architecture.png)
- [Zero-Knowledge Encryption Workflow](file:///o:/github/promptVault/diagrams/encryption-workflow.png)
- [Cloud Sync Lifecycle](file:///o:/github/promptVault/diagrams/cloud-sync-lifecycle.png)
- [AI Suggestion Pipeline](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png)
- [Runtime Workflows](file:///o:/github/promptVault/diagrams/runtime-workflows.png)
