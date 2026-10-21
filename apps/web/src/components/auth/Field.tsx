'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export function Field({ label, hint, error, type = 'text', testId, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; testId: string }) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[14px] font-medium">{label}</label>
      <div className="relative">
        <input id={id} type={isPassword && reveal ? 'text' : type} aria-invalid={!!error} aria-describedby={describedBy} data-testid={testId}
          className={`block min-h-[48px] w-full rounded-control border bg-surface-white px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] focus:border-brand-action focus:ring-[3px] focus:ring-brand-action/20 ${isPassword ? 'pr-12' : ''} ${error ? 'border-status-danger' : 'border-border-strong'}`}
          {...rest} />
        {isPassword && (
          <button type="button" onClick={() => setReveal(!reveal)} aria-label={reveal ? 'Hide password' : 'Show password'} aria-pressed={reveal} data-testid={`${testId}-reveal`}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control text-brand-inkMuted hover:text-brand-ink">
            {reveal ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && <p id={`${id}-hint`} className="text-[13px] text-brand-inkMuted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-[13px] font-medium text-status-danger" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  );
}

export function FormAlert({ tone, children, testId }: { tone: 'danger' | 'success' | 'info'; children: ReactNode; testId: string }) {
  const look = { danger: 'border-status-danger/30 bg-status-dangerSurface text-status-danger', success: 'border-status-success/30 bg-status-successSurface text-status-success', info: 'border-status-info/30 bg-status-infoSurface text-status-info' }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-control border px-4 py-3 text-[14px] ${look}`} data-testid={testId}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function SubmitButton({ busy, children, testId }: { busy: boolean; children: ReactNode; testId: string }) {
  return (
    <button type="submit" disabled={busy} data-testid={testId}
      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control bg-brand-action px-5 text-[15px] font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-brand-actionHover active:scale-[0.99] disabled:cursor-wait disabled:opacity-80">
      {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
