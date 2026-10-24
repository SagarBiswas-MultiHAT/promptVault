/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

export interface InputSelectionRange {
  start: number;
  end: number;
}

export function findActiveInput(): HTMLElement | null {
  let active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    return active;
  }
  if (active instanceof HTMLElement && (active.isContentEditable || active.getAttribute('contenteditable') === 'true')) {
    return active;
  }
  return null;
}

export function injectIntoHostInput(
  target: HTMLElement,
  text: string,
  savedRange: Range | null = null,
  savedInputSelection: InputSelectionRange | null = null,
  replaceTrigger = true
): boolean {
  if (!target.isConnected) {
    return false;
  }

  target.focus();

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const rawStart = savedInputSelection?.start ?? target.selectionStart ?? target.value.length;
    const rawEnd = savedInputSelection?.end ?? target.selectionEnd ?? target.value.length;
    const start = Math.max(0, Math.min(rawStart, target.value.length));
    const end = Math.max(start, Math.min(rawEnd, target.value.length));

    let before = target.value.slice(0, start);
    const after = target.value.slice(end);

    if (replaceTrigger && before.endsWith('/pv')) {
      before = before.slice(0, -3);
    }

    const nextVal = `${before}${text}${after}`;
    const proto = target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(target, nextVal);
    } else {
      target.value = nextVal;
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    const newCursorPos = before.length + text.length;
    target.selectionStart = newCursorPos;
    target.selectionEnd = newCursorPos;
    return true;
  }

  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    const selection = window.getSelection();
    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    if (replaceTrigger && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const textBefore = node.textContent.slice(0, range.startOffset);
        const idx = textBefore.lastIndexOf('/pv');
        if (idx !== -1) {
          range.setStart(node, idx);
          range.setEnd(node, idx + 3);
          range.deleteContents();
        }
      }
    }

    const success = typeof document.execCommand === 'function' ? document.execCommand('insertText', false, text) : false;
    if (success) {
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // Standard DOM Range fallback
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      target.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }

  return false;
}
