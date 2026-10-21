// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useVault, type VaultController } from '../../src/hooks/useVault.ts';
import type { SyncMetaStore } from '../../src/hooks/useSyncMeta.ts';
import { LOCAL_STORAGE_KEY } from '../../src/constants.ts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createMockSyncMeta(): SyncMetaStore {
  return {
    lastLocalChangeAt: { current: 0 },
    lastRemoteChangeAt: { current: 0 },
    lastSyncedAt: { current: null },
    pendingSync: { current: false },
    suppressLocalChange: { current: false },
    save: vi.fn(),
    initial: { lastLocalChangeAt: 0, lastRemoteChangeAt: 0, lastSyncedAt: null },
  };
}

describe('useVault Hook - Session Memory Hygiene on Manual Lock', () => {
  let container: HTMLDivElement;
  let root: Root;
  let vaultRef: { current: VaultController | null };

  function TestComponent({ syncMeta }: { syncMeta: SyncMetaStore }) {
    const vault = useVault(syncMeta);
    vaultRef.current = vault;
    return (
      <div>
        <div data-testid="is-locked">{String(vault.isLocked)}</div>
        <div data-testid="prompt-count">{vault.data.prompts.length}</div>
      </div>
    );
  }

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vaultRef = { current: null };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('zeroes decrypted prompts from React state and dataRef immediately upon manual lock', async () => {
    const syncMeta = createMockSyncMeta();

    await act(async () => {
      root.render(<TestComponent syncMeta={syncMeta} />);
    });

    const vault = vaultRef.current!;
    expect(vault.isLocked).toBe(false);

    // Create a canary prompt
    let promptId = '';
    await act(async () => {
      promptId = vault.createPrompt({
        title: 'Secret Canary Prompt',
        body: 'CANARY-TOP-SECRET-DATA-BODY',
        categoryId: 'cat-1',
      });
    });

    expect(vaultRef.current!.data.prompts.length).toBe(1);
    expect(vaultRef.current!.data.prompts[0]?.title).toBe('Secret Canary Prompt');

    // Protect the vault with a 6-digit PIN
    await act(async () => {
      await vaultRef.current!.protect('123456', 'pin');
    });

    expect(vaultRef.current!.isEncrypted).toBe(true);
    expect(vaultRef.current!.isLocked).toBe(false);
    expect(vaultRef.current!.data.prompts[0]?.body).toBe('CANARY-TOP-SECRET-DATA-BODY');

    // Confirm that ciphertext is in localStorage and plaintext is NOT in localStorage
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    expect(stored).toContain('ciphertext');
    expect(stored).not.toContain('CANARY-TOP-SECRET-DATA-BODY');

    // Toggle theme to light mode to ensure preference survives locking
    await act(async () => {
      vaultRef.current!.toggleTheme();
    });
    expect(vaultRef.current!.data.settings.isDarkMode).toBe(false);

    // Act: Perform Manual Lock
    await act(async () => {
      vaultRef.current!.lock();
    });

    // Assert: Memory Hygiene Verification
    const lockedVault = vaultRef.current!;
    expect(lockedVault.isLocked).toBe(true);

    // 1. Decrypted prompts in React state are zeroed
    expect(lockedVault.data.prompts).toEqual([]);

    // 2. Decrypted prompts in dataRef are zeroed
    expect(lockedVault.dataRef.current.prompts).toEqual([]);

    // 3. User's active non-sensitive theme setting is preserved
    expect(lockedVault.data.settings.isDarkMode).toBe(false);

    // 4. Encrypted envelope in localStorage was NOT overwritten by empty state
    const postLockStored = window.localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    expect(postLockStored).toContain('ciphertext');
    expect(postLockStored).toContain('"mode":"pin"');
    expect(postLockStored).not.toContain('CANARY-TOP-SECRET-DATA-BODY');

    // 5. Decrypted prompts are successfully restored upon unlock
    let unlockResult = false;
    await act(async () => {
      unlockResult = await vaultRef.current!.unlock('123456');
    });

    expect(unlockResult).toBe(true);
    expect(vaultRef.current!.isLocked).toBe(false);
    expect(vaultRef.current!.data.prompts.length).toBe(1);
    expect(vaultRef.current!.data.prompts[0]?.title).toBe('Secret Canary Prompt');
    expect(vaultRef.current!.data.prompts[0]?.body).toBe('CANARY-TOP-SECRET-DATA-BODY');
    expect(vaultRef.current!.dataRef.current.prompts[0]?.id).toBe(promptId);
    expect(vaultRef.current!.data.settings.isDarkMode).toBe(false);
  });
});
