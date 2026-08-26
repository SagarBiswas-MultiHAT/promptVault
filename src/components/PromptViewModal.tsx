/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The read-only record view, with modify / clone / delete in the footer.
 *
 * The delete confirmation is a two-step inline swap rather than a nested dialog:
 * stacking a second `aria-modal` dialog over this one is exactly the focus problem
 * Phase 5 has to fix, and there is no reason to add another instance of it here.
 */

import { AlertCircle } from 'lucide-react';

import { Prompt } from '../types.ts';
import { Modal } from './Modal.tsx';

export interface PromptViewModalProps {
  prompt: Prompt;
  categoryName: string | undefined;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
  onDuplicate: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  /** Lifted so it survives the modal closing, matching the previous behaviour. */
  isConfirmingDelete: boolean;
  onConfirmDeleteChange: (confirming: boolean) => void;
}

export function PromptViewModal({
  prompt,
  categoryName,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  isConfirmingDelete,
  onConfirmDeleteChange,
}: PromptViewModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Vault Record"
      footer={(
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(prompt)}
              className="flex items-center gap-2 px-6 py-2.5 bg-vault-border text-vault-text hover:bg-vault-accent-blue hover:text-vault-bg rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
            >
              Modify
            </button>
            <button
              onClick={() => onDuplicate(prompt)}
              className="flex items-center gap-2 px-6 py-2.5 border border-vault-border text-vault-text-muted hover:text-vault-text rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
            >
              Clone
            </button>
          </div>
          {isConfirmingDelete ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-widest">Confirm?</span>
              <button
                onClick={() => onDelete(prompt.id)}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold transition-all hover:bg-red-600 uppercase tracking-widest"
              >
                Yes
              </button>
              <button
                onClick={() => onConfirmDeleteChange(false)}
                className="px-3 py-1 text-vault-text-muted hover:text-vault-text text-xs font-bold transition-all uppercase tracking-widest"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConfirmDeleteChange(true)}
              className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Delete Prompt"
            >
              <AlertCircle size={20} />
            </button>
          )}
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-vault-border pb-4">
          <h3 className="text-2xl font-bold text-vault-accent">{prompt.title}</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-vault-accent/10 text-vault-accent rounded-full text-[10px] font-mono font-bold uppercase">
            {categoryName}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.2em]">Prompt Body</label>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
            {prompt.body}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {prompt.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-vault-border/50 text-vault-text-muted rounded-full text-[10px] font-mono">
              #{tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-vault-border h-24">
          <div className="flex flex-col items-center justify-center p-4 bg-vault-panel/50 rounded-xl border border-vault-border/50">
            <span className="text-xl font-mono-tight font-bold">{prompt.usageCount}</span>
            <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Extractions</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-vault-panel/50 rounded-xl border border-vault-border/50">
            <span className="text-[11px] font-mono font-bold">{new Date(prompt.createdAt).toLocaleDateString()}</span>
            <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Archived On</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
