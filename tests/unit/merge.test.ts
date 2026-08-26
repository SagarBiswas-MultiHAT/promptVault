import { describe, expect, it } from 'vitest';
import { mergeVaults, TOMBSTONE_RETENTION_MS } from '../../src/utils/merge.ts';
import type { VaultData } from '../../src/types.ts';

const base = (): VaultData => ({ schemaVersion: '2.0.0', prompts: [], categories: [{ id: 'cat', name: 'General', updatedAt: 1, deletedAt: null }], settings: { isDarkMode: true, sortBy: 'RECENTLY_ADDED' } });
const prompt = (updatedAt: number, deletedAt: number | null = null) => ({ id: 'p', title: 'Prompt', body: 'body', categoryId: 'cat', tags: [], isFavorite: false, usageCount: 0, createdAt: 1, updatedAt, deletedAt });

describe('mergeVaults', () => {
  it('preserves independent edits made on two devices', () => {
    const local = { ...base(), prompts: [prompt(2), { ...prompt(1), id: 'local', title: 'Local' }] };
    const remote = { ...base(), prompts: [{ ...prompt(1), id: 'remote', title: 'Remote' }] };
    expect(mergeVaults(local, remote).prompts.map(entry => entry.id).sort()).toEqual(['local', 'p', 'remote']);
  });

  it('keeps a tombstone over an older remote edit', () => {
    const local = { ...base(), prompts: [prompt(4, 4)] };
    const remote = { ...base(), prompts: [prompt(3)] };
    expect(mergeVaults(local, remote, 10).prompts[0]?.deletedAt).toBe(4);
  });

  it('cascades a category tombstone to its prompts and eventually sweeps it', () => {
    const local = { ...base(), categories: [{ ...base().categories[0]!, updatedAt: 5, deletedAt: 5 }], prompts: [prompt(4)] };
    const merged = mergeVaults(local, base(), 10);
    expect(merged.prompts[0]?.deletedAt).toBe(5);
    expect(mergeVaults(local, base(), 5 + TOMBSTONE_RETENTION_MS + 1).prompts).toEqual([]);
  });
});
