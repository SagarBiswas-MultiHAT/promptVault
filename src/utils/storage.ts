/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guarded `localStorage` access.
 *
 * Every direct `localStorage` call in this app was previously unguarded, which
 * fails in two distinct ways that need distinct handling:
 *
 * 1. **The write is rejected.** `QuotaExceededError` on a full origin. The vault
 *    silently stops persisting while the UI keeps reporting success — the user
 *    finds out when they reload and lose work.
 * 2. **The API is unreachable.** Reading `window.localStorage` *itself* throws in
 *    Safari private browsing and wherever storage is blocked by policy. That is a
 *    `SecurityError` on property access, before any method call, so a try/catch
 *    around `setItem` alone does not cover it.
 *
 * Callers get a discriminated result instead of an exception, so the failure is
 * impossible to ignore silently but never crashes a render.
 */

export type StorageFailure = 'quota' | 'unavailable';

export type WriteResult = { ok: true } | { ok: false; reason: StorageFailure; error: unknown };

/**
 * Resolve the backing store, or `null` when storage is blocked.
 *
 * Not cached: a user can grant storage permission mid-session, and a cached
 * `null` would keep the vault non-persistent for the rest of the page's life.
 */
function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Distinguish "out of space" from every other write failure.
 *
 * The modern name is `QuotaExceededError`, but Firefox has historically used
 * `NS_ERROR_DOM_QUOTA_REACHED`, and the legacy numeric codes (22 standard,
 * 1014 Firefox) are still what some engines report. Checking all four is the
 * only reliable test.
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

export function readRaw(key: string): string | null {
  const storage = store();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Read and parse JSON, returning `null` unless it satisfies `isValid`.
 *
 * The validator is required rather than optional. Parsed JSON from storage is
 * untrusted input — it may have been written by an older schema, hand-edited in
 * devtools, or corrupted by a partial write — and an unchecked cast to `T` is how
 * that turns into a crash three components deep.
 */
export function readJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): WriteResult {
  const storage = store();
  if (!storage) return { ok: false, reason: 'unavailable', error: new Error('localStorage is unavailable') };

  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'unavailable', error };
  }
}

export function removeKey(key: string): void {
  const storage = store();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Nothing useful to do: the key is already unreachable, which is the goal.
  }
}
