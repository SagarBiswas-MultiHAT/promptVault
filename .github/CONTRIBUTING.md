# Contributing to PromptVault

Thank you for your interest in contributing to PromptVault. We welcome contributions from developers of all skill levels. Whether you are fixing a typo in documentation, polishing a UI transition, improving test coverage, or designing a new feature, your help makes a difference.

---

## Code of Conduct & Values

PromptVault is built on three core pillars:
- **Privacy First:** Prompts are sensitive. Never introduce changes that leak user prompts, unencrypted vault data, or credentials to third-party servers.
- **Offline Reliability:** The application must remain completely usable when disconnected from the internet. Cloud features like Supabase sync must always remain optional.
- **Craftsmanship:** We care deeply about subtle details: instant load times, zero layout shifts, smooth transitions, strict type safety, and clean keyboard ergonomics.

Please treat fellow contributors and users with kindness, empathy, and respect.

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or newer (Node 20 or 22 LTS recommended)
- **npm**: Version 9 or newer
- **Git**: Configured with your personal name and email

### Local Setup

1. Fork the repository on GitHub and clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/promptVault.git
   cd promptVault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your local environment file:
   ```bash
   # On macOS or Linux:
   cp .env.example .env

   # On Windows (Command Prompt or PowerShell):
   copy .env.example .env
   ```

4. Configure your AI keys in `.env`. You will need at least one free API key:
   - Google Gemini: [Get a key from Google AI Studio](https://aistudio.google.com/apikey)
   - Groq: [Get a key from Groq Console](https://console.groq.com/keys)

   PromptVault will try Gemini first and seamlessly fall back to Groq if rate limits are hit.

5. (Optional) Run the key diagnostic script to verify connectivity:
   ```bash
   npm run test:keys
   ```

---

## Development Workflow

PromptVault consists of a client-side React 19 application and a lightweight local proxy server for AI requests (which keeps your API keys secure on your machine).

To run both services in development:

1. **Terminal 1: Start the AI Proxy Server**
   ```bash
   npm run dev:api
   ```
   Runs on `http://localhost:3002`.

2. **Terminal 2: Start the Vite Dev Server**
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:3000`.

Open your browser at `http://localhost:3000` to start using the app.

---

## Project Structure

```text
promptVault/
├── src/                  # React 19 frontend application
│   ├── components/       # UI components (PromptCard, VaultGrid, Modals, etc.)
│   ├── hooks/            # Custom React hooks (useVault, useMediaQuery, etc.)
│   ├── utils/            # Storage, encryption, import/export, and normalization
│   ├── constants.ts      # Default tags, categories, and configuration
│   ├── types.ts          # Core TypeScript data contracts
│   ├── App.tsx           # Main application view and layout
│   └── index.css         # Tailwind CSS v4 styling rules
├── server/               # AI proxy server (Express + TypeScript)
│   └── index.ts          # Dual-provider fallback, rate limiting, and caching
├── tests/                # Test suites
│   ├── unit/             # Vitest unit tests (crypto, cache, storage, merge)
│   └── e2e/              # Playwright browser end-to-end tests
├── public/               # Static assets, icons, manifest, and robots.txt
└── scripts/              # Developer utility scripts (key health checks, asset optimizers)
```

---

## Quality Checks & Testing

Before submitting your pull request, please make sure all automated checks pass locally.

### 1. Typechecking

PromptVault enforces strict TypeScript configurations across four independent targets (app, server, build tools, and test suites):

```bash
npm run typecheck
```

### 2. Unit Tests

Run the Vitest unit tests covering encryption, data normalization, and cloud sync merging:

```bash
npm test
```

You can also run tests in watch mode while coding:

```bash
npm run test:watch
```

### 3. Production Build Verification

Ensure the production bundle builds cleanly without bundling warnings:

```bash
npm run build
```

### 4. End-to-End Tests

Verify complete browser interactions with Playwright:

```bash
npm run test:e2e
```

---

## Pull Request Guidelines

1. **Branch Naming:** Use descriptive branch names like `fix/copy-button-focus`, `feat/keyboard-cheat-sheet`, or `docs/update-security-note`.
2. **Commit Messages:** Write clear, concise commit messages that describe the "why" behind your change. Please avoid automated bot footers or artificial attributions. Keep commit history focused and tidy.
3. **No Unrelated Changes:** Keep pull requests scoped to a single problem or feature. This makes review faster and safer.
4. **Documentation:** If you add or modify a user-facing behavior, please update the corresponding section in `README.md`.
5. **Backwards Compatibility:** Changes to storage formats must gracefully handle existing user vaults stored in `localStorage`.

---

## Areas Where We Welcome Help

- **Good First Issues:** Look for issues tagged `good first issue` on GitHub for bite-sized tasks.
- **Accessibility:** Improving keyboard navigation, screen reader hints, and ARIA labels.
- **Test Coverage:** Adding edge case unit tests for crypto routines and synchronization logic.
- **Performance:** Optimizing bundle sizes, font loading, and rendering performance for large prompt vaults (>500 items).
- **Documentation:** Refining guides, improving code comments, and clarifying setup steps.

Thank you for helping make PromptVault better for everyone!
