// @vitest-environment jsdom
import {act} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createRoot} from 'react-dom/client';

import {MOBILE_QUERY, isMobileViewport, useMediaQuery} from '../../src/hooks/useMediaQuery.ts';

// React only lets `act` flush effects when it knows it is under test; without this
// it still works but logs "not configured to support act(...)" on every render.
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom ships no `matchMedia`, so these tests install a controllable one. That is
 * also the point of the hook: the previous code read `window.innerWidth` inside an
 * unthrottled `resize` listener, which is untestable without faking layout and
 * re-rendered on every event whether or not the breakpoint had changed.
 */
type Listener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;

  const list = {
    get matches() {
      return matches;
    },
    media: MOBILE_QUERY,
    addEventListener: (_type: 'change', listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: Listener) => listeners.delete(listener),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => list)
  );

  return {
    set(next: boolean) {
      matches = next;
      for (const listener of listeners) listener({matches: next} as MediaQueryListEvent);
    },
    /** Flip without notifying — models a change between render and effect. */
    setSilently(next: boolean) {
      matches = next;
    },
    listenerCount: () => listeners.size,
  };
}

function renderHook<T>(hook: () => T) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const results: T[] = [];

  function Probe() {
    results.push(hook());
    return null;
  }

  act(() => root.render(<Probe />));

  return {
    get current() {
      return results[results.length - 1] as T;
    },
    renderCount: () => results.length,
    unmount: () => act(() => root.unmount()),
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('reports the initial match without waiting for an event', () => {
    installMatchMedia(true);
    const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('updates when the query flips', () => {
    const media = installMatchMedia(false);
    const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(hook.current).toBe(false);

    act(() => media.set(true));
    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('catches a flip that happened between render and subscribe', () => {
    const media = installMatchMedia(false);
    // No event is emitted, so only the re-read inside the effect can see this.
    const hook = renderHook(() => {
      const value = useMediaQuery(MOBILE_QUERY);
      media.setSilently(true);
      return value;
    });

    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('does not re-render when the same value is reported again', () => {
    const media = installMatchMedia(false);
    const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));
    const before = hook.renderCount();

    act(() => media.set(false));
    expect(hook.renderCount()).toBe(before);
    hook.unmount();
  });

  it('unsubscribes on unmount', () => {
    const media = installMatchMedia(false);
    const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(media.listenerCount()).toBe(1);

    hook.unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('reports false where matchMedia is missing instead of throwing', () => {
    vi.stubGlobal('matchMedia', undefined);
    const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(hook.current).toBe(false);
    hook.unmount();
  });
});

describe('isMobileViewport', () => {
  it('reads the breakpoint once', () => {
    installMatchMedia(true);
    expect(isMobileViewport()).toBe(true);
  });

  it('returns false where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(isMobileViewport()).toBe(false);
  });
});
