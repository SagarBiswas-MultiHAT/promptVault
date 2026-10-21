// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { PinLock } from '../../src/components/PinLock.tsx';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement | undefined | null, value: string) {
  if (!input) throw new Error('Input element not found');
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('PinLock Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('defaults to passphrase mode when creating a new vault protection', () => {
    act(() => {
      root.render(
        <PinLock
          mode="create"
          onSubmit={vi.fn()}
        />
      );
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    expect(container.textContent).toContain('Passphrase (Recommended)');
    expect(container.textContent).toContain('Numeric PIN (6+ Digits)');

    const labels = container.querySelectorAll('label');
    expect(labels[0]?.textContent).toContain('Passphrase');
    expect(labels[1]?.textContent).toContain('Confirm Passphrase');
  });

  it('enforces 15 character minimum and match validation for passphrases on creation', async () => {
    const onSubmit = vi.fn();
    act(() => {
      root.render(<PinLock mode="create" onSubmit={onSubmit} />);
    });

    const inputs = container.querySelectorAll('input');
    const form = container.querySelector('form')!;

    // Short passphrase
    act(() => {
      setInputValue(inputs[0], 'short');
      setInputValue(inputs[1], 'short');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Passphrase must be at least 15 characters.');
    expect(onSubmit).not.toHaveBeenCalled();

    // Mismatched passphrase
    act(() => {
      setInputValue(inputs[0], 'a-very-long-passphrase-entry-1');
      setInputValue(inputs[1], 'a-very-long-passphrase-entry-2');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('The two entries do not match.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enforces minimum 6 digits for numeric PIN on creation', async () => {
    const onSubmit = vi.fn();
    act(() => {
      root.render(<PinLock mode="create" onSubmit={onSubmit} />);
    });

    // Switch to Numeric PIN tab
    const pinTabButton = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes('Numeric PIN')
    );
    expect(pinTabButton).toBeDefined();

    act(() => {
      pinTabButton!.click();
    });

    const inputs = container.querySelectorAll('input');
    const form = container.querySelector('form')!;

    // Try a 4-digit PIN (legacy length, forbidden for new vaults)
    act(() => {
      setInputValue(inputs[0], '1234');
      setInputValue(inputs[1], '1234');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('PIN must be at least 6 digits.');
    expect(onSubmit).not.toHaveBeenCalled();

    // Try non-numeric characters
    act(() => {
      setInputValue(inputs[0], '1234ab');
      setInputValue(inputs[1], '1234ab');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('PIN must contain only numbers.');
    expect(onSubmit).not.toHaveBeenCalled();

    // 6-digit numeric PIN succeeds
    onSubmit.mockResolvedValueOnce({ recoveryKey: 'a'.repeat(64) });
    await act(async () => {
      setInputValue(inputs[0], '123456');
      setInputValue(inputs[1], '123456');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSubmit).toHaveBeenCalledWith('123456', 'pin');
  });

  it('allows 4-digit PIN unlock for legacy vault backward compatibility', async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce(true);
    act(() => {
      root.render(<PinLock mode="unlock" secretMode="pin" onSubmit={onSubmit} />);
    });

    const input = container.querySelector('input')!;
    const form = container.querySelector('form')!;

    await act(async () => {
      setInputValue(input, '1234');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(onSubmit).toHaveBeenCalledWith('1234', 'pin');
  });

  it('applies progressive cooldown delays after consecutive failed unlock attempts', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValue(false);

    act(() => {
      root.render(<PinLock mode="unlock" secretMode="pin" onSubmit={onSubmit} />);
    });

    const input = container.querySelector('input')!;
    const form = container.querySelector('form')!;
    const submitBtn = container.querySelector('button[type="submit"], button.btn-primary') as HTMLButtonElement;

    // Failure 1
    await act(async () => {
      setInputValue(input, '000000');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain('Incorrect pin.');
    expect(submitBtn.disabled).toBe(false);

    // Failure 2
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain('Incorrect pin.');
    expect(submitBtn.disabled).toBe(false);

    // Failure 3: Triggers cooldown delay
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain('Too many failed attempts. Please wait 2s before trying again.');
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain('Wait 2s…');

    // Attempting submit during cooldown is blocked
    const callsBefore = onSubmit.mock.calls.length;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSubmit.mock.calls.length).toBe(callsBefore);

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(submitBtn.textContent).toContain('Wait 1s…');
    expect(submitBtn.disabled).toBe(true);

    // Advance remaining 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent).toBe('Unlock');

    vi.useRealTimers();
  });
});
