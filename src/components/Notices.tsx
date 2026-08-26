/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The two out-of-band notices, both for failures that used to be silent.
 *
 * Statically imported: a dialog can afford to arrive over the network when you open
 * it, but a message that says "your changes are not being saved" cannot wait on a
 * chunk that may itself fail to load.
 */

import { AlertCircle } from 'lucide-react';

import type { StorageFailure } from '../utils/storage.ts';

/**
 * `aria-live="assertive"` because losing persistence invalidates what the rest of
 * the UI is telling the user; it should interrupt rather than wait for a pause.
 */
export function StorageErrorBanner({
  reason,
  onExport,
}: {
  reason: StorageFailure;
  onExport: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] flex items-start gap-3 p-4 bg-red-950/95 border border-red-500/40 rounded-xl shadow-2xl backdrop-blur-sm"
    >
      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-red-300">
          Changes are not being saved
        </p>
        <p className="mt-1.5 text-xs text-red-200/80 leading-relaxed">
          {reason === 'quota'
            ? 'This browser is out of storage for this site. Export a backup now, then delete some prompts to free space.'
            : 'This browser is blocking local storage, so nothing can be saved. Private browsing or a site permission is the usual cause. Export a backup to keep your work.'}
        </p>
        <button
          onClick={onExport}
          className="mt-3 px-3 py-1.5 border border-red-400/40 text-red-200 hover:bg-red-500/15 rounded-lg transition-colors text-[10px] font-mono font-bold tracking-widest uppercase"
        >
          Export backup
        </button>
      </div>
    </div>
  );
}

/**
 * Clipboard failure — previously swallowed entirely.
 *
 * `polite`, not `assertive`: a failed copy is recoverable by clicking again, so it
 * does not warrant cutting across whatever the screen reader is mid-sentence on.
 */
export function CopyErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] flex items-start gap-3 p-3.5 bg-vault-panel/95 border border-red-500/30 rounded-xl shadow-2xl backdrop-blur-sm"
    >
      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-xs text-vault-text-muted leading-relaxed">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-vault-text-muted hover:text-vault-text transition-colors text-sm leading-none"
      >
        ×
      </button>
    </div>
  );
}
