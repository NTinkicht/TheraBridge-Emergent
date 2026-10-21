'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { ReasonField, SelectField } from '@/components/centers/kit';
import { Button, Card, LockedAction, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import { LOCKED_REASON, clinicalApi, type Goal, type HomeActivity, type PlanVersion, type Workspace } from '@/lib/clinical';
import { ActivityCard } from './ActivityCard';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
const STATUS = { DRAFT: ['Draft', 'neutral'], IN_REVIEW: ['In review', 'info'], SUPERSEDED: ['Superseded', 'neutral'] } as const;
const input = 'w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';

function GoalRow({ g, onChange, onRemove, disabled, i }: { g: Goal; onChange: (g: Goal) => void; onRemove: () => void; disabled: boolean; i: number }) {
  return (
    <li className="grid grid-cols-1 gap-2 rounded-control border border-border-light p-3 md:grid-cols-[1fr_120px_90px_90px_40px]" data-testid={`goal-${i}`}>
      <input aria-label="Goal" className={input} value={g.title} disabled={disabled} onChange={(e) => onChange({ ...g, title: e.target.value })} placeholder="Goal, e.g. Uses two-word phrases" data-testid={`goal-title-${i}`} />
      <select aria-label="Measure" className={input} value={g.measure} disabled={disabled} onChange={(e) => onChange({ ...g, measure: e.target.value as Goal['measure'] })} data-testid={`goal-measure-${i}`}>
        <option value="percent">Percent</option><option value="count">Count</option><option value="level">Level</option>
      </select>
      <input aria-label="Baseline" type="number" className={input} value={g.baseline} disabled={disabled} onChange={(e) => onChange({ ...g, baseline: Number(e.target.value) })} data-testid={`goal-baseline-${i}`} />
      <input aria-label="Target" type="number" className={input} value={g.target} disabled={disabled} onChange={(e) => onChange({ ...g, target: Number(e.target.value) })} data-testid={`goal-target-${i}`} />
      {!disabled && <button type="button" aria-label="Remove goal" onClick={onRemove} className="grid h-10 w-10 place-items-center rounded-control hover:bg-surface-subtle" data-testid={`goal-remove-${i}`}><Trash2 size={16} aria-hidden="true" /></button>}
    </li>
  );
}

function VersionEditor({ centerId, ws, planId, v, run }: { centerId: string; ws: Workspace; planId: string; v: PlanVersion; run: Run }) {
  const [summary, setSummary] = useState(v.summary);
  const [goals, setGoals] = useState<Goal[]>(v.goals);
  const [acts, setActs] = useState<HomeActivity[]>(v.homeActivities);
  const [comment, setComment] = useState('');
  const [preview, setPreview] = useState(false);
  useEffect(() => { setSummary(v.summary); setGoals(v.goals); setActs(v.homeActivities); }, [v]);
  const edit = ws.canEdit && v.status === 'DRAFT';
  const save = () => run(() => clinicalApi.saveVersion(centerId, v.id, { summary, goals: goals.filter((g) => g.title.trim()), homeActivities: acts, version: v.version }), 'Draft saved.');
  return (
    <div className="space-y-4" data-testid={`plan-version-${v.number}`}>
      <div className="flex flex-wrap items-center gap-2"><Pill tone={STATUS[v.status][1]} testId="plan-version-status">{`Version ${v.number} · ${STATUS[v.status][0]}`}</Pill><span className="text-[13px] text-brand-inkMuted">by {v.author}</span></div>
      {v.reviewNotes.map((n, i) => <FormAlert key={i} tone="info" testId={`review-note-${i}`}>Supervisor review: {n.comment}</FormAlert>)}
      <label className="block text-[14px] font-medium">Plan summary<textarea className={`mt-1 ${input}`} rows={3} value={summary} disabled={!edit} onChange={(e) => setSummary(e.target.value)} data-testid="plan-summary" /></label>
      <div>
        <h3 className="text-[15px] font-semibold">Goals</h3>
        <ul className="mt-2 space-y-2">{goals.map((g, i) => <GoalRow key={g.key} i={i} g={g} disabled={!edit} onChange={(n) => setGoals(goals.map((x, j) => (j === i ? n : x)))} onRemove={() => setGoals(goals.filter((_, j) => j !== i))} />)}</ul>
        {!goals.length && <p className="text-[14px] text-brand-inkMuted" data-testid="goals-empty">No goals yet.</p>}
        {edit && <Button size="sm" variant="secondary" className="mt-2" onClick={() => setGoals([...goals, { key: `g${Date.now().toString(36)}`, title: '', measure: 'percent', baseline: 0, target: 80 }])} data-testid="goal-add"><Plus size={15} aria-hidden="true" />Add goal</Button>}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">Home activities</h3>
        <ul className="mt-2 space-y-2">
          {acts.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-control border border-border-light p-2 text-[14px]" data-testid={`home-activity-${i}`}>
              <span className="min-w-0 flex-1 font-semibold">{ws.templates.find((t) => t.id === a.templateId)?.title ?? 'Activity'}</span>
              <input aria-label="How often" className={`${input} max-w-[180px]`} value={a.frequency} disabled={!edit} onChange={(e) => setActs(acts.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
              {edit && <button type="button" aria-label="Remove activity" onClick={() => setActs(acts.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-control hover:bg-surface-subtle"><Trash2 size={16} aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
        {edit && <div className="mt-2 max-w-sm"><SelectField label="Add from the activity library" value="" testId="home-activity-add" onChange={(id) => id && setActs([...acts, { templateId: id, frequency: '3 times a week' }])}
          options={[{ value: '', label: 'Choose an activity' }, ...ws.templates.filter((t) => !acts.some((a) => a.templateId === t.id)).map((t) => ({ value: t.id, label: `${t.title} · ${serviceLabel(t.service)}` }))]} /></div>}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {edit && <Button onClick={() => void save()} data-testid="plan-save">Save draft</Button>}
        {edit && <Button variant="secondary" onClick={() => void run(() => clinicalApi.submit(centerId, v.id), 'Draft sent to the clinical supervisor for review.')} data-testid="plan-submit">Send for review</Button>}
        {ws.canEdit && v.status === 'IN_REVIEW' && <Button variant="secondary" onClick={() => void run(() => clinicalApi.newVersion(centerId, planId), 'New draft version started.')} data-testid="plan-new-version">Start a new version</Button>}
        <Button variant="ghost" onClick={() => setPreview(!preview)} data-testid="plan-family-preview">{preview ? 'Hide family preview' : 'Preview as family'}</Button>
        <LockedAction id={`approve-${v.id}`} label="Approve and release" reason={LOCKED_REASON} />
      </div>
      {ws.canReview && v.status === 'IN_REVIEW' && (
        <Card className="space-y-3 p-4" testId="review-panel">
          <ReasonField value={comment} onChange={setComment} testId="review-comment" label="Review comments for the therapist" />
          <Button variant="secondary" onClick={() => void (async () => { if (await run(() => clinicalApi.giveBack(centerId, v.id, comment.trim()), 'Draft returned to the therapist with your comments.')) setComment(''); })()} data-testid="review-return">Return to draft with comments</Button>
        </Card>
      )}
      {preview && (
        <div className="theme-family-light space-y-3 rounded-card bg-fam-canvas p-4 text-fam-ink" data-testid="family-preview">
          <p className="text-[13px] font-semibold">Staff-only preview · not shared with the family · release is disabled</p>
          {acts.map((a, i) => { const t = ws.templates.find((x) => x.id === a.templateId); return t ? <ActivityCard key={i} t={t} tone="family" extra={a.frequency} /> : null; })}
          {!acts.length && <p className="text-[14px]">No home activities in this draft.</p>}
        </div>
      )}
    </div>
  );
}

export function PlansPanel({ centerId, ws, run }: { centerId: string; ws: Workspace; run: Run }) {
  const [f, setF] = useState({ service: ws.child.services[0] ?? '', title: '' });
  return (
    <div className="space-y-5" data-testid="plans-panel">
      {ws.plans.map((p) => {
        const current = p.versions[0];
        return (
          <Card key={p.id} className="p-5 md:p-6" testId={`plan-${p.id}`}>
            <h2 className="text-[18px] font-semibold">{p.title}</h2>
            <p className="mb-4 text-[13px] text-brand-inkMuted">{serviceLabel(p.service)} · {p.versions.length} version{p.versions.length > 1 ? 's' : ''}</p>
            <VersionEditor centerId={centerId} ws={ws} planId={p.id} v={current} run={run} />
          </Card>
        );
      })}
      {!ws.plans.length && <p className="text-[14px] text-brand-inkMuted" data-testid="plans-empty">No therapy plan yet.</p>}
      {ws.canEdit && (
        <Card className="grid grid-cols-1 items-end gap-3 p-5 sm:grid-cols-[180px_1fr_auto]" testId="plan-create">
          <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service })} testId="plan-service" options={ws.child.services.map((s) => ({ value: s, label: serviceLabel(s) }))} />
          <Field label="New plan title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} testId="plan-title" />
          <Button onClick={() => void (async () => { if (await run(() => clinicalApi.plan(centerId, ws.child.id, f), 'Plan created with a first draft.')) setF({ ...f, title: '' }); })()} data-testid="plan-create-button">Create plan</Button>
        </Card>
      )}
    </div>
  );
}
