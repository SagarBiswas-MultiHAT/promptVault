# PromptVault

> **Your personal, private library for AI prompts - organised, rated, and always at hand.**

<!-- Badges Section -->
<p align="right">
  <a href="https://promptvault.multihat.dev/"><img src="https://img.shields.io/website?url=https%3A%2F%2Fpromptvault.multihat.dev&up_message=online&down_message=offline&label=Live%20Demo&color=10B981&logo=vercel" alt="Live Demo" /></a>
  &nbsp;
  <a href="https://github.com/SagarBiswas-MultiHAT/promptVault/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/SagarBiswas-MultiHAT/promptVault/ci.yml?branch=main&label=CI%20Build&logo=githubactions&logoColor=white" alt="CI Status" /></a>
  &nbsp;
  <a href="https://github.com/SagarBiswas-MultiHAT/promptVault/releases"><img src="https://img.shields.io/badge/Release-v2.1.0-F59E0B?logo=semanticrelease&logoColor=white" alt="Version" /></a>
  &nbsp;
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?logo=apache" alt="License" /></a>
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

- [Architecture Overview](#architecture-overview)
- [What is PromptVault?](#what-is-promptvault)
- [What Can It Do? (Features)](#what-can-it-do)
- [Security & Privacy](#is-my-data-safe)
- [License](#license)

---

## Architecture Overview

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
You can encrypt the local vault with either a numeric PIN or a passphrase. PromptVault uses AES-256-GCM for vault data and PBKDF2-SHA-256 (600,000 iterations) to derive the key that unlocks it. Your secret is never stored. A PIN is convenient but weak against offline guessing; use a long passphrase for meaningful protection, and save the one-time recovery key shown during setup.

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

## License

PromptVault is free and open source, released under the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0). You're free to use, modify, and distribute it.
