/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { isEncryptedVault, decryptVaultPayload, updateEncryptedVault, importVaultKey, type EncryptedVault } from '../utils/crypto.ts';
import { EXTENSION_SESSION_KEY } from './sessionBridge.ts';
import { ensureWebClipCategory, flushPendingClips, parsePendingClips, type PendingClip } from './pendingClips.ts';
import { initExtensionStorage } from './storageAdapter.ts';
import { isValidVaultData } from '../utils/vault.ts';
import type { Prompt, VaultData } from '../types.ts';

let mutationQueue: Promise<void> = Promise.resolve();
const storageReady = initExtensionStorage().catch((error: unknown) => {
  console.error('[PromptVault Background] Failed to initialize extension storage:', error);
  throw error;
});

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isSupportedContentSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || !sender.url) return false;
  try {
    const url = new URL(sender.url);
    return ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'chat.deepseek.com', 'www.perplexity.ai']
      .includes(url.hostname);
  } catch {
    return false;
  }
}

// Restrict session storage to extension contexts (Popup and Background Worker)
try {
  if (chrome.storage?.session?.setAccessLevel) {
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((err) => {
      console.warn('[PromptVault Background] Failed to set TRUSTED_CONTEXTS on session storage:', err);
    });
  }
} catch (err) {
  console.warn('[PromptVault Background] Failed to set TRUSTED_CONTEXTS on session storage:', err);
}

// Register Context Menu
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'pv-save-selection',
      title: 'Save selection to PromptVault',
      contexts: ['selection'],
    });
  } catch (err) {
    console.warn('[PromptVault Background] Failed to register context menu:', err);
  }
});

// Handle Context Menu click
chrome.contextMenus?.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'pv-save-selection' && typeof info.selectionText === 'string') {
    await enqueueMutation(() => handleSaveSelection(info.selectionText!)).catch((error: unknown) => {
      console.error('[PromptVault Background] Failed to save selected text:', error);
    });
  }
});

async function handleSaveSelection(text: string): Promise<void> {
  await storageReady;
  const trimmed = text.trim();
  if (!trimmed) return;

  const storage = await chrome.storage.local.get(['prompt-vault-data', 'prompt-vault-pending-clips']);
  const rawVault = storage['prompt-vault-data'];
  let parsedVault: unknown = null;

  try {
    if (rawVault) parsedVault = typeof rawVault === 'string' ? JSON.parse(rawVault) : rawVault;
  } catch {
    // Malformed storage
  }

  const isEncrypted = isEncryptedVault(parsedVault);

  if (isEncrypted) {
    const sessionData = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
    const serializedKey = sessionData[EXTENSION_SESSION_KEY];

    if (typeof serializedKey === 'string' && serializedKey.trim()) {
      // Vault is unlocked
      try {
        const key = await importVaultKey(serializedKey);
        const decrypted: VaultData = await decryptVaultPayload(parsedVault as EncryptedVault, key);
        if (!isValidVaultData(decrypted)) {
          console.error('[PromptVault Background] Refusing to mutate invalid decrypted vault data');
          return;
        }
        const clipCategory = ensureWebClipCategory(decrypted);
        const now = Date.now();

        const newPrompt: Prompt = {
          id: crypto.randomUUID(),
          title: (trimmed.slice(0, 30) + '...').trim(),
          body: trimmed,
          tags: ['web-clip'],
          categoryId: clipCategory.id,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
          deletedAt: null,
        };

        const updatedData: VaultData = {
          ...decrypted,
          prompts: [newPrompt, ...(decrypted.prompts || [])],
        };

        const envelope = await updateEncryptedVault(parsedVault as EncryptedVault, updatedData, key);
        await chrome.storage.local.set({ 'prompt-vault-data': JSON.stringify(envelope) });

        notifyUser('PromptVault', 'Prompt saved to your encrypted vault.');
        return;
      } catch (err) {
        console.error('[PromptVault Background] Failed to encrypt new prompt:', err);
      }
    }

    // Vault is locked: queue clip safely
    const pending = parsePendingClips(storage['prompt-vault-pending-clips']);
    const clip: PendingClip = {
      id: crypto.randomUUID(),
      title: (trimmed.slice(0, 30) + '...').trim(),
      body: trimmed,
      tags: ['web-clip'],
      createdAt: Date.now(),
    };
    pending.push(clip);

    await chrome.storage.local.set({ 'prompt-vault-pending-clips': pending });
    try {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
    } catch {
      // Ignore badge errors
    }

    notifyUser('PromptVault Locked', 'Clip saved to queue. Open PromptVault to unlock and encrypt.');
  } else if (parsedVault) {
    // Unencrypted vault
    const vaultData = parsedVault as VaultData;
    if (!isValidVaultData(vaultData)) {
      console.error('[PromptVault Background] Refusing to mutate invalid vault data');
      return;
    }
    const clipCategory = ensureWebClipCategory(vaultData);
    const now = Date.now();

    const newPrompt: Prompt = {
      id: crypto.randomUUID(),
      title: (trimmed.slice(0, 30) + '...').trim(),
      body: trimmed,
      tags: ['web-clip'],
      categoryId: clipCategory.id,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      deletedAt: null,
    };

    const updatedData: VaultData = {
      ...vaultData,
      prompts: [newPrompt, ...(vaultData.prompts || [])],
    };

    await chrome.storage.local.set({ 'prompt-vault-data': JSON.stringify(updatedData) });
    notifyUser('PromptVault', 'Prompt saved to vault.');
  }
}

function notifyUser(title: string, message: string) {
  try {
    if (chrome.notifications?.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title,
        message,
      });
    }
  } catch {
    // Notification permission may not be active
  }
}

// Forward keyboard shortcut command to active tab
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'open-quick-picker') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'PV_TOGGLE_PICKER' }, () => {
          void chrome.runtime.lastError;
        });
      }
    });
  }
});

// IPC Message Router
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'PV_GET_STATUS') {
    if (!isSupportedContentSender(_sender)) {
      sendResponse({ isEncrypted: false, isUnlocked: false });
      return;
    }
    (async () => {
      const storage = await chrome.storage.local.get('prompt-vault-data');
      const raw = storage['prompt-vault-data'];
      let parsed: unknown = null;
      try {
        if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        // Ignored
      }
      const isEncrypted = isEncryptedVault(parsed);
      let isUnlocked = false;
      if (isEncrypted) {
        const session = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
        isUnlocked = typeof session[EXTENSION_SESSION_KEY] === 'string' && Boolean(session[EXTENSION_SESSION_KEY].trim());
      } else {
        isUnlocked = true;
      }
      sendResponse({ isEncrypted, isUnlocked });
    })();
    return true;
  }

  if (message.type === 'PV_GET_PROMPTS') {
    if (!isSupportedContentSender(_sender)) {
      sendResponse({ prompts: [], locked: true });
      return;
    }
    (async () => {
      const storage = await chrome.storage.local.get('prompt-vault-data');
      const raw = storage['prompt-vault-data'];
      let parsed: unknown = null;
      try {
        if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        // Ignored
      }
      if (!parsed) {
        sendResponse({ prompts: [], locked: false });
        return;
      }

      if (isEncryptedVault(parsed)) {
        const session = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
        const serialized = session[EXTENSION_SESSION_KEY];
        if (typeof serialized === 'string' && serialized.trim()) {
          try {
            const key = await importVaultKey(serialized);
            const decrypted = await decryptVaultPayload(parsed, key);
            if (!isValidVaultData(decrypted)) {
             sendResponse({ prompts: [], locked: false });
             return;
            }
            sendResponse({
              prompts: (decrypted.prompts || []).map(({ body: _body, ...metadata }) => ({
                ...metadata,
                hasVariables: /\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/.test(_body),
              })),
              locked: false,
            });
            return;
          } catch {
            sendResponse({ prompts: [], locked: true });
            return;
          }
        }
        sendResponse({ prompts: [], locked: true });
        return;
      }

      const vaultData = parsed as VaultData;
      if (!isValidVaultData(vaultData)) {
        sendResponse({ prompts: [], locked: false });
        return;
      }
      sendResponse({
        prompts: (vaultData.prompts || []).map(({ body: _body, ...metadata }) => ({
          ...metadata,
          hasVariables: /\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/.test(_body),
        })),
        locked: false,
      });
    })();
    return true;
  }

  if (message.type === 'PV_GET_PROMPT_BODY') {
    if (!isSupportedContentSender(_sender)) {
      sendResponse({ success: false });
      return;
    }
    (async () => {
      if (typeof message.promptId !== 'string' || !message.promptId.trim()) {
        sendResponse({ success: false });
        return;
      }
      const storage = await chrome.storage.local.get('prompt-vault-data');
      const raw = storage['prompt-vault-data'];
      let parsed: unknown = null;
      try {
        if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        sendResponse({ success: false });
        return;
      }
      if (!parsed) {
        sendResponse({ success: false });
        return;
      }

      let vaultData: VaultData;
      if (isEncryptedVault(parsed)) {
        const session = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
        const serialized = session[EXTENSION_SESSION_KEY];
        if (typeof serialized !== 'string' || !serialized.trim()) {
          sendResponse({ success: false, locked: true });
          return;
        }
        try {
          vaultData = await decryptVaultPayload(parsed, await importVaultKey(serialized));
          if (!isValidVaultData(vaultData)) {
            sendResponse({ success: false });
            return;
          }
        } catch {
          sendResponse({ success: false, locked: true });
          return;
        }
      } else {
        vaultData = parsed as VaultData;
        if (!isValidVaultData(vaultData)) {
          sendResponse({ success: false });
          return;
        }
      }

      const prompt = vaultData.prompts.find((candidate) => candidate.id === message.promptId);
      sendResponse(prompt ? { success: true, body: prompt.body } : { success: false });
    })().catch((error: unknown) => {
      console.error('[PromptVault Background] Failed to load prompt body:', error);
      sendResponse({ success: false });
    });
    return true;
  }

  if (message.type === 'PV_SESSION_KEY_SAVED') {
    if (
      _sender.id !== chrome.runtime.id ||
      !_sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`)
    ) {
      sendResponse({ success: false });
      return;
    }
    enqueueMutation(async () => {
      await storageReady;
      const flushed = await flushPendingClips();
      sendResponse({ success: true, flushed });
    }).catch((error: unknown) => {
      console.error('[PromptVault Background] Failed to flush pending clips after unlock:', error);
      sendResponse({ success: false });
    });
    return true;
  }

  if (message.type === 'PV_RECORD_USAGE') {
    if (!isSupportedContentSender(_sender)) {
      sendResponse({ success: false });
      return;
    }
    if (typeof message.promptId !== 'string' || message.promptId.length === 0 || message.promptId.length > 200) {
      sendResponse({ success: false });
      return;
    }
    enqueueMutation(async () => {
      const promptId = message.promptId;

      const storage = await chrome.storage.local.get('prompt-vault-data');
      const raw = storage['prompt-vault-data'];
      let parsed: unknown = null;
      try {
        if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        // Ignored
      }
      if (!parsed) {
        sendResponse({ success: false });
        return;
      }

      if (isEncryptedVault(parsed)) {
        const session = await chrome.storage.session.get(EXTENSION_SESSION_KEY);
        const serialized = session[EXTENSION_SESSION_KEY];
        if (typeof serialized === 'string' && serialized.trim()) {
          try {
            const key = await importVaultKey(serialized);
            const decrypted = await decryptVaultPayload(parsed, key);
            if (!isValidVaultData(decrypted)) {
              sendResponse({ success: false });
              return;
            }
            const prompts = decrypted.prompts.map((p) =>
              p.id === promptId ? { ...p, usageCount: p.usageCount + 1, updatedAt: Date.now() } : p
            );
            const updated = { ...decrypted, prompts };
            const envelope = await updateEncryptedVault(parsed, updated, key);
            await chrome.storage.local.set({ 'prompt-vault-data': JSON.stringify(envelope) });
            sendResponse({ success: true });
            return;
          } catch {
            sendResponse({ success: false });
            return;
          }
        }
        // Locked: do not corrupt envelope
        sendResponse({ success: false, locked: true });
        return;
      }

      const vaultData = parsed as VaultData;
      if (!isValidVaultData(vaultData)) {
        sendResponse({ success: false });
        return;
      }
      const prompts = vaultData.prompts.map((p) =>
        p.id === promptId ? { ...p, usageCount: p.usageCount + 1, updatedAt: Date.now() } : p
      );
      const updated = { ...vaultData, prompts };
      await chrome.storage.local.set({ 'prompt-vault-data': JSON.stringify(updated) });
      sendResponse({ success: true });
    }).catch((error: unknown) => {
      console.error('[PromptVault Background] Failed to record prompt usage:', error);
      sendResponse({ success: false });
    });
    return true;
  }
});

void enqueueMutation(async () => {
  await storageReady;
  return flushPendingClips();
}).catch((error: unknown) => {
  console.error('[PromptVault Background] Startup pending-clip flush failed:', error);
});
