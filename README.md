# PromptVault

> **Your personal, private library for AI prompts - organised, rated, and always at hand.**

<!-- Badges Section -->
<p align="left">
  <a href="https://promptvault.multihat.dev/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fpromptvault.multihat.dev&up_message=online&down_message=offline&label=Live%20Demo&color=10B981&logo=vercel" alt="Live Demo" /></a>
  &nbsp;
  <a href="https://github.com/SagarBiswas-MultiHAT/promptVault/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/SagarBiswas-MultiHAT/promptVault/ci.yml?branch=main&label=CI%20Build&logo=githubactions&logoColor=white" alt="CI Status" /></a>
  &nbsp;
  <a href="https://github.com/SagarBiswas-MultiHAT/promptVault/releases"><img src="https://img.shields.io/badge/Release-v2.2.1-F59E0B?logo=semanticrelease&logoColor=white" alt="Version" /></a>
  &nbsp;
  <a href="docs/README.md"><img src="https://img.shields.io/badge/Docs-Architecture%20Portal-6366F1?logo=gitbook&logoColor=white" alt="Docs Portal" /></a>
  &nbsp;
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-blue?logo=git" alt="Changelog" /></a>
  &nbsp;
  <a href=".github/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?logo=github" alt="PRs Welcome" /></a>
  &nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?logo=apache" alt="License: Apache 2.0" /></a>
  &nbsp;
  <a href="NOTICE"><img src="https://img.shields.io/badge/Attribution-NOTICE-orange.svg" alt="Attribution Notice" /></a>
</p>
<p align="left">
  <img src="https://img.shields.io/badge/Security-AES--256--GCM%20%2B%20PBKDF2-10b981?logo=lock&logoColor=white" alt="Security" />
  &nbsp;
  <img src="https://img.shields.io/badge/AI%20Engine-Gemini%20%2B%20Groq%20Fallback-8B5CF6?logo=google&logoColor=white" alt="AI Engine" />
  &nbsp;
  <img src="https://img.shields.io/badge/Sync-Supabase%20RLS-3ECF8E?logo=supabase&logoColor=white" alt="Supabase Sync" />
  &nbsp;
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
  &nbsp;
  <img src="https://img.shields.io/badge/TypeScript-5.8%20Strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  &nbsp;
  <img src="https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  &nbsp;
  <img src="https://img.shields.io/badge/Testing-Playwright%20%2B%20Vitest-E33D26?logo=playwright&logoColor=white" alt="Testing" />
</p>

---

## 📋 Table of Contents

- [Comprehensive Architectural & Feature Synthesis](#comprehensive-architectural--feature-synthesis)
- [What is PromptVault?](#what-is-promptvault)
- [What Can It Do? (Features)](#what-can-it-do)
- [How Does It Compare?](#how-does-it-compare)
- [Security & Privacy](#is-my-data-safe)
- [Contributing & Community](#contributing--community)
- [License & Attribution](#license--attribution)

---

<a id="comprehensive-architectural--feature-synthesis"></a>
## 🏛️ Comprehensive Architectural & Feature Synthesis 

PromptVault is a privacy-first, client-encrypted AI prompt workbench and local library built with an offline-first architecture, an integrated AI Librarian (powered by Google Gemini with multi-key pooling and Groq fallback), dynamic {{variable}} template injection, multi-device cloud synchronization via Supabase, and real-time usage analytics.

### Architectural Breakdown

<div align="center">

<pre align="center">
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PROMPTVAULT ECOSYSTEM                                   │
├──────────────────────────────────────┬──────────────────────────────────────────────────┤
│ 🎨 Frontend (Client-Side)            │ 🔒 Cryptography & Storage Layer                 │
│ • React 19 + TypeScript 5.8 (Strict) │ • AES-256-GCM on-device encryption               │
│ • Tailwind CSS v4 + Motion           │ • PBKDF2-SHA-256 KDF (600,000 iterations)        │
│ • Virtualized Grid (>200 items)      │ • 256-bit DEK + KEK key wrapping + Recovery Key  │
│ • Offline PWA + Pre-paint Theme Init │ • Guarded localStorage with quota-aware error    │
├──────────────────────────────────────┼──────────────────────────────────────────────────┤
│ 🧠 AI Librarian Proxy Server         │ ☁️ Cloud Sync & Data Resilience                 │
│ • Express + TypeScript proxy         │ • Supabase PostgreSQL backend with Google OAuth  │
│ • Dual-Provider: Gemini + Groq       │ • Per-Entity LWW merge with 30-day tombstones    │
│ • Multi-Key Pool with 429 Cooldown   │ • Conflict-free cross-device synchronization     │
│ • SHA-256 LRU Cache & Coalescing     │ • JSON Import/Export with Schema Sanitization    │
└──────────────────────────────────────┴──────────────────────────────────────────────────┘
</pre>

</div>

### Architecture Overview (v1.0.0)

![Architecture Overview](diagrams/Architecture_Overview.png)

---

## What is PromptVault?

If you use AI tools like ChatGPT, Gemini, or Claude, you've probably written some really good instructions (called **"prompts"**) that get great results - and then lost them. They end up buried in chat history, scattered across notes apps, or simply forgotten.

**PromptVault is a personal library for those prompts.** Think of it like a recipe book, but instead of cooking instructions, it stores your best AI instructions. You can:

- Save prompts with a title, category, and tags so you can find them again
- Rate and improve them using a built-in AI assistant
- Copy any prompt to your clipboard in one click, ready to paste into any AI tool
- Access everything privately, from any device, without handing your data to a third party

Everything is stored directly in your browser. No sign-up required. No ads. No data sharing. You own your vault.

---

## What Can It Do?

### 🔒 Encrypt Your Vault
You can encrypt the local vault with either a numeric PIN (minimum 6 digits for new vaults, 4 digits for legacy unlocks) or a passphrase (minimum 15 characters, recommended by default). PromptVault uses AES-256-GCM for vault data, PBKDF2-SHA-256 (600,000 iterations) to derive the key that unlocks it, and progressive cooldown delays after consecutive failed unlock attempts. Your secret is never stored. A PIN is convenient for local devices, but a long passphrase provides the highest cryptographic resistance against offline guessing. Save the one-time recovery key shown during setup.

### 🤖 Built-In AI Assistant
Not sure if your prompt is well-written? The **AI Librarian** can:
- **Score it** out of 10 and explain what's weak
- **Rewrite it** into a better, more effective version
- **Suggest a title, category, and tags** so you don't have to think about filing

The AI assistant works privately through a backend service - your API keys are never exposed to the browser.

### 📂 Organise by Category
Create your own folders (called categories) - things like *Coding*, *Marketing*, *Writing*, or whatever fits your workflow. Rename or delete them any time. Each category shows a count of how many prompts it contains.

### ⭐ Favourites & Search
Star your most-used prompts so they're always one click away. A full-text search bar lets you find any prompt by its title, content, or tags - instantly, with no loading.

### 📊 Usage Statistics
A built-in dashboard shows you which prompts you use most, how active your library is, and your top categories - so you can see what's actually working in your workflow.

### 🔄 Fill-in-the-Blank Templates
Write a prompt once with placeholders like `{{topic}}` or `{{audience}}`. When you copy it, PromptVault will ask you to fill in each blank before putting it on your clipboard. Great for prompts you reuse with small variations every time.

### 💾 Backup & Restore
Export your entire vault as a single file at any time. If you ever switch devices or browsers, just import the file and everything is back instantly.

### ☁️ Optional Cloud Sync
If you want your prompts available on multiple devices (your laptop and phone, for example), you can sign in with Google. Your vault will stay in sync automatically. This is entirely optional - the app works perfectly without it.

### 🌗 Light & Dark Mode
Switch between a dark theme (easy on the eyes at night) and a light theme (great in sunlight). Your preference is remembered.

### 📱 Works on Mobile Too
The app is fully usable on phones and tablets. The sidebar slides in and out, buttons are large enough to tap, and the layout adjusts to any screen size.

---

## How Does It Compare?

Why choose PromptVault instead of saving prompts in a general note-taking app or on a cloud prompt directory? Here is how it compares across key developer and privacy needs:

| Capability | PromptVault | Notion / Docs | Obsidian | Web Prompt Directories |
| :--- | :--- | :--- | :--- | :--- |
| **100% Offline-First** | Yes (zero network requirement) | No (cloud-dependent) | Yes (local markdown) | No (cloud-dependent) |
| **Client-Side AES-256-GCM Encryption** | Yes (PBKDF2 + recovery key) | No | Community plugins only | No (stored on third-party servers) |
| **Built-in AI Prompt Refinement** | Yes (Gemini + Groq fallback) | Paid add-on required | Third-party plugin required | Limited or static only |
| **Variable Template Injection (`{{var}}`)** | Yes (interactive form before copy) | No native support | Templater plugin required | Rare |
| **Private API Key Proxy** | Yes (keys never reach the browser) | Not applicable | Direct client calls | Centralized / Hosted |
| **No Mandatory Account or Tracking** | Yes (use instantly with no signup) | Account required | Account not required | Account usually required |
| **Cross-Device Sync** | Optional (free Supabase backend) | Built-in | Paid or manual Git setup | Built-in (vendor locked) |
| **Open Source License** | Apache 2.0 | Proprietary | Proprietary | Mostly proprietary |

---

## Is My Data Safe?

Yes. Here's how PromptVault protects you:

| What | How |
|---|---|
| **Your AI keys are private** | They're stored on the server, never sent to your browser |
| **Encrypted local vault** | When enabled, prompt data is AES-256-GCM encrypted in browser storage; the secret is never stored |
| **Your prompts stay local** | Everything lives in your browser unless you choose cloud sync. Sync payloads are plaintext JSON protected by Supabase RLS and TLS so a newly signed-in device can use the vault |
| **The app can't be embedded** | Security headers prevent the app from being loaded inside other websites |
| **Abuse prevention** | The AI assistant is limited to 30 requests per minute per user |
| **Connections are restricted** | In production, only your own domain can talk to the server |

---

## Contributing & Community

PromptVault is an open-source project built for the AI community, and we welcome contributors of all skill levels.

- **Getting Started:** Read our [Contributing Guide](.github/CONTRIBUTING.md) for local setup, development commands, and pull request guidelines.
- **Security Inquiries:** Review our [Security Policy](.github/SECURITY.md) for responsible vulnerability disclosure and threat model details.
- **Join the Discussion:** Visit our [GitHub Discussions](https://github.com/SagarBiswas-MultiHAT/promptVault/discussions) to share your favorite prompt workflows, propose ideas, or ask questions.
- **Good First Issues:** Explore issues labeled `good first issue` on GitHub for well-scoped starter contributions.
- **Version History:** See [CHANGELOG.md](CHANGELOG.md) for a complete record of releases and changes.

---

## License & Attribution

**PromptVault** is licensed under the [Apache License, Version 2.0](./LICENSE).

In accordance with **Section 4(d)** of the Apache License 2.0, any fork, redistribution, or hosted deployment of this application must retain the root [`NOTICE`](./NOTICE) file and maintain visible attribution to **Sagar Biswas ([@SagarBiswas-MultiHAT](https://github.com/SagarBiswas-MultiHAT))** within both the documentation and the user interface.

Cloning this repository, stripping `.git` commit history, removing copyright or `NOTICE` files, or misrepresenting this codebase as your own original work is a direct violation of the license and international copyright law, and will result in an immediate GitHub DMCA Takedown notice.
