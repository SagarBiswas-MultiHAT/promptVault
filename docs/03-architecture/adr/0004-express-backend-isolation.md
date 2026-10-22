# ADR 0004: Express Backend Proxy for API Key Isolation and Rate Limiting

| Metadata | Details |
| :--- | :--- |
| **Status** | Accepted / Implemented |
| **Date** | 2026-10-22 |
| **Deciders** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Consulted** | Engineering & Security Architecture Team |
| **Informs** | [server/index.ts](file:///o:/github/promptVault/server/index.ts), [vite.config.ts](file:///o:/github/promptVault/vite.config.ts), [ai-suggestion-pipeline.png](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png) |

---

## Context & Problem Statement

PromptVault is primarily a client-side Single Page Application (SPA). When integrating artificial intelligence features (the AI Prompt Doctor powered by Google Gemini and Groq), we faced a major security dilemma regarding API credential handling:
1. **API Key Leaks**: If API keys are bundled into client-side JavaScript or queried directly from the browser, any user can inspect their DevTools Network tab, extract the API credentials, and run unauthorized requests against our cloud billing account.
2. **CORS Restrictions**: Direct browser requests to external AI vendor endpoints frequently encounter Cross-Origin Resource Sharing (CORS) blocks unless vendor-specific proxying is permitted.
3. **Denial-of-Service & Scraper Abuse**: Without a centralized gateway, malicious actors can flood third-party AI APIs, quickly exhausting monthly token allowances.

We needed a clean architecture to bridge the client-side SPA with external AI providers securely.

---

## Decision Drivers

- **Zero Client Credential Leakage**: Secret keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) must never touch client memory or network traces.
- **Traffic Protection & Abuse Prevention**: Must enforce IP-based rate limiting and response caching before requests reach third-party billing APIs.
- **Minimal Operational Footprint**: The server component must be lightweight, fast, stateless, and simple to deploy alongside static frontend files.
- **Development Simplicity**: Seamless local development experience where developers run a single command (`npm run dev`) and have both client and proxy communicate effortlessly.

---

## Considered Options

1. **Option 1: Pure Client-Side SPA (User Enters Own Keys)**: Force every user to obtain their own Google Gemini or Groq API keys and paste them into a settings modal.
   - *Problem*: High onboarding friction for non-technical users; exposes keys in `localStorage` where browser extensions could potentially compromise them.
2. **Option 2: Serverless Edge Functions (AWS Lambda / Cloudflare Workers)**: Deploy separate cloud functions to handle AI calls.
   - *Problem*: Vendor lock-in; fragmented repository structure; more complex local debugging and offline development setup.
3. **Option 3: Dedicated Express 5 Backend Gateway (Chosen)**:
   - Provide a lightweight Node.js Express 5 proxy in [server/index.ts](file:///o:/github/promptVault/server/index.ts).
   - In development, Vite proxies `/api` calls directly to the Express server (`localhost:3002`).
   - In production, Express serves the static pre-compiled Vite production bundle (`dist/`) while hosting `/api/suggest` and `/api/health`.
   - Express injects server-side environment variables into upstream calls, caches responses in memory, and enforces per-IP rate limiting.

---

## Decision Outcome

We selected **Option 3: Dedicated Express 5 Backend Gateway**.

### Technical Implementation Details
1. **Credential Boundary**:
   - `GEMINI_API_KEYS` and `GROQ_API_KEY` are read strictly from server-side environment variables (`process.env`).
   - The Vite build configuration strictly excludes these secrets from client bundles (`VITE_*` prefix convention).
2. **Security Middleware Stack**:
   - **Security Headers**: Enforces strict Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and HSTS headers.
   - **Compression**: Compresses JSON payloads and static assets using gzip.
   - **Rate Limiting**: Implements sliding-window rate limiting (30 requests per minute per IP).
3. **In-Memory Cache (30-Minute TTL, 200 Entries)**:
   - Evaluates whether identical prompt text was analyzed recently. If found, returns the cached evaluation in <= 15 milliseconds, sparing external API calls.
4. **Single-Port Production Deployment**:
   - In production, a single container or Node.js process hosts both the static frontend assets and the API gateway on port `3002` (or `$PORT`), simplifying deployment on VPS, Docker, or platforms like Render and Fly.io.

---

## Consequences

### Positive
- **Complete Secret Protection**: Third-party API keys are never transmitted to or accessible by client browsers.
- **Cost Protection**: Rate limits and in-memory caching prevent accidental or malicious billing surges.
- **Simple Deployment**: One process serves the entire application in production.
- **Clean Local DX**: Vite's proxy configuration in [vite.config.ts](file:///o:/github/promptVault/vite.config.ts) routes `/api` calls seamlessly during local coding.

### Negative / Trade-Offs
- **Requires Node.js Runtime**: Unlike pure static sites that can be hosted on GitHub Pages or an S3 bucket, PromptVault requires a Node.js runtime environment (such as a VPS, Render, Railway, or Docker container) to power its AI features.
- **Memory Scaling**: In-memory caching is per-server-instance. In horizontally scaled multi-container clusters, caches are not shared across instances (an acceptable trade-off for current single-instance deployment topologies).

---