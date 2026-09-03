# Security Policy

The PromptVault team takes security and privacy seriously. Because PromptVault is designed to store personal and proprietary AI prompts, we maintain a transparent, defensive security architecture.

---

## Supported Versions

Only the latest major and minor release lines receive active security updates.

| Version | Supported | Notes |
| :--- | :--- | :--- |
| 2.2.x | Yes | Current stable release line with AES-256-GCM encryption |
| 2.1.x | Security fixes only | Upgrading to 2.2.x is strongly recommended |
| < 2.1.0 | No | End of life |

---

## Security Architecture & Threat Model

PromptVault is designed with defense-in-depth principles:

### 1. On-Device Encryption at Rest
- When vault encryption is enabled, data is encrypted directly inside the browser using the Web Crypto API (`AES-256-GCM`).
- Keys are derived using `PBKDF2-SHA-256` with 600,000 iterations and a cryptographically random salt.
- The vault uses an envelope encryption model: a random 256-bit Data Encryption Key (DEK) encrypts the vault payload, and is wrapped by a Key Encryption Key (KEK) derived from your passphrase or PIN.
- A one-time emergency recovery key is generated to allow vault recovery if you ever forget your passphrase.
- Passphrase mode (5+ random words) is recommended over a short numeric PIN for high-threat environments, as short PINs are inherently more susceptible to offline dictionary guessing on compromised hardware.

### 2. API Key Protection
- Third-party AI credentials (Google Gemini and Groq API keys) are stored only on the host server in `.env`.
- The frontend client never receives or stores your AI API keys. All AI requests pass through a local Express proxy with rate limiting and origin restrictions.

### 3. Optional Cloud Sync
- If you configure Supabase sync, communications are encrypted in transit via TLS.
- Database access is restricted at the PostgreSQL layer using Supabase Row Level Security (RLS) policies tied directly to `auth.uid() = user_id`.

### 4. Browser Defense & Headers
- Production builds enforce strict Content Security Policy (CSP), `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and HTTP Strict Transport Security (HSTS).

---

## Reporting a Vulnerability

If you discover a security vulnerability or weakness in PromptVault, please do not disclose it publicly in an open GitHub issue or public forum.

### How to Report

1. **GitHub Security Advisory (Preferred):** Navigate to the repository's **Security** tab, click **Report a vulnerability**, and submit your report privately.
2. **Direct Contact:** If GitHub Private Vulnerability Reporting is unavailable, please email the maintainer at `sagar@multihat.dev` with the subject line `[SECURITY] PromptVault Vulnerability Report`.

### What to Include in Your Report

To help us investigate and triage quickly, please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal proof of concept.
- Affected browser versions, operating systems, and PromptVault release versions.
- Any suggested remediations or mitigations if you have them.

### Response Timelines

- **Initial Acknowledgment:** Within 48 hours of receiving the report.
- **Triage & Assessment:** Within 5 business days.
- **Remediation & Patch:** Typically released within 14 days, depending on severity and complexity.
- **Credit:** We gladly credit researchers in our release notes and changelog unless you request to remain anonymous.

Thank you for helping keep PromptVault and its users secure!
