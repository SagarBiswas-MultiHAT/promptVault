/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT/promptVault)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { configureStorageBackend, type StorageBackend, type StorageChangeCallback } from '../utils/storage.ts';

const cache = new Map<string, string>();

export async function initExtensionStorage(): Promise<void> {
  const items = await chrome.storage.local.get(null);
  for (const [key, value] of Object.entries(items)) {
    if (typeof value === 'string') {
      cache.set(key, value);
    }
  }
  configureStorageBackend(extensionStorageBackend);
}

export async function persistVaultAndRefreshCache(vaultJson: string): Promise<void> {
  await chrome.storage.local.set({ 'prompt-vault-data': vaultJson });
  cache.set('prompt-vault-data', vaultJson);
}

export const extensionStorageBackend: StorageBackend = {
  getItem(key: string): string | null {
    return cache.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    cache.set(key, value);
    chrome.storage.local.set({ [key]: value }).catch((err: unknown) => {
      console.error('[PromptVault Extension] Failed to persist to chrome.storage.local:', err);
    });
  },
  removeItem(key: string): void {
    cache.delete(key);
    chrome.storage.local.remove(key).catch((err: unknown) => {
      console.error('[PromptVault Extension] Failed to remove from chrome.storage.local:', err);
    });
  },
  subscribe(callback: StorageChangeCallback): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local') return;
      for (const [key, change] of Object.entries(changes)) {
        if (change.newValue !== undefined) {
          const nextVal = typeof change.newValue === 'string' ? change.newValue : JSON.stringify(change.newValue);
          cache.set(key, nextVal);
          callback(key, nextVal);
        } else {
          cache.delete(key);
          callback(key, null);
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },
};
