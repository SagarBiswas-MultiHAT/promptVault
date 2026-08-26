/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { INITIAL_DATA, LOCAL_STORAGE_KEY, SCHEMA_VERSION } from '../constants.ts';
import { createEncryptedVault, isEncryptedVault, recoverEncryptedVault, type EncryptedVault, type SecretMode, unlockEncryptedVault, updateEncryptedVault } from '../utils/crypto.ts';
import { mergeVaults } from '../utils/merge.ts';
import { readRaw, writeJson, type StorageFailure } from '../utils/storage.ts';
import { isValidVaultData, sanitizeVault, withoutSecrets } from '../utils/vault.ts';
import type { Category, Prompt, SortOption, VaultData } from '../types.ts';
import type { SyncMetaStore } from './useSyncMeta.ts';

type InitialVault = { data: VaultData; envelope: EncryptedVault | null };

function loadInitialVault(): InitialVault {
  const raw = readRaw(LOCAL_STORAGE_KEY);
  if (!raw) return { data: INITIAL_DATA, envelope: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isEncryptedVault(parsed)) return { data: INITIAL_DATA, envelope: parsed };
    return isValidVaultData(parsed) ? { data: sanitizeVault(parsed), envelope: null } : { data: INITIAL_DATA, envelope: null };
  } catch { return { data: INITIAL_DATA, envelope: null }; }
}

export interface VaultController {
  data: VaultData;
  dataRef: React.MutableRefObject<VaultData>;
  setData: Dispatch<SetStateAction<VaultData>>;
  isSaved: boolean;
  storageError: StorageFailure | null;
  isLocked: boolean;
  isEncrypted: boolean;
  /** A pre-v2 plaintext vault was loaded and can now be encrypted in place. */
  needsEncryptionUpgrade: boolean;
  protectionMode: SecretMode | null;
  unlock: (secret: string) => Promise<boolean>;
  recover: (recoveryKey: string) => Promise<boolean>;
  protect: (secret: string, mode: SecretMode) => Promise<string | null>;
  lock: () => void;
  removeProtection: () => boolean;
  createPrompt: (input: { title: string; body: string; categoryId: string; tags?: string[]; isFavorite?: boolean }) => string;
  updatePrompt: (id: string, patch: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  duplicatePrompt: (prompt: Prompt) => void;
  toggleFavorite: (id: string) => void;
  incrementUsage: (id: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  setSortBy: (next: SortOption) => void;
  toggleTheme: () => void;
  mergeImported: (incoming: VaultData) => void;
  exportVault: () => void;
}

export function useVault(syncMeta: SyncMetaStore): VaultController {
  const [initial] = useState(loadInitialVault);
  const [data, setData] = useState<VaultData>(initial.data);
  const [envelope, setEnvelope] = useState<EncryptedVault | null>(initial.envelope);
  const [isLocked, setIsLocked] = useState(Boolean(initial.envelope));
  const [isSaved, setIsSaved] = useState(false);
  const [storageError, setStorageError] = useState<StorageFailure | null>(null);
  const dataRef = useRef(data);
  const keyRef = useRef<CryptoKey | null>(null);
  const envelopeRef = useRef<EncryptedVault | null>(initial.envelope);
  const writeVersion = useRef(0);
  const mounted = useRef(false);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    if (data.settings.isDarkMode) document.documentElement.classList.remove('light');
    else document.documentElement.classList.add('light');
  }, [data.settings.isDarkMode]);

  const recordWrite = useCallback((ok: boolean, reason?: StorageFailure) => {
    if (!ok) { setStorageError(reason ?? 'unavailable'); return; }
    setStorageError(null);
    if (!mounted.current) { mounted.current = true; syncMeta.save(); return; }
    setIsSaved(true); window.setTimeout(() => setIsSaved(false), 2_000);
    if (syncMeta.suppressLocalChange.current) {
      syncMeta.suppressLocalChange.current = false;
      syncMeta.lastLocalChangeAt.current = syncMeta.lastRemoteChangeAt.current || Date.now();
    } else { syncMeta.lastLocalChangeAt.current = Date.now(); syncMeta.pendingSync.current = true; }
    syncMeta.save();
  }, [syncMeta]);

  // Versioning prevents an older WebCrypto operation completing after a newer edit.
  useEffect(() => {
    if (isLocked) return;
    const version = ++writeVersion.current;
    let cancelled = false;
    const persist = async () => {
      if (envelopeRef.current && keyRef.current) {
        try {
          const next = await updateEncryptedVault(envelopeRef.current, data, keyRef.current);
          if (cancelled || version !== writeVersion.current) return;
          const result = writeJson(LOCAL_STORAGE_KEY, next);
          if (result.ok) { envelopeRef.current = next; setEnvelope(next); }
          recordWrite(result.ok, result.ok ? undefined : result.reason);
        } catch (error) { console.error('[PromptVault] Failed to encrypt vault:', error); recordWrite(false, 'unavailable'); }
      } else {
        const result = writeJson(LOCAL_STORAGE_KEY, data);
        recordWrite(result.ok, result.ok ? undefined : result.reason);
      }
    };
    void persist();
    return () => { cancelled = true; };
  }, [data, isLocked, recordWrite]);

  const protect = useCallback(async (secret: string, mode: SecretMode) => {
    try {
      const nextData = { ...dataRef.current, schemaVersion: SCHEMA_VERSION };
      const created = await createEncryptedVault(nextData, secret, mode);
      const result = writeJson(LOCAL_STORAGE_KEY, created.envelope);
      if (!result.ok) { setStorageError(result.reason); return null; }
      dataRef.current = nextData; keyRef.current = created.key;
      setData(nextData); envelopeRef.current = created.envelope; setEnvelope(created.envelope); setIsLocked(false); setStorageError(null);
      return created.recoveryKey;
    } catch (error) { console.error('[PromptVault] Failed to enable encryption:', error); setStorageError('unavailable'); return null; }
  }, []);

  const unlock = useCallback(async (secret: string) => {
    if (!envelope) return false;
    try {
      const result = await unlockEncryptedVault(envelope, secret);
      const next = sanitizeVault(result.data);
      keyRef.current = result.key; dataRef.current = next; setData(next); setIsLocked(false);
      return true;
    } catch { return false; }
  }, [envelope]);
  const recover = useCallback(async (recoveryKey: string) => {
    if (!envelope) return false;
    try {
      const result = await recoverEncryptedVault(envelope, recoveryKey);
      const next = sanitizeVault(result.data);
      keyRef.current = result.key; dataRef.current = next; setData(next); setIsLocked(false);
      return true;
    } catch { return false; }
  }, [envelope]);
  const lock = useCallback(() => { if (envelope) { keyRef.current = null; setIsLocked(true); } }, [envelope]);
  const removeProtection = useCallback(() => {
    // `unlock()` installs the key synchronously but React state updates on the
    // next render. Checking the key makes removal work in the same user action.
    if (!envelope || !keyRef.current) return false;
    const result = writeJson(LOCAL_STORAGE_KEY, dataRef.current);
    if (!result.ok) { setStorageError(result.reason); return false; }
    keyRef.current = null; envelopeRef.current = null; setEnvelope(null); setStorageError(null); return true;
  }, [envelope]);

  const createPrompt = useCallback((input: { title: string; body: string; categoryId: string; tags?: string[]; isFavorite?: boolean }) => {
    const now = Date.now();
    const prompt: Prompt = { id: crypto.randomUUID(), title: input.title, body: input.body, categoryId: input.categoryId, tags: input.tags ?? [], isFavorite: input.isFavorite ?? false, usageCount: 0, createdAt: now, updatedAt: now, deletedAt: null };
    setData(previous => ({ ...previous, prompts: [prompt, ...previous.prompts] })); return prompt.id;
  }, []);
  const updatePrompt = useCallback((id: string, patch: Partial<Prompt>) => setData(previous => ({ ...previous, prompts: previous.prompts.map(prompt => prompt.id === id ? { ...prompt, ...patch, updatedAt: Date.now() } : prompt) })), []);
  const deletePrompt = useCallback((id: string) => { const now = Date.now(); setData(previous => ({ ...previous, prompts: previous.prompts.map(prompt => prompt.id === id ? { ...prompt, deletedAt: now, updatedAt: now } : prompt) })); }, []);
  const duplicatePrompt = useCallback((prompt: Prompt) => { const now = Date.now(); setData(previous => ({ ...previous, prompts: [{ ...prompt, id: crypto.randomUUID(), title: `${prompt.title} (copy)`, usageCount: 0, createdAt: now, updatedAt: now, deletedAt: null }, ...previous.prompts] })); }, []);
  const toggleFavorite = useCallback((id: string) => setData(previous => ({ ...previous, prompts: previous.prompts.map(prompt => prompt.id === id ? { ...prompt, isFavorite: !prompt.isFavorite, updatedAt: Date.now() } : prompt) })), []);
  const incrementUsage = useCallback((id: string) => setData(previous => ({ ...previous, prompts: previous.prompts.map(prompt => prompt.id === id ? { ...prompt, usageCount: prompt.usageCount + 1, updatedAt: Date.now() } : prompt) })), []);
  const addCategory = useCallback((name: string) => { const now = Date.now(); const category: Category = { id: crypto.randomUUID(), name, updatedAt: now, deletedAt: null }; setData(previous => ({ ...previous, categories: [...previous.categories, category] })); }, []);
  const renameCategory = useCallback((id: string, name: string) => setData(previous => ({ ...previous, categories: previous.categories.map(category => category.id === id ? { ...category, name, updatedAt: Date.now() } : category) })), []);
  const deleteCategory = useCallback((id: string) => { const now = Date.now(); setData(previous => ({ ...previous, categories: previous.categories.map(category => category.id === id ? { ...category, deletedAt: now, updatedAt: now } : category), prompts: previous.prompts.map(prompt => prompt.categoryId === id && prompt.deletedAt === null ? { ...prompt, deletedAt: now, updatedAt: now } : prompt) })); }, []);
  const setSortBy = useCallback((sortBy: SortOption) => setData(previous => ({ ...previous, settings: { ...previous.settings, sortBy } })), []);
  const toggleTheme = useCallback(() => setData(previous => ({ ...previous, settings: { ...previous.settings, isDarkMode: !previous.settings.isDarkMode } })), []);
  const mergeImported = useCallback((incoming: VaultData) => setData(previous => mergeVaults(previous, sanitizeVault(incoming))), []);
  const exportVault = useCallback(() => {
    const blob = new Blob([JSON.stringify(withoutSecrets(dataRef.current), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `vault-export-${new Date().toISOString().split('T')[0]}.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, []);

  return { data, dataRef, setData, isSaved, storageError, isLocked, isEncrypted: envelope !== null, needsEncryptionUpgrade: envelope === null && data.schemaVersion !== SCHEMA_VERSION, protectionMode: envelope?.encryption.mode ?? null, unlock, recover, protect, lock, removeProtection, createPrompt, updatePrompt, deletePrompt, duplicatePrompt, toggleFavorite, incrementUsage, addCategory, renameCategory, deleteCategory, setSortBy, toggleTheme, mergeImported, exportVault };
}
