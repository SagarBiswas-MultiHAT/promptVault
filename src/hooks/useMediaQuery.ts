/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Replaces the two independent `resize` listeners that `App` and `Sidebar` each
 * ran. Those were wrong in three ways: they fired on *every* resize event
 * (unthrottled, so a window drag re-rendered the whole tree per frame), they
 * re-rendered even when the boolean had not changed, and having two copies meant
 * the breakpoint could be edited in one place and not the other.
 *
 * `matchMedia` fires only when the match actually flips, which is the event
 * anyone laying out a page cares about.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // `matchMedia` is missing in non-browser environments (SSR, some test DOMs).
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Re-read on subscribe: the query may have flipped between the initial
    // render and this effect, and that change produced no event to catch.
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * The app's single mobile breakpoint.
 *
 * `max-width: 768px` reproduces the previous `window.innerWidth <= 768` exactly,
 * so no layout shifts as part of this change.
 */
export const MOBILE_QUERY = '(max-width: 768px)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/**
 * One-shot read, for `useState` initializers that need a starting value but then
 * own the state themselves (e.g. a sidebar the user can collapse independently of
 * the viewport). Prefer `useIsMobile` anywhere the value should stay live.
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}
