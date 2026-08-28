/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Load a module during idle time, after first paint.
 *
 * `App.tsx` carried this block twice — once for `motion/react`, once for
 * `utils/supabase.ts` — character for character apart from the import specifier
 * and the setter. Both copies had to get the cancellation right, and only one of
 * them would have been fixed if the pattern needed changing.
 */

import { useEffect, useState } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Returns `null` until the module resolves.
 *
 * `load` is called once on mount and is deliberately *not* a dependency: it is
 * an inline arrow at every call site, so a new identity on every render would
 * re-import forever. The specifier inside it is static, which is what lets the
 * bundler split the chunk in the first place.
 *
 * Safari has no `requestIdleCallback`, hence the `setTimeout(0)` fallback — later
 * than idle scheduling would be under load, but still after the current paint.
 */
export function useIdleModule<T>(load: () => Promise<T>, delayMs = 1200): T | null {
  const [module, setModule] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | null = null;
    const idleWindow = window as IdleWindow;

    const run = () => {
      load().then((mod) => {
        // The import cannot be aborted, so cancellation can only be enforced here.
        // Without this, a module resolving after unmount sets state on a dead tree.
        if (!cancelled) setModule(mod);
      });
    };

    const schedule = () => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(run, { timeout: 3000 });
      } else {
        run();
      }
    };

    const timerId = window.setTimeout(schedule, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs]);

  return module;
}
