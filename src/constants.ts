/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_SORT, VaultData } from './types.ts';

export const APP_VERSION = '2.1.0';
export const SCHEMA_VERSION = '2.0.0';
const INITIAL_TIMESTAMP = 0;

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Coding', updatedAt: INITIAL_TIMESTAMP, deletedAt: null },
  { id: 'cat-2', name: 'Writing', updatedAt: INITIAL_TIMESTAMP, deletedAt: null },
  { id: 'cat-3', name: 'Marketing', updatedAt: INITIAL_TIMESTAMP, deletedAt: null },
  { id: 'cat-4', name: 'General', updatedAt: INITIAL_TIMESTAMP, deletedAt: null },
];

export const INITIAL_DATA: VaultData = {
  schemaVersion: SCHEMA_VERSION,
  prompts: [],
  categories: INITIAL_CATEGORIES,
  settings: {
    isDarkMode: true,
    sortBy: DEFAULT_SORT,
  },
};

export const LOCAL_STORAGE_KEY = 'prompt-vault-data';
export const SYNC_META_KEY = 'prompt-vault-sync-meta';
export const SYNC_TABLE = 'vaults';
