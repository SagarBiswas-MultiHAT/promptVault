/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT/promptVault)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Vault Protocol Settings: the PIN, cloud sync, backup/restore, and a summary of
 * what the storage layer actually is.
 *
 * `lazy()`-loaded by `App`, and it imports `Modal` statically. That combination is
 * what keeps the modal machinery out of the initial chunk while letting the bundler
 * hoist `Modal` into a chunk shared with every other dialog - the same net effect
 * as the previous arrangement, where `App` lazily imported `Modal` itself.
 */

import { ChangeEvent } from 'react';
import { Cloud, Command, Download, Github, Keyboard, LogOut, Mail, RefreshCcw, ShieldCheck, Upload, User } from 'lucide-react';

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
          <div className="p-4 sm:p-5 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between gap-4">
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
          <div className="p-4 sm:p-5 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-4">
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
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-vault-panel-bright border border-vault-border flex items-center justify-center shrink-0">
                      <User size={15} className="text-vault-accent-blue" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-vault-text leading-none">Signed in</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active session" />
                      </div>
                      <p className="text-[11px] text-vault-text-muted font-mono truncate" title={sync.session.user.email}>
                        {sync.session.user.email || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={sync.signOut}
                    className="shrink-0 px-2.5 py-1.5 border border-vault-border text-vault-text-muted hover:text-red-400 hover:border-red-400/40 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 group"
                    title="Sign out of Supabase"
                  >
                    <LogOut size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    <span>Sign out</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 sm:p-3 rounded-xl border border-vault-border bg-vault-panel-bright/40 space-y-1">
                    <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Sync status</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        sync.status === 'syncing' ? 'bg-vault-accent-blue animate-ping' :
                        sync.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                      }`} />
                      <p aria-live="polite" aria-atomic="true" className={`text-xs font-semibold font-mono truncate ${
                        sync.status === 'error' ? 'text-red-400' :
                        sync.status === 'syncing' ? 'text-vault-accent-blue' :
                        'text-vault-text'
                      }`}>
                        {sync.status === 'syncing' ? 'Syncing...' : sync.status === 'error' ? 'Error' : 'Idle'}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl border border-vault-border bg-vault-panel-bright/40 space-y-1">
                    <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Last synced</p>
                    <p aria-live="polite" aria-atomic="true" className="text-xs font-semibold font-mono text-vault-text truncate">
                      {formatTimestamp(sync.lastSyncedAt)}
                    </p>
                  </div>
                </div>

                {sync.error && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono break-all whitespace-pre-wrap">
                    {sync.error}
                  </div>
                )}

                <button
                  onClick={sync.syncNow}
                  disabled={sync.status === 'syncing'}
                  className="w-full py-2 px-4 bg-vault-accent-blue hover:bg-vault-accent-blue/90 disabled:opacity-50 text-vault-bg rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCcw size={12} className={sync.status === 'syncing' ? 'animate-spin' : ''} />
                  <span>{sync.status === 'syncing' ? 'Syncing...' : 'Sync now'}</span>
                </button>
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
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono break-all whitespace-pre-wrap">
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
          <div className="p-4 sm:p-5 bg-vault-bg/50 border border-vault-border rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <div className="p-4 sm:p-5 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-3">
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0">App Version</span>
              <span className="font-mono text-vault-accent-blue">{APP_VERSION}</span>
            </div>
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0">Schema Version</span>
              <span className="font-mono text-vault-text-muted">{SCHEMA_VERSION}</span>
            </div>
            <div className="flex items-start sm:items-center justify-between gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0 pt-0.5 sm:pt-0">Storage Engine</span>
              <div className="flex items-center gap-1.5 font-mono text-right text-[11px] sm:text-xs flex-wrap justify-end">
                <span className="text-vault-text font-medium whitespace-nowrap">LocalStorage</span>
                <span className="text-vault-text-muted whitespace-nowrap">+ Supabase</span>
                <span className="text-[10px] text-vault-text-muted/70 tracking-tight whitespace-nowrap">(optional)</span>
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0">Encryption</span>
              <span className="font-mono opacity-50 italic">{hasPin ? 'AES-256-GCM + PBKDF2' : 'Not enabled'}</span>
            </div>

            {/* Mobile-only shortcuts entry - desktop uses the floating ? button */}
            <div className="pt-2 border-t border-vault-border/50">
              <button
                onClick={() => { onClose(); onOpenShortcuts(); }}
                className="w-full flex items-center justify-between text-xs py-1 group"
              >
                <span className="text-vault-text-muted font-mono shrink-0">Protocol Shortcuts</span>
                <span className="flex items-center gap-1.5 text-vault-text-muted group-hover:text-vault-accent transition-colors">
                  <Keyboard size={12} />
                  <span className="font-mono text-[10px] uppercase tracking-widest">View</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* About & Attribution */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-vault-text-muted font-mono uppercase tracking-widest text-[10px] font-bold">
            <span>About &amp; License</span>
          </div>
          <div className="p-4 sm:p-5 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-3">
            <a
              href="https://multihat.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 text-xs group"
            >
              <span className="text-vault-text-muted font-mono shrink-0">Author</span>
              <span className="flex items-center gap-1.5 text-right font-mono transition-colors">
                <User size={12} className="shrink-0 text-vault-accent" />
                <span className="font-sans font-medium text-vault-text group-hover:text-vault-accent transition-colors whitespace-nowrap">
                  Sagar Biswas
                </span>
                <span className="text-vault-text-muted text-[10px] whitespace-nowrap">
                  (@SagarBiswas-MultiHAT)
                </span>
              </span>
            </a>
            <div className="border-t border-vault-border/50" />
            <a
              href="mailto:sagarbiswas@multihat.dev"
              className="flex items-center justify-between gap-3 text-xs group"
            >
              <span className="text-vault-text-muted font-mono shrink-0">Contact</span>
              <span className="flex items-center gap-1.5 text-vault-text-muted group-hover:text-vault-accent transition-colors font-mono text-[11px] whitespace-nowrap">
                <Mail size={12} className="shrink-0 text-vault-accent" />
                sagarbiswas@multihat.dev
              </span>
            </a>
            <div className="border-t border-vault-border/50" />
            <a
              href="https://github.com/SagarBiswas-MultiHAT/promptVault"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 text-xs group"
            >
              <span className="text-vault-text-muted font-mono shrink-0">Source</span>
              <span className="flex items-center gap-1.5 text-vault-text-muted group-hover:text-vault-accent transition-colors font-mono text-[11px] whitespace-nowrap">
                <Github size={12} className="shrink-0 text-vault-accent" />
                SagarBiswas-MultiHAT/promptVault
              </span>
            </a>
            <div className="border-t border-vault-border/50" />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0">License</span>
              <a
                href="https://github.com/SagarBiswas-MultiHAT/promptVault/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-emerald-400 hover:text-emerald-300 transition-colors text-[11px] whitespace-nowrap"
              >
                Apache-2.0 (NOTICE Attributed)
              </a>
            </div>
            <div className="border-t border-vault-border/50" />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-vault-text-muted font-mono shrink-0">Privacy Policy</span>
              <a
                href="https://github.com/SagarBiswas-MultiHAT/promptVault/blob/main/PRIVACY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-vault-accent hover:underline transition-colors text-[11px] whitespace-nowrap"
              >
                Zero Prompt Tracking
              </a>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
