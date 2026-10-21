# Project Vision & Charter: PromptVault

| Metadata | Details |
| :--- | :--- |
| **Project Name** | PromptVault |
| **Document Type** | Vision Statement & Project Charter |
| **Status** | Approved (Production Baseline) |
| **Current Version** | v2.2.0 |
| **Owner / Maintainer** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **License** | Apache License 2.0 |
| **Repository** | [github.com/SagarBiswas-MultiHAT/promptVault](https://github.com/SagarBiswas-MultiHAT/promptVault) |
| **Live Web App** | [promptvault.multihat.dev](https://promptvault.multihat.dev/) |

---

## 1. Executive Summary (The Simple Story)

Artificial Intelligence has transformed the way we write, code, design, and brainstorm. Every day, professionals and creators craft powerful, nuanced AI prompts. However, most people store these valuable prompts in messy text files, scattered browser tabs, random note apps, or cloud tools that lock them into proprietary subscriptions. Worse yet, many online prompt tools store private thoughts and trade secrets on centralized servers where they could be inspected, leaked, or used for AI training.

**PromptVault** solves this problem completely. 

Think of PromptVault as **your private, impenetrable digital safe for AI prompts**. It lives directly in your web browser, works 100% offline, encrypts your data using military-grade security before it touches your computer disk, and includes an intelligent AI Prompt Doctor that scores and polishes your writing on demand. If you want multi-device backup, it connects to your private cloud storage without ever compromising your privacy.

---

## 2. Core Problem Statement

Modern AI users face three fundamental obstacles:

1. **Fragmentation & Inefficiency**: Prompts are scattered across ChatGPT chat histories, Notion pages, Apple Notes, and Discord messages. When you need a specific code-review prompt or email template, finding it takes minutes instead of seconds.
2. **Privacy & Security Vulnerabilities**: Many prompt tools store data in plain text on remote corporate servers. Prompts often contain confidential context, proprietary business logic, sensitive customer scenarios, and personal trade secrets that must never be exposed.
3. **Lack of Prompt-Specific Intelligence**: Standard note-taking applications cannot evaluate prompt clarity, cannot automatically inject dynamic template variables like `{{language}}` or `{{framework}}` on copy, and do not provide automated prompt-engineering improvements.

---

## 3. Product Vision & Principles

> **"Your personal, private library for AI prompts: organised, rated, and always at hand."**

PromptVault is guided by five foundational principles:

* **Zero-Knowledge Privacy First**: Your data belongs to you. Encryption happens directly in your browser using AES-256-GCM with 600,000 calculation rounds. Zero plaintext prompts and zero PIN hashes are ever stored on disk.
* **Instant Speed & Keyboard-Driven**: Finding and copying a prompt should be instantaneous. Global shortcuts (`Cmd+K` to search, `Cmd+N` to create, `Escape` to close) ensure you never lose your flow.
* **Smart Template Automation**: Prompts are living templates. When you click Copy on a prompt containing `{{variables}}`, PromptVault prompts you to fill in the blanks and injects your custom values into your clipboard in milliseconds.
* **Resilient Dual-AI Architecture**: The built-in AI Prompt Doctor evaluates and polishes your prompts using Google Gemini with an automatic, zero-outage fallback to Groq Cloud.
* **No Vendor Lock-In & Full Offline Capability**: Works fully offline as an installable Progressive Web App (PWA). You can export and download your entire library as a clean, universal JSON backup file whenever you wish.

---

## 4. Target Audience

PromptVault is designed specifically for:

| User Persona | Primary Needs & Daily Frustrations | How PromptVault Delivers |
| :--- | :--- | :--- |
| **Prompt Engineers & AI Researchers** | Managing hundreds of complex system prompts, parameter contracts, and persona definitions. | Custom categories, multi-tag filtering, usage tracking, and automated 8-point rubric evaluation. |
| **Software Developers & Engineers** | Storing code review, refactoring, regex, and unit testing prompts; needs rapid clipboard copying. | Lightning-fast search, global shortcuts (`Cmd+K`), dark mode by default, and single-click copy. |
| **Content Creators & Marketers** | Running repetitive workflows that change only a few keywords (e.g., topic, tone, target audience). | Dynamic `{{variable}}` detection and interactive substitution modal before copying. |
| **Privacy-Conscious Individuals** | Refusing to upload sensitive personal ideas or business strategies to unencrypted cloud databases. | On-device WebCrypto envelope encryption where only the user holds the unlocking key. |

---

## 5. Scope Boundaries: What We Build vs What We Do Not Build

To keep PromptVault lean, secure, and focused, the project defines strict boundaries:

### In-Scope (Core Capabilities)
* **On-Device Vault Management**: Create, edit, soft-delete, duplicate, favorite, search, and sort prompts and categories.
* **Military-Grade Local Protection**: WebCrypto AES-256-GCM envelope encryption with PBKDF2-SHA-256 (600,000 iterations), supporting Numeric PIN (6+ digits for new vaults, 4+ digits for backward-compatible unlock) or Passphrase (15+ chars, default), plus a 64-character Emergency Recovery Key and progressive brute-force delay cooldowns.
* **AI Prompt Doctor**: Automated quality scoring (0-10), weak-spot identification, metadata suggestion, and one-click automated rewriting via a secure server proxy.
* **Dynamic Variable Personalization**: Automatic regex parsing of `{{variable}}` tags and interactive injection form.
* **Offline-First PWA Shell**: Service worker caching of application assets and themes for full offline usability.
* **Conflict-Free Cloud Synchronization**: Optional Supabase sync using per-entity Last-Write-Wins and 30-day deletion tombstones.
* **Data Portability**: Clean JSON backup export (with secrets stripped) and schema-validated merge import.

### Out-of-Scope (Non-Goals)
* **Not a Social Network or Marketplace**: PromptVault does not feature public prompt feeds, likes, comments, or public sharing links. It is strictly your personal workspace.
* **No Unencrypted Centralized Database**: PromptVault will never store user prompts in a shared public database where administrators can read them.
* **No Tracking, Advertising, or Telemetry**: No third-party tracking scripts, advertising SDKs, or behavioral telemetry are included.
* **No Direct Client API Key Exposure**: Third-party AI API keys (Gemini / Groq) are never exposed to the client browser bundle.

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

The success and technical health of PromptVault are measured by the following targets:

| Area | Target Metric (KPI) | Verification Method |
| :--- | :--- | :--- |
| **Privacy & Security** | Zero plaintext leaks at rest in browser storage. | Cryptographic unit tests verify encrypted envelope and lack of plaintext prompts. |
| **Quality & Correctness** | 100% green test suite across all unit and integration tests. | 74 automated unit tests running in Vitest on every build. |
| **User Experience Speed** | Initial app shell render < 1.0s; prompt search filter < 16ms (60fps). | Lighthouse performance audit and memory-indexed search benchmarks. |
| **AI Availability** | >= 99.9% uptime for AI evaluations via automated fallback. | Express proxy switches transparently from Gemini to Groq if the primary provider fails. |
| **Sync Resilience** | Zero resurrected prompts after cross-device deletion. | 30-day tombstone sweep and Last-Write-Wins merge validation. |

---

## 7. Key Risks & Mitigation Plan

| Identified Risk | Severity | Proactive Mitigation Strategy |
| :--- | :--- | :--- |
| **Forgotten PIN or Passphrase** | High | PromptVault generates a 32-byte (64-character hex) Emergency Recovery Key shown once at setup. Users can safely unlock their vault offline without relying on any central reset server. |
| **Simultaneous Multi-Device Edits** | Medium | The merge engine uses per-prompt Last-Write-Wins timestamps and 30-day tombstones rather than overwriting the entire document, preventing lost edits. |
| **AI API Rate Limits or Outages** | Medium | The backend incorporates dual-provider fallback (Gemini primary, Groq secondary), in-memory response caching (30-minute TTL), and client-side debouncing. |
| **Browser Storage Quota Limits** | Low | Local storage is monitored with quota checks, compact JSON payloads, and graceful user warnings before storage exhaustion. |

---

## 8. High-Level Architectural Context

For detailed technical diagrams and architectural documentation, refer to the corresponding project references:

* [System Architecture Overview](file:///o:/github/promptVault/diagrams/architecture.png): Complete 4-layer view of the application, reactive hooks, security engines, and transport layer.
* [Zero-Knowledge Encryption Workflow](file:///o:/github/promptVault/diagrams/encryption-workflow.png): Visual walkthrough of DEK generation, KEK derivation, and emergency recovery.
* [Cloud Sync Lifecycle](file:///o:/github/promptVault/diagrams/cloud-sync-lifecycle.png): Details on the 1-second debounced push, 30-second silent poll, and tombstone reconciliation.
* [AI Suggestion Pipeline](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png): Deep dive into token bucket rate limits, provider fallback, and prompt scoring rubrics.
* [Runtime Workflows](file:///o:/github/promptVault/diagrams/runtime-workflows.png): Step-by-step user journeys for smart copy, AI prompt polishing, and portable backups.
