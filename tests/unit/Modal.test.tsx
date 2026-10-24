// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { Modal } from '../../src/components/Modal.tsx';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal component', () => {
  let host: HTMLDivElement;
  let shadowRoot: ShadowRoot;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    shadowRoot = host.attachShadow({ mode: 'open' });
    container = document.createElement('div');
    shadowRoot.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    vi.restoreAllMocks();
  });

  it('restores opener focus on document when modal closes', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open Modal';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    let isOpen = true;
    const onClose = vi.fn(() => {
      isOpen = false;
    });

    await act(async () => {
      root.render(
        <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
          <button id="modal-btn">Inside</button>
        </Modal>
      );
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Close the modal
    await act(async () => {
      root.render(
        <Modal isOpen={false} onClose={onClose} title="Test Modal">
          <button id="modal-btn">Inside</button>
        </Modal>
      );
    });

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('traps focus using active element inside Shadow DOM', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <Modal isOpen={true} onClose={onClose} title="Shadow Modal">
          <div>
            <button id="btn-1">First Button</button>
            <button id="btn-2">Last Button</button>
          </div>
        </Modal>
      );
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();

    const lastButton = container.querySelector('#btn-2') as HTMLButtonElement;
    const firstButton = container.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    lastButton.focus();
    expect(shadowRoot.activeElement).toBe(lastButton);

    // Tab key on last button wraps to first focusable element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(tabEvent);

    expect(onClose).not.toHaveBeenCalled();
    expect(shadowRoot.activeElement).toBe(firstButton);
  });
});
