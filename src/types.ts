/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

export interface Category {
  id: string;
  name: string;
  isCollapsed: boolean;
}

export interface VaultData {
  schemaVersion: string;
  prompts: Prompt[];
  categories: Category[];
  settings: {
    pinHash: string | null;
    isDarkMode: boolean;
  };
}

export type SortOption = 'MOST_USED' | 'RECENTLY_ADDED' | 'RECENTLY_UPDATED' | 'A_Z';
