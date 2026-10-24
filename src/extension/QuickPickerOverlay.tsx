/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Prompt } from '../types.ts';
import { Search, Sparkles, Lock, X } from 'lucide-react';
import { extractVariables } from '../utils/vault.ts';

interface QuickPickerOverlayProps {
  prompts: Prompt[];
  isLocked: boolean;
  onSelectPrompt: (prompt: Prompt) => void;
  onClose: () => void;
}

export function QuickPickerOverlay({
  prompts,
  isLocked,
  onSelectPrompt,
  onClose,
}: QuickPickerOverlayProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredPrompts = useMemo(() => {
    if (!search.trim()) {
      return prompts.filter((p) => p.deletedAt === null);
    }
    const q = search.toLowerCase();
    return prompts.filter(
      (p) =>
        p.deletedAt === null &&
        (((p.title || '').toLowerCase().includes(q)) ||
          ((p.body || '').toLowerCase().includes(q)) ||
          ((p.tags || []).some((t) => (t || '').toLowerCase().includes(q))))
    );
  }, [prompts, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPrompts.length > 0 ? (prev + 1) % filteredPrompts.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredPrompts.length > 0 ? (prev - 1 + filteredPrompts.length) % filteredPrompts.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPrompts[selectedIndex]) {
        onSelectPrompt(filteredPrompts[selectedIndex]);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-[#0B0C0E] rounded-2xl shadow-2xl shadow-black/90 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150"
        style={{ border: '1px solid rgba(255, 255, 255, 0.95)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-[#0B0C0E]"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.95)' }}
        >
          <Search size={18} className="text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isLocked ? 'Vault is locked...' : 'Search prompts by title, body, or tag...'}
            disabled={isLocked}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-400 font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div ref={listRef} className="overflow-y-auto max-h-[55vh] p-2 space-y-1">
          {isLocked ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-amber-500"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <Lock size={22} />
              </div>
              <h3 className="text-sm font-semibold text-white">PromptVault is Locked</h3>
              <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
                Click the PromptVault icon in your browser toolbar to unlock your vault with your PIN or passphrase.
              </p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              {prompts.length === 0
                ? 'No prompts saved yet. Create your first prompt in the PromptVault popup!'
                : 'No prompts match your search query.'}
            </div>
          ) : (
            filteredPrompts.map((prompt, idx) => {
              const isSelected = idx === selectedIndex;
              const promptBody = prompt.body || '';
              const vars = extractVariables(promptBody);
              return (
                <div
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 ${
                    isSelected ? 'shadow-sm' : 'hover:bg-white/5'
                  }`}
                  style={
                    isSelected
                      ? {
                          border: '1px solid rgba(245, 158, 11, 0.85)',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        }
                      : {
                          border: '1px solid transparent',
                        }
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {prompt.title || 'Untitled Prompt'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {vars.length > 0 && (
                        <span
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-amber-400 text-[10px] font-mono font-medium"
                          style={{
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          }}
                        >
                          <Sparkles size={10} />
                          {vars.length} {vars.length === 1 ? 'var' : 'vars'}
                        </span>
                      )}
                      {prompt.usageCount > 0 && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {prompt.usageCount}x
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                    {promptBody}
                  </p>

                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {prompt.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                          style={{
                            border: '1px solid rgba(255, 255, 255, 0.9)',
                            backgroundColor: 'transparent',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 bg-[#0B0C0E] flex items-center justify-between text-[11px] text-zinc-300"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.95)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded text-white font-mono text-[9px]"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  backgroundColor: 'transparent',
                }}
              >
                ↑
              </kbd>
              <kbd
                className="px-1.5 py-0.5 rounded text-white font-mono text-[9px]"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  backgroundColor: 'transparent',
                }}
              >
                ↓
              </kbd>
              <span className="text-zinc-200 ml-0.5">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded text-white font-mono text-[9px]"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  backgroundColor: 'transparent',
                }}
              >
                Enter
              </kbd>
              <span className="text-zinc-200 ml-0.5">Insert</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded text-white font-mono text-[9px]"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  backgroundColor: 'transparent',
                }}
              >
                Esc
              </kbd>
              <span className="text-zinc-200 ml-0.5">Close</span>
            </span>
          </div>
          <span className="text-[10px] text-zinc-300 font-mono">
            {filteredPrompts.length} of {prompts.length}
          </span>
        </div>
      </div>
    </div>
  );
}
