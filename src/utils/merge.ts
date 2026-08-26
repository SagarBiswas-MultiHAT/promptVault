/** @license SPDX-License-Identifier: Apache-2.0 */

import { SCHEMA_VERSION } from '../constants.ts';
import type { Category, Prompt, VaultData } from '../types.ts';

export const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
type Entity = Prompt | Category;

function winner<T extends Entity>(left: T, right: T): T {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? left : right;
  // A deletion wins a simultaneous edit, preventing a deleted record reappearing.
  if (left.deletedAt !== right.deletedAt) return left.deletedAt !== null ? left : right;
  return left;
}

function mergeEntities<T extends Entity>(local: T[], remote: T[]): T[] {
  const all = new Map<string, T>();
  for (const entry of local) all.set(entry.id, entry);
  for (const entry of remote) {
    const current = all.get(entry.id);
    all.set(entry.id, current ? winner(current, entry) : entry);
  }
  return [...all.values()];
}

export function sweepTombstones(data: VaultData, now = Date.now()): VaultData {
  const isLive = <T extends Entity>(entry: T) => entry.deletedAt === null || now - entry.deletedAt < TOMBSTONE_RETENTION_MS;
  return { ...data, prompts: data.prompts.filter(isLive), categories: data.categories.filter(isLive) };
}

/** Last-write-wins per entity, not for the whole document. */
export function mergeVaults(local: VaultData, remote: VaultData, now = Date.now()): VaultData {
  const categories = mergeEntities(local.categories, remote.categories);
  const categoryDeletes = new Map(categories.filter(category => category.deletedAt !== null).map(category => [category.id, category.deletedAt!]));
  const prompts = mergeEntities(local.prompts, remote.prompts).map(prompt => {
    const categoryDeletedAt = categoryDeletes.get(prompt.categoryId);
    if (categoryDeletedAt !== undefined && (prompt.deletedAt === null || categoryDeletedAt >= prompt.updatedAt)) {
      return { ...prompt, deletedAt: categoryDeletedAt, updatedAt: Math.max(prompt.updatedAt, categoryDeletedAt) };
    }
    return prompt;
  });
  return sweepTombstones({ ...local, schemaVersion: SCHEMA_VERSION, prompts, categories }, now);
}
