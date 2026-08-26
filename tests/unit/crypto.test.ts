import { describe, expect, it } from 'vitest';
import { createEncryptedVault, PBKDF2_ITERATIONS, recoverEncryptedVault, unlockEncryptedVault } from '../../src/utils/crypto.ts';
import type { VaultData } from '../../src/types.ts';

const vault: VaultData = {
  schemaVersion: '2.0.0',
  prompts: [{ id: 'prompt', title: 'Private prompt', body: 'CANARY-secret-body', categoryId: 'cat', tags: [], isFavorite: false, createdAt: 1, updatedAt: 1, usageCount: 0, deletedAt: null }],
  categories: [{ id: 'cat', name: 'General', updatedAt: 1, deletedAt: null }],
  settings: { isDarkMode: true, sortBy: 'RECENTLY_ADDED' },
};

describe('encrypted vault envelopes', () => {
  it('uses AES-GCM with a 600k-iteration PBKDF2 wrapper and contains no plaintext', async () => {
    const { envelope } = await createEncryptedVault(vault, 'correct horse battery staple', 'passphrase');
    expect(envelope.encryption.algorithm).toBe('AES-256-GCM');
    expect(envelope.encryption.iterations).toBe(PBKDF2_ITERATIONS);
    expect(JSON.stringify(envelope)).not.toContain('CANARY-secret-body');
    expect(JSON.stringify(envelope)).not.toContain('correct horse battery staple');
  });

  it('round-trips with the primary secret and rejects a wrong one', async () => {
    const { envelope } = await createEncryptedVault(vault, '1234', 'pin');
    await expect(unlockEncryptedVault(envelope, '4321')).rejects.toThrow();
    await expect(unlockEncryptedVault(envelope, '1234')).resolves.toMatchObject({ data: vault });
  });

  it('recovers the same vault with the one-time recovery key', async () => {
    const created = await createEncryptedVault(vault, '1234', 'pin');
    await expect(recoverEncryptedVault(created.envelope, created.recoveryKey)).resolves.toMatchObject({ data: vault });
  });
});
