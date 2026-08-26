/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four dialogs that replaced native `window.prompt` / `confirm` / `alert`.
 *
 * They share a module because they share a chunk: each is a few dozen lines, all
 * four import the same `Modal`, and splitting them four ways would mean four
 * requests for what amounts to one screen's worth of markup.
 */

import { AlertCircle } from 'lucide-react';

import { VaultData } from '../types.ts';
import { Modal } from './Modal.tsx';

const cancelButtonClass =
  'px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase';

/** Replaces `window.prompt('Category Name:')`. */
export function CategoryCreateDialog({
  name,
  onNameChange,
  onCancel,
  onConfirm,
}: {
  name: string;
  onNameChange: (next: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onCancel} title="New Category">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="new-category-name"
            className="block text-[10px] font-mono uppercase tracking-widest text-vault-text-muted mb-2"
          >
            Category name
          </label>
          <input
            id="new-category-name"
            autoFocus
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Research"
            className="w-full bg-vault-bg border border-vault-border rounded-xl px-4 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={cancelButtonClass}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-primary !text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Replaces the `confirm()` that used to live inside `Sidebar`. */
export function CategoryDeleteDialog({
  categoryName,
  promptCount,
  onCancel,
  onConfirm,
}: {
  categoryName: string | undefined;
  promptCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onCancel} title="Delete Category">
      <div className="space-y-5">
        <p className="text-sm text-vault-text-muted leading-relaxed">
          Delete{' '}
          <span className="text-vault-text font-bold">{categoryName ?? 'this category'}</span>
          ? This also deletes the{' '}
          <span className="text-vault-text font-mono font-bold">{promptCount}</span>{' '}
          {promptCount === 1 ? 'prompt' : 'prompts'} inside it. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={cancelButtonClass}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Replaces `window.confirm` on import. */
export function ImportConfirmDialog({
  incoming,
  onCancel,
  onConfirm,
}: {
  incoming: VaultData;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onCancel} title="Import Backup">
      <div className="space-y-5">
        <p className="text-sm text-vault-text-muted leading-relaxed">
          This file contains{' '}
          <span className="text-vault-text font-mono font-bold">{incoming.prompts.length}</span>{' '}
          {incoming.prompts.length === 1 ? 'prompt' : 'prompts'} and{' '}
          <span className="text-vault-text font-mono font-bold">{incoming.categories.length}</span>{' '}
          {incoming.categories.length === 1 ? 'category' : 'categories'}.
        </p>
        <p className="text-xs text-vault-text-muted leading-relaxed">
          Importing merges it into your vault. Entries whose ID already exists are skipped, so nothing
          you already have is overwritten or duplicated.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={cancelButtonClass}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-primary !text-[11px]">
            Import
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Replaces `window.alert('Invalid import file.')`, which said nothing about *why*
 * the file was rejected.
 */
export function ImportErrorDialog({
  problems,
  onClose,
}: {
  problems: string[];
  onClose: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Import Failed">
      <div className="space-y-5">
        <p className="text-sm text-vault-text-muted leading-relaxed">
          That file could not be imported:
        </p>
        <ul className="space-y-2">
          {problems.map((problem) => (
            <li
              key={problem}
              className="flex items-start gap-2.5 p-3 bg-red-500/8 border border-red-500/20 rounded-xl"
            >
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-xs font-mono text-vault-text-muted leading-relaxed">{problem}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary !text-[11px]">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
