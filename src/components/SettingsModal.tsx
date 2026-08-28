/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vault Protocol Settings: the PIN, cloud sync, backup/restore, and a summary of
 * what the storage layer actually is.
 *
 * `lazy()`-loaded by `App`, and it imports `Modal` statically. That combination is
 * what keeps the modal machinery out of the initial chunk while letting the bundler
 * hoist `Modal` into a chunk shared with every other dialog — the same net effect
 * as the previous arrangement, where `App` lazily imported `Modal` itself.
 */

import { ChangeEvent } from 'react';
import { Cloud, Command, Download, Keyboard, LogOut, RefreshCcw, ShieldCheck, Upload, User } from 'lucide-react';

import { APP_VERSION, SCHEMA_VERSION } from '../constants.ts';
import type { CloudSyncController } from '../hooks/useCloudSync.ts';
import { formatTimestamp } from '../utils/vault.ts';
import { Modal } from './Modal.tsx';

export interface SettingsModalProps {
  onClose: () => void;
  hasPin: boolean;
  /** Opens the PIN screen in "confirm to remove" mode. */
  onRemoveLock: () => void;
  onCreatePin: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  sync: CloudSyncController;
  /** Opens the Protocol Shortcuts modal (used on mobile where the floating button is hidden). */
  onOpenShortcuts: () => void;
}

export function SettingsModal({
  onClose,
  hasPin,
  onRemoveLock,
  onCreatePin,
  onImport,
  onExport,
  sync,
  onOpenShortcuts,
}: SettingsModalProps) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Vault Protocol Settings">
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
            <ShieldCheck size={14} />
            <span>Vault Encryption</span>
          </div>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{hasPin ? 'Remove encryption' : 'Encrypt vault'}</p>
              <p className="text-xs text-vault-text-muted font-mono">
                {hasPin ? 'Confirm with your secret before returning this device to plaintext storage.' : 'Use a PIN or passphrase to encrypt local storage with AES-256-GCM.'}
              </p>
            </div>
            {hasPin ? (
              <button
                onClick={onRemoveLock}
                className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all"
              >
                Remove encryption
              </button>
            ) : (
              <button
                onClick={onCreatePin}
                className="px-4 py-2 bg-vault-accent text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
              >
                Encrypt vault
              </button>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-vault-accent-blue font-mono uppercase tracking-widest text-[10px] font-bold">
            <Cloud size={14} />
            <span>Cloud Sync</span>
          </div>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-4">
            {!sync.configured ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Supabase not configured</p>
                <p className="text-xs text-vault-text-muted font-mono">
                  Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cross-device sync.
                </p>
              </div>
            ) : !sync.ready ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Checking sign-in status</p>
                <p className="text-xs text-vault-text-muted font-mono">Please wait while we load your session.</p>
              </div>
            ) : sync.session ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-vault-panel-bright border border-vault-border flex items-center justify-center">
                      <User size={16} className="text-vault-text-muted" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Signed in</p>
                      <p className="text-xs text-vault-text-muted font-mono">{sync.session.user.email || 'Unknown user'}</p>
                    </div>
                  </div>
                  <button
                    onClick={sync.signOut}
                    className="px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-vault-border bg-vault-panel-bright/40">
                    <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Sync status</p>
                    <p aria-live="polite" aria-atomic="true" className={`text-sm font-semibold ${sync.status === 'error' ? 'text-red-400' : sync.status === 'syncing' ? 'text-vault-accent-blue' : 'text-vault-text'}`}>
                      {sync.status === 'syncing' ? 'Syncing' : sync.status === 'error' ? 'Error' : 'Idle'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-vault-border bg-vault-panel-bright/40">
                    <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Last synced</p>
                    <p aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-vault-text">{formatTimestamp(sync.lastSyncedAt)}</p>
                  </div>
                </div>

                {sync.error && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
                    {sync.error}
                  </div>
                )}

                <div className="flex items-center justify-center">
                  <button
                    onClick={sync.syncNow}
                    className="px-4 py-2 bg-vault-accent-blue text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                  >
                    <RefreshCcw size={12} />
                    Sync now
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sign in to sync your vault</p>
                  <p className="text-xs text-vault-text-muted font-mono">Continue with Google to keep prompts in sync.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={sync.signIn}
                    className="px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                  >
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)' }}
                    />
                    Continue with Google
                  </button>
                </div>

                {sync.error && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
                    {sync.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
            <Download size={14} />
            <span>Data Management</span>
          </div>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Backup &amp; Restore</p>
              <p className="text-xs text-vault-text-muted font-mono">Export your vault to a JSON file or import an existing backup.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <label className="cursor-pointer px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2">
                <Upload size={14} /> Import
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
              <button
                onClick={onExport}
                className="px-4 py-2 bg-vault-border text-vault-text hover:bg-vault-accent hover:text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-vault-accent-blue font-mono uppercase tracking-widest text-[10px] font-bold">
            <Command size={14} />
            <span>Architecture Details</span>
          </div>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-vault-text-muted font-mono">App Version</span>
              <span className="font-mono text-vault-accent-blue">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-vault-text-muted font-mono">Schema Version</span>
              <span className="font-mono text-vault-text-muted">{SCHEMA_VERSION}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-vault-text-muted font-mono">Storage Engine</span>
              <span className="font-mono">LocalStorage + Supabase (optional)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-vault-text-muted font-mono">Encryption</span>
              <span className="font-mono opacity-50 italic">{hasPin ? 'AES-256-GCM + PBKDF2' : 'Not enabled'}</span>
            </div>

            {/* Mobile-only shortcuts entry — desktop uses the floating ? button */}
            <div className="sm:hidden pt-2 border-t border-vault-border/50">
              <button
                onClick={() => { onClose(); onOpenShortcuts(); }}
                className="w-full flex items-center justify-between text-xs py-1 group"
              >
                <span className="text-vault-text-muted font-mono">Protocol Shortcuts</span>
                <span className="flex items-center gap-1.5 text-vault-text-muted group-hover:text-vault-accent transition-colors">
                  <Keyboard size={12} />
                  <span className="font-mono text-[10px] uppercase tracking-widest">View</span>
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
