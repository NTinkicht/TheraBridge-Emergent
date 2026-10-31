'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { ReasonField, SelectField } from '@/components/centers/kit';
import { Button, Card, LockedAction, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import { LOCKED_REASON, clinicalApi, type Goal, type HomeActivity, type PlanVersion, type Workspace, type Template } from '@/lib/clinical';
import { ActivityCard } from './ActivityCard';
import { HomeScheduleFields } from './HomeScheduleFields';
import { HomeActivityDetails } from './HomeActivityDetails';
import { HomePracticeCalendar } from './HomePracticeCalendar';
import { HomePlanHandoff } from './HomePlanHandoff';
import { SavedHomePlanPreview } from './SavedHomePlanPreview';
import { homePlanHandoff } from '@/lib/home-plan-handoff';
import { scheduleProblem } from '@/lib/home-schedule';
import { PlanVersionHistory } from './PlanVersionHistory';
import { PlanEvidenceTrail } from './PlanEvidenceTrail';
import { GoalCheckpointPanel } from './GoalCheckpointPanel';
import { GoalReviewWorklist } from './GoalReviewWorklist';
import { goalReviewAnchor } from '@/lib/goal-review';
import { draftHomeActivitySuggestions } from '@/lib/evidence-assist';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
const STATUS = { DRAFT: ['Draft', 'neutral'], IN_REVIEW: ['In review', 'info'], SUPERSEDED: ['Superseded', 'neutral'], RETURNED_FOR_REVISION: ['Returned for revision', 'caution'], WITHDRAWN: ['Withdrawn', 'neutral'], FROZEN_INTERNAL: ['Frozen internal', 'info'] } as const;
const input = 'w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';

function GoalRow({ g, onChange, onRemove, disabled, i, planId }: { g: Goal; onChange: (g: Goal) => void; onRemove: () => void; disabled: boolean; i: number; planId: string }) {
  return (
    <li id={goalReviewAnchor(planId, g.key)} tabIndex={-1} className="scroll-mt-20 space-y-3 rounded-control border border-border-light p-3 focus-visible:outline-2 focus-visible:outline-brand-action" data-testid={`goal-${i}`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px_100px_auto]">
        <input aria-label="Goal" className={input} value={g.title} disabled={disabled}
          onChange={e => onChange({ ...g, title: e.target.value })} placeholder="Goal, e.g. Uses two-word phrases" data-testid={`goal-title-${i}`} />
        <select aria-label="Measure" className={input} value={g.measure} disabled={disabled}
          onChange={e => onChange({ ...g, measure: e.target.value as Goal['measure'] })} data-testid={`goal-measure-${i}`}>
          <option value="percent">Percent</option><option value="count">Count</option><option value="level">Level</option>
        </select>
        <input aria-label="Baseline" type="number" className={input} value={g.baseline} disabled={disabled}
          onChange={e => onChange({ ...g, baseline: Number(e.target.value) })} data-testid={`goal-baseline-${i}`} />
        <input aria-label="Target" type="number" className={input} value={g.target} disabled={disabled}
          onChange={e => onChange({ ...g, target: Number(e.target.value) })} data-testid={`goal-target-${i}`} />
        {!disabled && <button type="button" aria-label="Remove goal" onClick={onRemove}
          className="grid h-10 w-10 place-items-center rounded-control hover:bg-surface-subtle" data-testid={`goal-remove-${i}`}><Trash2 size={16} aria-hidden="true" /></button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid={`goal-planning-${i}`}>
        <label className="text-[12px] font-semibold">Objective horizon
          <select className={`mt-1 min-h-[42px] ${input}`} value={g.horizon ?? ''} disabled={disabled}
            onChange={e => onChange({ ...g, horizon: e.target.value ? e.target.value as Goal['horizon'] : undefined })} data-testid={`goal-horizon-${i}`}>
            <option value="">Not categorized (legacy)</option>
            <option value="SHORT_TERM">Short-term</option>
            <option value="LONG_TERM">Long-term</option>
          </select>
        </label>
        <label className="text-[12px] font-semibold">Target date
          <input type="date" className={`mt-1 min-h-[42px] ${input}`} value={g.targetOn ?? ''} disabled={disabled}
            onChange={e => onChange({ ...g, targetOn: e.target.value || undefined })} data-testid={`goal-target-date-${i}`} />
        </label>
        <label className="text-[12px] font-semibold">Next review date
          <input type="date" className={`mt-1 min-h-[42px] ${input}`} value={g.reviewOn ?? ''} disabled={disabled}
            onChange={e => onChange({ ...g, reviewOn: e.target.value || undefined })} data-testid={`goal-review-date-${i}`} />
        </label>
      </div>
      <p className="text-[12px] text-brand-inkMuted">Planning dates and objective horizon are clinician-entered. They do not indicate clinical progress or approval.</p>
    </li>
  );
}

function VersionEditor({ centerId, ws, planId, planTitle, service, v, source, run, onDirtyChange, otherPlanDirty }: {
  centerId: string; ws: Workspace; planId: string; planTitle: string; service: string; v: PlanVersion;
  source?: Workspace['plans'][number]['source']; run: Run;
  onDirtyChange: (versionId: string, dirty: boolean) => void; otherPlanDirty: boolean;
}) {
  const [summary, setSummary] = useState(v.summary);
  const [goals, setGoals] = useState<Goal[]>(v.goals);
  const [acts, setActs] = useState<HomeActivity[]>(v.homeActivities);
  const [comment, setComment] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof clinicalApi.familyPreview>> | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [searchedTemplates, setSearchedTemplates] = useState<Template[] | null>(null);
  const [templateCache, setTemplateCache] = useState<Template[]>([]);
  const [templateNextOffset, setTemplateNextOffset] = useState<number | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const templateWs = useMemo<Workspace>(() => ({ ...ws, templates: [
    ...ws.templates, ...templateCache.filter(t => !ws.templates.some(x => x.id === t.id)),
  ] }), [ws, templateCache]);
  const findTemplates = async (more = false) => {
    if (templateLoading || (more && templateNextOffset === null)) return;
    setTemplateLoading(true); setTemplateError('');
    try {
      const page = await clinicalApi.templates(centerId, { service, search: templateSearch.trim(),
        offset: more ? templateNextOffset! : 0, limit: 50 });
      setSearchedTemplates(prev => more ? [...(prev ?? []), ...page.items] : page.items);
      setTemplateCache(prev => [...prev, ...page.items.filter(x => !prev.some(t => t.id === x.id))]);
      setTemplateNextOffset(page.nextOffset);
    } catch { setTemplateError('Could not search the activity library. Please retry.'); }
    finally { setTemplateLoading(false); }
  };
  useEffect(() => { setSummary(v.summary); setGoals(v.goals); setActs(v.homeActivities); }, [v]);
  const edit = ws.canEdit && v.mine && ['DRAFT','RETURNED_FOR_REVISION'].includes(v.status);
  // Preserve legacy unlinked drafts; every NEW activity added in this editor
  // must be explicitly associated by the clinician before draft save.
  const legacyTemplateIds = new Set(v.homeActivities.map(a => a.templateId));
  const unlinkedNew = acts.some(a => !legacyTemplateIds.has(a.templateId) && !a.goalKey);
  const invalidSchedule = acts.some(a => !!scheduleProblem(a.schedule));
  const invalidDuration = acts.some(a => a.durationMinutes !== undefined && (!Number.isInteger(a.durationMinutes) || a.durationMinutes < 1 || a.durationMinutes > 120));
  const unsavedPlanEdits = summary !== v.summary ||
    JSON.stringify(goals) !== JSON.stringify(v.goals) ||
    JSON.stringify(acts) !== JSON.stringify(v.homeActivities);
  const handoff = homePlanHandoff({ summary, goals, activities: acts, templates: templateWs.templates,
    hasUnsavedEdits: unsavedPlanEdits, hasOtherPlanEdits: otherPlanDirty,
    newlyAddedUnlinked: unlinkedNew }, scheduleProblem);
  // Any checkpoint's shared run() reloads ALL mounted plan editors.
  // Aggregate dirty state by exact version in the parent so a clean plan
  // cannot discard unsaved edits in another plan.
  useEffect(() => { onDirtyChange(v.id, unsavedPlanEdits); }, [v.id, unsavedPlanEdits, onDirtyChange]);
  useEffect(() => () => { onDirtyChange(v.id, false); }, [v.id, onDirtyChange]);
  const save = () => run(() => clinicalApi.saveVersion(centerId, v.id, { summary, goals: goals.filter((g) => g.title.trim()), homeActivities: acts.map(({ templateId, goalKey, frequency, note, durationMinutes, schedule }) => ({ templateId, goalKey, frequency, note, durationMinutes, schedule })), version: v.version }), 'Draft saved.');
  return (
    <div className="space-y-4" data-testid={`plan-version-${v.number}`}>
      <div className="flex flex-wrap items-center gap-2"><Pill tone={STATUS[v.status][1]} testId="plan-version-status">{`Version ${v.number} · ${STATUS[v.status][0]}`}</Pill><span className="text-[13px] text-brand-inkMuted">by {v.author}</span></div>
      {v.reviewNotes.map((n, i) => <FormAlert key={i} tone="info" testId={`review-note-${i}`}>Supervisor review: {n.comment}</FormAlert>)}
      <PlanEvidenceTrail version={v} origin={source} observations={ws.observations} />
      <SavedHomePlanPreview key={v.id} version={v} templates={templateWs.templates}
        title={planTitle} service={service} origin={source} unsaved={unsavedPlanEdits} />
      <GoalCheckpointPanel centerId={centerId} version={v} ws={ws} editable={edit}
        unsavedPlanEdits={unsavedPlanEdits || otherPlanDirty} run={run} />
      <label className="block text-[14px] font-medium">Plan summary<textarea className={`mt-1 ${input}`} rows={3} value={summary} disabled={!edit} onChange={(e) => setSummary(e.target.value)} data-testid="plan-summary" /></label>
      <div>
        <h3 className="text-[15px] font-semibold">Goals</h3>
        <ul className="mt-2 space-y-2">{goals.map((g, i) => <GoalRow key={g.key} i={i} g={g} planId={planId} disabled={!edit} onChange={(n) => setGoals(goals.map((x, j) => (j === i ? n : x)))} onRemove={() => setGoals(goals.filter((_, j) => j !== i))} />)}</ul>
        {!goals.length && <p className="text-[14px] text-brand-inkMuted" data-testid="goals-empty">No goals yet.</p>}
        {edit && <Button size="sm" variant="secondary" className="mt-2" onClick={() => setGoals([...goals, { key: `g${Date.now().toString(36)}`, title: '', measure: 'percent', baseline: 0, target: 80 }])} data-testid="goal-add"><Plus size={15} aria-hidden="true" />Add goal</Button>}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">Home activities</h3>
        <ul className="mt-2 space-y-2">
          {acts.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-control border border-border-light p-2 text-[14px]" data-testid={`home-activity-${i}`}>
              <span className="min-w-0 flex-1 font-semibold">{a.snapshot?.title ?? templateWs.templates.find((t) => t.id === a.templateId)?.title ?? 'Activity (library entry unavailable)'}</span>
              <label className="min-w-[170px] flex-1 text-[12px] text-brand-inkMuted">Linked goal (plan v{v.number})
                <select aria-label={`Linked goal for activity ${i + 1}`} data-testid={`home-activity-goal-${i}`} className={`mt-1 ${input}`} value={a.goalKey ?? ''} disabled={!edit} onChange={(e) => setActs(prev => prev.map((x, j) => j === i ? { ...x, goalKey: e.target.value || undefined } : x))}>
                  <option value="">Not linked{legacyTemplateIds.has(a.templateId) ? ' (existing draft)' : ' — select before saving'}</option>
                  {goals.filter(g => g.title.trim()).map(g => <option key={g.key} value={g.key}>{g.title}</option>)}
                </select>
              </label>
              {!a.schedule && <input aria-label="How often (legacy frequency)" className={`${input} max-w-[180px]`} value={a.frequency} disabled={!edit} onChange={(e) => setActs(acts.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />}
              <HomeScheduleFields schedule={a.schedule} disabled={!edit} index={i}
                onChange={schedule => setActs(prev => prev.map((x, j) =>
                  j === i ? { ...x, schedule, frequency: schedule ? (schedule.cadence === 'WEEKLY' ? 'Weekly calendar draft' : 'Monthly calendar draft') : 'As directed (undated)' } : x))} />
              <HomeActivityDetails activity={a} templates={templateWs.templates} editable={edit} index={i}
                onDurationChange={durationMinutes => setActs(prev => prev.map((x, j) => j === i ? { ...x, durationMinutes } : x))}
                onInstructionsChange={note => setActs(prev => prev.map((x, j) =>
                  j === i ? { ...x, note } : x))} />
              {edit && <button type="button" aria-label="Remove activity" onClick={() => setActs(acts.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-control hover:bg-surface-subtle"><Trash2 size={16} aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
        {edit && <div className="mt-2 max-w-sm space-y-2">
          <SelectField label="Add from the activity library" value="" testId="home-activity-add" onChange={(id) => id && setActs([...acts, { templateId: id, frequency: '3 times a week' }])}
            options={[{ value: '', label: 'Choose an activity' }, ...(searchedTemplates ?? templateWs.templates).filter(t => t.service === service && !acts.some(a => a.templateId === t.id)).map(t => ({ value: t.id, label: `${t.title} · ${serviceLabel(t.service)}` }))]} />
          <label className="block text-[12px] font-medium">Find an activity beyond the first library page
            <input className={`mt-1 ${input}`} value={templateSearch} onChange={e => { setTemplateSearch(e.target.value); setSearchedTemplates(null); setTemplateNextOffset(null); }} placeholder="Search title or age band" data-testid="plan-template-search" />
          </label>
          <Button size="sm" variant="secondary" disabled={templateLoading} onClick={() => void findTemplates()} data-testid="plan-template-find">{templateLoading ? 'Searching…' : 'Search full activity library'}</Button>
          {templateNextOffset !== null && <Button size="sm" variant="secondary" disabled={templateLoading} onClick={() => void findTemplates(true)} data-testid="plan-template-more">Load more matching activities</Button>}
          {templateError && <p role="alert" className="text-[12px] text-status-caution">{templateError}</p>}
          {searchedTemplates?.length === 0 && <p role="status" className="text-[12px]">No matching activities for this plan specialty.</p>}
        </div>}
      </div>
      <HomePracticeCalendar key={v.id} activities={acts} goals={goals} templates={templateWs.templates}
        versionNumber={v.number} timezone={ws.timezone} unsaved={unsavedPlanEdits} />
      {edit && <div className="space-y-2 rounded-card border border-border-light bg-surface-subtle p-4" data-testid="home-plan-evidence-assist">
        <h3 className="text-[16px] font-semibold">Draft activity shortlist</h3>
        <p className="text-[13px] text-brand-inkMuted">Specialty-filtered local library, NOT AI advice or approved home practice. The therapist must check each goal, age and safety. No automatic family sharing.</p>
        <Button variant="secondary" onClick={()=>setSuggestOpen(!suggestOpen)} data-testid="home-assist-toggle">{suggestOpen?'Hide suggestions':'Review activity suggestions'}</Button>
        {suggestOpen && draftHomeActivitySuggestions(ws,service,acts).map(item=><div key={item.templateId} className="flex flex-wrap items-center gap-3 rounded-control border border-border-light bg-white p-3">
          <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">{item.title}</p><p className="text-[12px] text-brand-inkMuted">{item.reason}</p></div>
          <Button variant="secondary" size="sm" data-testid={'home-assist-add-'+item.templateId} onClick={()=>setActs(prev=>prev.some(a=>a.templateId===item.templateId)?prev:[...prev,item.proposed])}>Add to draft</Button>
        </div>)}
        {suggestOpen && draftHomeActivitySuggestions(ws,service,acts).length===0 && <p className="text-[13px]">No further centre activity templates for this specialty.</p>}
        <p className="text-[12px] text-brand-inkMuted">Suggestions require Save draft to persist; signing and release remain disabled.</p>
      </div>}
      {edit && <HomePlanHandoff result={handoff} versionNumber={v.number} />}
      <div className="flex flex-wrap items-start gap-2">
        {edit && <div>
          {unlinkedNew && <p role="status" className="mb-2 text-[12px] text-brand-inkMuted" data-testid="home-activity-unlinked">Choose a specific plan goal for each newly added activity before saving.</p>}
          {invalidDuration && <p role="status" className="mb-2 text-[12px] text-status-caution" data-testid="home-activity-invalid-duration">Plan-specific durations must be whole numbers between 1 and 120 minutes.</p>}
          {invalidSchedule && <p role="status" className="mb-2 text-[12px] text-status-caution" data-testid="home-activity-invalid-schedule">Complete or remove invalid dated schedules before saving.</p>}
          <Button disabled={unlinkedNew || invalidSchedule || invalidDuration} onClick={() => void save()} data-testid="plan-save">Save draft</Button>
        </div>}
        {edit && <Button variant="secondary" disabled={!handoff.canSendSavedDraft}
          onClick={() => { if (!handoff.canSendSavedDraft) return;
            void run(() => clinicalApi.submit(centerId, v.id, v.version), 'Saved draft sent to the clinical supervisor for review.'); }}
          data-testid="plan-submit">Send saved draft for review</Button>}
        {ws.canEdit && v.mine && ['WITHDRAWN','FROZEN_INTERNAL'].includes(v.status) && <Button variant="secondary" onClick={() => void run(() => clinicalApi.newVersion(centerId, planId), 'New draft version started.')} data-testid="plan-new-version">Start a new version</Button>}
        <Button variant="ghost" onClick={() => { if (preview) setPreview(null); else void run(async () => setPreview(await clinicalApi.familyPreview(centerId, v.id)), 'Immutable internal preview generated.'); }} data-testid="plan-family-preview">{preview ? 'Hide family preview' : 'Preview as family'}</Button>
        <a href="/app/governance" className="p-2 text-[14px] text-brand-action underline">Version history & explicit withdrawal</a>
        <LockedAction id={`approve-${v.id}`} label="Approve and release" reason={LOCKED_REASON} />
      </div>
      {ws.canReview && v.status === 'IN_REVIEW' && (
        <Card className="space-y-3 p-4" testId="review-panel">
          <ReasonField value={comment} onChange={setComment} testId="review-comment" label="Review comments for the therapist" />
          <Button variant="secondary" onClick={() => void (async () => { if (await run(() => clinicalApi.giveBack(centerId, v.id, comment.trim(), v.version), 'Draft returned to the therapist with your comments.')) setComment(''); })()} data-testid="review-return">Return to draft with comments</Button>
        </Card>
      )}
      {preview && (
        <div className="theme-family-light space-y-3 rounded-card bg-fam-canvas p-4 text-fam-ink" data-testid="family-preview">
          <p className="text-[13px] font-semibold">{preview.notice}</p>
          {preview.activities.map((a, i) => { const t = a.template; return t ? <ActivityCard key={i} t={t} tone="family" extra={a.frequency} /> : null; })}
          {!preview.activities.length && <p className="text-[14px]">No home activities in this frozen preview.</p>}<p className="break-all text-[12px]">Snapshot: {preview.snapshotId} · SHA-256: {preview.fingerprint}</p>
        </div>
      )}
    </div>
  );
}

export function PlansPanel({ centerId, ws, run, pagination }: { centerId: string; ws: Workspace; run: Run;
  pagination: { hasMore: boolean; loading: boolean; error: string; load: () => Promise<void> } }) {
  const [f, setF] = useState({ service: ws.child.services[0] ?? '', title: '' });
  const [refreshRevision, setRefreshRevision] = useState(0);
  // Parent keeps older pages and their evidence across clinical tabs. Its run
  // handler refreshes those pages after writes without unmounting this editor.
  const runPlanAction: Run = async (fn, ok) => {
    const success = await run(fn, ok);
    if (success) setRefreshRevision(n => n + 1);
    return success;
  };
  const [linkedEvidenceNote, setLinkedEvidenceNote] = useState('');
  const [historicGoal, setHistoricGoal] = useState<{ planId: string; versionId: string; goalKey: string } | null>(null);
  const [dirtyVersions, setDirtyVersions] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((versionId: string, dirty: boolean) => {
    setDirtyVersions(prev => prev[versionId] === dirty ? prev : { ...prev, [versionId]: dirty });
  }, []);
  useEffect(() => {
    const inspectHashTarget = () => {
    // Saved report evidence can refer to a historical plan version. Never
    // silently map it onto the latest goal or measurements of that plan.
    const hash = window.location.hash;
    if (!hash.startsWith('#plan?')) return;
    const params = new URLSearchParams(hash.slice('#plan?'.length));
    const versionId = params.get('version'), goalKey = params.get('goal');
    if (!versionId || !goalKey) return;
    const plan = ws.plans.find(p => p.versions.some(v => v.id === versionId &&
      v.goals.some(g => g.key === goalKey)));
    if (!plan) {
      setLinkedEvidenceNote('This saved report goal refers to a plan version not visible in this workspace.');
      return;
    }
    if (plan.versions[0]?.id === versionId) {
      document.getElementById(goalReviewAnchor(plan.id, goalKey))?.scrollIntoView({ block: 'center' });
      setLinkedEvidenceNote('Opened the matching current plan goal. Evidence remains version-specific.');
    } else {
      setHistoricGoal({ planId: plan.id, versionId, goalKey });
      setLinkedEvidenceNote('Historical source goal selected below in its exact saved plan version. Current evidence cannot be substituted.');
    }
    };
    inspectHashTarget();
    window.addEventListener('hashchange', inspectHashTarget);
    return () => window.removeEventListener('hashchange', inspectHashTarget);
  }, [ws]);
  return (
    <div className="space-y-5" data-testid="plans-panel" data-refresh-revision={refreshRevision}>
      {linkedEvidenceNote && <p role="status" className="rounded-control border border-border-light bg-surface-subtle p-3 text-[13px]" data-testid="report-goal-navigation-note">{linkedEvidenceNote}</p>}
      <GoalReviewWorklist ws={ws} />
      {ws.plans.map((p) => {
        const current = p.versions[0];
        return (
          <Card key={p.id} className="p-5 md:p-6" testId={`plan-${p.id}`}>
            <h2 className="text-[18px] font-semibold">{p.title}</h2>
            <p className="mb-4 text-[13px] text-brand-inkMuted">{serviceLabel(p.service)} · {p.versions.length} version{p.versions.length > 1 ? 's' : ''}</p>
            <VersionEditor centerId={centerId} ws={ws} planId={p.id} planTitle={p.title} service={p.service}
              v={current} source={p.source} run={runPlanAction} onDirtyChange={onDirtyChange}
              otherPlanDirty={Object.entries(dirtyVersions).some(([id, dirty]) => id !== current.id && dirty)} />
            <PlanVersionHistory key={p.id} plan={p} templates={ws.templates} timezone={ws.timezone}
              target={historicGoal?.planId === p.id ? { versionId: historicGoal.versionId, goalKey: historicGoal.goalKey } : undefined} />
          </Card>
        );
      })}
      {pagination.hasMore && <Button variant="secondary" disabled={pagination.loading} onClick={() => void pagination.load()} data-testid="plans-load-more">{pagination.loading ? 'Loading earlier plans…' : 'Load earlier plans'}</Button>}
      {pagination.error && <p role="alert" className="text-[13px] text-status-caution" data-testid="plans-load-error">{pagination.error}</p>}
      {!ws.plans.length && <p className="text-[14px] text-brand-inkMuted" data-testid="plans-empty">No therapy plan yet.</p>}
      {ws.canEdit && (
        <Card className="grid grid-cols-1 items-end gap-3 p-5 sm:grid-cols-[180px_1fr_auto]" testId="plan-create">
          <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service })} testId="plan-service" options={ws.child.services.map((s) => ({ value: s, label: serviceLabel(s) }))} />
          <Field label="New plan title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} testId="plan-title" />
          <Button onClick={() => void (async () => { if (await runPlanAction(() => clinicalApi.plan(centerId, ws.child.id, f), 'Plan created with a first draft.')) setF({ ...f, title: '' }); })()} data-testid="plan-create-button">Create plan</Button>
        </Card>
      )}
    </div>
  );
}
