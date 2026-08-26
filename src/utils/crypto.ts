/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hashes a string using SHA-256 for local PIN storage.
 * Note: This is an offline-first privacy measure, not absolute security.
 */
export async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validates a PIN against a hash.
 */
export async function validatePin(pin: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPin(pin);
  return hashedInput === hash;
}
