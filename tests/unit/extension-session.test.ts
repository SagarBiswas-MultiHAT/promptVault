/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXTENSION_SESSION_KEY,
  extensionSessionBridge,
} from '../../src/extension/sessionBridge.ts';
import {
  createEncryptedVault,
  exportVaultKey,
  importVaultKey,
} from '../../src/utils/crypto.ts';
import type { VaultData } from '../../src/types.ts';

const testVault: VaultData = {
  schemaVersion: '2.0.0',
  prompts: [],
  categories: [],
  settings: { isDarkMode: true, sortBy: 'RECENTLY_ADDED' },
};

describe('extensionSessionBridge', () => {
  let sessionStorageMock: Record<string, unknown> = {};

  beforeEach(() => {
    sessionStorageMock = {};
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn(async (key: string) => ({ [key]: sessionStorageMock[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(sessionStorageMock, items);
          }),
          remove: vi.fn(async (key: string) => {
            delete sessionStorageMock[key];
          }),
        },
      },
      runtime: {
        sendMessage: vi.fn(async () => ({ success: true })),
      },
    });
  });

  it('serializes extractable transfer key and saves to chrome.storage.session', async () => {
    const created = await createEncryptedVault(testVault, '1234', 'pin', { includeTransferKey: true });
    expect(created.transferKey).toBeDefined();

    if (created.transferKey) {
      await extensionSessionBridge.saveUnlockedKey!(created.transferKey);
      expect(typeof sessionStorageMock[EXTENSION_SESSION_KEY]).toBe('string');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'PV_SESSION_KEY_SAVED' });
    }
  });

  it('rejects saving non-extractable primary vault key with an explicit error', async () => {
    const created = await createEncryptedVault(testVault, '1234', 'pin', { includeTransferKey: false });
    expect(created.key.extractable).toBe(false);

    await expect(extensionSessionBridge.saveUnlockedKey!(created.key)).rejects.toThrow(
      'Session bridge requires the explicit extension transfer key'
    );
  });

  it('loadUnlockedKey returns CryptoKey when serialized key is present in session', async () => {
    const created = await createEncryptedVault(testVault, '1234', 'pin', { includeTransferKey: true });
    if (created.transferKey) {
      const base64 = await exportVaultKey(created.transferKey);
      sessionStorageMock[EXTENSION_SESSION_KEY] = base64;

      const loaded = await extensionSessionBridge.loadUnlockedKey!();
      expect(loaded).toBeDefined();
      expect(loaded?.type).toBe('secret');
      expect(loaded?.algorithm.name).toBe('AES-GCM');
      expect(loaded?.extractable).toBe(false); // Non-extractable in memory
    }
  });

  it('loadUnlockedKey returns null when no session key is stored', async () => {
    const loaded = await extensionSessionBridge.loadUnlockedKey!();
    expect(loaded).toBeNull();
  });

  it('clearUnlockedKey removes key from session store', async () => {
    sessionStorageMock[EXTENSION_SESSION_KEY] = 'test-token';
    await extensionSessionBridge.clearUnlockedKey();

    expect(sessionStorageMock[EXTENSION_SESSION_KEY]).toBeUndefined();
    expect(chrome.storage.session.remove).toHaveBeenCalledWith(EXTENSION_SESSION_KEY);
  });

  it('exportVaultKey and importVaultKey round-trip accurately', async () => {
    const created = await createEncryptedVault(testVault, '1234', 'pin', { includeTransferKey: true });
    expect(created.transferKey).toBeDefined();

    if (created.transferKey) {
      const exported = await exportVaultKey(created.transferKey);
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);

      const imported = await importVaultKey(exported);
      expect(imported.algorithm.name).toBe('AES-GCM');
      expect(imported.extractable).toBe(false);
    }
  });
});
