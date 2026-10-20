'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { ScrollStrip } from './ScrollStrip';

export type DataState = 'populated' | 'loading' | 'empty' | 'error';
interface PreviewCtx { dataState: DataState; setDataState: (s: DataState) => void; notify: (msg: string) => void }

const Ctx = createContext<PreviewCtx | null>(null);
export function usePreview(): PreviewCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePreview must be used inside PreviewProvider');
  return ctx;
}

const SCREENS: [string, string][] = [
  ['/design-preview', 'Direction'],
  ['/design-preview/platform', 'Platform'],
  ['/design-preview/center', 'Center'],
  ['/design-preview/therapist', 'Therapist'],
  ['/design-preview/child', 'Child profile'],
  ['/design-preview/family', 'Family'],
];

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [dataState, setDataState] = useState<DataState>('populated');
  const [notice, setNotice] = useState<string | null>(null);
  const path = usePathname();

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(id);
  }, [notice]);

  const select = 'min-h-[32px] max-w-[150px] rounded-[8px] border border-white/20 bg-white/10 px-2 text-[12px] text-white';

  return (
    <Ctx.Provider value={{ dataState, setDataState, notify: setNotice }}>
      <div>
        <div className="bg-[#0B1530] text-white [--focus-ring:#7DB3E8]" data-testid="preview-bar">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#FFD991]" data-testid="preview-synthetic-label">
              <FlaskConical size={14} aria-hidden="true" /> Design preview · Synthetic fixture data · Not connected to the API
            </span>
            <nav aria-label="Preview screens" className="min-w-0 max-w-full">
              <ScrollStrip tone="dark" innerClassName="gap-1" testId="preview-screens">
              {SCREENS.map(([href, label]) => (
                <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} data-testid={`preview-link-${label.toLowerCase().replace(' ', '-')}`}
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 transition-colors ${path === href ? 'bg-white/20 font-semibold' : 'text-white/80 hover:bg-white/10'}`}>
                  {label}
                </Link>
              ))}
              </ScrollStrip>
            </nav>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:ml-auto">
              <label className="flex items-center gap-1.5 text-white/80">
                Data
                <select className={select} value={dataState} onChange={(e) => setDataState(e.target.value as DataState)} data-testid="preview-data-state">
                  <option className="text-brand-ink" value="populated">Populated</option>
                  <option className="text-brand-ink" value="loading">Loading</option>
                  <option className="text-brand-ink" value="empty">Empty</option>
                  <option className="text-brand-ink" value="error">Error</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        {children}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:bottom-6">
          {notice && (
            <div role="status" data-testid="preview-notice" className="tb-rise pointer-events-auto max-w-md rounded-control bg-brand-ink px-4 py-3 text-[14px] text-white shadow-lg">
              {notice}
            </div>
          )}
        </div>
      </div>
    </Ctx.Provider>
  );
}
