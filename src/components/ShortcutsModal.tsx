/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'lucide-react';

import { Modal } from './Modal.tsx';

const SHORTCUTS: { label: string; keys: string[]; uppercase?: boolean }[] = [
  { label: 'Spotlight Search', keys: ['⌘', 'K'] },
  { label: 'New Entry', keys: ['⌘', 'N'] },
  { label: 'Close Interface', keys: ['Esc'], uppercase: true },
  { label: 'Toggle Manual', keys: ['?'] },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Protocol Shortcuts">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3">
          {SHORTCUTS.map(({ label, keys, uppercase }) => (
            <div
              key={label}
              className="flex items-center justify-between p-4 bg-vault-bg border border-vault-border rounded-xl"
            >
              <span className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">{label}</span>
              <div className="flex gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className={`px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm${uppercase ? ' uppercase' : ''}`}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 p-4 bg-vault-accent/10 border border-vault-accent/20 rounded-xl">
          <Command size={18} className="text-vault-accent" />
          <p className="text-[10px] font-mono text-vault-text-muted uppercase leading-relaxed">System-wide hotkeys active while vault is decrypted.</p>
        </div>
      </div>
    </Modal>
  );
}
