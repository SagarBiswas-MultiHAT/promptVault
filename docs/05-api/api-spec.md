# API Specification: PromptVault AI Proxy & System Services

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Document Type** | API Specification & Integration Guide |
| **Status** | Approved (Production Baseline) |
| **Version** | v2.2.0 |
| **Owner / Lead Architect** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **OpenAPI Definition** | [openapi.yaml](file:///o:/github/promptVault/docs/05-api/openapi.yaml) |
| **Reference Documents** | [Architecture Blueprint](file:///o:/github/promptVault/docs/03-architecture/architecture.md), [Threat Model](file:///o:/github/promptVault/docs/04-security/threat-model.md), [SRS](file:///o:/github/promptVault/docs/02-requirements/srs.md) |

---

## 1. API Architecture in Plain English

PromptVault is designed as a **local-first, zero-knowledge** system. This means your private prompt notes, sensitive project codes, and personal ideas are encrypted on your own device and never sent to a central application database.

However, PromptVault also includes an intelligent **AI Librarian** that helps you:
- Score how clear and effective your prompt is (from 0 to 10).
- Highlight missing instructions or ambiguities (weak spots).
- Suggest relevant tags and categorize your prompt automatically.
- Completely rewrite your prompt into a polished, high-performing variation.

### Why Does PromptVault Have an API Server?
If PromptVault is local-first, why does it have an API server at all?

1. **Protecting Expensive AI Keys**: Google Gemini and Groq API keys cost money and grant access to paid compute quotas. If these keys were bundled into the frontend web page, any visitor could open Developer Tools, steal your keys, and run up your bill. The Express server holds these keys safely in its environment variables (`GEMINI_API_KEYS`, `GROQ_API_KEY`).
2. **Stateless Privacy Courier**: The server never records, stores, or logs your prompts. It receives your prompt, asks the AI model for feedback, cleans up the AI's response into neat structured data, and sends it directly back to your browser.
3. **Dual Provider High Availability**: If Google Gemini is slow, rate-limited, or experiencing downtime, the server automatically routes your prompt to Groq without you noticing any interruption.
4. **Smart Memory Caching**: If you test the same prompt twice within 30 minutes, the server returns the previous answer in under 15 milliseconds without using up your AI quota.

---

## 2. Server Base URLs & Network Protocol

| Environment | Base URL | Purpose |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:3002` | Default port used during local npm runs (`npm run dev`) |
| **Production Server** | `https://promptvault.app` | Production cloud deployment over TLS 1.3 |

All endpoints use standard JSON over HTTP/HTTPS:
- **Request Content-Type**: `application/json` (maximum payload size: 1 MB)
- **Response Content-Type**: `application/json; charset=utf-8`

---

## 3. Endpoints Summary

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/suggest` | Analyzes prompt quality or generates an improved prompt rewrite | 30 req / min per IP |
| `GET` | `/api/health` | Diagnostic status, uptime, cache metrics, and provider health | 30 req / min per IP |
| `ALL` | `/api/*` | Catch-all JSON 404 handler for unmatched routes | 30 req / min per IP |

---

## 4. Endpoint Details

### 4.1 POST `/api/suggest`

Analyzes an existing prompt or generates a professionally rewritten version.

#### Request Parameters (JSON Body)

| Field | Type | Required? | Rules & Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prompt` | `string` | **Yes** | 3 to 10,000 characters | The raw prompt text to analyze or improve. Leading and trailing whitespace is trimmed. |
| `categories` | `string[]` | No | Max 64 items, total length <= 2,000 chars | List of existing categories from the user's vault. The AI selects the best fit from this list. |
| `mode` | `string` | No | `'analyze'` or `'improve'` (Default: `'analyze'`) | The operation mode. `'analyze'` evaluates quality; `'improve'` rewrites the prompt. |

#### Mode 1: Quality Analysis (`mode: "analyze"`)

Evaluates clarity, identifies flaws, suggests tags, and provides actionable recommendations.

**Sample Request**:
```json
{
  "prompt": "Write a python script to parse logs and send alerts on error.",
  "categories": ["Development", "DevOps", "Personal"],
  "mode": "analyze"
}
```

**Sample Response (HTTP 200 OK)**:
```json
{
  "qualityScore": 7.5,
  "scoreLabel": "GOOD",
  "weakSpots": [
    "Log file format (JSON, syslog, plain text) is not specified",
    "Alerting destination (Slack, Email, PagerDuty) is missing",
    "Error threshold condition is undefined"
  ],
  "improvements": [
    "Specify the log file structure and timestamp format",
    "Name the desired notification channel and required authentication",
    "Define rate limits for alerts to prevent alert fatigue"
  ],
  "confidence": "HIGH",
  "confidenceNote": "Clear operational goal with standard system administration patterns.",
  "title": "Python Log Parser and Alert Script",
  "category": "DevOps",
  "tags": [
    "python",
    "logging",
    "devops",
    "monitoring",
    "alerts"
  ],
  "provider": "gemini"
}
```

**Field Descriptions**:
- `qualityScore`: Number between 0.0 and 10.0 representing prompt effectiveness.
- `scoreLabel`: Human label (`EXCELLENT` for >= 9.0, `GOOD` for 7.0 to 8.9, `CONSIDER IMPROVING` for < 7.0).
- `weakSpots`: Up to 5 specific ambiguities or missing constraints detected in the prompt.
- `improvements`: Up to 10 concrete suggestions to make the prompt yield better results.
- `confidence`: Either `HIGH` or `MEDIUM` based on the certainty of the model evaluation.
- `confidenceNote`: A one-sentence explanation supporting the confidence score.
- `title`: An automatically generated title (clean and human-readable).
- `category`: The best category selected from the user's provided list (defaults to `General` if none match).
- `tags`: Up to 8 clean lowercase topical tags.
- `provider`: Which upstream engine fulfilled the request (e.g., `gemini`, `gemini[0]`, or `groq`).

---

#### Mode 2: Prompt Rewriting (`mode: "improve"`)

Rewrites the prompt into a comprehensive, high-quality version with role context and output constraints.

**Sample Request**:
```json
{
  "prompt": "Give me ideas for marketing our new b2b developer tool.",
  "categories": ["Marketing", "Growth"],
  "mode": "improve"
}
```

**Sample Response (HTTP 200 OK)**:
```json
{
  "improvedPrompt": "Act as a Senior B2B Developer Marketing Strategist. Propose 5 actionable, high-impact growth strategies to launch a new developer productivity tool. For each strategy, provide: (1) Core channel (e.g. GitHub, technical blogs, open-source sponsorships), (2) Concrete execution step for weeks 1-4, (3) Expected cost/resource requirement, and (4) Success metrics (KPIs) to track. Focus on technical credibility and avoid generic hype.",
  "improvementsMade": [
    "Added expert persona (Senior B2B Developer Marketing Strategist)",
    "Set strict output structure (5 numbered strategies with 4 clear sub-points each)",
    "Added tone constraint (technical credibility over generic hype)",
    "Introduced measurable KPI requirements"
  ],
  "provider": "gemini"
}
```

**Field Descriptions**:
- `improvedPrompt`: Complete, production-ready rewritten prompt text.
- `improvementsMade`: Itemized list explaining every enhancement made to the original draft.
- `provider`: Which AI provider answered the call.

---

### 4.2 GET `/api/health`

Reports the real-time operational status of the server, uptime, memory cache health, and AI provider availability.

**Sample Request**:
```bash
curl -X GET http://localhost:3002/api/health
```

**Sample Response (HTTP 200 OK)**:
```json
{
  "status": "ok",
  "version": "2.2.0",
  "uptimeSeconds": 18420,
  "cache": {
    "entries": 35,
    "pending": 0
  },
  "models": {
    "gemini": "gemini-3.6-flash",
    "groq": "qwen/qwen3.8-27b"
  },
  "geminiStructuredOutput": true,
  "providers": {
    "gemini": {
      "configured": true,
      "lastFailure": null
    },
    "groq": {
      "configured": true,
      "lastFailure": null
    }
  }
}
```

**Headers Returned**:
- `Cache-Control: no-store`: Ensures monitoring systems always receive fresh data without proxy caching.

---

### 4.3 Catch-All 404 Handler (`/api/*`)

Any unknown route under `/api/` immediately returns a clean JSON error rather than HTML:

```json
{
  "error": "Unknown API route: GET /api/nonexistent"
}
```

---

## 5. HTTP Status Code Catalog & Error Handling

All error responses from the API return a standardized JSON object with a human-readable `error` message:

```json
{
  "error": "Descriptive message here."
}
```

| HTTP Status | Meaning | Reason | Example Message |
| :--- | :--- | :--- | :--- |
| **200 OK** | Success | Request was processed or served from cache. | *(Response payload)* |
| **400 Bad Request** | Validation Failure | Missing prompt, prompt too short (< 3 chars), prompt too long (> 10,000 chars), or malformed JSON. | `"Prompt must be at least 3 characters."`<br>`"Request body is not valid JSON."` |
| **404 Not Found** | Unknown Route | The requested URL does not match any known API endpoint. | `"Unknown API route: POST /api/unknown"` |
| **413 Payload Too Large** | Size Exceeded | The incoming JSON request body exceeds the 1 MB parser ceiling. | `"Request body is too large."` |
| **429 Too Many Requests** | Rate Limit Exceeded | Client exceeded 30 requests per minute. | `"Too many requests. Please wait a moment before trying again."` |
| **502 Bad Gateway** | Upstream AI Down | Both Gemini and Groq failed, timed out, or returned invalid JSON. | `"Every AI provider failed. Check API keys, quota, and network connectivity."` |
| **503 Service Unavailable** | Unconfigured Server | The server is running without any Gemini or Groq API keys configured. | `"The AI service is not configured on this server."` |

---

## 6. Rate Limiting Specifications

To prevent runaway costs and protect server resources, an in-memory sliding window rate limiter protects all `/api/` routes:

- **Window Duration**: 60,000 milliseconds (1 minute).
- **Maximum Requests**: 30 requests per window per IP address.
- **Reverse Proxy Support**: Configured with `app.set('trust proxy', TRUST_PROXY_HOPS)` to ensure client IP addresses are accurately identified behind Cloudflare, Railway, or Render proxies.

### Rate Limit Response Headers
Every response from the `/api/` router includes standard informational rate limit headers:

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1774163460
```

When a client hits the rate limit (request 31+ within 60 seconds), the server returns HTTP `429 Too Many Requests` along with a `Retry-After` header specifying the number of seconds to wait:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 35
Content-Type: application/json

{
  "error": "Too many requests. Please wait a moment before trying again."
}
```

---

## 7. Direct Cloud Sync (Supabase Client-Side API)

For cloud synchronization, PromptVault bypasses the Express proxy entirely and connects the browser client directly to Supabase over TLS 1.3:

1. **Authentication**: Handled via Supabase GoTrue using OAuth PKCE flow (Google or GitHub).
2. **Access Security**: Guarded by PostgreSQL Row-Level Security (RLS) on `public.vaults`. The database verifies `auth.uid() = user_id` on every query.
3. **Payload Security**: The cloud payload is an encrypted AES-256-GCM envelope (`ciphertext`, `iv`, `salt`). The Supabase database never receives plaintext prompts or encryption keys.

---

## 8. cURL Command Quick-Reference

### Test Health Check
```bash
curl -s http://localhost:3002/api/health | jq .
```

### Analyze a Prompt
```bash
curl -s -X POST http://localhost:3002/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a database migration script in SQL to add a user status column with default active.",
    "categories": ["Database", "SQL"],
    "mode": "analyze"
  }' | jq .
```

### Improve a Prompt
```bash
curl -s -X POST http://localhost:3002/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a regex to find all emails in a text.",
    "categories": ["Regex", "Development"],
    "mode": "improve"
  }' | jq .
```
