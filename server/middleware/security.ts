/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RequestHandler } from 'express';
import { IS_PRODUCTION } from '../config.ts';

/**
 * The production Content-Security-Policy.
 *
 * `'unsafe-hashes'` and a `'sha256-1jAmyYX…'` script hash used to sit in
 * `script-src`. They covered an inline `onload` handler that no longer exists —
 * `index.html` now loads `/gtag-init.js` as an external file, and its only
 * remaining inline `<script>` is `application/ld+json`, which is data and never
 * executed. Both directives were dead config that weakened the policy for
 * nothing, so they are gone.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Blocks `<base href>` injection and plugin/embed content outright, and stops
  // a form from being retargeted at an attacker's endpoint.
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
  // 'unsafe-inline' is required: the build inlines critical CSS into the document
  // head, and both Tailwind and `motion` set element styles at runtime.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
  // The AI providers are reached through this server, never from the browser, so
  // they are deliberately absent from connect-src.
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://*.google-analytics.com https://*.analytics.google.com https://cloudflareinsights.com",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // `X-XSS-Protection: 1; mode=block` was here and is intentionally dropped.
  // It drove a browser XSS auditor that Chrome removed years ago after it was
  // shown to *introduce* vulnerabilities (it could be abused to selectively
  // disable legitimate scripts). No current browser honours it; the CSP below is
  // the real defence.

  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);
  }

  next();
};
