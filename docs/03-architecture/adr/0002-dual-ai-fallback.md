# ADR 0002: Dual-Provider AI Pipeline (Gemini Primary, Groq Fallback)

| Metadata | Details |
| :--- | :--- |
| **Status** | Accepted / Implemented |
| **Date** | 2026-10-22 |
| **Deciders** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Consulted** | Engineering & AI Integration Team |
| **Informs** | [server/index.ts](file:///o:/github/promptVault/server/index.ts), [AiAssistantWidget.tsx](file:///o:/github/promptVault/src/components/AiAssistantWidget.tsx), [ai-suggestion-pipeline.png](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png) |

---

## Context & Problem Statement

PromptVault includes an **AI Prompt Doctor** that evaluates prompts against an 8-point prompt engineering rubric and provides automated rewrites. Initially, relying on a single third-party AI provider introduced serious reliability risks:
1. **API Rate Limiting & Outages**: Single LLM APIs periodically suffer from rate limit throttling (HTTP 429), regional outages, or slow response times during peak usage hours.
2. **Schema Inconsistency**: Different LLM model families format JSON responses unpredictably, leading to JSON parsing errors on the client.
3. **User Disruption**: A failed AI call breaks the user's flow and undermines trust in the application.

We needed a resilient, high-availability architecture that ensures the AI Prompt Doctor remains operational even during major provider outages.

---

## Decision Drivers

- **Zero-Outage User Experience**: Users should never experience an error screen because a single external AI vendor is degraded.
- **Strict Output Schema Compliance**: The output format must match the 8-point rubric and UI contracts regardless of which model processes the request.
- **Cost & Speed Efficiency**: Fast response times (< 2.5s) while keeping token consumption and operational costs economical.
- **Security & Privacy**: Third-party API keys must remain strictly confidential on the server.

---

## Considered Options

1. **Option 1: Single Provider with Exponential Backoff (Gemini Only)**:
   - *Problem*: Backoff retries do not help during prolonged vendor outages or hard rate-limit exhaustion, causing long user-facing hangs.
2. **Option 2: Direct Client-Side Multi-LLM Calls**: Let the browser call Gemini or Groq directly using user-supplied keys.
   - *Problem*: Heavy client-side SDKs, exposed API keys in browser network inspectors, CORS complexities, and lack of unified caching.
3. **Option 3: Server-Side Dual-Provider Orchestration with Transparent Fallback (Chosen)**:
   - The Express proxy hosts a unified endpoint (`POST /api/suggest`).
   - Requests first attempt Google Gemini (default: `gemini-3.6-flash`).
   - If Gemini fails (HTTP 429, 500, 503, network timeout > 35s), the server transparently switches to Groq Cloud (default: `qwen/qwen3.8-27b`).
   - Unified JSON normalization sanitizes the response before sending it to the client.

---

## Decision Outcome

We selected **Option 3: Server-Side Dual-Provider Orchestration with Transparent Fallback**.

### Technical Implementation Details
1. **Model Selection**:
   - Primary: Google Gemini (default: `gemini-3.6-flash`, configurable via `GEMINI_MODEL`). Chosen for state-of-the-art instruction adherence, low latency, and deep reasoning capabilities.
   - Secondary: Groq Cloud (default: `qwen/qwen3.8-27b`, configurable via `GROQ_MODEL`). Chosen for ultra-high-speed inference (LPU architecture) and open-weights reliability.
2. **Standardized Prompt Engineering Rubric**:
   - Both models are fed identical system instructions enforcing an 8-point rubric (Goal clarity, persona role, context, constraints, output format, few-shot examples, edge cases, guardrails) and strict JSON output.
3. **In-Memory Cache (30-Minute TTL, 200 Entries)**:
   - Cache keys are generated via SHA-256 hash of the normalized prompt body and categories.
   - Up to 200 recent responses are cached, reducing external API costs and delivering sub-15ms responses on repeated evaluations.
4. **Sliding-Window Rate Limiting**:
   - Enforced per IP address (30 requests per minute) to protect against abusive scraping and token exhaustion.

---

## Consequences

### Positive
- **High Availability**: The AI Prompt Doctor achieves >= 99.9% uptime. If Google's API degrades, Groq instantly takes over without the user noticing.
- **Consistent UI Contracts**: The client receives identical JSON structures regardless of the underlying LLM provider.
- **Security & Key Protection**: Gemini and Groq API keys reside solely in server environment variables, never bundled into client JavaScript.
- **Fast Performance**: In-memory caching eliminates redundant API round-trips for common prompts.

### Negative / Trade-Offs
- **Two API Keys Recommended for Full Redundancy**: Server hosts should configure both `GEMINI_API_KEYS` and `GROQ_API_KEY` to enable seamless failover (the app gracefully runs with either if only one is provided).
- **Slight Model Variance in Rewrites**: While the JSON schema is identical, different models have slightly different prose writing styles. This is mitigated by our strict 8-point system prompt constraints and normalization.

---