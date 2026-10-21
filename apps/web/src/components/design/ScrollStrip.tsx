'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FADE = '40px';
const MASKS = {
  none: undefined,
  left: `linear-gradient(to right, transparent, #000 ${FADE})`,
  right: `linear-gradient(to left, transparent, #000 ${FADE})`,
  both: `linear-gradient(to right, transparent, #000 ${FADE}, #000 calc(100% - ${FADE}), transparent)`,
};

// Horizontal strip with edge fades + chevrons whenever more content exists off-screen.
export function ScrollStrip({ children, className = '', innerClassName = '', role, ariaLabel, testId, tone = 'light', activeItemKey }: { children: ReactNode; className?: string; innerClassName?: string; role?: string; ariaLabel?: string; testId?: string; tone?: 'light' | 'dark'; activeItemKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const update = useCallback(() => {
    const el = ref.current;
    if (el) setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [update]);

  // Keep route selections and keyboard focus clear of the existing 44px edge controls.
  // Scroll only the strip, never the page or a hidden desktop navigation.
  const reveal = useCallback((item: HTMLElement | null) => {
    const el = ref.current;
    if (!el || !item || !el.clientWidth) return;
    const box = el.getBoundingClientRect();
    const target = item.getBoundingClientRect();
    const inset = el.scrollWidth > el.clientWidth ? 48 : 0;
    if (target.left < box.left + inset || target.right > box.right - inset) {
      el.scrollLeft += target.left - box.left - (el.clientWidth - target.width) / 2;
    }
  }, []);
  useEffect(() => {
    if (activeItemKey === undefined) return;
    const el = ref.current;
    if (!el) return;
    const selected = () => { reveal(el.querySelector<HTMLElement>('[aria-current="page"]')); update(); };
    selected();
    const ro = new ResizeObserver(selected);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => ro.disconnect();
  }, [activeItemKey, reveal, update]);

  const mask = MASKS[edges.left && edges.right ? 'both' : edges.left ? 'left' : edges.right ? 'right' : 'none'];
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: 'smooth' });
  const chevron = `absolute top-1/2 z-[1] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border shadow-sm transition-opacity ${tone === 'dark' ? 'border-white/25 bg-[#0B1530] text-white' : 'border-border-light bg-surface-white text-brand-ink'}`;

  return (
    <div className={`relative min-w-0 ${className}`} data-testid={testId} data-overflow-left={edges.left} data-overflow-right={edges.right}>
      <div ref={ref} role={role} aria-label={ariaLabel} onFocusCapture={activeItemKey === undefined ? undefined : (event) => reveal(event.target as HTMLElement)} className={`flex overflow-x-auto scroll-smooth motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${innerClassName}`} style={{ maskImage: mask, WebkitMaskImage: mask }}>
        {children}
      </div>
      {edges.left && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => scroll(-1)} className={`${chevron} left-0.5`} data-testid={testId ? `${testId}-scroll-left` : undefined}>
          <ChevronLeft size={16} />
        </button>
      )}
      {edges.right && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => scroll(1)} className={`${chevron} right-0.5`} data-testid={testId ? `${testId}-scroll-right` : undefined}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
