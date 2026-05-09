# PromptVault

> **Your private, offline-first AI prompt library.**

A secure, feature-rich prompt management application for organizing, evaluating, and deploying AI prompts across any workflow. Built with React, TypeScript, and powered by an AI-driven quality analysis engine.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node: 18+](https://img.shields.io/badge/Node-18%2B-green.svg)](https://nodejs.org/)

---

## ✨ Features

- **🔒 PIN-Based Privacy** — SHA-256 hashed PIN lock keeps your vault private
- **🤖 AI Librarian** — Evaluate prompt quality, get improvement suggestions, and auto-classify prompts using Gemini or Groq
- **📂 Category Organization** — Group prompts into custom categories with rename/delete support
- **⭐ Favorites & Search** — Star important prompts and search across titles, bodies, and tags
- **📊 Vault Intelligence** — Dashboard with usage stats, activity trends, and top prompts
- **🔄 Dynamic Variables** — Use `{{variable}}` syntax for templated prompts with fill-in-the-blank injection
- **💾 Import / Export** — Full JSON backup and restore for portability
- **🌗 Light & Dark Mode** — Carefully crafted themes for any lighting
- **📱 Responsive** — Full mobile support with slide-out sidebar and touch-optimized controls
- **⚡ Offline-First** — All data lives in your browser's localStorage; no account required

---

## 🛠 Tech Stack

| Layer     | Technology                       |
| --------- | -------------------------------- |
| Frontend  | React 19, TypeScript, Vite 6     |
| Styling   | Tailwind CSS 4                   |
| Animation | Motion (Framer Motion)           |
| Icons     | Lucide React                     |
| Backend   | Express 4 (API proxy)            |
| AI        | Google Gemini, Groq (fallback)   |
| Storage   | Browser localStorage             |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **API Keys** — at least one of:
  - [Google Gemini API Key](https://aistudio.google.com/apikey)
  - [Groq API Key](https://console.groq.com/keys)

### 1. Clone & Install

```bash
git clone https://github.com/SagarBiswas-MultiHAT/promptVault.git
cd promptVault
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
GEMINI_API_KEY="your-gemini-key-here"
GROQ_API_KEY="your-groq-key-here"
```

### 3. Run Development Server

Open two terminals:

```bash
# Terminal 1: Start the API proxy
npm run dev:api

# Terminal 2: Start the frontend
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 🏗 Production Deployment

### Build & Run

```bash
# Build the frontend
npm run build

# Start the production server (serves both API + frontend)
npm start          # Linux / macOS
npm run start:win  # Windows
```

The production server serves the built frontend and the API from a single process on the configured port (default: `3002`).

### Environment Variables

| Variable          | Required | Default                   | Description                                           |
| ----------------- | -------- | ------------------------- | ----------------------------------------------------- |
| `GEMINI_API_KEY`  | Yes*     | —                         | Google Gemini API key                                  |
| `GEMINI_MODEL`    | No       | `gemini-2.0-flash`        | Gemini model to use                                    |
| `GROQ_API_KEY`    | Yes*     | —                         | Groq API key (fallback provider)                       |
| `GROQ_MODEL`      | No       | `llama-3.3-70b-versatile` | Groq model to use                                      |
| `AI_PROXY_PORT`   | No       | `3002`                    | Server port                                            |
| `NODE_ENV`        | No       | —                         | Set to `production` for production mode                |
| `ALLOWED_ORIGINS` | No       | —                         | Comma-separated CORS origins (production recommended)  |

\* At least one AI provider key is required for the AI Librarian feature.

### Deployment Platforms

The unified server works on any Node.js hosting platform:

- **Railway** — Connect your repo, set environment variables, done
- **Render** — Use `npm run build && npm start` as the start command
- **Fly.io** — Deploy with `fly launch`
- **VPS** — Use PM2 or systemd to manage the process

---

## 📁 Project Structure

```
promptvault/
├── public/              # Static assets (favicon, manifest, OG image)
├── server/
│   └── index.ts         # Express API proxy (AI providers, rate limiting)
├── src/
│   ├── components/      # React components
│   │   ├── AiAssistantWidget.tsx   # AI Librarian prompt evaluator
│   │   ├── ErrorBoundary.tsx       # Crash recovery boundary
│   │   ├── Modal.tsx               # Reusable modal
│   │   ├── PinLock.tsx             # PIN entry screen
│   │   ├── PromptCard.tsx          # Prompt grid card
│   │   ├── PromptForm.tsx          # Create/edit prompt form
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   ├── StatsDashboard.tsx      # Analytics dashboard
│   │   └── VariableForm.tsx        # Template variable injection
│   ├── utils/
│   │   └── crypto.ts    # SHA-256 PIN hashing
│   ├── App.tsx           # Main application
│   ├── constants.ts      # Schema version & defaults
│   ├── index.css         # Global styles & design tokens
│   ├── main.tsx          # Entry point
│   └── types.ts          # TypeScript interfaces
├── index.html            # HTML entry with SEO meta tags
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies & scripts
```

---

## 🔐 Security

- **API keys never reach the browser** — all AI calls are proxied through the Express server
- **Rate limiting** — 30 requests/minute per IP on `/api/suggest`
- **Security headers** — X-Frame-Options, CSP-compatible headers, HSTS in production
- **PIN privacy** — SHA-256 hashed, stored locally, never transmitted
- **Input validation** — Prompt length capped at 10,000 characters

---

## 📜 Available Scripts

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Start Vite dev server (port 3000)              |
| `npm run dev:api`| Start Express API proxy (port 3002)            |
| `npm run build`  | Build frontend for production                  |
| `npm start`      | Run production server (Unix/macOS)             |
| `npm run start:win` | Run production server (Windows)             |
| `npm run preview`| Preview the production build locally           |
| `npm run lint`   | Run TypeScript type checking                   |
| `npm run clean`  | Remove build artifacts                         |

---

## 📄 License

[Apache License 2.0](https://opensource.org/licenses/Apache-2.0)
