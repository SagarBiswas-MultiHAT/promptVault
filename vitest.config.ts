import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  // Only the hook tests are JSX; the plugin is inert for the rest.
  plugins: [react()],
  test: {
    // Default to Node: most units under test are pure (merge, normalize, crypto).
    // WebCrypto is available as a global in Node 18+, so crypto tests need no DOM.
    // Files that need a DOM opt in with `// @vitest-environment jsdom` at the top.
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
