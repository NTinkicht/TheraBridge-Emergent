'use client';

import { useState } from 'react';
import { Button } from '@/components/design/ui';
import type { Goal, HomeActivity, PlanVersion, Template, Workspace } from '@/lib/clinical';
import { inspectSyntheticSources, syntheticScope, type SyntheticSourceRef } from '@/lib/synthetic-source-integrity';

export interface SyntheticHomePlanCandidate {
  templateId: string;
  templateVersion: number | null;
  planVersionId: string;
  goalKey: string;
  sourceRefs: string[];
  pinnedSources: SyntheticSourceRef[];
  sourceScope: string;
  title: string;
  warnings: string[];
  suggested: HomeActivity;
  clinicalValidation: 'NOT_VERIFIED';
  released: false;
}

/** Scoped source snapshot derived only from server-authorized workspace data. */
export function homePlanSourceSnapshot(ws: Workspace, v: PlanVersion, service: string, centerId: string, editableGoals: Goal[]): SyntheticSourceRef[] {
  const scope = syntheticScope(centerId, ws.child.id, service);
  const mk = (kind: SyntheticSourceRef['kind'], id: string, revision: string, snapshot: unknown): SyntheticSourceRef =>
    ({ kind, id, scope, revision, snapshot: JSON.stringify(snapshot), validation: 'REFERENCED_NOT_VERIFIED' });
  return [
    ...editableGoals.filter(g => g.key && g.title.trim()).map(g =>
      mk('plan-goal', v.id + ':' + g.key, String(v.version), [g.title, g.measure, g.baseline, g.target])),
    ...ws.templates.filter(t => t.service === service && t.library === 'center').map(t =>
      mk('activity-template', t.id, String(t.version ?? 'unknown'), [t.title, t.service, t.ageBand, t.minutes, t.materials, t.steps, t.safety])),
  ];
}

/** Offline fictional shortlist based on the authorized workspace snapshot; never infers treatment. */
export function syntheticHomePlanCandidates(ws: Workspace, v: PlanVersion, service: string, existing: HomeActivity[], editableGoals: Goal[], centerId: string): SyntheticHomePlanCandidate[] {
  if (ws.synthetic !== true || !ws.canEdit || !v.mine || !['DRAFT', 'RETURNED_FOR_REVISION'].includes(v.status)) return [];
  const existingIds = new Set(existing.map(a => a.templateId));
  const templates = ws.templates.filter(t => t.service === service && t.library === 'center' && !existingIds.has(t.id))
    .sort((a, b) => a.title.localeCompare(b.title)).slice(0, 5);
  const validGoals = editableGoals.filter(g => g.key && g.title.trim());
  const scope = syntheticScope(centerId, ws.child.id, service);
  const sources = homePlanSourceSnapshot(ws, v, service, centerId, editableGoals);
  if (!validGoals.length) return [];
  return templates.map((template: Template) => ({
    templateId: template.id, templateVersion: template.version ?? null, planVersionId: v.id,
    goalKey: validGoals[0].key, sourceScope: scope,
    pinnedSources: sources.filter(ref => ref.kind === 'activity-template' && ref.id === template.id || ref.kind === 'plan-goal' && ref.id === v.id + ':' + validGoals[0].key),
    sourceRefs: [`plan-version:${v.id}:goal:${validGoals[0].key}`, `activity-template:${template.id}:version:${template.version ?? 'unknown'}`],
    title: template.title,
    warnings: ['Specialty-filtered only: no evidence establishes the activity is suitable.', 'Therapist must check age, safety, goals and frequency.'],
    suggested: { templateId: template.id, goalKey: validGoals[0].key, frequency: 'Therapist to decide', note: 'SYNTHETIC DRAFT; clinician review required; NOT VERIFIED.' },
    clinicalValidation: 'NOT_VERIFIED', released: false,
  }));
}

export function HomePlanSyntheticAssist({ ws, v, service, centerId, existing, editableGoals, onInsert }: {
  ws: Workspace; v: PlanVersion; service: string; centerId: string; existing: HomeActivity[]; editableGoals: Goal[]; onInsert: (a: HomeActivity) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SyntheticHomePlanCandidate | null>(null);
  const [goalKey, setGoalKey] = useState('');
  const [frequency, setFrequency] = useState('');
  const [note, setNote] = useState('');
  const candidates = syntheticHomePlanCandidates(ws, v, service, existing, editableGoals, centerId);
  const goals: Goal[] = editableGoals.filter(g => g.key && g.title.trim());
  const scope = syntheticScope(centerId, ws.child.id, service);
  const currentSources = homePlanSourceSnapshot(ws, v, service, centerId, editableGoals);
  const sourceCheck = selected ? inspectSyntheticSources(selected.pinnedSources, currentSources, scope) : null;
  const stale = !!selected && (selected.sourceScope !== scope || sourceCheck?.status !== 'CURRENT');
  const select = (candidate: SyntheticHomePlanCandidate) => {
    setSelected(candidate); setGoalKey(candidate.goalKey);
    setFrequency(candidate.suggested.frequency); setNote(candidate.suggested.note ?? '');
  };
  const discard = () => { setSelected(null); setGoalKey(''); setFrequency(''); setNote(''); };
  return <section className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-4" data-testid="home-plan-synthetic-assist">
    <h3 className="text-[16px] font-semibold">Synthetic home-plan drafting</h3>
    <p className="text-[13px] text-brand-inkMuted">Offline fictional library shortlist. No model call, treatment recommendation, consent, approval or family release. Review each candidate before insertion. Saving is separate.</p>
    <Button variant="secondary" onClick={() => { setOpen(!open); discard(); }} data-testid="home-assist-toggle">{open ? 'Hide suggestions' : 'Generate fictional suggestions'}</Button>
    {open && !candidates.length && <p role="status" className="text-[13px]" data-testid="home-ai-no-candidates">No eligible specialty-matched template and editable goal combination.</p>}
    {open && candidates.map(c => <div key={c.templateId} className="flex flex-wrap items-center gap-2 rounded-control border border-border-light bg-white p-3">
      <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{c.title}</p>
      <p className="break-all text-[12px] text-brand-inkMuted">{c.sourceRefs.join(' · ')} · {c.clinicalValidation}</p></div>
      <Button variant="secondary" size="sm" onClick={() => select(c)} data-testid={'home-assist-review-' + c.templateId}>Review candidate</Button>
    </div>)}
    {open && selected && <div className="space-y-2 rounded-control border border-border-light bg-white p-3" data-testid="home-ai-review">
      <p className="text-[13px] font-semibold">Clinician review: {selected.title}</p>
      {stale && <p role="alert" data-testid="home-ai-stale" className="text-[12px] text-status-danger">Sources changed or are unavailable. Discard and regenerate this candidate.</p>}
      <a className="text-[12px] font-semibold text-brand-action underline" href={`/app/clinical/${ws.child.id}`} data-testid="home-ai-source-open">Inspect authorized plan and source evidence</a>
      <p className="break-all text-[12px] text-brand-inkMuted" data-testid="home-ai-sources">{selected.pinnedSources.map(ref => ref.kind + ':' + ref.id + ' (' + ref.revision + ')').join(' · ')}</p>
      {selected.warnings.map((w,i) => <p key={i} className="text-[12px] text-status-caution">{w}</p>)}
      <label className="block text-[13px] font-semibold">Linked goal
        <select className="mt-1 w-full rounded-control border border-border-light p-2" value={goalKey} onChange={e => {
          const next = e.target.value;
          setGoalKey(next);
          setSelected(prev => prev ? { ...prev, goalKey: next, pinnedSources: currentSources.filter(ref => ref.kind === 'activity-template' && ref.id === prev.templateId || ref.kind === 'plan-goal' && ref.id === v.id + ':' + next) } : null);
        }} data-testid="home-ai-goal">
          {goals.map(g => <option key={g.key} value={g.key}>{g.title}</option>)}
        </select>
      </label>
      <label className="block text-[13px] font-semibold">Frequency
        <input className="mt-1 w-full rounded-control border border-border-light p-2" maxLength={100} value={frequency} onChange={e => setFrequency(e.target.value)} data-testid="home-ai-frequency" />
      </label>
      <label className="block text-[13px] font-semibold">Instructions (draft only)
        <textarea className="mt-1 w-full rounded-control border border-border-light p-2" maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} data-testid="home-ai-note" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={stale || !goals.some(g => g.key === goalKey) || !frequency.trim() || existing.some(a => a.templateId === selected.templateId)}
          onClick={() => {
            if (stale || inspectSyntheticSources(selected.pinnedSources, homePlanSourceSnapshot(ws, v, service, centerId, editableGoals), scope).status !== 'CURRENT' || !goals.some(g => g.key === goalKey) || !frequency.trim() || existing.some(a => a.templateId === selected.templateId)) return;
            onInsert({ templateId: selected.templateId, goalKey, frequency: frequency.trim(), note: note.trim() });
            discard();
          }} data-testid="home-ai-insert">Insert into unsaved plan draft</Button>
        <Button size="sm" variant="ghost" onClick={discard} data-testid="home-ai-discard">Discard</Button>
      </div>
    </div>}
    <p className="text-[12px] text-brand-inkMuted">Candidate sources are references, not verified clinical findings; no change is persisted until Save draft.</p>
  </section>;
}
