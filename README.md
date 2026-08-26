# PromptVault

> **Your personal, private library for AI prompts — organised, rated, and always at hand.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fpromptvault.multihat.dev&label=Live%20Demo)](https://promptvault.multihat.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Sync_Enabled-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## What is PromptVault?

If you use AI tools like ChatGPT, Gemini, or Claude, you've probably written some really good instructions (called **"prompts"**) that get great results — and then lost them. They end up buried in chat history, scattered across notes apps, or simply forgotten.

**PromptVault is a personal library for those prompts.** Think of it like a recipe book, but instead of cooking instructions, it stores your best AI instructions. You can:

- Save prompts with a title, category, and tags so you can find them again
- Rate and improve them using a built-in AI assistant
- Copy any prompt to your clipboard in one click, ready to paste into any AI tool
- Access everything privately, from any device, without handing your data to a third party

Everything is stored directly in your browser. No sign-up required. No ads. No data sharing. You own your vault.

---

## What Can It Do?

### 🔒 Keep Your Vault Private
You can set a PIN code to lock the app. Nobody can read your prompts without it. The PIN is scrambled using a one-way security process before it's stored, so even if someone accessed your device, they couldn't recover the original code.

### 🤖 Built-In AI Assistant
Not sure if your prompt is well-written? The **AI Librarian** can:
- **Score it** out of 10 and explain what's weak
- **Rewrite it** into a better, more effective version
- **Suggest a title, category, and tags** so you don't have to think about filing

The AI assistant works privately through a backend service — your API keys are never exposed to the browser.

### 📂 Organise by Category
Create your own folders (called categories) — things like *Coding*, *Marketing*, *Writing*, or whatever fits your workflow. Rename or delete them any time. Each category shows a count of how many prompts it contains.

### ⭐ Favourites & Search
Star your most-used prompts so they're always one click away. A full-text search bar lets you find any prompt by its title, content, or tags — instantly, with no loading.

### 📊 Usage Statistics
A built-in dashboard shows you which prompts you use most, how active your library is, and your top categories — so you can see what's actually working in your workflow.

### 🔄 Fill-in-the-Blank Templates
Write a prompt once with placeholders like `{{topic}}` or `{{audience}}`. When you copy it, PromptVault will ask you to fill in each blank before putting it on your clipboard. Great for prompts you reuse with small variations every time.

### 💾 Backup & Restore
Export your entire vault as a single file at any time. If you ever switch devices or browsers, just import the file and everything is back instantly.

### ☁️ Optional Cloud Sync
If you want your prompts available on multiple devices (your laptop and phone, for example), you can sign in with Google. Your vault will stay in sync automatically. This is entirely optional — the app works perfectly without it.

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
| **Your PIN is protected** | It's scrambled using a one-way process — not stored as plain text |
| **Your prompts stay local** | Everything lives in your browser unless you choose to enable cloud sync |
| **The app can't be embedded** | Security headers prevent the app from being loaded inside other websites |
| **Abuse prevention** | The AI assistant is limited to 30 requests per minute per user |
| **Connections are restricted** | In production, only your own domain can talk to the server |

---

## License

PromptVault is free and open source, released under the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0). You're free to use, modify, and distribute it.
