/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT/promptVault)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { SessionKeyBridge } from '../hooks/useVault.ts';
import { exportVaultKey, importVaultKey } from '../utils/crypto.ts';

export const EXTENSION_SESSION_KEY = 'prompt_vault_session_dek';

export const extensionSessionBridge: SessionKeyBridge = {
  async loadUnlockedKey(): Promise<CryptoKey | null> {
    try {
      const result = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
      const serialized = result[EXTENSION_SESSION_KEY];
      if (typeof serialized === 'string' && serialized.trim()) {
        return await importVaultKey(serialized);
      }
      return null;
    } catch (err) {
      console.warn('[PromptVault Extension] Failed to load session key:', err);
      return null;
    }
  },

  async saveUnlockedKey(key: CryptoKey): Promise<void> {
    try {
      if (!key.extractable) {
        throw new Error('Session bridge requires the explicit extension transfer key');
      }
      const serialized = await exportVaultKey(key);
      await chrome.storage.session.set({ [EXTENSION_SESSION_KEY]: serialized });
      await chrome.runtime.sendMessage({ type: 'PV_SESSION_KEY_SAVED' });
    } catch (err) {
      console.error('[PromptVault Extension] Failed to save session key:', err);
      throw err;
    }
  },

  async clearUnlockedKey(): Promise<void> {
    try {
      await chrome.storage.session.remove(EXTENSION_SESSION_KEY);
    } catch (err) {
      console.error('[PromptVault Extension] Failed to clear session key:', err);
    }
  },
};
