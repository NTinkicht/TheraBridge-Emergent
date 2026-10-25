'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/design/ui';
import { reportsApi, type GoalEvidence, type ReportDetail, type ReportVersion } from '@/lib/reports';
import type { ReportHandoffGate, ReportHandoffLease } from './ReportEditor';

type SourceGoal = GoalEvidence & { planVersionId: string };
const refOf = (g: SourceGoal) => g.planVersionId + ':' + g.key;

// All candidates are derived from an *authorized, saved report version*.
// No live evidence recomputation or LLM source is used by this workflow.
export function ReportToPlanHandoff({ centerId, detail, prepare }: { centerId: string; detail: ReportDetail; prepare: ReportHandoffGate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(detail.versions[0]?.id ?? '');
  const [snapshot, setSnapshot] = useState<ReportVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('Home-plan draft from ' + detail.report.title);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  // After the first POST, retain its exact payload and the editor lease until
  // success or an explicit abandon action. Network failures may be ambiguous.
  const attempt = useRef<Parameters<typeof reportsApi.createPlanDraft>[2] | null>(null);
  const lease = useRef<ReportHandoffLease | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    if (!open || !sourceId) return;
    let active = true;
    setSnapshot(null);
    setSelected([]);
    setLoading(true);
    setError('');
    reportsApi.version(centerId, sourceId)
      .then(result => {
        if (!active) return;
        setSnapshot(result);
        // Opt-in per goal: do not silently select every goal as treatment.
        setSelected([]);
      })
      .catch(() => { if (active) setError('Could not load this saved report version. Retry or choose another version.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [centerId, sourceId, open]);

  if (!detail.canEdit) return null;
  if (detail.versions.length === 0) return (
    <Card className="space-y-2 p-5" testId="report-to-plan-needs-version">
      <h2 className="text-[17px] font-semibold">Prepare a home-plan draft</h2>
      <p className="text-[13px] text-brand-inkMuted">First choose <strong>Save version</strong> in the report editor. That captures an exact evidence snapshot; then you can select its recorded goals to start an internal plan draft. No automatic release or recommendations.</p>
    </Card>
  );
  const goals: SourceGoal[] = (snapshot?.evidence.goals ?? []).filter(
    (g): g is SourceGoal => typeof g.planVersionId === 'string' && !!g.planVersionId,
  );
  const selectedGoals = goals.filter(g => selected.includes(refOf(g)));
  const validTitle = title.trim().length >= 3 && title.trim().length <= 120;
  const create = async () => {
    if (busy.current || loading || (!attempt.current && (!snapshot || !validTitle || selectedGoals.length === 0 || selectedGoals.length > 12))) return;
    busy.current = true;
    setSaving(true);
    setError('');
    let succeeded = false;
    try {
      if (!attempt.current) {
        // The report editor must commit ALL outstanding text before a plan
        // is created. Hold its editing lock until this request resolves.
        const held = await prepare();
        lease.current = held;
        attempt.current = {
          requestId: crypto.randomUUID(),
          sourceReportVersionId: snapshot!.id,
          reportRevision: held.revision,
          title: title.trim(),
          selectedGoals: selectedGoals.map(g => ({ planVersionId: g.planVersionId, goalKey: g.key })),
        };
      }
      await reportsApi.createPlanDraft(centerId, detail.report.id, attempt.current);
      succeeded = true;
      // Do not unlock the report while client-side navigation is pending.
      router.push('/app/clinical/' + detail.report.childId + '#plan');
    } catch (e) {
      if (attempt.current) {
        setUncertain(true);
        setError('The server response was not confirmed. Retry the exact same request to recover the draft; do not start a second draft.');
      } else {
        lease.current?.release();
        lease.current = null;
        setError('Report text could not be saved before preparing a plan. Keep your report open and retry.');
      }
    } finally {
      if (!succeeded) {
        busy.current = false;
        setSaving(false);
      }
    }
  };

  const abandon = () => {
    if (!uncertain || busy.current) return;
    // Explicit user acknowledgement: we CANNOT assert an ambiguous POST did
    // not commit. The same request should be retried, not silently dropped.
    if (!window.confirm('The last request may have created a draft. Abandoning it could create a duplicate if you submit again. Cancel the unresolved handoff anyway?')) return;
    attempt.current = null;
    lease.current?.release();
    lease.current = null;
    setUncertain(false);
    setError('');
  };

  return <Card className="space-y-3 p-5" testId="report-to-plan">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <ClipboardList size={19} className="mt-0.5 shrink-0 text-brand-action" aria-hidden="true" />
        <div>
          <h2 className="text-[17px] font-semibold">Prepare a home-plan draft</h2>
          <p className="mt-1 text-[13px] text-brand-inkMuted">Copy selected goal definitions from an exact saved report snapshot into a new, editable plan. All home activities start empty. Therapist review is required; nothing is approved or shared with families.</p>
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={() => setOpen(v => !v)} disabled={saving || uncertain} data-testid="report-to-plan-toggle"
        aria-expanded={open} aria-controls="report-to-plan-form">
        {open ? 'Hide handoff' : 'Select goals'}
      </Button>
    </div>
    {open && <div id="report-to-plan-form" className="space-y-4 border-t border-border-light pt-4" data-testid="report-to-plan-form">
      <label className="block text-[13px] font-semibold">Saved report evidence version
        <select className="mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[14px]"
          value={sourceId} disabled={saving || uncertain} onChange={e => setSourceId(e.target.value)} data-testid="report-to-plan-source">
          {detail.versions.map(v => <option key={v.id} value={v.id}>Version {v.number} · {v.kind} · {v.createdAt.slice(0,10)}</option>)}
        </select>
      </label>
      {loading && <p className="flex items-center gap-2 text-[13px]" role="status"><Loader2 size={16} className="animate-spin" />Loading saved evidence…</p>}
      {snapshot && <fieldset disabled={saving || uncertain} className="space-y-2" data-testid="report-to-plan-goals">
        <legend className="text-[14px] font-semibold">Select recorded goal definitions ({selected.length} selected; maximum 12)</legend>
        {goals.map((g, i) => <label key={refOf(g)} className="flex min-h-[44px] items-start gap-3 rounded-control border border-border-light p-3 text-[13px]">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={selected.includes(refOf(g))}
            onChange={e => { setSelected(x => e.target.checked ? [...x, refOf(g)] : x.filter(v => v !== refOf(g)));  }}
            aria-label={'Copy goal ' + g.title} data-testid={`report-to-plan-goal-${i}`} />
          <span><strong>{g.title}</strong><span className="mt-1 block text-brand-inkMuted">
            Baseline {g.baseline}, target {g.target} ({g.measure}) · {g.points.length} recorded measurement(s), not copied
          </span></span>
        </label>)}
        {!goals.length && <p className="text-[13px] text-brand-inkMuted">This snapshot has no source-linked goals available. Save a report version containing suitable recorded goals first.</p>}
      </fieldset>}
      <label className="block text-[13px] font-semibold">New draft title
        <input className="mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[14px]"
          value={title} maxLength={120} disabled={saving || uncertain} onChange={e => setTitle(e.target.value)}
          data-testid="report-to-plan-title" />
      </label>
      <p className="text-[12px] text-brand-inkMuted">A new plan starts in DRAFT status. Goal keys are new; earlier observations are never treated as measurements for this plan. Source report/version/goal references are recorded in the internal audit trail.</p>
      {error && <p role="alert" className="rounded-control bg-status-dangerSurface p-3 text-[13px] text-status-danger" data-testid="report-to-plan-error">{error}</p>}
      {uncertain && <Button size="sm" variant="secondary" onClick={abandon} data-testid="report-to-plan-abandon">Abandon unresolved request</Button>}
      <Button onClick={() => void create()} disabled={saving || (!uncertain && (loading || !snapshot || !validTitle || selectedGoals.length === 0 || selectedGoals.length > 12))}
        data-testid="report-to-plan-create">{saving ? 'Preparing draft…' : uncertain ? 'Retry same request' : 'Create editable draft'}</Button>
    </div>}
  </Card>;
}
