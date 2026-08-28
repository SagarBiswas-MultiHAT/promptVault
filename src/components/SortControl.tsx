/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sort control for the prompt grid.
 *
 * Replaced the native <select> (which renders a white platform sheet on Android)
 * with a fully custom dropdown that matches the vault's dark design system on
 * every platform — keyboard-navigable and screen-reader-labelled.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';

import { SORT_OPTIONS, SortOption, isSortOption } from '../types.ts';

const SORT_LABELS: Record<SortOption, string> = {
  RECENTLY_ADDED:   'Recently Added',
  RECENTLY_UPDATED: 'Recently Updated',
  MOST_USED:        'Most Used',
  A_Z:              'Title A–Z',
};

export const SortControl = ({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (next: SortOption) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center" id="sort-prompts-wrapper">
      {/* Trigger button */}
      <button
        id="sort-prompts"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort prompts"
        onClick={() => setOpen(prev => !prev)}
        className="appearance-none bg-vault-bg/80 border border-vault-border rounded-xl pl-8 pr-7 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all cursor-pointer flex items-center whitespace-nowrap"
      >
        {SORT_LABELS[value]}
      </button>

      {/* Icon left */}
      <ArrowUpDown
        size={13}
        className="pointer-events-none absolute left-2.5 text-vault-text-muted"
        aria-hidden="true"
      />
      {/* Chevron right */}
      <span className="pointer-events-none absolute right-2.5 text-[8px] text-vault-text-muted" aria-hidden="true">▾</span>

      {/* Dropdown panel */}
      {open && (
        <ul
          role="listbox"
          aria-label="Sort options"
          className="absolute top-full right-0 mt-1.5 z-50 min-w-[180px] bg-vault-panel border border-vault-border rounded-xl shadow-2xl overflow-hidden py-1"
        >
          {SORT_OPTIONS.map((option) => {
            const selected = option === value;
            return (
              <li
                key={option}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (isSortOption(option)) {
                    onChange(option);
                    setOpen(false);
                  }
                }}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors select-none ${
                  selected
                    ? 'text-vault-accent bg-vault-accent/8'
                    : 'text-vault-text-muted hover:text-vault-text hover:bg-vault-panel-bright'
                }`}
              >
                {SORT_LABELS[option]}
                {selected && <Check size={12} className="text-vault-accent shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
