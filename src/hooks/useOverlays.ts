/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Which overlay is open.
 *
 * Twelve independent slots, deliberately kept as plain state + setters rather than
 * dressed up as an `open(kind)` state machine: they are not mutually exclusive today
 * (the delete confirmation lives *under* the view modal, and an import error can
 * arrive while Settings is open), and pretending otherwise would force a fake
 * hierarchy on them.
 *
 * The one thing this hook exists to own is `closeEscapable` — the set of overlays
 * that Escape dismisses. That list was previously inlined in the keyboard handler,
 * which made it impossible to see that Settings and the four confirm dialogs are
 * *not* in it.
 */

import { useCallback, useMemo, useState } from 'react';

import { Prompt, VaultData } from '../types.ts';

/** A copy that stalled because the body has `{{placeholders}}` to fill in. */
export interface VariableRequest {
  prompt: Prompt;
  vars: string[];
}

export interface Overlays {
  newPrompt: boolean;
  setNewPrompt: (open: boolean) => void;

  editing: Prompt | null;
  setEditing: (prompt: Prompt | null) => void;

  viewing: Prompt | null;
  setViewing: (prompt: Prompt | null) => void;

  variables: VariableRequest | null;
  setVariables: (request: VariableRequest | null) => void;

  settings: boolean;
  setSettings: (open: boolean) => void;

  shortcuts: boolean;
  setShortcuts: (open: boolean) => void;
  toggleShortcuts: () => void;

  categoryCreate: boolean;
  setCategoryCreate: (open: boolean) => void;
  categoryName: string;
  setCategoryName: (name: string) => void;

  categoryDelete: string | null;
  setCategoryDelete: (categoryId: string | null) => void;

  pendingImport: VaultData | null;
  setPendingImport: (incoming: VaultData | null) => void;

  importError: string[] | null;
  setImportError: (problems: string[] | null) => void;

  /**
   * Which prompt's delete button has been armed. Lives here rather than inside
   * `PromptViewModal` so that it survives closing and reopening the modal, which is
   * how it behaved before the split.
   */
  confirmDeleteId: string | null;
  setConfirmDeleteId: (promptId: string | null) => void;

  /**
   * Dismiss the overlays that Escape dismisses.
   *
   * Note what is absent: Settings, the two category dialogs, and the two import
   * dialogs. `Modal` has `role="dialog"` and `aria-modal` but no Escape handler of
   * its own, so those five are currently mouse-only. That is a real accessibility
   * gap, tracked as Phase 5 work; it is reproduced faithfully here so this refactor
   * changes no behaviour.
   */
  closeEscapable: () => void;
}

export function useOverlays(): Overlays {
  const [newPrompt, setNewPrompt] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [viewing, setViewing] = useState<Prompt | null>(null);
  const [variables, setVariables] = useState<VariableRequest | null>(null);
  const [settings, setSettings] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [categoryCreate, setCategoryCreate] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDelete, setCategoryDelete] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<VaultData | null>(null);
  const [importError, setImportError] = useState<string[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleShortcuts = useCallback(() => setShortcuts(prev => !prev), []);

  const closeEscapable = useCallback(() => {
    setNewPrompt(false);
    setEditing(null);
    setViewing(null);
    setVariables(null);
    setShortcuts(false);
  }, []);

  return useMemo(() => ({
    newPrompt, setNewPrompt,
    editing, setEditing,
    viewing, setViewing,
    variables, setVariables,
    settings, setSettings,
    shortcuts, setShortcuts, toggleShortcuts,
    categoryCreate, setCategoryCreate,
    categoryName, setCategoryName,
    categoryDelete, setCategoryDelete,
    pendingImport, setPendingImport,
    importError, setImportError,
    confirmDeleteId, setConfirmDeleteId,
    closeEscapable,
  }), [
    newPrompt, editing, viewing, variables, settings, shortcuts, categoryCreate,
    categoryName, categoryDelete, pendingImport, importError, confirmDeleteId,
    toggleShortcuts, closeEscapable,
  ]);
}
