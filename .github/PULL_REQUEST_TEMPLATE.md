## Description

Please provide a clear and concise summary of the changes proposed in this pull request. Explain the problem being solved or the feature being introduced, along with the motivation behind your implementation choices.

Fixes #(issue)

---

## Type of Change

Please select the appropriate option(s):

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Performance optimization (improving speed, memory, or bundle size)
- [ ] Documentation update (guides, comments, or README improvements)
- [ ] Code refactoring (no functional or user-visible changes)
- [ ] Security fix or hardening

---

## Verification & Testing

Please describe how you verified your changes:

- [ ] Ran TypeScript typecheck across all projects (`npm run typecheck`)
- [ ] Ran Vitest unit test suite (`npm test`)
- [ ] Ran Playwright browser end-to-end tests (`npm run test:e2e`)
- [ ] Built production bundle cleanly (`npm run build`)
- [ ] Verified manually across light and dark themes in the browser
- [ ] Tested responsive mobile layout if UI was modified

---

## Security & Reliability Checklist

- [ ] No API keys, tokens, or sensitive credentials are included or committed.
- [ ] Changes maintain compatibility with existing user vaults stored in localStorage.
- [ ] Offline functionality remains intact and cloud sync remains strictly optional.
- [ ] Code follows project standards and contains clear, human comments where appropriate.
