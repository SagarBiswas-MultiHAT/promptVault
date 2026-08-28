# PromptVault

> **Your personal, private library for AI prompts - organised, rated, and always at hand.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fpromptvault.multihat.dev&label=Live%20Demo)](https://promptvault.multihat.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Sync_Enabled-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [What is PromptVault?](#what-is-promptvault)
- [What Can It Do? (Features)](#what-can-it-do)
- [Requirements](#what-do-you-need-to-run-it)
- [Getting Started (Step by Step)](#getting-started-step-by-step)
  - [Step 1 - Download & Install](#step-1---download-the-project-and-install-dependencies)
  - [Step 2 - Configure API Keys](#step-2---add-your-api-keys)
  - [Step 3 - Start the App](#step-3---start-the-app)
  - [Optional: Cloud Sync (Supabase)](#optional-enable-cloud-sync)
- [Deployment (Production)](#putting-it-on-the-internet-deployment)
  - [Updating on a Droplet / VPS](#updating-your-project-on-a-droplet-vps)
- [Security & Privacy](#is-my-data-safe)
- [Available Commands](#available-commands)
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

## What Do You Need to Run It?

PromptVault is a web application you run on your own computer (or server). It is **not** a hosted service - you install and run it yourself, which is what makes it private.

To get started you need two things:

1. **Node.js** (version 18 or newer) - a free program that lets your computer run JavaScript applications. [Download it here.](https://nodejs.org/)
2. **At least one AI API key** - a free-to-obtain password that lets PromptVault connect to an AI service on your behalf. You need one of:
   - **Google Gemini** - [Get a free key here](https://aistudio.google.com/apikey) (generous free tier)
   - **Groq** - [Get a free key here](https://console.groq.com/keys) (very fast, free tier)

   PromptVault tries Gemini first and automatically falls back to Groq if it's unavailable. Your keys stay on your own server and are never sent to the browser.

---

## Getting Started (Step by Step)

### Step 1 - Download the project and install dependencies

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:

```bash
git clone https://github.com/SagarBiswas-MultiHAT/promptVault.git
cd promptVault
npm install
```

> **What does this do?** It downloads the project files to your computer and installs all the helper packages it depends on (including `vite`, `tsx`, and all other tools used to run the app).
>
> ⚠️ **`npm install` is required before anything else.** If you skip this step and try to run the app, you'll see errors like `'vite' is not recognized` or `'tsx' is not recognized`. Run `npm install` once and they will go away.

---

### Step 2 - Add your API keys

Copy the example settings file:

**Mac / Linux:**
```bash
cp .env.example .env
```

**Windows (Command Prompt or PowerShell):**
```powershell
copy .env.example .env
```

Then open the newly created `.env` file in any text editor (Notepad works fine) and fill in your keys:

```
GEMINI_API_KEYS="paste-your-gemini-key-here"
GROQ_API_KEY="paste-your-groq-key-here"
```

> **What is `.env`?** It's a plain text file that holds private settings for the app - like passwords. It stays on your computer and is never uploaded anywhere.
>
> 💡 **Verify your keys:** Run `npm run test:keys` to check that all your keys are authenticated and working. See the [API Key Diagnostic Guide](scripts/README.md) for full details.

---

### Step 3 - Start the app

> **Before running these commands**, make sure you have completed Step 1 (`npm install`). If you see errors like `'vite' is not recognized` or `'tsx' is not recognized`, it means the install step was skipped - go back and run `npm install` first.

You need two terminal windows open at the same time. In the first, run:

```bash
npm run dev:api
```

In the second, run:

```bash
npm run dev
```

Then open your browser and go to **http://localhost:3000**. PromptVault will be running.

> **Why two terminals?** One runs the AI assistant service in the background (the part that talks to Gemini/Groq). The other runs the visual app you see in your browser. Both need to be running at the same time.

---

### Optional: Enable Cloud Sync

If you want your vault to stay in sync across multiple devices, you can connect a free [Supabase](https://supabase.com) account. Supabase is a free, open-source service that securely stores your data in the cloud.

1. Create a free account at [supabase.com](https://supabase.com) and start a new project.
2. In your Supabase project, go to **Authentication → Providers** and enable **Google**.
3. Add `http://localhost:3000` to your list of allowed redirect URLs (under **Authentication → URL Configuration**).
4. Go to the **SQL Editor** in Supabase and run this script to create the storage table:

```sql
create table public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  schema_version text not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

create policy "Users can view own vault"
on public.vaults for select
using (auth.uid() = user_id);

create policy "Users can insert own vault"
on public.vaults for insert
with check (auth.uid() = user_id);

create policy "Users can update own vault"
on public.vaults for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own vault"
on public.vaults for delete
using (auth.uid() = user_id);
```

5. Copy your **Project URL** and **anon public key** from Supabase → **Project Settings → API**, then add them to your `.env` file:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

Once set up, you'll see a "Sign in with Google" button in the app. After signing in, your vault syncs automatically.

---

## Putting It on the Internet (Deployment)

If you want to access PromptVault from anywhere - not just your own computer - you can deploy it to a hosting service. This means running it on a server that's always on and reachable from any browser.

### Step 1 - Build the app for production

```bash
npm run build
npm start
```

This packages all the app files into an optimised bundle and starts a single server that handles everything. The server runs on port `3002` by default.

### Step 2 - Choose a hosting platform

Any platform that runs Node.js applications will work. Popular options:

| Platform | Difficulty | Cost | Best For |
|---|---|---|---|
| [Railway](https://railway.app) | Very easy | ~$5–10/mo | Simplest setup |
| [Render](https://render.com) | Easy | Free tier + paid | Free to start |
| [Fly.io](https://fly.io) | Moderate | Free tier + paid | More control |
| A VPS (e.g. DigitalOcean) | Advanced | ~$5/mo | Full control |

### Step 3 - Set your environment variables on the platform

Every hosting platform has a place to enter secret settings (the equivalent of your `.env` file). You'll need to enter these:

| Setting | What it is |
|---|---|
| `GEMINI_API_KEYS` | Your Google Gemini key(s), comma-separated |
| `GROQ_API_KEY` | Your Groq key |
| `NODE_ENV` | Set this to `production` |
| `ALLOWED_ORIGINS` | Your website address, e.g. `https://yourdomain.com` |
| `VITE_SUPABASE_URL` | Your Supabase project URL (if using cloud sync) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (if using cloud sync) |

> **The two `VITE_` settings behave differently from the rest.** They are read by
> the bundler and written *into* the JavaScript files during `npm run build`, so
> they must be set **before** the platform runs its build command - and if you
> ever change one, restarting the server is not enough. You have to rebuild and
> redeploy. Everything else in the table is read by the server at startup, so a
> restart is sufficient for those.

> **Important:** When you deploy to a real domain, you'll also need to update the social sharing links inside `index.html` - specifically the `og:url`, `og:image`, `twitter:image`, and `canonical` lines - to point to your actual domain name.

---

<a id="updating-your-project-on-a-droplet-vps"></a>
### 🔄 Updating Your Project on a Droplet / VPS

When you push new commits to GitHub and want to update your live DigitalOcean Droplet (or any Linux VPS), follow these steps:

#### 1. Connect to your Droplet
```bash
ssh root@your-droplet-ip
```

#### 2. Navigate to your project directory
```bash
cd /var/www/promptvault
```

#### 3. Pull the latest changes, rebuild, and restart

**Step-by-step:**
```bash
# 1. Pull the latest commits cleanly (avoids accidental local merge conflicts)
git pull --ff-only origin main

# 2. Clean install dependencies strictly from package-lock.json
npm ci

# 3. Rebuild the frontend bundle (Vite injects VITE_* variables here)
npm run build

# 4. (Optional) Run zero-token API key health check on the server
npm run test:keys

# 5. Restart PM2 with fresh environment variables and persist the process state
pm2 restart promptvault --update-env
pm2 save
```

**⚡ All-in-one bulletproof update command:**
```bash
cd /var/www/promptvault && git pull --ff-only origin main && npm ci && npm run build && pm2 restart promptvault --update-env && pm2 save
```

#### 4. Verify deployment health
```bash
pm2 status
pm2 logs promptvault --lines 20
```

> 💡 **Browser Cache & Service Worker Notice:** PromptVault is a PWA. If you do not see the newest UI updates immediately after deploying:
> 1. Open `https://promptvault.multihat.dev` (or your domain).
> 2. Press `F12` → **Application** → **Service Workers** → click **Unregister**.
> 3. Perform a hard refresh (`Ctrl + Shift + R` or `Cmd + Shift + R`).

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

## Available Commands

Run these in your terminal from the project folder:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app for local development (port 3000) |
| `npm run dev:api` | Starts the AI assistant service (port 3002) |
| `npm run test:keys` | Tests and diagnoses all AI API keys ([docs](scripts/README.md)) |
| `npm run test:keys:wait` | Tests keys with a 60s cooldown for rate-limit recovery |
| `npm run test` | Runs the test suite |
| `npm run build` | Packages the app ready for deployment |
| `npm start` | Runs the packaged app in production mode |
| `npm run preview` | Previews the packaged app locally before deploying |
| `npm run lint` | Checks the code for errors |
| `npm run clean` | Deletes the packaged build files |

---

## License

PromptVault is free and open source, released under the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0). You're free to use, modify, and distribute it.
