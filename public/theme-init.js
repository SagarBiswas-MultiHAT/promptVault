/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apply the saved theme before first paint.
 *
 * The React effect that toggles the `light` class runs after hydration, so a
 * light-theme user saw a full-screen dark flash on every load. This runs
 * synchronously in <head>, before the body is painted.
 *
 * Kept as an external file rather than an inline <script> so it needs no CSP
 * exception: `script-src 'self'` already covers it. Loaded WITHOUT `defer` — a
 * deferred script runs after the document is parsed, which is exactly the flash
 * this is here to prevent.
 *
 * Deliberately duplicates the storage key and the shape of `settings.isDarkMode`
 * rather than importing them: this must not depend on the module graph, since the
 * whole point is to run before any of it loads. Guarded on every access so a
 * blocked or corrupted store leaves the default dark theme in place.
 */
(function () {
  try {
    var raw = window.localStorage.getItem('prompt-vault-data');
    if (!raw) return;
    var settings = JSON.parse(raw).settings;
    if (settings && settings.isDarkMode === false) {
      document.documentElement.classList.add('light');
    }
  } catch (err) {
    // No storage, blocked storage, or unparsable data: keep the dark default.
  }
})();
