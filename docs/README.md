# PromptVault Documentation Portal & Knowledge Base

| Metadata | Details |
| :--- | :--- |
| **Product Name** | PromptVault |
| **Tagline** | The Private, Offline-First Prompt Manager for AI Power Users |
| **Documentation Version** | v2.2.0 |
| **Repository** | [github.com/SagarBiswas-MultiHAT/promptVault](https://github.com/SagarBiswas-MultiHAT/promptVault) |
| **Lead Architect** | Sagar Biswas (@SagarBiswas-MultiHAT) / MultiHAT (<https://multihat.dev>) |
| **Status** | Production Baseline (Fully Verified) |

---

## 1. Welcome to PromptVault Documentation

PromptVault is a **zero-knowledge, local-first notebook** built specifically for AI prompt engineers, software developers, researchers, and creators.

When you use modern AI tools (like ChatGPT, Claude, or Midjourney), the prompts you write often contain confidential project ideas, proprietary source code, internal business logic, and personal drafts. Traditional cloud apps store your notes unencrypted on remote corporate servers where employees or third parties could potentially inspect them.

**PromptVault does the exact opposite**:
- **Your Computer Holds the Only Keys**: Your prompts are encrypted directly in your browser using military-grade **AES-256-GCM** encryption before anything is saved to disk.
- **True Offline First**: PromptVault runs completely offline without requiring an active internet connection.
- **No Passwords on Central Servers**: We never store your PIN, passphrase, or encryption keys on any server. If someone inspects your browser files or intercepts network traffic, they see only scrambled cryptographic noise.
- **Smart AI Librarian**: When you want AI feedback to polish your prompts, an isolated server proxy securely consults Google Gemini and Groq Cloud without exposing your private third-party API keys to the browser.
- **Private Multi-Device Sync**: Optional cloud backup powered by Supabase synchronization guarded by PostgreSQL Row-Level Security, storing only encrypted ciphertext.

This documentation portal is written following the **Docs-as-Code** standard: complete, factual, easy to read, and understandable by both non-technical stakeholders and veteran software engineers.

---

## 2. Master Documentation Index

Every document in this directory serves a specific role in explaining how PromptVault is conceived, built, secured, tested, and deployed:

```
docs/
├── 00-overview/
│   └── vision-charter.md         # Problem statement, vision, goals, success KPIs
├── 01-product/
│   └── prd.md                    # User personas, feature matrix, MoSCoW priorities
├── 02-requirements/
│   └── srs.md                    # Engineering specs, latencies, cryptographic rules
├── 03-architecture/
│   ├── architecture.md           # C4 architecture models, technology stack rationale
│   ├── data-model.md             # ERD, data dictionary, schema versioning, tombstones
│   └── adr/                      # Architectural Decision Records (ADRs 0001 - 0004)
├── 04-security/
│   └── threat-model.md           # STRIDE threat analysis, trust boundaries, invariants
├── 05-api/
│   ├── openapi.yaml              # OpenAPI 3.1.0 machine-readable schema
│   └── api-spec.md               # Human-friendly API guide, status codes, cURL examples
├── 06-testing/
│   └── test-strategy.md          # Test pyramid, Vitest unit tests, Playwright E2E suites
└── 07-operations/
    └── deployment-guide.md       # Production deployment runbook, Docker, Supabase setup
```

### Complete Document Catalog

| Directory & File | Document Title | Description | Primary Audience |
| :--- | :--- | :--- | :--- |
| [docs/00-overview/vision-charter.md](file:///o:/github/promptVault/docs/00-overview/vision-charter.md) | **Vision & Project Charter** | High-level summary of why PromptVault exists, the core privacy problem it solves, target user archetypes, success metrics, and strategic project boundaries. | Founders, Executives, All Users |
| [docs/01-product/prd.md](file:///o:/github/promptVault/docs/01-product/prd.md) | **Product Requirements Document (PRD)** | Detailed user personas, MoSCoW feature prioritization table, functional user stories (FR-1 to FR-7), accessibility targets, and non-goals. | Product Managers, Designers, Developers |
| [docs/02-requirements/srs.md](file:///o:/github/promptVault/docs/02-requirements/srs.md) | **Software Requirements Specification (SRS)** | Quantifiable technical specifications: PBKDF2 600k hashing rounds, 1-second debouncing, 30-second sync polling, rate limits, and 30-day deletion tombstones. | Software Engineers, QA Leads |
| [docs/03-architecture/architecture.md](file:///o:/github/promptVault/docs/03-architecture/architecture.md) | **Architecture Blueprint** | C4 architecture models (Context, Container, Component, Code), 4-tier system stack, component decomposition, and technology selection trade-offs. | Architects, Lead Developers |
| [docs/03-architecture/data-model.md](file:///o:/github/promptVault/docs/03-architecture/data-model.md) | **Data Model & Schema Specification** | Full Entity-Relationship Diagram (ERD), TypeScript schemas, data dictionary, schema versioning lifecycle (`2.0.0`), and tombstone deletion tracking. | Database Designers, Developers |
| [docs/03-architecture/adr/](file:///o:/github/promptVault/docs/03-architecture/adr/) | **Architectural Decision Records (ADRs)** | Formal records documenting major architectural decisions: Envelope Encryption (0001), Dual AI Fallback (0002), Last-Write-Wins Merge (0003), and Backend Isolation (0004). | Senior Engineers, System Architects |
| [docs/04-security/threat-model.md](file:///o:/github/promptVault/docs/04-security/threat-model.md) | **Threat Model & Security Spec** | Plain-English security summary, 3-tier asset classification, trust boundary maps, STRIDE threat mitigations, and 5 mandatory security invariants. | Security Auditors, Compliance, Users |
| [docs/05-api/openapi.yaml](file:///o:/github/promptVault/docs/05-api/openapi.yaml) | **OpenAPI 3.1.0 Specification** | Standard machine-readable OpenAPI specification for the Express AI proxy and health monitoring endpoints. | API Developers, Tooling Integrations |
| [docs/05-api/api-spec.md](file:///o:/github/promptVault/docs/05-api/api-spec.md) | **API Integration & Usage Guide** | Human-readable API guide covering `/api/suggest` (analyze and improve modes), `/api/health`, error codes, rate-limiting headers, and cURL examples. | Frontend Devs, Backend Devs |
| [docs/06-testing/test-strategy.md](file:///o:/github/promptVault/docs/06-testing/test-strategy.md) | **Test Strategy & Quality Plan** | Quality assurance framework covering 74 Vitest unit tests, Playwright browser E2E tests, API key diagnostic probes, and regression prevention history. | QA Engineers, Contributors |
| [docs/07-operations/deployment-guide.md](file:///o:/github/promptVault/docs/07-operations/deployment-guide.md) | **Production Deployment Runbook** | Complete deployment instructions for VPS/Node.js, multi-stage Docker containerization, cloud PaaS (Railway, Render), Supabase migrations, and troubleshooting. | DevOps, Sysadmins, Self-Hosters |

---

## 3. Visual Architecture Diagrams

PromptVault includes a comprehensive visual library of high-resolution architectural diagrams located in the [diagrams/](file:///o:/github/promptVault/diagrams) directory:

1. **System Architecture Overview**:
   - Visual Diagram: [diagrams/architecture.png](file:///o:/github/promptVault/diagrams/architecture.png)
   - *What it shows*: Complete end-to-end component topology spanning the Browser Client, Express AI Gateway, External AI Providers (Gemini + Groq), and Supabase Cloud.

2. **Cryptographic Encryption Workflow**:
   - Visual Diagram: [diagrams/encryption-workflow.png](file:///o:/github/promptVault/diagrams/encryption-workflow.png)
   - *What it shows*: Step-by-step key derivation (PBKDF2 with 600,000 iterations), DEK generation, AES-256-GCM authenticated encryption, and the dual-path unlocking workflow (PIN vs Emergency Recovery Key).

3. **Cloud Synchronization Lifecycle**:
   - Visual Diagram: [diagrams/cloud-sync-lifecycle.png](file:///o:/github/promptVault/diagrams/cloud-sync-lifecycle.png)
   - *What it shows*: Multi-device synchronization, 1-second write debouncing, 30-second cloud polling, deterministic Last-Write-Wins merge reconciliation, and 30-day deletion tombstone propagation.

4. **AI Suggestion & Fallback Pipeline**:
   - Visual Diagram: [diagrams/ai-suggestion-pipeline.png](file:///o:/github/promptVault/diagrams/ai-suggestion-pipeline.png)
   - *What it shows*: Client prompt submission, 30-minute in-memory caching, Gemini key pool rotation, automated Groq fallback circuit-breaker, JSON repair retry, and response normalization.

5. **Runtime System Workflows**:
   - Visual Diagram: [diagrams/runtime-workflows.png](file:///o:/github/promptVault/diagrams/runtime-workflows.png)
   - *What it shows*: Complete user journeys for smart copy with dynamic variable substitution (`{{variables}}`), AI Prompt Doctor scoring and rewriting with 1-click vault save, and portable JSON backup export and schema-sanitized import with conflict-free merge.

---

## 4. Reading Paths by Role

To help you find exactly what you need quickly, follow the tailored reading path for your role:

### For Non-Technical Users & Evaluators
- **Start here**: [docs/00-overview/vision-charter.md](file:///o:/github/promptVault/docs/00-overview/vision-charter.md) to understand why PromptVault was created and how it protects your ideas.
- **Next**: [docs/04-security/threat-model.md#1-security-in-plain-english-executive-summary](file:///o:/github/promptVault/docs/04-security/threat-model.md) to read how your prompts are locked like a personal home safe.
- **Then**: [docs/01-product/prd.md](file:///o:/github/promptVault/docs/01-product/prd.md) to explore the features, user personas, and capabilities.

### For Software Developers & Contributors
- **Start here**: [docs/03-architecture/architecture.md](file:///o:/github/promptVault/docs/03-architecture/architecture.md) for the 4-tier stack and component decomposition.
- **Next**: [docs/03-architecture/data-model.md](file:///o:/github/promptVault/docs/03-architecture/data-model.md) for the TypeScript interfaces and storage schema.
- **Then**: [docs/05-api/api-spec.md](file:///o:/github/promptVault/docs/05-api/api-spec.md) for backend endpoints, and [docs/06-testing/test-strategy.md](file:///o:/github/promptVault/docs/06-testing/test-strategy.md) to run the test suite.

### For Security Auditors & Privacy Specialists
- **Start here**: [docs/04-security/threat-model.md](file:///o:/github/promptVault/docs/04-security/threat-model.md) for the comprehensive STRIDE risk analysis and 5 inviolable security rules.
- **Next**: [docs/03-architecture/adr/0001-envelope-encryption.md](file:///o:/github/promptVault/docs/03-architecture/adr/0001-envelope-encryption.md) for cryptographic implementation rationale.
- **Then**: Inspect the live automated tests in [tests/unit/crypto.test.ts](file:///o:/github/promptVault/tests/unit/crypto.test.ts) and [tests/e2e/lock.spec.ts](file:///o:/github/promptVault/tests/e2e/lock.spec.ts) verifying zero-plaintext storage.

### For DevOps & Self-Hosters
- **Start here**: [docs/07-operations/deployment-guide.md](file:///o:/github/promptVault/docs/07-operations/deployment-guide.md) for hardware sizing, environment variables, and Docker setup.
- **Next**: [docs/05-api/api-spec.md](file:///o:/github/promptVault/docs/05-api/api-spec.md) for health probe endpoints and rate-limit configuration.
- **Then**: Run `npm run test:keys` to verify your AI provider keys.

---

## 5. Documentation Standards & Guidelines

All documents within the PromptVault repository adhere to the following quality rules:
1. **Plain-English Accessibility**: Every technical topic begins with an executive summary that anyone can understand without technical jargon.
2. **100% Codebase Accuracy**: Every line of documentation is verified against the actual TypeScript codebase and automated test suites.
3. **No Dead Links**: All internal file and symbol links are verified and use standard GitHub markdown formatting.
4. **Standard Punctuation**: Prohibited characters (such as em-dashes) are excluded in favor of standard punctuation for universal font and screen-reader compatibility.
5. **Living Documentation**: Changes to code, APIs, or database schemas must be accompanied by updates to the corresponding documentation files.
