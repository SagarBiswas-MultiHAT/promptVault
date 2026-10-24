/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildExtension(): Promise<void> {
  console.log('[PromptVault] Starting extension build...');

  // Pass 1: Build popup.html and background.ts as ES Module
  console.log('[PromptVault] Pass 1: Building popup and background service worker...');
  await build({
    configFile: false,
    root: rootDir,
    publicDir: false,
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        process.env.VITE_API_BASE_URL || 'https://promptvault.multihat.dev'
      ),
    },
    build: {
      target: 'es2022',
      outDir: 'dist-extension',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(rootDir, 'src/extension/popup.html'),
          background: path.resolve(rootDir, 'src/extension/background.ts'),
        },
        output: {
          format: 'es',
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') return 'background.js';
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  });

  // Relocate popup.html from dist-extension/src/extension/popup.html to dist-extension/popup.html
  const nestedHtml = path.resolve(rootDir, 'dist-extension/src/extension/popup.html');
  const rootHtml = path.resolve(rootDir, 'dist-extension/popup.html');
  if (fs.existsSync(nestedHtml)) {
    let htmlContent = fs.readFileSync(nestedHtml, 'utf8');
    htmlContent = htmlContent.replace(/(\.\.\/)+assets\//g, './assets/');
    fs.writeFileSync(rootHtml, htmlContent, 'utf8');
    fs.rmSync(path.resolve(rootDir, 'dist-extension/src'), { recursive: true, force: true });
  } else if (!fs.existsSync(rootHtml)) {
    throw new Error('Extension popup.html was not emitted at the expected Vite output path');
  }

  // Pass 2: Standalone IIFE Content Script with zero code-splitting
  console.log('[PromptVault] Pass 2: Building content script as isolated IIFE...');
  await build({
    configFile: false,
    root: rootDir,
    publicDir: false,
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      target: 'es2022',
      outDir: 'dist-extension',
      emptyOutDir: false,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve(rootDir, 'src/extension/content.tsx'),
        name: 'PromptVaultContentScript',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // Clean up any stray style.css emitted by library mode
  const strayCss = path.resolve(rootDir, 'dist-extension/style.css');
  if (fs.existsSync(strayCss)) {
    fs.rmSync(strayCss, { force: true });
  }

  // Asset Provisioning: Copy manifest.json
  console.log('[PromptVault] Provisioning manifest and icons...');
  fs.copyFileSync(
    path.resolve(rootDir, 'src/extension/manifest.json'),
    path.resolve(rootDir, 'dist-extension/manifest.json')
  );

  // Asset Provisioning: Copy icons
  const iconsSrcDir = path.resolve(rootDir, 'src/extension/icons');
  const iconsDestDir = path.resolve(rootDir, 'dist-extension/icons');
  if (!fs.existsSync(iconsDestDir)) {
    fs.mkdirSync(iconsDestDir, { recursive: true });
  }
  if (fs.existsSync(iconsSrcDir)) {
    for (const iconFile of fs.readdirSync(iconsSrcDir)) {
      fs.copyFileSync(path.join(iconsSrcDir, iconFile), path.join(iconsDestDir, iconFile));
    }
  }

  // Asset Provisioning: Copy UI logo assets
  const publicDir = path.resolve(rootDir, 'public');
  for (const logoName of ['logo-sm.png', 'logo.png']) {
    const srcFile = path.join(publicDir, logoName);
    const destFile = path.join(rootDir, 'dist-extension', logoName);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  }

  // Integrity Check: Content script must not contain top-level imports
  const contentScriptPath = path.resolve(rootDir, 'dist-extension/content.js');
  if (!fs.existsSync(contentScriptPath)) {
    throw new Error('dist-extension/content.js was not emitted');
  }
  const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf8');
  if (/^import\s+/m.test(contentScriptCode)) {
    throw new Error('dist-extension/content.js contains top-level import statement; IIFE bundling failed');
  }

  console.log('[PromptVault] Browser extension build succeeded: dist-extension/');
}

buildExtension().catch((err: unknown) => {
  console.error('[PromptVault] Extension build failed:', err);
  process.exit(1);
});
