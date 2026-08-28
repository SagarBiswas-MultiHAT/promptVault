/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Composition root.
 *
 * Everything that used to be interleaved in here — vault state and persistence, the
 * sync engine and its eight refs, the keyboard shortcuts, both header layouts, both
 * footer layouts, and eleven dialogs — now lives in `hooks/` and `components/`. What
 * remains is the wiring: which controller each control calls, and the handlers that
 * genuinely span more than one of them.
 */

import { ChangeEvent, Suspense, lazy, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

import { AppFooter } from './components/AppFooter.tsx';
import { AppHeader } from './components/AppHeader.tsx';
import { CopyErrorToast, StorageErrorBanner } from './components/Notices.tsx';
import { EmptyState, PromptGrid } from './components/PromptGrid.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { VaultOverlays } from './components/VaultOverlays.tsx';

import { useCloudSync } from './hooks/useCloudSync.ts';
import { focusSearchInput, useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts';
import { isMobileViewport, useIsMobile } from './hooks/useMediaQuery.ts';
import { useMotion } from './hooks/useMotion.ts';
import { useOverlays } from './hooks/useOverlays.ts';
import { useSyncMeta } from './hooks/useSyncMeta.ts';
import { useVault } from './hooks/useVault.ts';

import { Prompt, VaultData } from './types.ts';
import { buildPromptSearchIndex, describeVaultProblems, extractVariables, sanitizeVault, selectPromptEntries } from './utils/vault.ts';

const StatsDashboard = lazy(() => import('./components/StatsDashboard.tsx').then(m => ({ default: m.StatsDashboard })));
const AiAssistantWidget = lazy(() => import('./components/AiAssistantWidget.tsx').then(m => ({ default: m.AiAssistantWidget })));
const PinLock = lazy(() => import('./components/PinLock.tsx').then(m => ({ default: m.PinLock })));

/** Blank, not a spinner: PinLock covers the viewport, so anything else flashes. */
const pinLockFallback = <div className="min-h-screen w-full bg-vault-bg" />;

export default function App() {
  const syncMeta = useSyncMeta();
  const vault = useVault(syncMeta);
  const { data } = vault;

  const sync = useCloudSync({
    syncMeta,
    data,
    dataRef: vault.dataRef,
    onRemoteData: vault.setData,
    enabled: !vault.isLocked,
  });

  const motion = useMotion();
  const isMobile = useIsMobile();
  const overlays = useOverlays();

  // Hide floating widgets on mobile when any full-screen modal is open.
  const anyModalOpen = isMobile && (
    overlays.newPrompt ||
    overlays.viewing !== null ||
    overlays.editing !== null ||
    overlays.shortcuts ||
    overlays.settings
  );

  // Security screens replace the whole app. The encrypted vault itself owns the
  // locked state; this extra state is only for enabling/removing protection.
  const [securityAction, setSecurityAction] = useState<'create' | 'remove' | null>(null);

  // Browsing state.
  const [searchQuery, setSearchQuery] = useState('');
  // Keep typing immediate when a large vault makes filter/sort expensive.
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobileViewport);
  const [copyError, setCopyError] = useState<string | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const livePrompts = useMemo(() => data.prompts.filter(prompt => prompt.deletedAt === null), [data.prompts]);
  const liveCategories = useMemo(() => data.categories.filter(category => category.deletedAt === null), [data.categories]);
  const promptSearchIndex = useMemo(() => buildPromptSearchIndex(data.prompts), [data.prompts]);

  const filteredPrompts = useMemo(
    () => selectPromptEntries(promptSearchIndex, {
      searchQuery: deferredSearchQuery,
      categoryId: selectedCategoryId,
      favoritesOnly: showFavorites,
      sortBy: data.settings.sortBy,
    }),
    [data.settings.sortBy, deferredSearchQuery, promptSearchIndex, selectedCategoryId, showFavorites],
  );

  /**
   * Copy a prompt body, or open the variable form if it has placeholders.
   *
   * Stays in the composition root because its `Promise<boolean>` contract is a view
   * concern: `PromptCard` uses the resolved value to decide whether to show "Copied",
   * and `false` means "nothing reached the clipboard" — either because the variable
   * form opened instead, or because the write was rejected.
   */
  const handleCopyPrompt = useCallback((prompt: Prompt, customBody?: string) => {
    const finalBody = customBody || prompt.body;

    if (!customBody) {
      const vars = extractVariables(prompt.body);
      if (vars.length > 0) {
        overlays.setVariables({ prompt, vars });
        return Promise.resolve(false);
      }
    }

    // The rejection path used to be unhandled: no clipboard permission or a
    // non-secure context dropped the usage-count increment *and* the error, so the
    // button looked like it worked and the count silently never moved.
    return navigator.clipboard.writeText(finalBody).then(
      () => {
        vault.incrementUsage(prompt.id);
        overlays.setVariables(null);
        return true;
      },
      (error: unknown) => {
        console.error('[PromptVault] Clipboard write failed:', error);
        setCopyError('Could not copy to the clipboard. Your browser may have blocked it, or this page is not on HTTPS.');
        return false;
      },
    );
  }, [overlays, vault]);

  /** Deleting from the view modal has to close the modal that was showing it. */
  const handleDeletePrompt = useCallback((id: string) => {
    vault.deletePrompt(id);
    overlays.setViewing(null);
    overlays.setEditing(null);
    overlays.setConfirmDeleteId(null);
  }, [overlays, vault]);

  /** Leaving a deleted category selected would show an empty grid with no way out. */
  const handleDeleteCategory = useCallback(() => {
    const id = overlays.categoryDelete;
    if (!id) return;
    vault.deleteCategory(id);
    setSelectedCategoryId(current => (current === id ? null : current));
    overlays.setCategoryDelete(null);
  }, [overlays, vault]);

  const handleImport = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so re-picking the same file fires `change` again.
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => overlays.setImportError(['The file could not be read.']);
    reader.onload = (readEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(readEvent.target?.result ?? ''));
      } catch {
        overlays.setImportError(['The file is not valid JSON.']);
        return;
      }

      const problems = describeVaultProblems(parsed);
      if (problems.length > 0) {
        overlays.setImportError(problems);
        return;
      }

      overlays.setPendingImport(sanitizeVault(parsed as VaultData));
    };
    reader.readAsText(file);
  }, [overlays]);

  const handleLockButtonClick = () => {
    if (vault.isEncrypted) vault.lock();
    else setSecurityAction('create');
  };

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);
  const openNewPrompt = useCallback(() => overlays.setNewPrompt(true), [overlays]);
  const openSettings = useCallback(() => overlays.setSettings(true), [overlays]);

  useKeyboardShortcuts(!vault.isLocked && !securityAction, {
    toggleSidebar,
    focusSearch: focusSearchInput,
    newPrompt: openNewPrompt,
    closeOverlays: overlays.closeEscapable,
    toggleShortcuts: overlays.toggleShortcuts,
  });

  if (vault.isLocked || securityAction) {
    return (
      <Suspense fallback={pinLockFallback}>
        <PinLock
          mode={vault.isLocked ? 'unlock' : securityAction === 'remove' ? 'remove' : 'create'}
          secretMode={vault.protectionMode ?? 'pin'}
          onSubmit={async (secret, mode) => {
            if (vault.isLocked) return vault.unlock(secret);
            if (securityAction === 'remove') {
              const removed = (await vault.unlock(secret)) && vault.removeProtection();
              if (removed) setSecurityAction(null);
              return removed;
            }
            const recoveryKey = await vault.protect(secret, mode);
            return recoveryKey ? { recoveryKey } : false;
          }}
          onRecover={vault.isLocked ? vault.recover : undefined}
          onCancel={securityAction ? () => setSecurityAction(null) : undefined}
        />
      </Suspense>
    );
  }

  // An empty grid must not scroll, or the "create your first prompt" call to action
  // ends up below the fold on a short viewport.
  const isEmptyState = !showStats && filteredPrompts.length === 0;
  const contentAreaClassName = `flex-1 min-h-0 ${isEmptyState ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} ${isMobile ? (isEmptyState ? 'px-4 py-3' : 'p-4') : (isEmptyState ? 'px-10 py-6' : 'px-10 py-8')}`;
  const contentWrapperClassName = isEmptyState
    ? 'flex flex-1 flex-col max-w-7xl mx-auto w-full'
    : 'space-y-6 max-w-7xl mx-auto';
  const currentViewLabel = showFavorites
    ? '⭐ Favorites'
    : selectedCategoryId
      ? `# ${liveCategories.find(c => c.id === selectedCategoryId)?.name || 'Unknown'}`
      : 'All Prompts';

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full bg-vault-bg text-vault-text overflow-hidden transition-colors duration-300 relative z-[1]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-vault-accent focus:text-vault-bg focus:rounded-lg focus:text-sm focus:font-bold">Skip to main content</a>

      <Sidebar
        categories={liveCategories}
        prompts={livePrompts}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          setShowStats(false);
        }}
        onAddCategory={() => {
          // Replaces `window.prompt`. Native dialogs block the event loop, cannot be
          // styled, are suppressed in some embedded contexts, and are untestable.
          overlays.setCategoryName('');
          overlays.setCategoryCreate(true);
        }}
        onDeleteCategory={overlays.setCategoryDelete}
        onRenameCategory={vault.renameCategory}
        showFavorites={showFavorites}
        onToggleFavorites={() => {
          setShowFavorites(!showFavorites);
          setSelectedCategoryId(null);
          setShowStats(false);
        }}
        onToggleStats={() => setShowStats(!showStats)}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-full min-h-0">
        {/* Visually hidden, so the page has an h1 without the design carrying one. */}
        <h1 className="sr-only">PromptVault — Your Private AI Prompt Library</h1>

        <AppHeader
          isMobile={isMobile}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={data.settings.sortBy}
          onSortChange={vault.setSortBy}
          isDarkMode={data.settings.isDarkMode}
          onToggleTheme={vault.toggleTheme}
          hasPin={vault.isEncrypted}
          onLockClick={handleLockButtonClick}
          onNewPrompt={openNewPrompt}
          onOpenSettings={openSettings}
          sync={sync}
        />

        <div ref={contentAreaRef} data-testid="content-area" className={contentAreaClassName}>
          {vault.needsEncryptionUpgrade && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-vault-accent/30 bg-vault-accent/10 px-4 py-3 text-sm">
              <span>Your existing vault is stored in the legacy plaintext format. Encrypt it to upgrade safely.</span>
              <button onClick={() => setSecurityAction('create')} className="btn-primary !rounded-lg !px-4 !py-2 !text-[10px]">Encrypt now</button>
            </div>
          )}
          {showStats ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tight">Vault <span className="text-gradient">Intelligence</span></h2>
                <button onClick={() => setShowStats(false)} className="text-[11px] font-mono text-vault-text-muted hover:text-vault-accent uppercase px-4 py-2 border border-vault-border hover:border-vault-accent/30 rounded-xl transition-all">Back to Prompts</button>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-20 text-vault-text-muted text-sm font-mono">Loading analytics…</div>}>
                <StatsDashboard prompts={livePrompts} categories={liveCategories} />
              </Suspense>
            </div>
          ) : (
            <div className={contentWrapperClassName}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight">{currentViewLabel}</h2>
                  <span className="badge badge-amber">{filteredPrompts.length} prompts</span>
                </div>
              </div>

              {filteredPrompts.length > 0 ? (
                <PromptGrid
                  prompts={filteredPrompts}
                  scrollContainerRef={contentAreaRef}
                  onCopy={handleCopyPrompt}
                  onToggleFavorite={vault.toggleFavorite}
                  onSelect={overlays.setViewing}
                />
              ) : (
                <EmptyState
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery('')}
                  onCreate={openNewPrompt}
                  motion={motion}
                />
              )}
            </div>
          )}
        </div>

        <AppFooter
          isMobile={isMobile}
          isSaved={vault.isSaved}
          promptCount={filteredPrompts.length}
          isEncrypted={vault.isEncrypted}
          onOpenSettings={openSettings}
          motion={motion}
        />
      </main>

      <Suspense fallback={null}>
        <AiAssistantWidget
          categories={liveCategories}
          onCreatePrompt={(promptData) => vault.createPrompt({ ...promptData, isFavorite: false })}
          hideOnMobile={anyModalOpen}
        />
      </Suspense>

      <VaultOverlays
        overlays={overlays}
        vault={vault}
        sync={sync}
        onCopy={handleCopyPrompt}
        onImport={handleImport}
        onDeletePrompt={handleDeletePrompt}
        onDeleteCategory={handleDeleteCategory}
          onCreatePin={() => {
            overlays.setSettings(false);
            setSecurityAction('create');
          }}
          onRemoveLock={() => {
            overlays.setSettings(false);
            setSecurityAction('remove');
          }}
      />

      {vault.storageError && (
        <StorageErrorBanner reason={vault.storageError} onExport={vault.exportVault} />
      )}

      {copyError && <CopyErrorToast message={copyError} onDismiss={() => setCopyError(null)} />}

      {!anyModalOpen && (
        <div className="fixed bottom-[3.5rem] right-30 pointer-events-none group">
          <button
            onClick={() => overlays.setShortcuts(true)}
            aria-label="Keyboard shortcuts help"
            className="pointer-events-auto w-9 h-9 bg-vault-panel/80 border border-vault-border rounded-full flex items-center justify-center text-vault-text-muted/50 hover:text-vault-accent hover:border-vault-accent/30 transition-all shadow-lg backdrop-blur-sm"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
