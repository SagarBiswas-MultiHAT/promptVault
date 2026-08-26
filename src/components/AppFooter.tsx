/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The status bar. Two layouts, same reason as the header.
 *
 * The save indicator is animated when `motion` has loaded and a plain `<span>`
 * before that, so the footer renders identically on the first paint either way.
 * The `key` flip is what makes the animation replay on each save rather than only
 * on mount.
 */

import { Settings } from 'lucide-react';

import { SCHEMA_VERSION } from '../constants.ts';
import type { MotionKit } from '../hooks/useMotion.ts';

export interface AppFooterProps {
  isMobile: boolean;
  isSaved: boolean;
  promptCount: number;
  isEncrypted: boolean;
  onOpenSettings: () => void;
  motion: MotionKit;
}

export function AppFooter({ isMobile, isSaved, promptCount, isEncrypted, onOpenSettings, motion }: AppFooterProps) {
  const MotionSpan = motion.Span;

  if (isMobile) {
    const mobileClassName = `text-[9px] font-mono uppercase tracking-widest ${
      isSaved ? 'text-emerald-400' : 'text-vault-text-muted'
    }`;
    const mobileLabel = isSaved ? '✓ Saved' : `v${SCHEMA_VERSION}`;

    return (
      /* ─── Mobile Footer: compact bottom action bar ─── */
      <footer className="border-t border-vault-border bg-vault-panel/95 backdrop-blur-sm shrink-0 px-4 py-2 flex items-center justify-between">
        {/* Left: save indicator + schema */}
        <div className="flex items-center gap-2">
          <span aria-live="polite" aria-atomic="true">
            {MotionSpan ? (
              <MotionSpan
                key={isSaved ? 'saved' : 'idle'}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className={mobileClassName}
              >
                {mobileLabel}
              </MotionSpan>
            ) : (
              <span className={mobileClassName}>{mobileLabel}</span>
            )}
          </span>
          <span className="text-vault-border">·</span>
          <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Offline</span>
        </div>

        {/* Center: prompt count pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vault-panel-bright border border-vault-border">
          <span className="text-[10px] font-mono font-bold text-vault-accent">{promptCount}</span>
          <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-wider">prompts</span>
        </div>

        {/* Right: settings shortcut */}
        <button
          id="mobile-settings-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-accent transition-colors"
        >
          <Settings size={13} />
          <span className="text-[9px] font-mono uppercase tracking-widest">Settings</span>
        </button>
      </footer>
    );
  }

  const desktopLabel = isSaved ? '✓ Saved' : 'Offline-First';
  const desktopClassName = isSaved ? 'text-emerald-400/80' : '';

  return (
    /* ─── Desktop Footer ─── */
    <footer className="h-10 shrink-0 relative">
      <div className="divider-glow" />
      <div className="h-full px-8 flex items-center justify-between text-[10px] font-mono text-vault-text-muted uppercase tracking-widest bg-vault-panel/50">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-vault-text-muted">PromptVault</span>
          <span className="text-vault-border">·</span>
          <span>v{SCHEMA_VERSION}</span>
        </div>
        <div className="flex items-center gap-3">
          <span aria-live="polite" aria-atomic="true">
            {MotionSpan ? (
              <MotionSpan
                key={isSaved ? 'saved' : 'idle'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={desktopClassName}
              >
                {desktopLabel}
              </MotionSpan>
            ) : (
              <span className={desktopClassName}>{desktopLabel}</span>
            )}
          </span>
          <span className="text-vault-border">·</span>
          <span>{isEncrypted ? 'AES-GCM encrypted' : 'Local storage'}</span>
        </div>
      </div>
    </footer>
  );
}
