/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure vault helpers: validation, repair, and the shape sent to the cloud.
 *
 * These lived at module scope in `App.tsx`, where nothing could reach them.
 * They are the functions most worth testing in the whole client — every one of
 * them exists because a malformed vault reached a React render and threw — so
 * they belong in a module a test file can import.
 */

import { Category, DEFAULT_SORT, Prompt, VaultData, isSortOption } from '../types.ts';

/**
 * Document-level shape check, used as the `readJson` validator and by the sync
 * pull path before remote data is trusted.
 */
export const isValidVaultData = (value: unknown): value is VaultData => {
  const data = value as VaultData;
  return Boolean(
    data &&
    data.schemaVersion &&
    Array.isArray(data.prompts) &&
    Array.isArray(data.categories) &&
    data.settings &&
    typeof data.settings.isDarkMode === 'boolean'
  );
};

/**
 * Explain, field by field, why a file is not a vault.
 *
 * Import previously checked only `schemaVersion` and then read `.prompts` and
 * `.categories` — so a file carrying a version but no `prompts` array threw
 * *inside* `setData`, after the try/catch had already returned. The user saw
 * "Invalid import file" for a syntax error and an unhandled exception for a
 * structural one.
 *
 * Deliberately document-level only, matching `isValidVaultData` exactly. Entry-level
 * problems are repaired by `sanitizePrompts`/`sanitizeCategories` rather than
 * rejecting the whole file: one malformed prompt should cost you that prompt, not
 * the other four hundred.
 */
export const describeVaultProblems = (value: unknown): string[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return ['The file does not contain a JSON object.'];
  }

  const data = value as Partial<VaultData>;
  const problems: string[] = [];

  if (typeof data.schemaVersion !== 'string' || !data.schemaVersion) {
    problems.push('"schemaVersion" is missing — this may not be a PromptVault export.');
  }
  if (!Array.isArray(data.prompts)) problems.push('"prompts" is missing or is not a list.');
  if (!Array.isArray(data.categories)) problems.push('"categories" is missing or is not a list.');
  if (typeof data.settings !== 'object' || data.settings === null) {
    problems.push('"settings" is missing.');
  } else if (typeof data.settings.isDarkMode !== 'boolean') {
    problems.push('"settings.isDarkMode" is missing or is not a boolean.');
  }

  return problems;
};

/**
 * Drop entries that would crash a render, and fill in fields added after the
 * entry was written.
 *
 * Applied on load as well as on import: a hand-edited or partially-written
 * `localStorage` value could previously put `null` or an object where a string
 * belonged, and React throws on the way out rather than at the point of damage.
 */
export const sanitizePrompts = (value: unknown): Prompt[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return (value as unknown[]).flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const p = entry as Partial<Prompt>;

    // Identity and content are required; everything else has a sane default.
    if (typeof p.id !== 'string' || !p.id) return [];
    if (typeof p.title !== 'string' || typeof p.body !== 'string') return [];
    if (seen.has(p.id)) return [];
    seen.add(p.id);

    const now = Date.now();
    return [{
      id: p.id,
      title: p.title,
      body: p.body,
      categoryId: typeof p.categoryId === 'string' ? p.categoryId : '',
      tags: Array.isArray(p.tags) ? p.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      isFavorite: p.isFavorite === true,
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : now,
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : now,
      usageCount: typeof p.usageCount === 'number' && p.usageCount >= 0 ? p.usageCount : 0,
      deletedAt: typeof p.deletedAt === 'number' ? p.deletedAt : null,
    }];
  });
};

export const sanitizeCategories = (value: unknown): Category[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return (value as unknown[]).flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const c = entry as Partial<Category>;
    if (typeof c.id !== 'string' || !c.id) return [];
    if (typeof c.name !== 'string' || !c.name) return [];
    if (seen.has(c.id)) return [];
    seen.add(c.id);
    return [{
      id: c.id,
      name: c.name,
      updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
      deletedAt: typeof c.deletedAt === 'number' ? c.deletedAt : null,
    }];
  });
};

export const sanitizeVault = (data: VaultData): VaultData => ({
  ...data,
  prompts: sanitizePrompts(data.prompts),
  categories: sanitizeCategories(data.categories),
  settings: {
    isDarkMode: data.settings?.isDarkMode !== false,
    // Absent in every vault written before the sort control shipped, and free-text
    // in a hand-edited one. Falling back keeps the sort switch's `default: return 0`
    // branch unreachable in practice.
    sortBy: isSortOption(data.settings?.sortBy) ? data.settings.sortBy : DEFAULT_SORT,
  },
});

/**
 * The vault as it goes to the cloud, and as it goes into an export file.
 *
 * Encryption keys and recovery keys are never part of `VaultData`, so cloud
 * payloads and portable backups are intentionally ordinary, usable JSON.
 */
export const withoutSecrets = (value: VaultData): VaultData => ({ ...value });

export const formatTimestamp = (value: number | null) => {
  if (!value) return 'Never';
  const diffMs = value - Date.now();
  const absMs = Math.abs(diffMs);
  if (absMs < 45_000) return 'just now';

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const [unit, unitMs] of units) {
    if (absMs >= unitMs) {
      return formatter.format(Math.round(diffMs / unitMs), unit);
    }
  }

  return 'just now';
};

/** Extract `{{variable}}` names in first-appearance order, de-duplicated. */
export const extractVariables = (body: string): string[] => {
  const matches = body.match(/{{([^{}]+)}}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/{{|}}/g, ''))));
};

export interface PromptFilter {
  searchQuery: string;
  categoryId: string | null;
  favoritesOnly: boolean;
  sortBy: VaultData['settings']['sortBy'];
}

export interface PromptSearchEntry {
  prompt: Prompt;
  searchableText: string;
}

export const buildPromptSearchIndex = (prompts: Prompt[]): PromptSearchEntry[] => prompts.map((prompt) => ({
  prompt,
  searchableText: `${prompt.title}\n${prompt.body}\n${prompt.tags.join('\n')}`.toLowerCase(),
}));

/** Filter and sort the grid. Pure so the ordering rules can be tested directly. */
export const selectPromptEntries = (entries: PromptSearchEntry[], filter: PromptFilter): Prompt[] => {
  let result = entries.filter(({prompt}) => prompt.deletedAt === null);

  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter((entry) => entry.searchableText.includes(q));
  }

  if (filter.categoryId) {
    result = result.filter(({prompt}) => prompt.categoryId === filter.categoryId);
  }

  if (filter.favoritesOnly) {
    result = result.filter(({prompt}) => prompt.isFavorite);
  }

  result.sort((a, b) => {
    switch (filter.sortBy) {
      case 'MOST_USED': return b.prompt.usageCount - a.prompt.usageCount;
      case 'RECENTLY_ADDED': return b.prompt.createdAt - a.prompt.createdAt;
      case 'RECENTLY_UPDATED': return b.prompt.updatedAt - a.prompt.updatedAt;
      case 'A_Z': return a.prompt.title.localeCompare(b.prompt.title);
      default: return 0;
    }
  });

  return result.map(({prompt}) => prompt);
};

export const selectPrompts = (prompts: Prompt[], filter: PromptFilter): Prompt[] => selectPromptEntries(
  buildPromptSearchIndex(prompts),
  filter,
);
