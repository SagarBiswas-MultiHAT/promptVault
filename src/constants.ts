/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VaultData } from './types.ts';

export const SCHEMA_VERSION = '1.0.0';

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'Coding', isCollapsed: false },
  { id: 'cat-2', name: 'Writing', isCollapsed: false },
  { id: 'cat-3', name: 'Marketing', isCollapsed: false },
  { id: 'cat-4', name: 'General', isCollapsed: false },
];

export const INITIAL_DATA: VaultData = {
  schemaVersion: SCHEMA_VERSION,
  prompts: [],
  categories: INITIAL_CATEGORIES,
  settings: {
    pinHash: null,
    isDarkMode: true,
  },
};

export const LOCAL_STORAGE_KEY = 'prompt-vault-data';
