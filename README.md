# PromptVault

> **Your personal, private library for AI prompts — organised, rated, and always at hand.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

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

## What Do You Need to Run It?

PromptVault is a web application you run on your own computer (or server). It is **not** a hosted service — you install and run it yourself, which is what makes it private.

To get started you need two things:

1. **Node.js** (version 18 or newer) — a free program that lets your computer run JavaScript applications. [Download it here.](https://nodejs.org/)
2. **At least one AI API key** — a free-to-obtain password that lets PromptVault connect to an AI service on your behalf. You need one of:
   - **Google Gemini** — [Get a free key here](https://aistudio.google.com/apikey) (generous free tier)
   - **Groq** — [Get a free key here](https://console.groq.com/keys) (very fast, free tier)

   PromptVault tries Gemini first and automatically falls back to Groq if it's unavailable. Your keys stay on your own server and are never sent to the browser.

---

## Getting Started (Step by Step)

### Step 1 — Download the project

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:

```bash
git clone https://github.com/SagarBiswas-MultiHAT/promptVault.git
cd promptVault
npm install
```

> **What does this do?** It downloads the project files to your computer and installs all the helper packages it depends on. This only needs to be done once.

---

### Step 2 — Add your API keys

Copy the example settings file:

```bash
cp .env.example .env
```

Then open the newly created `.env` file in any text editor (Notepad works fine) and fill in your keys:

```
GEMINI_API_KEY="paste-your-gemini-key-here"
GROQ_API_KEY="paste-your-groq-key-here"
```

> **What is `.env`?** It's a plain text file that holds private settings for the app — like passwords. It stays on your computer and is never uploaded anywhere.

---

### Step 3 — Start the app

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
```

5. Copy your **Project URL** and **anon public key** from Supabase → **Project Settings → API**, then add them to your `.env` file:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

Once set up, you'll see a "Sign in with Google" button in the app. After signing in, your vault syncs automatically.

---

## Putting It on the Internet (Deployment)

If you want to access PromptVault from anywhere — not just your own computer — you can deploy it to a hosting service. This means running it on a server that's always on and reachable from any browser.

### Step 1 — Build the app for production

```bash
npm run build
npm start
```

This packages all the app files into an optimised bundle and starts a single server that handles everything. The server runs on port `3002` by default.

### Step 2 — Choose a hosting platform

Any platform that runs Node.js applications will work. Popular options:

| Platform | Difficulty | Cost | Best For |
|---|---|---|---|
| [Railway](https://railway.app) | Very easy | ~$5–10/mo | Simplest setup |
| [Render](https://render.com) | Easy | Free tier + paid | Free to start |
| [Fly.io](https://fly.io) | Moderate | Free tier + paid | More control |
| A VPS (e.g. DigitalOcean) | Advanced | ~$5/mo | Full control |

### Step 3 — Set your environment variables on the platform

Every hosting platform has a place to enter secret settings (the equivalent of your `.env` file). You'll need to enter these:

| Setting | What it is |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini key |
| `GROQ_API_KEY` | Your Groq key |
| `NODE_ENV` | Set this to `production` |
| `ALLOWED_ORIGINS` | Your website address, e.g. `https://yourdomain.com` |
| `VITE_SUPABASE_URL` | Your Supabase project URL (if using cloud sync) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (if using cloud sync) |

> **Important:** When you deploy to a real domain, you'll also need to update the social sharing links inside `index.html` — specifically the `og:url`, `og:image`, `twitter:image`, and `canonical` lines — to point to your actual domain name.

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

## Available Commands

Run these in your terminal from the project folder:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app for local development (port 3000) |
| `npm run dev:api` | Starts the AI assistant service (port 3002) |
| `npm run build` | Packages the app ready for deployment |
| `npm start` | Runs the packaged app in production mode |
| `npm run preview` | Previews the packaged app locally before deploying |
| `npm run lint` | Checks the code for errors |
| `npm run clean` | Deletes the packaged build files |

---

## License

PromptVault is free and open source, released under the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0). You're free to use, modify, and distribute it.
