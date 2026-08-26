/** @license SPDX-License-Identifier: Apache-2.0 */

export interface Prompt {
  id: string;
  title: string;
  body: string;
  categoryId: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  deletedAt: number | null;
}

export interface Category {
  id: string;
  name: string;
  updatedAt: number;
  deletedAt: number | null;
}

export interface VaultData {
  schemaVersion: string;
  prompts: Prompt[];
  categories: Category[];
  settings: { isDarkMode: boolean; sortBy: SortOption };
}

export type SortOption = 'MOST_USED' | 'RECENTLY_ADDED' | 'RECENTLY_UPDATED' | 'A_Z';
export const SORT_OPTIONS: readonly SortOption[] = ['RECENTLY_ADDED', 'RECENTLY_UPDATED', 'MOST_USED', 'A_Z'];
export const DEFAULT_SORT: SortOption = 'RECENTLY_ADDED';
export function isSortOption(value: unknown): value is SortOption {
  return typeof value === 'string' && (SORT_OPTIONS as readonly string[]).includes(value);
}
