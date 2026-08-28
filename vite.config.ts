import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// `loadEnv` used to be called here and its result discarded, so it had no effect.
// Vite already exposes `VITE_*` vars to the client via `import.meta.env`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        // Exclude heavy lazy chunks (Supabase, Motion) from the critical initial preload list
        return deps.filter(
          (dep) =>
            !dep.includes('vendor-supabase') &&
            !dep.includes('vendor-motion') &&
            !dep.includes('supabase-')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/react/') || normalizedId.includes('/node_modules/react-dom/')) return 'vendor-react';
          if (normalizedId.includes('/node_modules/motion/')) return 'vendor-motion';
          if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
          if (normalizedId.includes('/node_modules/@supabase/')) return 'vendor-supabase';
        },
      },
    },
  },
});
