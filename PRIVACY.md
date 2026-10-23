# Privacy Policy & Data Transparency Declaration

| Document Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Official Repository** | [https://github.com/SagarBiswas-MultiHAT/promptVault](https://github.com/SagarBiswas-MultiHAT/promptVault) |
| **Live PWA URL** | [https://promptvault.multihat.dev](https://promptvault.multihat.dev) |
| **Author / Maintainer** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT ([https://multihat.dev](https://multihat.dev)) |
| **Effective Date** | March 2026 |
| **License** | Apache-2.0 |

---

## 1. Executive Privacy Pledge

PromptVault is an open-source, client-encrypted AI prompt management workbench and local vault. It was engineered from day one with a strict **local-first, zero-knowledge privacy philosophy**:

- **Your prompts belong entirely to you.**
- **Your prompts, prompt titles, tags, and categories are NEVER tracked, inspected, or sold.**
- **All prompt editing, searching, and template variable substitutions occur 100% on your local device.**
- **Encryption keys and PINs never leave your device.**

We believe that confidentiality is paramount for prompt engineers, software developers, researchers, and creators who handle proprietary business logic, sensitive trade secrets, or personal creative thoughts.

---

## 2. The Zero-Prompt-Tracking Guarantee

We make an absolute, unconditional technical guarantee regarding your prompt data:

1. **Zero Prompt Telemetry**: PromptVault does **not** transmit, record, or track your prompt text, prompt titles, category names, tags, or dynamic `{{variable}}` values to any analytics system, telemetry pipeline, or advertising network.
2. **Zero Search Query Logging**: Search queries typed into the search bar or Command Palette (`Cmd+K` / `Ctrl+K`) are evaluated exclusively in active browser memory. They are never logged or sent to an external server.
3. **Zero Keystroke or Typing Capture**: We do not record user keystrokes, typing rhythms, or editing activity.
4. **Zero Key or Secret Transmission**: Your Master Vault Key, Numeric PIN, Passphrase, and Emergency Recovery Key never touch any remote server or analytics service. Key derivation (PBKDF2-SHA-256 with 600,000 rounds) and encryption (AES-256-GCM) happen strictly on your device using the browser Web Crypto API (`crypto.subtle`).

---

## 3. What Analytics Are Used and Why

PromptVault uses lightweight, privacy-configured **Google Analytics 4 (GA4)** and Cloudflare Insights for aggregate traffic measurement only.

### 3.1 Purpose of Analytics
As an open-source project, aggregate visit metrics help the maintainer:
- Understand high-level site reach (total page view counts and general growth trends).
- Identify popular browser platforms and device form-factors (e.g., Chrome vs Safari, desktop vs mobile) to prioritize compatibility fixes and performance optimizations.
- Measure referral pathways (e.g., GitHub, product directories, social links).

### 3.2 What Is Collected (Aggregated & Anonymous)
- Anonymous page view counts and routing paths (e.g., visit to `/`).
- General device attributes (operating system family, browser type, screen resolution bracket).
- Approximate geographic origin (country or region level).
- Referrer URL (the site or link that directed you to PromptVault).

### 3.3 What Is Explicitly Excluded
- **No prompt text, titles, bodies, tags, or categories.**
- **No search terms or filter selections.**
- **No variable values or customized clipboard contents.**
- **No encryption secrets, salts, IVs, or ciphertexts.**
- **No user identification tokens or personal identifiers.**

### 3.4 Technical Privacy Safeguards in Analytics Configuration
In the client initialization (`gtag-init.js`), the following privacy-preserving flags are enforced:
- **IP Anonymization**: IP addresses are masked and anonymized by default.
- **Google Signals Disabled**: Cross-device tracking via Google account profiles (`allow_google_signals: false`) is disabled.
- **Ad Personalization Disabled**: Ad personalization signals (`allow_ad_personalization_signals: false`) are disabled.
- **Restricted Data Processing**: Data processing is restricted (`restricted_data_processing: true`).
- **Deferred Script Loading**: The analytics script is deferred until after initial interaction or idle time, ensuring it does not compete with main-thread hydration or local vault operations.

### 3.5 Full Support for Ad Blockers & Privacy Extensions
PromptVault is built with progressive enhancement. If you use an ad blocker (such as uBlock Origin, Brave Shields, Privacy Badger, or Pi-hole) or disable JavaScript for analytics, **PromptVault will continue to function 100% normally**. No features, encryption locks, or sync functions depend on analytics scripts.

---

## 4. AI Prompt Doctor & External AI Providers

PromptVault includes an optional AI Prompt Doctor that evaluates prompt structure, scores clarity across an 8-point rubric, and suggests rewrites.

### 4.1 On-Demand Operation Only
Prompts are **never** transmitted to an AI provider automatically. Data is sent only when you explicitly click the **"Analyze"** or **"Improve"** button in the AI Assistant interface.

### 4.2 Stateless Proxy Courier
Requests are routed through a lightweight Express server (`/api/suggest`):
- The server acts solely as a stateless proxy courier to shield private API keys from the browser.
- The server does **not** write prompt text to a database, disk, or persistent log file.
- The server maintains a short-lived in-memory cache (30-minute TTL, maximum 200 entries) solely to return fast evaluations for identical prompts without incurring redundant network costs.

### 4.3 Upstream AI Providers
Depending on your configuration, AI evaluations are processed by:
- **Google Gemini API** (`gemini-1.5-flash` or newer)
- **Groq Cloud API** (`llama-3.3-70b-versatile` or fallback models)

Both Google Cloud and Groq operate commercial API tiers with enterprise data terms stating that customer prompt inputs submitted through paid or commercial developer API endpoints are not used to train public foundation models.

If you do not wish to send prompt text to third-party AI services, simply do not click the AI Doctor buttons, or run PromptVault without configuring AI API keys.

---

## 5. Optional Cloud Synchronization (Supabase)

PromptVault provides optional multi-device synchronization powered by Supabase.

### 5.1 Strictly Opt-In
Cloud synchronization is completely disabled by default. PromptVault requires no account or registration to use locally.

### 5.2 Encryption in Transit & Access Control
- All sync network traffic travels over secure TLS 1.3 (HTTPS).
- Storage access is strictly controlled at the PostgreSQL database layer via Row-Level Security (RLS) policies (`auth.uid() = user_id`). No other authenticated user can read or write your vault records.

### 5.3 Payload Security
- If you have enabled local vault encryption with a PIN or Passphrase, your synchronized vault records remain encrypted on your device with AES-256-GCM before transport. The server and database store only opaque cryptographic ciphertext.

---

## 6. Local Storage & Memory Hygiene

PromptVault operates as an offline-first Progressive Web App (PWA):

1. **Storage at Rest**: Data is stored locally in your browser `localStorage`. When encryption is enabled, all prompt records, category definitions, and metadata are encrypted with AES-256-GCM.
2. **Session Memory Hygiene**: When you click "Lock Vault" or close your session, PromptVault synchronously zeros the Master Vault Key (`keyRef.current = null`) and clears decrypted prompts from React state and internal memory references, leaving zero plaintext records in RAM.
3. **Data Retention & Deletion**: Deleting a prompt in PromptVault removes it locally. A tombstone identifier is retained for 30 days solely to reconcile cross-device deletions during sync, after which it is purged. Exporting your vault produces a clean JSON file that you control.

---

## 7. Open-Source Transparency & Verification

PromptVault is licensed under the **Apache License, Version 2.0**. Our complete codebase is open and publicly verifiable:

- Inspect the client application code: [src/](file:///o:/github/promptVault/src/)
- Inspect cryptographic implementation: [src/utils/crypto.ts](file:///o:/github/promptVault/src/utils/crypto.ts)
- Inspect memory hygiene and storage routines: [src/hooks/useVault.ts](file:///o:/github/promptVault/src/hooks/useVault.ts)
- Inspect analytics initialization: [public/gtag-init.js](file:///o:/github/promptVault/public/gtag-init.js)

You are free to audit, test, build, and run PromptVault locally in a completely isolated offline environment.

---

## 8. Contact & Security Inquiries

If you have questions about this Privacy Policy, our data handling practices, or wish to report a security concern, please reach out:

- **Maintainer**: Sagar Biswas (@SagarBiswas-MultiHAT)
- **Email**: `sagarbiswas@multihat.dev`
- **Security Reporting**: Review our [Security Policy](.github/SECURITY.md) or submit a private advisory on GitHub.
- **GitHub Discussions**: [PromptVault Discussions](https://github.com/SagarBiswas-MultiHAT/promptVault/discussions)
