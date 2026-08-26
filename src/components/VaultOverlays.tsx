/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Every overlay the unlocked app can show, and the lazy boundaries around them.
 *
 * The `lazy()` declarations live here rather than in the composition root because
 * they are the point of this file: each dialog is its own chunk, and each imports
 * `Modal` *statically*, so Rollup hoists the modal machinery into one shared chunk
 * instead of duplicating it eleven times or dragging it into the initial bundle.
 *
 * Handlers that need only the vault and the overlay state are implemented here.
 * Anything that also touches app-level state — the current category selection, the
 * lock screens, the clipboard, the file input — arrives as a prop, which is why the
 * prop list is short despite there being twelve overlays.
 */

import { ChangeEvent, Suspense, lazy } from 'react';

import type { CloudSyncController } from '../hooks/useCloudSync.ts';
import type { Overlays } from '../hooks/useOverlays.ts';
import type { VaultController } from '../hooks/useVault.ts';
import { Prompt } from '../types.ts';

const Modal = lazy(() => import('./Modal.tsx').then(m => ({ default: m.Modal })));
const PromptForm = lazy(() => import('./PromptForm.tsx').then(m => ({ default: m.PromptForm })));
const VariableForm = lazy(() => import('./VariableForm.tsx').then(m => ({ default: m.VariableForm })));
const SettingsModal = lazy(() => import('./SettingsModal.tsx').then(m => ({ default: m.SettingsModal })));
const ShortcutsModal = lazy(() => import('./ShortcutsModal.tsx').then(m => ({ default: m.ShortcutsModal })));
const PromptViewModal = lazy(() => import('./PromptViewModal.tsx').then(m => ({ default: m.PromptViewModal })));
const CategoryCreateDialog = lazy(() => import('./VaultDialogs.tsx').then(m => ({ default: m.CategoryCreateDialog })));
const CategoryDeleteDialog = lazy(() => import('./VaultDialogs.tsx').then(m => ({ default: m.CategoryDeleteDialog })));
const ImportConfirmDialog = lazy(() => import('./VaultDialogs.tsx').then(m => ({ default: m.ImportConfirmDialog })));
const ImportErrorDialog = lazy(() => import('./VaultDialogs.tsx').then(m => ({ default: m.ImportErrorDialog })));

/**
 * A dimmed panel of the right shape, so opening a dialog on a cold cache does not
 * shift the page or flash the content behind it.
 */
const modalFallback = (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/80" />
    <div className="relative w-full max-w-2xl h-[70vh] rounded-2xl border border-vault-border bg-vault-panel/80" />
  </div>
);

export interface VaultOverlaysProps {
  overlays: Overlays;
  vault: VaultController;
  sync: CloudSyncController;
  /** Resolves false when nothing reached the clipboard. Owned by the app: see `App.tsx`. */
  onCopy: (prompt: Prompt, customBody?: string) => Promise<boolean>;
  /** Reads the picked file and routes it to `pendingImport` or `importError`. */
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Deletes the prompt *and* closes the modals showing it. */
  onDeletePrompt: (id: string) => void;
  /** Deletes the armed category, and clears the sidebar selection if it pointed there. */
  onDeleteCategory: () => void;
  onCreatePin: () => void;
  onRemoveLock: () => void;
}

export function VaultOverlays({
  overlays,
  vault,
  sync,
  onCopy,
  onImport,
  onDeletePrompt,
  onDeleteCategory,
  onCreatePin,
  onRemoveLock,
}: VaultOverlaysProps) {
  const { categories, prompts } = vault.data;
  const liveCategories = categories.filter(category => category.deletedAt === null);
  const livePrompts = prompts.filter(prompt => prompt.deletedAt === null);

  return (
    <>
      {overlays.newPrompt && (
        <Suspense fallback={modalFallback}>
          <Modal isOpen={true} onClose={() => overlays.setNewPrompt(false)} title="New Librarian Entry">
            <PromptForm
              categories={liveCategories}
              onSubmit={(promptData) => {
                vault.createPrompt({
                  title: promptData.title!,
                  body: promptData.body!,
                  categoryId: promptData.categoryId!,
                  tags: promptData.tags,
                  isFavorite: false,
                });
                overlays.setNewPrompt(false);
              }}
              onCancel={() => overlays.setNewPrompt(false)}
            />
          </Modal>
        </Suspense>
      )}

      {overlays.editing && (
        <Suspense fallback={modalFallback}>
          <Modal isOpen={true} onClose={() => overlays.setEditing(null)} title="Modify Entry">
            <PromptForm
              initialData={overlays.editing}
              categories={liveCategories}
              onSubmit={(promptData) => {
                vault.updatePrompt(overlays.editing!.id, promptData);
                overlays.setEditing(null);
              }}
              onCancel={() => overlays.setEditing(null)}
            />
          </Modal>
        </Suspense>
      )}

      {overlays.viewing && (
        <Suspense fallback={modalFallback}>
          <PromptViewModal
            prompt={overlays.viewing}
            categoryName={liveCategories.find(c => c.id === overlays.viewing!.categoryId)?.name}
            onClose={() => overlays.setViewing(null)}
            onEdit={(prompt) => {
              overlays.setEditing(prompt);
              overlays.setViewing(null);
            }}
            onDuplicate={(prompt) => {
              vault.duplicatePrompt(prompt);
              overlays.setViewing(null);
            }}
            onDelete={onDeletePrompt}
            isConfirmingDelete={overlays.confirmDeleteId === overlays.viewing.id}
            onConfirmDeleteChange={(confirming) =>
              overlays.setConfirmDeleteId(confirming ? overlays.viewing!.id : null)}
          />
        </Suspense>
      )}

      {overlays.variables && (
        <Suspense fallback={modalFallback}>
          <Modal isOpen={true} onClose={() => overlays.setVariables(null)} title="Dynamic Injection">
            <VariableForm
              prompt={overlays.variables.prompt}
              variables={overlays.variables.vars}
              onCopy={(body) => onCopy(overlays.variables!.prompt, body)}
              onCancel={() => {
                // Skipping the form still copies — the raw body, placeholders and all —
                // and still counts as a use, which is what it did before the split.
                void onCopy(overlays.variables!.prompt, overlays.variables!.prompt.body);
              }}
            />
          </Modal>
        </Suspense>
      )}

      {overlays.settings && (
        <Suspense fallback={modalFallback}>
          <SettingsModal
            onClose={() => overlays.setSettings(false)}
            hasPin={vault.isEncrypted}
            onRemoveLock={onRemoveLock}
            onCreatePin={onCreatePin}
            onImport={onImport}
            onExport={vault.exportVault}
            sync={sync}
          />
        </Suspense>
      )}

      {overlays.shortcuts && (
        <Suspense fallback={modalFallback}>
          <ShortcutsModal onClose={() => overlays.setShortcuts(false)} />
        </Suspense>
      )}

      {overlays.categoryCreate && (
        <Suspense fallback={modalFallback}>
          <CategoryCreateDialog
            name={overlays.categoryName}
            onNameChange={overlays.setCategoryName}
            onCancel={() => overlays.setCategoryCreate(false)}
            onConfirm={() => {
              const name = overlays.categoryName.trim();
              if (!name) return;
              vault.addCategory(name);
              overlays.setCategoryCreate(false);
              overlays.setCategoryName('');
            }}
          />
        </Suspense>
      )}

      {overlays.categoryDelete && (
        <Suspense fallback={modalFallback}>
          <CategoryDeleteDialog
            categoryName={liveCategories.find(c => c.id === overlays.categoryDelete)?.name}
            promptCount={livePrompts.filter(p => p.categoryId === overlays.categoryDelete).length}
            onCancel={() => overlays.setCategoryDelete(null)}
            onConfirm={onDeleteCategory}
          />
        </Suspense>
      )}

      {overlays.pendingImport && (
        <Suspense fallback={modalFallback}>
          <ImportConfirmDialog
            incoming={overlays.pendingImport}
            onCancel={() => overlays.setPendingImport(null)}
            onConfirm={() => {
              const incoming = overlays.pendingImport;
              overlays.setPendingImport(null);
              if (incoming) vault.mergeImported(incoming);
            }}
          />
        </Suspense>
      )}

      {overlays.importError && (
        <Suspense fallback={modalFallback}>
          <ImportErrorDialog
            problems={overlays.importError}
            onClose={() => overlays.setImportError(null)}
          />
        </Suspense>
      )}
    </>
  );
}
