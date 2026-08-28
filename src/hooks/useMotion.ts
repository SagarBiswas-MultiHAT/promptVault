/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `motion/react`, loaded after first paint.
 *
 * The animation library is ~30 kB of the initial bundle it does not need to be in,
 * so it arrives during idle time and every consumer renders a plain element until
 * it does. That is why `Div` is an `ElementType` rather than a motion component:
 * before the module lands it is the string `'div'`, and the animation props are
 * withheld so React does not receive `initial`/`animate` on a real DOM node.
 */

import { useIdleModule } from './useLazyModule.ts';

export type MotionModule = typeof import('motion/react');

export interface MotionKit {
  ready: boolean;
  /** `motion.div` once loaded, the string `'div'` before that. */
  Div: React.ElementType;
  /** `motion.span`, or `null` before the module lands. */
  Span: MotionModule['motion']['span'] | null;
  /**
   * Spread onto `Div`. Empty until the module is ready, because a plain `<div>`
   * would forward `initial`/`animate`/`transition` straight to the DOM.
   */
  fadeUp: Record<string, unknown>;
}

export function useMotion(): MotionKit {
  const mod = useIdleModule<MotionModule>(() => import('motion/react'), 800);
  const ready = Boolean(mod);

  return {
    ready,
    Div: ready ? mod!.motion.div : 'div',
    Span: mod?.motion.span ?? null,
    fadeUp: ready
      ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }
      : {},
  };
}
