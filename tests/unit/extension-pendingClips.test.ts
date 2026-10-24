/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureWebClipCategory,
  flushPendingClips,
  parsePendingClips,
} from '../../src/extension/pendingClips.ts';
import { createEncryptedVault, decryptVaultPayload, type EncryptedVault } from '../../src/utils/crypto.ts';
import type { VaultData } from '../../src/types.ts';

const baseVault: VaultData = {
  schemaVersion: '2.0.0',
  prompts: [
    {
      id: 'existing-p1',
      title: 'Existing Prompt',
      body: 'Existing body',
      categoryId: 'cat-1',
      tags: ['work'],
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000,
      usageCount: 1,
      deletedAt: null,
    },
  ],
  categories: [{ id: 'cat-1', name: 'Work', updatedAt: 1000, deletedAt: null }],
  settings: { isDarkMode: true, sortBy: 'RECENTLY_ADDED' },
};

describe('pendingClips module', () => {
  let localStorageMock: Record<string, unknown> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) => {
            const res: Record<string, unknown> = {};
            for (const k of keys) res[k] = localStorageMock[k];
            return res;
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(localStorageMock, items);
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            for (const k of arr) delete localStorageMock[k];
          }),
        },
        session: {
          get: vi.fn(async () => ({})),
        },
      },
      action: {
        setBadgeText: vi.fn(async () => {}),
      },
    });
  });

  describe('parsePendingClips', () => {
    it('filters invalid clips and sanitizes fields', () => {
      const raw = [
        null,
        {},
        { body: '   ' },
        { body: 'Valid prompt body', title: 'Custom Title', tags: ['ai'] },
        { body: 'Auto title prompt' },
      ];

      const parsed = parsePendingClips(raw);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]?.title).toBe('Custom Title');
      expect(parsed[0]?.body).toBe('Valid prompt body');
      expect(parsed[0]?.tags).toEqual(['ai']);
      expect(parsed[1]?.title).toBe('Auto title prompt...');
    });
  });

  describe('ensureWebClipCategory', () => {
    it('creates Web Clips category if absent and returns existing if present', () => {
      const vault: VaultData = JSON.parse(JSON.stringify(baseVault));
      const cat1 = ensureWebClipCategory(vault);
      expect(cat1.name).toBe('Web Clips');
      expect(vault.categories).toContain(cat1);

      const cat2 = ensureWebClipCategory(vault);
      expect(cat2.id).toBe(cat1.id);
      expect(vault.categories).toHaveLength(2);
    });
  });

  describe('flushPendingClips', () => {
    it('returns false when no pending clips exist', async () => {
      localStorageMock['prompt-vault-pending-clips'] = [];
      localStorageMock['prompt-vault-data'] = JSON.stringify(baseVault);

      const result = await flushPendingClips();
      expect(result).toBe(false);
    });

    it('merges pending clips into unencrypted vault and clears queue', async () => {
      localStorageMock['prompt-vault-pending-clips'] = [
        { id: 'clip-1', title: 'New Web Clip', body: 'Web clip body text', createdAt: 2000 },
      ];
      localStorageMock['prompt-vault-data'] = JSON.stringify(baseVault);

      const flushed = await flushPendingClips();
      expect(flushed).toBe(true);

      const updatedVault = JSON.parse(localStorageMock['prompt-vault-data'] as string) as VaultData;
      expect(updatedVault.prompts).toHaveLength(2);
      expect(updatedVault.prompts[0]?.title).toBe('New Web Clip');
      expect(updatedVault.prompts[0]?.body).toBe('Web clip body text');
      expect(localStorageMock['prompt-vault-pending-clips']).toBeUndefined();
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('merges pending clips into encrypted vault when unlocked key is provided', async () => {
      const created = await createEncryptedVault(baseVault, '1234', 'pin');
      localStorageMock['prompt-vault-data'] = JSON.stringify(created.envelope);
      localStorageMock['prompt-vault-pending-clips'] = [
        { id: 'clip-2', title: 'Encrypted Clip', body: 'Encrypted clip body', createdAt: 3000 },
      ];

      const flushed = await flushPendingClips(created.key);
      expect(flushed).toBe(true);

      const updatedEnvelope = JSON.parse(localStorageMock['prompt-vault-data'] as string) as EncryptedVault;
      const decrypted = await decryptVaultPayload(updatedEnvelope, created.key);
      expect(decrypted.prompts).toHaveLength(2);
      expect(decrypted.prompts[0]?.title).toBe('Encrypted Clip');
      expect(localStorageMock['prompt-vault-pending-clips']).toBeUndefined();
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('defers flush and preserves queue when encrypted vault is locked', async () => {
      const created = await createEncryptedVault(baseVault, '1234', 'pin');
      localStorageMock['prompt-vault-data'] = JSON.stringify(created.envelope);
      localStorageMock['prompt-vault-pending-clips'] = [
        { id: 'clip-3', title: 'Locked Clip', body: 'Will wait in queue', createdAt: 4000 },
      ];

      const flushed = await flushPendingClips(null);
      expect(flushed).toBe(false);

      expect(localStorageMock['prompt-vault-pending-clips']).toBeDefined();
      expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
    });
  });
});
