/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowUpDown } from 'lucide-react';

import { SORT_OPTIONS, SortOption, isSortOption } from '../types.ts';

const SORT_LABELS: Record<SortOption, string> = {
  RECENTLY_ADDED: 'Recently added',
  RECENTLY_UPDATED: 'Recently updated',
  MOST_USED: 'Most used',
  A_Z: 'Title A–Z',
};

/**
 * Sort control for the prompt grid.
 *
 * The `sortBy` state and every branch of the sort comparator already existed and
 * worked; nothing ever called the setter, so the README's "sort by most used /
 * recently added / A–Z" was simply untrue. This is the control that makes it true.
 *
 * A native `<select>` on purpose. It is keyboard-navigable, screen-reader-labelled,
 * and uses the platform picker on touch devices for free — all of which a
 * hand-rolled div-based dropdown would have to reimplement, and usually gets wrong.
 */
export const SortControl = ({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (next: SortOption) => void;
}) => (
  <div className="relative flex items-center">
    <ArrowUpDown
      size={13}
      className="pointer-events-none absolute left-2.5 text-vault-text-muted"
      aria-hidden="true"
    />
    <select
      id="sort-prompts"
      aria-label="Sort prompts"
      value={value}
      onChange={(event) => {
        // A `<select>` can only yield one of its own options, but an `as` cast here
        // would also silently accept a stale value after an option is renamed.
        if (isSortOption(event.target.value)) onChange(event.target.value);
      }}
      className="appearance-none bg-vault-bg/80 border border-vault-border rounded-xl pl-8 pr-7 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all cursor-pointer"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {SORT_LABELS[option]}
        </option>
      ))}
    </select>
    <span className="pointer-events-none absolute right-2.5 text-[8px] text-vault-text-muted" aria-hidden="true">▾</span>
  </div>
);
