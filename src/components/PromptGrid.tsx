/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The prompt grid and the empty state that replaces it.
 *
 * Both are statically imported by `App`, but `PromptCard` is lazy *inside* the
 * grid. That split is deliberate: making the grid itself lazy would mean an empty
 * vault flashes a three-card skeleton on load before deciding it has nothing to
 * show, whereas today it goes straight to the empty state. The card chunk is only
 * requested when there is at least one card to render.
 */

import { Suspense, lazy, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Briefcase, Plus, Search } from 'lucide-react';

import type { MotionKit } from '../hooks/useMotion.ts';
import { Prompt } from '../types.ts';

const PromptCard = lazy(() => import('./PromptCard.tsx').then(m => ({ default: m.PromptCard })));
const VIRTUALIZE_AFTER = 200;
const CARD_HEIGHT = 256;
const GRID_GAP = 20;
const ROW_HEIGHT = CARD_HEIGHT + GRID_GAP;
const OVERSCAN_ROWS = 2;

const gridFallback = (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="h-64 rounded-2xl border border-vault-border bg-vault-panel/50" />
    ))}
  </div>
);

export interface PromptGridProps {
  prompts: Prompt[];
  scrollContainerRef: RefObject<HTMLElement | null>;
  onCopy: (prompt: Prompt) => Promise<boolean>;
  onToggleFavorite: (id: string) => void;
  onSelect: (prompt: Prompt) => void;
}

function columnCountForWidth(width: number) {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

export function PromptGrid({ prompts, scrollContainerRef, onCopy, onToggleFavorite, onSelect }: PromptGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, scrollTop: 0, gridTop: 0 });
  const isVirtualized = prompts.length > VIRTUALIZE_AFTER;
  const columns = columnCountForWidth(viewport.width);
  const rowCount = Math.ceil(prompts.length / columns);
  const totalHeight = rowCount === 0 ? 0 : (rowCount * CARD_HEIGHT) + ((rowCount - 1) * GRID_GAP);

  useEffect(() => {
    if (!isVirtualized) return;
    const grid = gridRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!grid || !scrollContainer) return;

    const measure = () => {
      const gridRect = grid.getBoundingClientRect();
      const scrollRect = scrollContainer.getBoundingClientRect();
      setViewport({
        width: grid.clientWidth,
        height: scrollContainer.clientHeight,
        scrollTop: scrollContainer.scrollTop,
        gridTop: gridRect.top - scrollRect.top + scrollContainer.scrollTop,
      });
    };

    measure();
    scrollContainer.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(grid);
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      resizeObserver.disconnect();
    };
  }, [isVirtualized, scrollContainerRef]);

  const visibleRange = useMemo(() => {
    if (!isVirtualized) return { startIndex: 0, endIndex: prompts.length, offsetY: 0 };
    const viewportStart = Math.max(0, viewport.scrollTop - viewport.gridTop);
    const viewportEnd = viewportStart + viewport.height;
    const startRow = Math.max(0, Math.floor(viewportStart / ROW_HEIGHT) - OVERSCAN_ROWS);
    const endRow = Math.min(rowCount - 1, Math.ceil(viewportEnd / ROW_HEIGHT) + OVERSCAN_ROWS);

    return {
      startIndex: startRow * columns,
      endIndex: Math.min(prompts.length, (endRow + 1) * columns),
      offsetY: startRow * ROW_HEIGHT,
    };
  }, [columns, isVirtualized, prompts.length, rowCount, viewport.gridTop, viewport.height, viewport.scrollTop]);

  const visiblePrompts = isVirtualized ? prompts.slice(visibleRange.startIndex, visibleRange.endIndex) : prompts;
  const cards = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {visiblePrompts.map(prompt => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onCopy={onCopy}
          onToggleFavorite={onToggleFavorite}
          onClick={onSelect}
          enableLayout={!isVirtualized}
        />
      ))}
    </div>
  );

  if (isVirtualized) {
    return (
      <div ref={gridRef} className="relative" style={{ height: totalHeight }}>
        <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${visibleRange.offsetY}px)` }}>
          <Suspense fallback={gridFallback}>{cards}</Suspense>
        </div>
      </div>
    );
  }

  return (
    <div ref={gridRef}>
      <Suspense fallback={gridFallback}>
        {cards}
      </Suspense>
    </div>
  );
}

export interface EmptyStateProps {
  /** Non-empty when the emptiness is a search miss rather than an empty vault. */
  searchQuery: string;
  onClearSearch: () => void;
  onCreate: () => void;
  motion: MotionKit;
}

export function EmptyState({ searchQuery, onClearSearch, onCreate, motion }: EmptyStateProps) {
  const MotionDiv = motion.Div;

  return (
    <MotionDiv
      {...motion.fadeUp}
      className="flex flex-1 flex-col items-center justify-center space-y-6 md:space-y-8"
    >
      {/* Animated geometric illustration */}
      <div className="relative w-24 h-24 md:w-32 md:h-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border border-vault-border bg-vault-panel/50 flex items-center justify-center geo-float">
            {searchQuery ? <Search size={32} className="text-vault-text-muted/30" /> : <Briefcase size={32} className="text-vault-text-muted/30" />}
          </div>
        </div>
        <div className="absolute top-0 right-2 w-5 h-5 md:w-6 md:h-6 rounded-lg border border-vault-accent/20 bg-vault-accent/5 geo-float-delay" />
        <div className="absolute bottom-2 left-0 w-3 h-3 md:w-4 md:h-4 rounded-md border border-vault-accent-blue/20 bg-vault-accent-blue/5 geo-float-delay-2" />
        <div className="absolute top-4 left-3 w-3 h-3 rounded-full border border-emerald-500/20 bg-emerald-500/5 geo-float-delay" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold tracking-tight">{searchQuery ? 'No Results Found' : 'Start Your Collection'}</h3>
        <p className="text-sm text-vault-text-muted max-w-sm leading-relaxed">{searchQuery ? `No prompts match "${searchQuery}". Try different terms or browse categories.` : 'Your prompt library is empty. Add your first prompt to begin building your vault.'}</p>
      </div>
      <button
        onClick={() => (searchQuery ? onClearSearch() : onCreate())}
        className="btn-primary flex items-center gap-2 !rounded-full !px-8"
      >
        {searchQuery ? 'Clear Search' : <><Plus size={14} /> Add First Prompt</>}
      </button>
    </MotionDiv>
  );
}
