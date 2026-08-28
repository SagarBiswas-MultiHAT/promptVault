# 🧪 PromptVault API Key Health Diagnostic Tool

A zero-token, high-precision health check script to diagnose, validate, and benchmark all **Google Gemini** (pool) and **Groq** API keys configured in `.env`.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
- [Status Codes & Action Matrix](#-status-codes--action-matrix)
- [Environment Variables Evaluated](#-environment-variables-evaluated)
- [CLI Options & Flags](#-cli-options--flags)
- [Best Practices for 100% Accurate Testing](#-best-practices-for-100-accurate-testing)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🔍 Overview

PromptVault uses a multi-tier fallback architecture:
1. **Gemini Key Pool**: Iterates sequentially through `GEMINI_API_KEYS`.
2. **Groq Fallback**: Used when Gemini keys are exhausted, rate-limited, or unavailable.

The diagnostic script [`scripts/test-api-keys.ts`](./test-api-keys.ts) validates every single key in isolation **without** consuming user prompt generation tokens or getting trapped in reasoning-token thinking loops.

---

## 🚀 Quick Start

### 1. Standard Fast Check (~1–2 seconds total)

```bash
npm run test:keys
```
*Equivalent direct command:*
```bash
npx tsx scripts/test-api-keys.ts
```

### 2. High-Precision Cooldown Mode (`--wait`)

Use when keys were recently active or hit rate limits:

```bash
npm run test:keys:wait
```
*Equivalent direct command:*
```bash
npx tsx scripts/test-api-keys.ts --wait
```

---

## ⚙️ How It Works

```
                        [.env File]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [GEMINI_API_KEYS]                   [GROQ_API_KEY]
 (Comma-separated pool)                  (Fallback)
            │                                 │
     Sequential Loop                   Single Verification
 (300ms pacing between keys)                  │
            │                                 ▼
            ▼                        GET /openai/v1/models
 GET /v1beta/models/{model}          (Auth + Model Available)
  (Metadata & Access check)                   │
            │                                 │
            └────────────────┬────────────────┘
                             ▼
              [Live Diagnostic Summary Table]
```

### 1. Zero-Token Metadata Probe
- **Gemini**: Sends `GET /v1beta/models/${GEMINI_MODEL}` with the `x-goog-api-key` header.
- **Groq**: Sends `GET /openai/v1/models` with the `Authorization: Bearer` header.
- **Why this matters**: Traditional text generation requests (`POST /generateContent`) consume token quota and cause reasoning models (like `gemini-3.6-flash`) to consume output tokens on internal thinking. Metadata endpoints test key authentication, project authorization, and model availability in ~200ms with **0 output tokens billed**.

### 2. Sequential Execution with Collision Pacing
Tests keys sequentially with a 300ms inter-request cooldown. Firing all keys simultaneously (`Promise.all`) triggers false-positive 429 rate limits due to shared network burst limits.

### 3. Active Dev Server Detection
The script probes `http://localhost:${AI_PROXY_PORT}` (default: `3002`). If your backend proxy is running, it outputs a visible warning advising that active background traffic may distort rate-limit metrics.

### 4. Smart Auto-Retry Logic
- **Rate-limited (HTTP 429)**: Retried automatically after a 3s cooldown (or 60s in `--wait` mode).
- **Timeout**: Retried immediately once to eliminate transient network spikes before declaring a key dead.

---

## 📊 Status Codes & Action Matrix

| Status Icon | Status | HTTP Code | Meaning | Recommended Action |
|:---:|:---|:---:|:---|:---|
| ✅ | **OK** | `200` | Key authenticated & configured model is accessible. | **KEEP** - Key is fully operational. |
| ⏳ | **RATE LIMITED** | `429` | Valid key authentication, but free-tier RPM/TPM quota exhausted. | **KEEP** - Auto-recovers within ~60 seconds. |
| 🔑 | **AUTH** | `401` / `403` / `API_KEY_INVALID` | Invalid key, deleted in cloud console, or project access revoked. | **REMOVE / ROTATE** - Edit `.env` and delete/replace this key. |
| 🔍 | **MODEL NOT FOUND** | `404` | Key is valid, but its project tier lacks access to `GEMINI_MODEL`. | **INVESTIGATE / REMOVE** - Check model permissions in Google AI Studio. |
| ⏱️ | **TIMEOUT** | `-` | Request exceeded deadline twice consecutively. | **REMOVE** - Dead/unresponsive keys waste up to 35s per user request. |
| ⚠️ | **BAD REQUEST** | `400` | Malformed key syntax or invalid parameter. | **FIX** - Check for trailing commas or whitespace. |
| 🌐 | **NETWORK** | `-` | DNS resolution failure or connection refused. | **CHECK CONNECTION** - Verify your internet/firewall. |

---

## 🛠️ Environment Variables Evaluated

The script automatically parses your root [`.env`](../.env) file:

| Variable | Default Value | Description |
|:---|:---|:---|
| `GEMINI_API_KEYS` | `""` | Comma-separated list of Gemini API keys (e.g. `AIzaSy...,AQ.Ab8...`). |
| `GEMINI_MODEL` | `gemini-3.6-flash` | The Gemini model checked for availability and access. |
| `GROQ_API_KEY` | `""` | Groq API key (starts with `gsk_...`). |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | The Groq model validated against the provider model catalog. |
| `GEMINI_TIMEOUT_MS` | `25000` | Maximum wait duration before marking a Gemini request as timed out. |
| `GROQ_TIMEOUT_MS` | `25000` | Maximum wait duration before marking a Groq request as timed out. |
| `AI_PROXY_PORT` | `3002` | Port scanned for local dev server detection. |

---

## 🚩 CLI Options & Flags

### `--wait`
Extends the rate-limit retry delay from `3s` to `60s`.

```bash
npx tsx scripts/test-api-keys.ts --wait
```

**When to use:**
If you have just executed high-volume test queries or your server was recently under load, Google Gemini's 60-second rate-limit window might still be active. Running with `--wait` gives the quota window sufficient time to clear, confirming whether the key is healthy.

---

## 🎯 Best Practices for 100% Accurate Testing

1. **Stop the local API proxy first**:
   Shut down `npm run dev:api` before testing so concurrent background requests do not consume your rate-limit quotas during the test.
2. **Order your pool strategically**:
   Place your highest quota / lowest latency key at index 0 (`gemini[0]`) in `GEMINI_API_KEYS`.
3. **No extra quotes or spaces**:
   Ensure keys are separated strictly by commas without accidental spaces:
   ```env
   # Correct:
   GEMINI_API_KEYS="AIzaSyKeyOne...,AQ.Ab8KeyTwo...,AIzaSyKeyThree..."
   ```
4. **Regular Maintenance**:
   Run `npm run test:keys` whenever you rotate keys or update `GEMINI_MODEL` in `.env`.

---

## ❓ Troubleshooting & FAQs

### Why did a key show HTTP 403 `Your project has been denied access`?
Google Cloud or AI Studio suspended the project associated with that key, or Generative Language API permissions were restricted in the Google Cloud Console. Delete this key from `GEMINI_API_KEYS`.

### Why did a key show HTTP 404 `This model is no longer available`?
Your `.env` contains a deprecated model name or an experimental checkpoint that the specific account tier cannot access. Update `GEMINI_MODEL` to the current stable default (`gemini-3.6-flash`).

### What is the difference between `AIzaSy...` and `AQ.Ab8...` keys?
- `AIzaSy...`: Standard API keys issued by [Google AI Studio](https://aistudio.google.com/app/apikey).
- `AQ.Ab8...`: API keys generated via Google Cloud Console service credentials.
*Both key formats are supported by PromptVault.*
