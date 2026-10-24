/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { RotateCcw } from 'lucide-react';
import extensionStyles from '../index.css?inline';
import { findActiveInput, injectIntoHostInput, type InputSelectionRange } from './hostDom.ts';
import { QuickPickerOverlay } from './QuickPickerOverlay.tsx';
import { VariableForm } from '../components/VariableForm.tsx';
import { extractVariables } from '../utils/vault.ts';
import type { Prompt } from '../types.ts';

function isExtensionValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function ContentScriptApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInvalidated, setIsInvalidated] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [activePromptForVars, setActivePromptForVars] = useState<Prompt | null>(null);
  const [replaceTrigger, setReplaceTrigger] = useState(false);

  const targetInputRef = useRef<HTMLElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const savedInputSelectionRef = useRef<InputSelectionRange | null>(null);
  const isOpenRef = useRef(false);
  isOpenRef.current = isOpen;

  const openPicker = (fromTriggerKeyword = false) => {
    if (!isExtensionValid()) {
      setIsInvalidated(true);
      setIsOpen(true);
      return;
    }

    const active = findActiveInput();
    targetInputRef.current = active;

    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

    if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
      savedInputSelectionRef.current = {
        start: active.selectionStart ?? active.value.length,
        end: active.selectionEnd ?? active.value.length,
      };
    } else {
      savedInputSelectionRef.current = null;
    }

    setReplaceTrigger(fromTriggerKeyword);
    setActivePromptForVars(null);

    try {
      if (!isExtensionValid()) {
        setIsInvalidated(true);
        setIsOpen(true);
        return;
      }

      chrome.runtime.sendMessage(
        { type: 'PV_GET_PROMPTS' },
        (res: { prompts?: Prompt[]; locked?: boolean } | undefined) => {
          try {
            let hasError = false;
            try {
              hasError = !isExtensionValid() || Boolean(chrome.runtime?.lastError);
            } catch {
              hasError = true;
            }

            if (hasError || !res) {
              setPrompts([]);
              setIsLocked(false);
            } else {
              setPrompts(Array.isArray(res.prompts) ? res.prompts : []);
              setIsLocked(Boolean(res.locked));
            }
            setIsOpen(true);
          } catch {
            setIsInvalidated(true);
            setIsOpen(true);
          }
        }
      );
    } catch {
      setIsInvalidated(true);
      setIsOpen(true);
    }
  };

  const closePicker = () => {
    setIsOpen(false);
    setIsInvalidated(false);
    setActivePromptForVars(null);
    if (targetInputRef.current && targetInputRef.current.isConnected) {
      targetInputRef.current.focus();
    }
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    const promptBody = prompt.body || '';
    const vars = extractVariables(promptBody);
    if (vars.length > 0) {
      setActivePromptForVars(prompt);
      return;
    }
    executeInjection(prompt, promptBody);
  };

  const executeInjection = (prompt: Prompt, textToInject: string) => {
    const target = targetInputRef.current;
    if (target && target.isConnected) {
      injectIntoHostInput(
        target,
        textToInject,
        savedRangeRef.current,
        savedInputSelectionRef.current,
        replaceTrigger
      );
    }

    // Optional clipboard copy
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToInject).catch(() => {
        // Content script clipboard permissions may vary by site
      });
    }

    // Record prompt usage in background worker
    try {
      if (isExtensionValid()) {
        chrome.runtime.sendMessage({ type: 'PV_RECORD_USAGE', promptId: prompt.id }, () => {
          try {
            void chrome.runtime?.lastError;
          } catch {
            // Ignore context invalidation
          }
        });
      }
    } catch {
      // Extension context invalidated, safe ignore
    }

    closePicker();
  };

  // Keyboard shortcut listener and trigger keyword detection
  useEffect(() => {
    const handleMessage = (msg: { type: string }) => {
      if (!isExtensionValid()) return;
      if (msg.type === 'PV_TOGGLE_PICKER') {
        if (isOpenRef.current) {
          closePicker();
        } else {
          openPicker(false);
        }
      }
    };

    try {
      if (isExtensionValid()) {
        chrome.runtime.onMessage.addListener(handleMessage);
      }
    } catch {
      // Context already invalidated
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if (e.altKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          e.stopPropagation();
          if (isOpenRef.current) {
            closePicker();
          } else {
            openPicker(false);
          }
        }
      } catch {
        // Safe ignore
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);

    const handleKeyUp = (e: KeyboardEvent) => {
      try {
        if (isOpenRef.current) return;
        if (e.key === 'p' || e.key === 'v' || e.key === '/') {
          const active = findActiveInput();
          if (!active) return;

          let textBeforeCursor = '';
          if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
            const pos = active.selectionStart ?? active.value.length;
            textBeforeCursor = active.value.slice(0, pos);
          } else if (active.isContentEditable || active.getAttribute('contenteditable') === 'true') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              if (range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.textContent) {
                textBeforeCursor = range.startContainer.textContent.slice(0, range.startOffset);
              }
            }
          }

          if (textBeforeCursor.endsWith('/pv')) {
            openPicker(true);
          }
        }
      } catch {
        // Safe ignore
      }
    };

    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      try {
        if (isExtensionValid()) {
          chrome.runtime.onMessage.removeListener(handleMessage);
        }
      } catch {
        // Safe ignore
      }
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, []);

  if (!isOpen) return null;

  if (isInvalidated) {
    return (
      <div
        className="fixed inset-0 z-[2147483647] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePicker();
        }}
      >
        <div
          className="bg-[#0B0C0E] rounded-2xl shadow-2xl shadow-black/90 w-full max-w-md p-6 text-white animate-in fade-in zoom-in-95 duration-150 text-center space-y-4"
          style={{ border: '1px solid rgba(255, 255, 255, 0.95)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-amber-500 mx-auto"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <RotateCcw size={22} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white">
              Extension Reloaded
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              PromptVault was reloaded in your browser. Please refresh this page to reconnect the quick picker.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={closePicker}
              className="flex-1 px-4 py-2 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ border: '1px solid rgba(255, 255, 255, 0.4)' }}
            >
              Dismiss
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-xs transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePromptForVars) {
    const vars = extractVariables(activePromptForVars.body);
    return (
      <div
        className="fixed inset-0 z-[2147483647] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePicker();
        }}
      >
        <div
          className="bg-[#0B0C0E] rounded-2xl shadow-2xl shadow-black/90 w-full max-w-lg p-6 text-white animate-in fade-in zoom-in-95 duration-150"
          style={{ border: '1px solid rgba(255, 255, 255, 0.95)' }}
        >
          <div
            className="flex items-center justify-between pb-4 mb-4"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.95)' }}
          >
            <h3 className="text-sm font-semibold text-white truncate">
              Fill Variables: {activePromptForVars.title}
            </h3>
            <button
              onClick={closePicker}
              className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <VariableForm
            prompt={activePromptForVars}
            variables={vars}
            onCopy={(substitutedText) => executeInjection(activePromptForVars, substitutedText)}
            onCancel={() => setActivePromptForVars(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <QuickPickerOverlay
      prompts={prompts}
      isLocked={isLocked}
      onSelectPrompt={handleSelectPrompt}
      onClose={closePicker}
    />
  );
}

function initContentScript() {
  const existing = document.getElementById('promptvault-extension-root');
  if (existing) return;

  const host = document.createElement('div');
  host.id = 'promptvault-extension-root';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    :host {
      all: initial;
      display: block;
      position: relative;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #FFFFFF;
      --tw-border-style: solid;
      --v-bg: #08090A;
      --v-panel: #111214;
      --v-panel-bright: #1A1C20;
      --v-border: rgba(255, 255, 255, 0.95);
      --v-text: #FFFFFF;
      --v-muted: #D1D5DB;
      --color-vault-accent: #f59e0b;
      --color-vault-border: rgba(255, 255, 255, 0.95);
      --color-vault-card: #111214;
      --color-vault-text: #FFFFFF;
      --color-vault-text-muted: #D1D5DB;
      --color-vault-bg: #08090A;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      border-style: solid;
    }
    input, button, textarea {
      font-family: inherit;
    }
  ` + extensionStyles;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.id = 'promptvault-shadow-container';
  container.style.color = '#FFFFFF';
  shadow.appendChild(container);

  createRoot(container).render(<ContentScriptApp />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
