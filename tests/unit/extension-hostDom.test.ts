// @vitest-environment jsdom
/**
 * @project PromptVault (https://github.com/SagarBiswas-MultiHAT)
 * @author Sagar Biswas (@SagarBiswas-MultiHAT) <https://multihat.dev>
 * @copyright Copyright (c) 2026 Sagar Biswas (MultiHAT)
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findActiveInput, injectIntoHostInput } from '../../src/extension/hostDom.ts';

describe('hostDom utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('findActiveInput identifies active textarea and input elements', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    expect(findActiveInput()).toBe(textarea);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    expect(findActiveInput()).toBe(input);
  });

  it('findActiveInput identifies active contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();

    expect(findActiveInput()).toBe(div);
  });

  it('findActiveInput returns null when focused on a non-editable element', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.focus();

    expect(findActiveInput()).toBeNull();
  });

  it('findActiveInput traverses shadowRoot to identify active input', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const shadowInput = document.createElement('input');
    shadow.appendChild(shadowInput);
    shadowInput.focus();

    expect(findActiveInput()).toBe(shadowInput);
  });

  it('injectIntoHostInput inserts text and replaces trailing /pv in textarea', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Please review /pv';
    document.body.appendChild(textarea);
    textarea.focus();

    const inputListener = vi.fn();
    const changeListener = vi.fn();
    textarea.addEventListener('input', inputListener);
    textarea.addEventListener('change', changeListener);

    const success = injectIntoHostInput(textarea, 'my prompt body', null, { start: 17, end: 17 }, true);

    expect(success).toBe(true);
    expect(textarea.value).toBe('Please review my prompt body');
    expect(inputListener).toHaveBeenCalled();
    expect(changeListener).toHaveBeenCalled();
  });

  it('injectIntoHostInput inserts text without replacing when replaceTrigger is false', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'Prefix: ';
    document.body.appendChild(textarea);
    textarea.focus();

    const success = injectIntoHostInput(textarea, 'inserted', null, { start: 8, end: 8 }, false);

    expect(success).toBe(true);
    expect(textarea.value).toBe('Prefix: inserted');
  });

  it('injectIntoHostInput returns false if target is disconnected from DOM', () => {
    const detached = document.createElement('textarea');
    expect(injectIntoHostInput(detached, 'text')).toBe(false);
  });

  it('injectIntoHostInput handles contenteditable insertion fallback', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    div.focus();

    // In jsdom document.execCommand returns false, exercising DOM Range fallback
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const success = injectIntoHostInput(div, 'Rich prompt text', range, null, false);
    expect(success).toBe(true);
    expect(div.textContent).toContain('Rich prompt text');
  });
});
