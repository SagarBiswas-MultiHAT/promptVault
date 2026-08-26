import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PRELOAD_PLACEHOLDER = '<!-- __CSS_PRELOAD__ -->';

function cssPreloadPlugin() {
  return {
    name: 'inject-css-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!html.includes(CSS_PRELOAD_PLACEHOLDER)) {
          return html;
        }

        if (!ctx?.bundle) {
          return html.replace(CSS_PRELOAD_PLACEHOLDER, '');
        }

        const cssAssets = Object.values(ctx.bundle).filter(
          (item) => item.type === 'asset' && item.fileName.endsWith('.css')
        );
        const cssAsset = cssAssets.find((item) => item.fileName.startsWith('assets/index-')) || cssAssets[0];

        if (!cssAsset) {
          return html.replace(CSS_PRELOAD_PLACEHOLDER, '');
        }

        const href = `/${cssAsset.fileName}`;
        const preloadTag = `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">`;
        const noscriptTag = `<noscript><link rel="stylesheet" href="${href}"></noscript>`;
        const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stylesheetRegex = new RegExp(`<link[^>]*rel="stylesheet"[^>]*href="${escapedHref}"[^>]*>\\s*`, 'g');

        return html
          .replace(stylesheetRegex, '')
          .replace(CSS_PRELOAD_PLACEHOLDER, `${preloadTag}\n    ${noscriptTag}`);
      },
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), cssPreloadPlugin()],
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
    build: {
      target: 'es2022',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion/react'],
            'vendor-icons': ['lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
