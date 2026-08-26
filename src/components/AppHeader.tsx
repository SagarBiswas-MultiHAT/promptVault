/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The app header, in its two independent layouts.
 *
 * Mobile and desktop are separate trees rather than one tree with responsive
 * classes, because they are genuinely different: mobile stacks a brand row over a
 * full-width search row and hides the settings entry point in the footer, while
 * desktop is a single row with search on the left and every control on the right.
 * Expressing that as one tree would mean rendering both sets of buttons and hiding
 * one, which duplicates every `id` the E2E suite targets.
 *
 * Static, not lazy: this is in the first paint.
 */

import { Cloud, Lock, LogOut, Moon, Plus, Search, Settings, Sun, Unlock, User } from 'lucide-react';

import type { CloudSyncController } from '../hooks/useCloudSync.ts';
import { SortOption } from '../types.ts';
import { SortControl } from './SortControl.tsx';

export interface AppHeaderProps {
  isMobile: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (next: string) => void;
  sortBy: SortOption;
  onSortChange: (next: SortOption) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  hasPin: boolean;
  onLockClick: () => void;
  onNewPrompt: () => void;
  onOpenSettings: () => void;
  sync: CloudSyncController;
}

/** The Google "G" as four quadrants. Cheaper than shipping the SVG logo. */
const GoogleDot = ({ size }: { size: number }) => (
  <span
    className="rounded-full"
    style={{
      width: size,
      height: size,
      background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)',
    }}
  />
);

export function AppHeader({
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  isDarkMode,
  onToggleTheme,
  hasPin,
  onLockClick,
  onNewPrompt,
  onOpenSettings,
  sync,
}: AppHeaderProps) {
  const themeLabel = isDarkMode ? 'Switch to light theme' : 'Switch to dark theme';
  const lockLabel = hasPin ? 'Lock vault' : 'Encrypt vault';

  return (
    <header
      className={`border-b border-vault-border bg-vault-panel/70 backdrop-blur-xl z-10 shrink-0 ${
        isMobile ? 'flex flex-col' : 'h-[72px] flex items-center justify-between px-8'
      }`}
    >
      {isMobile ? (
        /* ─── Mobile Header ─── */
        <>
          {/* Row 1: Menu toggle · Logo · Action buttons */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                id="mobile-menu-toggle"
                onClick={onToggleSidebar}
                aria-label="Toggle sidebar"
                className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent active:scale-95 transition-all"
              >
                {/* Animated hamburger: 3 lines → X when sidebar open */}
                <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? 'rotate-45 translate-y-[6.5px]' : ''
                  }`} />
                <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? 'opacity-0 scale-x-0' : ''
                  }`} />
                <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? '-rotate-45 -translate-y-[6.5px]' : ''
                  }`} />
              </button>

              {/* Brand wordmark */}
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="PromptVault Logo" width="20" height="20" className="w-5 h-5 rounded-md shrink-0 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]" />
                <span className="text-sm font-bold tracking-tight">Prompt<span className="text-vault-accent">Vault</span></span>
              </div>
            </div>

            {/* Right: vault status badge + new + lock */}
            <div className="flex items-center gap-2">
              <div className={`hidden xs:flex items-center gap-1.5 px-2 py-1 rounded-full border ${hasPin ? 'border-emerald-500/20 bg-emerald-500/8' : 'border-amber-500/20 bg-amber-500/8'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                <span className={`text-[9px] font-mono uppercase tracking-widest ${hasPin ? 'text-emerald-400' : 'text-amber-400'}`}>{hasPin ? 'Encrypted' : 'Unprotected'}</span>
              </div>

              {sync.configured && sync.ready ? (
                sync.session ? (
                  <button
                    onClick={sync.signOut}
                    aria-label="Sign out"
                    className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                  </button>
                ) : (
                  <button
                    onClick={sync.signIn}
                    aria-label="Sign in with Google"
                    className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
                  >
                    <GoogleDot size={16} />
                  </button>
                )
              ) : null}

              <button
                id="mobile-new-prompt"
                onClick={onNewPrompt}
                aria-label="New Prompt"
                className="btn-primary flex items-center gap-1.5 h-9 px-3 !py-0 !rounded-lg text-[11px]"
              >
                <Plus size={13} />
                <span>New</span>
              </button>

              <button
                id="mobile-theme-toggle"
                onClick={onToggleTheme}
                aria-label={themeLabel}
                className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button
                id="mobile-lock-toggle"
                onClick={onLockClick}
                aria-label={lockLabel}
                className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
              >
                {hasPin ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
          </div>

          {/* Row 2: Full-width search bar + sort */}
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                id="main-search"
                type="text"
                placeholder="Search prompts..."
                aria-label="Search prompts"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-vault-bg/80 border border-vault-border rounded-xl pl-9 pr-4 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/60"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" size={14} />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-vault-border text-vault-text-muted hover:text-vault-text transition-colors text-[10px] font-bold"
                >×</button>
              )}
            </div>
            <SortControl value={sortBy} onChange={onSortChange} />
          </div>
        </>
      ) : (
        /* ─── Desktop Header ─── */
        <>
          <div className="w-[400px] relative group/search">
            <input
              id="main-search-desktop"
              type="text"
              placeholder="Search prompts..."
              aria-label="Search prompts"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-vault-bg/60 border border-vault-border rounded-xl pl-10 pr-12 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/60"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vault-text-muted group-focus-within/search:text-vault-accent transition-colors" size={14} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 border border-vault-border/60 rounded-md text-[10px] text-vault-text-muted font-mono">⌘K</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Security chip */}
            <div className={hasPin ? 'badge badge-emerald' : 'badge badge-amber'}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span>{hasPin ? 'Encrypted' : 'Unprotected'}</span>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {sync.configured ? (
                sync.ready ? (
                  sync.session ? (
                    <div className="flex items-center gap-2">
                      <div className="badge badge-emerald">
                        <User size={12} />
                        <span>Signed in</span>
                      </div>
                      <button
                        onClick={sync.signOut}
                        className="px-3 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={sync.signIn}
                      className="px-3 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-2"
                    >
                      <GoogleDot size={12} />
                      Sign in
                    </button>
                  )
                ) : (
                  <div className="badge badge-amber">
                    <Cloud size={12} />
                    <span>Checking</span>
                  </div>
                )
              ) : (
                <div className="badge badge-amber">
                  <Cloud size={12} />
                  <span>Sync off</span>
                </div>
              )}
            </div>

            <button
              onClick={onNewPrompt}
              className="btn-primary flex items-center gap-2 !text-[11px]"
            >
              <Plus size={14} />
              New Prompt
            </button>

            <SortControl value={sortBy} onChange={onSortChange} />

            <button
              onClick={onToggleTheme}
              className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30 rounded-xl transition-all"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={onLockClick}
              className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30 rounded-xl transition-all"
              aria-label={lockLabel}
              title={lockLabel}
            >
              {hasPin ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30 rounded-xl transition-all"
              aria-label="Settings"
              title="Vault Protocol Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
