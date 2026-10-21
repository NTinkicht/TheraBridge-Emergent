'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { errorText } from '@/components/centers/kit';
import { Button, Card, LockedAction } from '@/components/design/ui';
import { LOCKED_REASON } from '@/lib/clinical';
import { SECTIONS, reportsApi, type ReportDetail } from '@/lib/reports';

type Save = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'error';
const area = 'mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px] leading-relaxed disabled:bg-surface-subtle disabled:text-brand-inkMuted';

function SaveState({ s, at, onRetry }: { s: Save; at: string | null; onRetry: () => void }) {
  const text = { idle: 'No changes yet', pending: 'Unsaved changes', saving: 'Saving…', saved: `All changes saved${at ? ` at ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`, conflict: 'Not saved: newer version exists', error: 'Couldn’t save' }[s];
  const Icon = s === 'saving' ? Loader2 : s === 'conflict' || s === 'error' ? AlertTriangle : CheckCircle2;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-[13px] ${s === 'conflict' || s === 'error' ? 'text-status-danger' : 'text-brand-inkMuted'}`} data-testid="report-save-state" data-state={s}>
      <Icon size={14} className={s === 'saving' ? 'animate-spin' : ''} aria-hidden="true" />{text}
      {s === 'error' && <button type="button" onClick={onRetry} className="font-semibold text-brand-action underline" data-testid="report-save-retry">Retry</button>}
    </span>
  );
}

// Sections autosave about a second after typing stops. Each save carries the version on screen, so a stale tab gets a conflict instead of overwriting.
export function ReportEditor({ centerId, d, onReload, onError, onPreview }: { centerId: string; d: ReportDetail; onReload: () => Promise<void>; onError: (e: unknown) => void; onPreview: () => void }) {
  const [sections, setSections] = useState<Record<string, string>>(d.report.sections);
  const [state, setState] = useState<Save>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const local = useRef(sections);
  const ver = useRef(d.report.version);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = d.report.id;

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return true;
    dirty.current = false;
    setState('saving');
    try {
      const r = await reportsApi.autosave(centerId, id, local.current, ver.current);
      ver.current = r.version;
      setSavedAt(r.savedAt);
      setState(dirty.current ? 'pending' : 'saved');
      return true;
    } catch (e) {
      dirty.current = true;
      const t = errorText(e, onError);
      setState((e as { status?: number }).status === 409 ? 'conflict' : 'error');
      if (t) setNotice({ tone: 'danger', text: t });
      return false;
    }
  }, [centerId, id, onError]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); clearTimeout(timer.current); };
  }, []);

  const change = (k: string, v: string) => {
    const next = { ...local.current, [k]: v };
    local.current = next;
    setSections(next);
    dirty.current = true;
    if (state === 'conflict') return;
    setState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1200);
  };

  const act = async (fn: (v: number) => Promise<{ number: number }>, ok: (n: number) => string) => {
    setNotice(null);
    if (!(await save())) return;
    try { const r = await fn(ver.current); setNotice({ tone: 'success', text: ok(r.number) }); await onReload(); }
    catch (e) { const t = errorText(e, onError); if (t) setNotice({ tone: 'danger', text: t }); }
  };

  const edit = d.canEdit;
  return (
    <Card className="space-y-4 p-5" testId="report-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold">Report sections</h2>
        {edit ? <SaveState s={state} at={savedAt} onRetry={() => void save()} /> : <span className="text-[13px] text-brand-inkMuted" data-testid="report-readonly">{d.report.status === 'IN_REVIEW' ? 'With the supervisor for review, read-only' : 'Read-only'}</span>}
      </div>
      {state === 'conflict' && (
        <div className="rounded-control border border-status-danger/30 bg-status-dangerSurface p-3 text-[14px] text-status-danger" role="alert" data-testid="report-conflict">
          <p className="font-semibold">This report changed somewhere else.</p>
          <p className="mt-1">Your latest typing is still on screen but was not saved. Copy anything you need, then reload the latest version.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void navigator.clipboard?.writeText(SECTIONS.map(([k, l]) => `${l}\n${sections[k] ?? ''}`).join('\n\n'))} data-testid="report-conflict-copy">Copy my text</Button>
            <Button size="sm" onClick={() => { dirty.current = false; void onReload(); }} data-testid="report-conflict-reload">Reload latest version</Button>
          </div>
        </div>
      )}
      {notice && state !== 'conflict' && <FormAlert tone={notice.tone} testId={`report-notice-${notice.tone}`}>{notice.text}</FormAlert>}
      {SECTIONS.map(([k, label, hint]) => (
        <label key={k} className="block text-[14px] font-semibold">
          {label}
          <span className="block text-[12px] font-normal text-brand-inkMuted">{hint}</span>
          <textarea className={area} rows={k === 'goals' ? 8 : 4} value={sections[k] ?? ''} disabled={!edit} onChange={(e) => change(k, e.target.value)} data-testid={`report-section-${k}`} />
        </label>
      ))}
      <div className="flex flex-wrap items-start gap-2 border-t border-border-light pt-4">
        {edit && <Button variant="secondary" onClick={() => void act((v) => reportsApi.saveVersion(centerId, id, v), (n) => `Saved as version ${n}.`)} data-testid="report-save-version">Save version</Button>}
        {edit && <Button onClick={() => void act((v) => reportsApi.submit(centerId, id, v), (n) => `Sent for review as version ${n}.`)} data-testid="report-submit">Send for review</Button>}
        <Button variant="ghost" onClick={() => void save().then(onPreview)} data-testid="report-preview-toggle">Preview family format</Button>
        <LockedAction id="report-release" label="Release to family" reason={LOCKED_REASON} />
      </div>
    </Card>
  );
}
