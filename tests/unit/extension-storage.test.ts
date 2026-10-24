/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extensionStorageBackend,
  initExtensionStorage,
  persistVaultAndRefreshCache,
} from '../../src/extension/storageAdapter.ts';

describe('extensionStorageBackend', () => {
  let localStorageMock: Record<string, unknown> = {};
  type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
  let changeListeners: ChangeListener[] = [];

  beforeEach(() => {
    localStorageMock = {};
    changeListeners = [];

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | null) => {
            if (keys === null) return { ...localStorageMock };
            if (typeof keys === 'string') return { [keys]: localStorageMock[keys] };
            if (Array.isArray(keys)) {
              const res: Record<string, unknown> = {};
              for (const k of keys) res[k] = localStorageMock[k];
              return res;
            }
            return {};
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(localStorageMock, items);
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) delete localStorageMock[k];
          }),
        },
        onChanged: {
          addListener: vi.fn((listener: ChangeListener) => {
            changeListeners.push(listener);
          }),
          removeListener: vi.fn((listener: ChangeListener) => {
            changeListeners = changeListeners.filter((l) => l !== listener);
          }),
        },
      },
    });
  });

  it('hydrates initial cache from chrome.storage.local.get(null)', async () => {
    localStorageMock['key1'] = 'val1';
    localStorageMock['key2'] = 'val2';

    await initExtensionStorage();

    expect(extensionStorageBackend.getItem('key1')).toBe('val1');
    expect(extensionStorageBackend.getItem('key2')).toBe('val2');
    expect(extensionStorageBackend.getItem('missing')).toBeNull();
  });

  it('setItem writes synchronously to cache and asynchronously to chrome.storage.local', async () => {
    extensionStorageBackend.setItem('testKey', 'testVal');

    expect(extensionStorageBackend.getItem('testKey')).toBe('testVal');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'testVal' });
  });

  it('removeItem deletes synchronously from cache and calls chrome.storage.local.remove', async () => {
    extensionStorageBackend.setItem('delKey', 'delVal');
    extensionStorageBackend.removeItem('delKey');

    expect(extensionStorageBackend.getItem('delKey')).toBeNull();
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('delKey');
  });

  it('persistVaultAndRefreshCache awaits local set and updates memory cache', async () => {
    const payload = JSON.stringify({ schemaVersion: '2.0.0' });
    await persistVaultAndRefreshCache(payload);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'prompt-vault-data': payload });
    expect(extensionStorageBackend.getItem('prompt-vault-data')).toBe(payload);
  });

  it('notifies subscribers when storage.onChanged fires for local area', () => {
    const callback = vi.fn();
    const unsubscribe = extensionStorageBackend.subscribe!(callback);

    for (const listener of changeListeners) {
      listener({ myKey: { newValue: 'newString' } }, 'local');
    }

    expect(callback).toHaveBeenCalledWith('myKey', 'newString');
    expect(extensionStorageBackend.getItem('myKey')).toBe('newString');

    unsubscribe();
    expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled();
  });
});
