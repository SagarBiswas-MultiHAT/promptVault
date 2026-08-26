/**
 * Cryptography for the on-device vault.
 *
 * The passphrase is never persisted. It derives a KEK which unwraps a random
 * vault key (DEK); the DEK encrypts the JSON with AES-256-GCM.
 */

import type { VaultData } from '../types.ts';

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const VAULT_KEY_BYTES = 32;

export type SecretMode = 'pin' | 'passphrase';

export interface KeyWrapper {
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface EncryptedVault {
  schemaVersion: '2.0.0';
  encryption: {
    version: 1;
    algorithm: 'AES-256-GCM';
    kdf: 'PBKDF2-SHA-256';
    iterations: number;
    mode: SecretMode;
    primary: KeyWrapper;
    recovery: KeyWrapper;
    payload: { iv: string; ciphertext: string };
  };
}

export interface NewEncryptedVault {
  envelope: EncryptedVault;
  key: CryptoKey;
  /** Show exactly once. It is an alternative to the secret, not a stored secret. */
  recoveryKey: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveKek(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function createWrapper(rawKey: Uint8Array, secret: string): Promise<KeyWrapper> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const kek = await deriveKek(secret, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, rawKey);
  return { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

async function unwrapKey(wrapper: KeyWrapper, secret: string): Promise<CryptoKey> {
  const kek = await deriveKek(secret, fromBase64(wrapper.salt));
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(wrapper.iv) }, kek, fromBase64(wrapper.ciphertext),
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptPayload(data: VaultData, key: CryptoKey): Promise<EncryptedVault['encryption']['payload']> {
  const iv = randomBytes(IV_BYTES);
  const plaintext = encoder.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

async function decryptPayload(envelope: EncryptedVault, key: CryptoKey): Promise<VaultData> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.encryption.payload.iv) }, key, fromBase64(envelope.encryption.payload.ciphertext),
  );
  return JSON.parse(decoder.decode(plaintext)) as VaultData;
}

export async function createEncryptedVault(data: VaultData, secret: string, mode: SecretMode): Promise<NewEncryptedVault> {
  const rawKey = randomBytes(VAULT_KEY_BYTES);
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const recoveryKey = Array.from(randomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const [primary, recovery, payload] = await Promise.all([createWrapper(rawKey, secret), createWrapper(rawKey, recoveryKey), encryptPayload(data, key)]);
  return {
    key,
    recoveryKey,
    envelope: {
      schemaVersion: '2.0.0',
      encryption: { version: 1, algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iterations: PBKDF2_ITERATIONS, mode, primary, recovery, payload },
    },
  };
}

export async function unlockEncryptedVault(envelope: EncryptedVault, secret: string): Promise<{ data: VaultData; key: CryptoKey }> {
  const key = await unwrapKey(envelope.encryption.primary, secret);
  return { key, data: await decryptPayload(envelope, key) };
}

export async function recoverEncryptedVault(envelope: EncryptedVault, recoveryKey: string): Promise<{ data: VaultData; key: CryptoKey }> {
  const key = await unwrapKey(envelope.encryption.recovery, recoveryKey);
  return { key, data: await decryptPayload(envelope, key) };
}

export async function updateEncryptedVault(envelope: EncryptedVault, data: VaultData, key: CryptoKey): Promise<EncryptedVault> {
  return { ...envelope, encryption: { ...envelope.encryption, payload: await encryptPayload(data, key) } };
}

export function isEncryptedVault(value: unknown): value is EncryptedVault {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<EncryptedVault>;
  const enc = candidate.encryption;
  return candidate.schemaVersion === '2.0.0' && typeof enc === 'object' && enc !== null &&
    enc.version === 1 && enc.algorithm === 'AES-256-GCM' && enc.kdf === 'PBKDF2-SHA-256' &&
    typeof enc.iterations === 'number' && (enc.mode === 'pin' || enc.mode === 'passphrase') &&
    typeof enc.primary?.salt === 'string' && typeof enc.primary?.iv === 'string' && typeof enc.primary?.ciphertext === 'string' &&
    typeof enc.recovery?.salt === 'string' && typeof enc.recovery?.iv === 'string' && typeof enc.recovery?.ciphertext === 'string' &&
    typeof enc.payload?.iv === 'string' && typeof enc.payload?.ciphertext === 'string';
}
