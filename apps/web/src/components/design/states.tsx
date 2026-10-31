'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, RotateCw, ShieldOff, X, type LucideIcon } from 'lucide-react';
import { usePreview } from './PreviewContext';
import { Button, btn, type Tone } from './ui';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-control bg-surface-subtle ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 3, testId }: { rows?: number; testId?: string }) {
  return (
    <div className="space-y-3" data-testid={testId} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, tone = 'clinical', testId }: { icon: LucideIcon; title: string; body: string; action?: ReactNode; tone?: Tone; testId?: string }) {
  const fam = tone === 'family';
  return (
    <div data-testid={testId} className={`flex flex-col items-center rounded-control border border-dashed px-6 py-8 text-center ${fam ? 'border-fam-border' : 'border-border-strong'}`}>
      <span className={`grid h-11 w-11 place-items-center rounded-full ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className={`mt-3 text-[15px] font-semibold ${fam ? 'text-fam-ink' : ''}`}>{title}</p>
      <p className={`mt-1 max-w-sm text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'We couldn’t load this', body = 'The server didn’t respond. Nothing was changed.', onRetry, tone = 'clinical', testId }: { title?: string; body?: string; onRetry: () => void; tone?: Tone; testId?: string }) {
  const fam = tone === 'family';
  return (
    <div role="alert" data-testid={testId} className={`flex flex-col items-start gap-3 rounded-control border px-4 py-4 sm:flex-row sm:items-center ${fam ? 'border-fam-border bg-fam-raised' : 'border-status-danger/25 bg-status-dangerSurface'}`}>
      <AlertTriangle size={20} className={`shrink-0 ${fam ? 'text-fam-caution' : 'text-status-danger'}`} aria-hidden="true" />
      <div className="flex-1">
        <p className={`text-[14px] font-semibold ${fam ? 'text-fam-ink' : 'text-status-danger'}`}>{title}</p>
        <p className={`text-[13px] ${fam ? 'text-fam-muted' : 'text-[#7A2630]'}`}>{body}</p>
      </div>
      <Button variant="secondary" tone={tone} size="sm" onClick={onRetry} data-testid={testId ? `${testId}-retry` : undefined}>
        <RotateCw size={14} aria-hidden="true" /> Retry
      </Button>
    </div>
  );
}

export function AccessDenied({ title, body, backHref, backLabel, testId }: { title: string; body: string; backHref: string; backLabel: string; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-card border border-border-light bg-surface-white p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-subtle text-brand-inkMuted">
        <ShieldOff size={22} aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-[18px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[14px] text-brand-inkMuted">{body}</p>
      <Link href={backHref} className={`${btn('secondary')} mt-4`}>{backLabel}</Link>
    </div>
  );
}

// Applies the preview "Data" control: populated → children, else loading/empty/error renderings.
export function StateGate({ children, empty, rows = 3, tone = 'clinical', testId }: { children: ReactNode; empty: ReactNode; rows?: number; tone?: Tone; testId: string }) {
  const { dataState, setDataState } = usePreview();
  if (dataState === 'loading') return <SkeletonRows rows={rows} testId={`${testId}-loading`} />;
  if (dataState === 'empty') return <>{empty}</>;
  if (dataState === 'error') return <ErrorState tone={tone} onRetry={() => setDataState('populated')} testId={`${testId}-error`} />;
  return <>{children}</>;
}

export function Dialog({ open, onClose, title, children, footer, tone = 'clinical', testId }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; tone?: Tone; testId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal(); // Native modal dialog traps keyboard focus and handles Escape.
      (d.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? d).focus();
    }
    if (!open && d.open) {
      d.close();
      returnFocus.current?.focus();
    }
  }, [open]);
  useEffect(() => () => { returnFocus.current?.focus(); }, []);
  const fam = tone === 'family';
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby={`${testId}-title`} data-testid={testId}
      className={`w-[min(560px,calc(100vw-24px))] rounded-[18px] border p-0 shadow-2xl backdrop:bg-[#0D1226]/55 backdrop:backdrop-blur-[2px] ${fam ? 'border-fam-border bg-fam-surface text-fam-ink' : 'border-border-light bg-surface-white text-brand-ink'}`}>
      <div className={`flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6 ${fam ? 'border-fam-border' : 'border-border-light'}`}>
        <h2 id={`${testId}-title`} className="font-display text-[18px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" data-testid={`${testId}-close`} className="grid h-11 w-11 place-items-center rounded-control hover:bg-black/5">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto px-5 py-5 md:px-6">{children}</div>
      {footer && <div className={`flex flex-wrap items-start justify-end gap-3 border-t px-5 py-4 md:px-6 ${fam ? 'border-fam-border' : 'border-border-light'}`}>{footer}</div>}
    </dialog>
  );
}
