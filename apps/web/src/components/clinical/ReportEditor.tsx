'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { errorText } from '@/components/centers/kit';
import { Button, Card, LockedAction } from '@/components/design/ui';
import { LOCKED_REASON } from '@/lib/clinical';
import { SECTIONS, reportsApi, type ReportDetail } from '@/lib/reports';
import { ReportDecisionAssist } from './ReportDecisionAssist';

export type ReportHandoffLease = { revision: number; release: () => void };
export type ReportHandoffGate = () => Promise<ReportHandoffLease>;
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
export function ReportEditor({ centerId, d, onReload, onError, onPreview, onSections, onSuccess, handoffGateRef }: { centerId: string; d: ReportDetail; onReload: () => Promise<void>; onError: (e: unknown) => void; onPreview: () => void; onSections: (s: Record<string, string>) => void; onSuccess: (text: string) => void; handoffGateRef?: MutableRefObject<ReportHandoffGate | null> }) {
  const [sections, setSections] = useState<Record<string, string>>(d.report.sections);
  const [state, setState] = useState<Save>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const local = useRef(sections);
  const ver = useRef(d.report.version);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // A decision remounts the editor at its new report version. Lock the
  // parent synchronously so no unsaved text can be typed after the flush.
  const decisionBusy = useRef(false);
  const [decisionLocked, setDecisionLocked] = useState(false);
  const saveQueue = useRef<Promise<boolean> | null>(null);
  const handoffBusy = useRef(false);
  const [handoffLocked, setHandoffLocked] = useState(false);
  const beginDecision = () => {
    if (decisionBusy.current || handoffBusy.current) return false;
    decisionBusy.current = true;
    setDecisionLocked(true);
    return true;
  };
  const endDecision = () => {
    decisionBusy.current = false;
    setDecisionLocked(false);
  };
  const id = d.report.id;

  const save = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    // Queue the *whole* autosave, not only its HTTP request. If A is in
    // flight and B is queued, decision-flush C must wait for B, even if B
    // cleared the dirty flag when its own POST started. All saves use the
    // version returned by the immediately preceding request.
    const previous = saveQueue.current;
    const queued = (async (): Promise<boolean> => {
      if (previous && !(await previous)) return false;
      if (!dirty.current) return true;
      dirty.current = false;
      setState('saving');
      try {
        const snapshot = { ...local.current };
        const r = await reportsApi.autosave(centerId, id, snapshot, ver.current);
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
    })();
    saveQueue.current = queued;
    void queued.then(
      () => { if (saveQueue.current === queued) saveQueue.current = null; },
      () => { if (saveQueue.current === queued) saveQueue.current = null; },
    );
    return queued;
  }, [centerId, id, onError]);

  const handoffGate = useCallback(async (): Promise<ReportHandoffLease> => {
    if (decisionBusy.current || handoffBusy.current) throw new Error('Report editing is already busy.');
    handoffBusy.current = true;
    setHandoffLocked(true);
    // Lock typing synchronously before flushing the ENTIRE autosave queue.
    // The callback supplies the actual server-acknowledged revision, rather
    // than the stale revision last returned by the parent detail request.
    const ok = await save();
    if (!ok) {
      handoffBusy.current = false;
      setHandoffLocked(false);
      throw new Error('The report text could not be saved before the handoff.');
    }
    return {
      revision: ver.current,
      release: () => { handoffBusy.current = false; setHandoffLocked(false); },
    };
  }, [save]);

  useEffect(() => {
    if (!handoffGateRef) return;
    handoffGateRef.current = handoffGate;
    return () => { if (handoffGateRef.current === handoffGate) handoffGateRef.current = null; };
  }, [handoffGateRef, handoffGate]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current || decisionBusy.current || handoffBusy.current || saveQueue.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    onSections(local.current);
    return () => { window.removeEventListener('beforeunload', warn); clearTimeout(timer.current); };
  }, []);

  const change = (k: string, v: string) => {
    if (decisionBusy.current || handoffBusy.current) return;
    const next = { ...local.current, [k]: v };
    local.current = next;
    setSections(next);
    onSections(next);
    dirty.current = true;
    if (state === 'conflict') return;
    setState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1200);
  };

  const act = async (fn: (v: number) => Promise<{ number: number }>, ok: (n: number) => string) => {
    if (decisionBusy.current) return;
    setNotice(null);
    if (!(await save())) return;
    try { const r = await fn(ver.current); onSuccess(ok(r.number)); await onReload(); }
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
      {edit && <div className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-4" data-testid="report-evidence-assist">
        <h3 className="text-[16px] font-semibold">Evidence-assisted draft passages</h3>
        <p className="text-[13px] text-brand-inkMuted">Deterministic, source-referenced clinician draft decisions. No AI, publication, clinical verification, approval or release.</p>
        <ReportDecisionAssist centerId={centerId} reportId={id}
          getVersion={() => ver.current} flush={save} beginDecision={beginDecision} endDecision={endDecision} onError={onError}
          onCommitted={async () => {
            onSuccess('Your evidence decision and draft revision have been saved. This does not validate or release clinical content.');
            await onReload();
          }}/>
      </div>}
      {decisionLocked && <p role="status" aria-live="polite" className="text-[13px] text-brand-inkMuted" data-testid="report-decision-edit-lock">Recording evidence decision — report editing is temporarily paused to protect unsaved text.</p>}
      {handoffLocked && <p role="status" aria-live="polite" className="text-[13px] text-brand-inkMuted" data-testid="report-handoff-edit-lock">Saving report text and preparing the linked plan draft — report editing is paused until the handoff is confirmed or cancelled.</p>}
      {SECTIONS.map(([k, label, hint]) => (
        <label key={k} className="block text-[14px] font-semibold">
          {label}
          <span className="block text-[12px] font-normal text-brand-inkMuted">{hint}</span>
          <textarea className={area} rows={k === 'goals' ? 8 : 4} value={sections[k] ?? ''} disabled={!edit || decisionLocked || handoffLocked} onChange={(e) => change(k, e.target.value)} data-testid={`report-section-${k}`} />
        </label>
      ))}
      <div className="flex flex-wrap items-start gap-2 border-t border-border-light pt-4">
        {edit && <Button variant="secondary" disabled={decisionLocked || handoffLocked} onClick={() => void act((v) => reportsApi.saveVersion(centerId, id, v), (n) => `Saved as version ${n}.`)} data-testid="report-save-version">Save version</Button>}
        {edit && <Button disabled={decisionLocked} onClick={() => void act((v) => reportsApi.submit(centerId, id, v), (n) => `Sent for review as version ${n}.`)} data-testid="report-submit">Send for review</Button>}
        <Button variant="ghost" disabled={decisionLocked} onClick={() => { if (!decisionBusy.current && !handoffBusy.current) void save().then(ok => { if (ok) onPreview(); }); }} data-testid="report-preview-toggle">Preview family format</Button>
        <LockedAction id="report-release" label="Release to family" reason={LOCKED_REASON} />
      </div>
    </Card>
  );
}
