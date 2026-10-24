/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Category, Prompt, VaultData } from '../types.ts';
import { isEncryptedVault, decryptVaultPayload, updateEncryptedVault } from '../utils/crypto.ts';
import { isValidVaultData } from '../utils/vault.ts';
import { persistVaultAndRefreshCache } from './storageAdapter.ts';
import { extensionSessionBridge } from './sessionBridge.ts';

export interface PendingClip {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  categoryId?: string;
  createdAt: number;
}

export function parsePendingClips(value: unknown): PendingClip[] {
  if (!Array.isArray(value)) return [];
  const clips: PendingClip[] = [];
  for (const item of value.slice(0, 100)) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.body !== 'string' || !candidate.body.trim() || candidate.body.length > 100_000) continue;
    const title = typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim()
      : (candidate.body.slice(0, 30) + '...').trim();
    if (title.length > 500) continue;
    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : crypto.randomUUID();
    const tags = Array.isArray(candidate.tags)
      ? candidate.tags
        .filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
        .slice(0, 20)
        .map((tag) => tag.slice(0, 100))
      : ['web-clip'];
    const categoryId = typeof candidate.categoryId === 'string' && candidate.categoryId.trim()
      ? candidate.categoryId
      : undefined;
    const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
      ? candidate.createdAt
      : Date.now();
    clips.push({ id, title, body: candidate.body, tags, categoryId, createdAt });
  }
  return clips;
}

export function ensureWebClipCategory(vault: VaultData): Category {
  const existing = vault.categories.find(c => c.name.toLowerCase() === 'web clips' && c.deletedAt === null);
  if (existing) return existing;
  const newCat: Category = {
    id: crypto.randomUUID(),
    name: 'Web Clips',
    updatedAt: Date.now(),
    deletedAt: null,
  };
  vault.categories.push(newCat);
  return newCat;
}

export async function flushPendingClips(unlockedKey?: CryptoKey | null): Promise<boolean> {
  try {
    const local = await chrome.storage.local.get(['prompt-vault-pending-clips', 'prompt-vault-data']);
    const pendingClips = parsePendingClips(local['prompt-vault-pending-clips']);
    if (pendingClips.length === 0) {
      return false;
    }

    const rawVaultData = local['prompt-vault-data'];
    if (!rawVaultData) return false;

    let parsedVault: unknown;
    try {
      parsedVault = typeof rawVaultData === 'string' ? JSON.parse(rawVaultData) : rawVaultData;
    } catch {
      return false;
    }

    let updatedVaultJson: string;

    if (isEncryptedVault(parsedVault)) {
      const key = unlockedKey ?? (extensionSessionBridge.loadUnlockedKey ? await extensionSessionBridge.loadUnlockedKey() : null);
      if (!key) {
        return false;
      }

      const decryptedData: VaultData = await decryptVaultPayload(parsedVault, key);
      const now = Date.now();
      const clipCategory = ensureWebClipCategory(decryptedData);
      const usedIds = new Set(decryptedData.prompts.map((prompt) => prompt.id));

      const newPrompts: Prompt[] = pendingClips.map((clip) => {
        let id = clip.id || crypto.randomUUID();
        while (usedIds.has(id)) id = crypto.randomUUID();
        usedIds.add(id);
        return {
        id,
        title: clip.title,
        body: clip.body,
        tags: clip.tags && clip.tags.length > 0 ? clip.tags : ['web-clip'],
        categoryId: clip.categoryId && decryptedData.categories.some((category) => category.id === clip.categoryId)
          ? clip.categoryId
          : clipCategory.id,
        isFavorite: false,
        createdAt: clip.createdAt || now,
        updatedAt: now,
        usageCount: 0,
        deletedAt: null,
        };
      });

      const updatedData: VaultData = {
        ...decryptedData,
        prompts: [...newPrompts, ...(decryptedData.prompts || [])],
      };

      const reEncryptedEnvelope = await updateEncryptedVault(parsedVault, updatedData, key);
      updatedVaultJson = JSON.stringify(reEncryptedEnvelope);
    } else {
      if (!isValidVaultData(parsedVault)) {
        console.error('[PromptVault Extension] Cannot flush clips into invalid vault data');
        return false;
      }
      const vaultData = parsedVault;
      const now = Date.now();
      const clipCategory = ensureWebClipCategory(vaultData);
      const usedIds = new Set(vaultData.prompts.map((prompt) => prompt.id));

      const newPrompts: Prompt[] = pendingClips.map((clip) => {
        let id = clip.id || crypto.randomUUID();
        while (usedIds.has(id)) id = crypto.randomUUID();
        usedIds.add(id);
        return {
        id,
        title: clip.title,
        body: clip.body,
        tags: clip.tags && clip.tags.length > 0 ? clip.tags : ['web-clip'],
        categoryId: clip.categoryId && vaultData.categories.some((category) => category.id === clip.categoryId)
          ? clip.categoryId
          : clipCategory.id,
        isFavorite: false,
        createdAt: clip.createdAt || now,
        updatedAt: now,
        usageCount: 0,
        deletedAt: null,
        };
      });

      const updatedData: VaultData = {
        ...vaultData,
        prompts: [...newPrompts, ...(vaultData.prompts || [])],
      };
      updatedVaultJson = JSON.stringify(updatedData);
    }

    await persistVaultAndRefreshCache(updatedVaultJson);
    await chrome.storage.local.remove('prompt-vault-pending-clips');
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch {
      // Action API may be unavailable in some execution contexts
    }
    return true;
  } catch (err) {
    console.error('[PromptVault Extension] Failed to flush pending clips:', err);
    return false;
  }
}
