/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The global keyboard shortcuts, as advertised by the shortcuts modal.
 *
 * A single `keydown` listener on `window` rather than per-element handlers: the
 * point of these is that they work wherever focus happens to be. `enabled` is
 * false while the vault is locked, so none of them fire behind the PIN screen.
 */

import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  toggleSidebar: () => void;
  focusSearch: () => void;
  newPrompt: () => void;
  closeOverlays: () => void;
  toggleShortcuts: () => void;
}

export function useKeyboardShortcuts(enabled: boolean, handlers: ShortcutHandlers) {
  // Read the handlers through a ref so the listener is bound once, instead of
  // re-subscribing every time the caller re-renders with fresh closures. The
  // assignment has to happen on every render, not inside an effect, or the first
  // keypress after a state change would call last render's handler.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      const isCmdOrCtrl = event.metaKey || event.ctrlKey;

      if (isCmdOrCtrl && event.key === '[') {
        event.preventDefault();
        handlersRef.current.toggleSidebar();
      } else if (isCmdOrCtrl && event.key === 'k') {
        event.preventDefault();
        handlersRef.current.focusSearch();
      } else if (isCmdOrCtrl && event.key === 'n') {
        event.preventDefault();
        handlersRef.current.newPrompt();
      } else if (event.key === 'Escape') {
        handlersRef.current.closeOverlays();
      } else if (
        event.key === '?' &&
        (event.target as HTMLElement).tagName !== 'INPUT' &&
        (event.target as HTMLElement).tagName !== 'TEXTAREA'
      ) {
        handlersRef.current.toggleShortcuts();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

/**
 * Move focus to whichever search input is mounted.
 *
 * `focus()` returns void, so the original `a?.focus() || b?.focus()` always ran
 * the right-hand side too — focus ended up on the mobile input whenever both were
 * in the tree. Pick the target first, then focus exactly one.
 */
export const focusSearchInput = () => {
  const input =
    document.getElementById('main-search-desktop') ?? document.getElementById('main-search');
  input?.focus();
};
