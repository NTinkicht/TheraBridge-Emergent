'use client';

import { useEffect, useRef, useState } from 'react';
import { GitCompareArrows, History } from 'lucide-react';
import { Card, Pill } from '@/components/design/ui';
import type { HomeActivity, PlanVersion, Template } from '@/lib/clinical';
import { comparePlanVersions, type ChangeKind } from '@/lib/plan-version-compare';
import { scheduleDescription } from '@/lib/home-schedule';
import { GoalCheckpointComparison } from './GoalCheckpointComparison';
import { HomePracticeCalendar } from './HomePracticeCalendar';

type Plan = { id: string; title: string; service: string; versions: PlanVersion[] };
const statusNames: Record<PlanVersion['status'], string> = {
  DRAFT: 'Draft', IN_REVIEW: 'In review', SUPERSEDED: 'Superseded',
  RETURNED_FOR_REVISION: 'Returned for revision', WITHDRAWN: 'Withdrawn',
  FROZEN_INTERNAL: 'Frozen internal (not approved)',
};
const changeNames: Record<ChangeKind, string> = {
  added: 'Added', removed: 'Removed', changed: 'Changed', unchanged: 'Unchanged',
};
const shortDate = (value: string) => value?.slice(0, 10) || 'Not recorded';
const field = 'min-h-[44px] w-full rounded-control border border-border-strong bg-surface-white px-3 py-2 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action';

function activityDifferenceTitle(templateId: string, current: HomeActivity | null, previous: HomeActivity | null, templates: Template[]): string {
  const savedTitle = current?.snapshot?.title ?? previous?.snapshot?.title;
  if (savedTitle) return savedTitle;
  const liveTitle = templates.find(t => t.id === templateId)?.title;
  return liveTitle ? 'Legacy activity — current-library title: ' + liveTitle : 'Historic activity (template unavailable)';
}


function ActivityText({ a, templates }: { a: HomeActivity; templates: Template[] }) {
  const currentLibraryTemplate = templates.find(x => x.id === a.templateId);
  // Use the immutable saved definition. A live template may have changed
  // since this plan version was written. Clearly label the legacy fallback.
  const t = a.snapshot ?? currentLibraryTemplate;
  return <span className="break-words">
    <span className="font-medium">{t?.title ?? 'Historic activity (template unavailable)'}</span>
    {' · '}{a.frequency} · linked goal: {a.goalKey || 'Not recorded'}{a.schedule && <span className="block text-brand-inkMuted">Planned cadence: {scheduleDescription(a.schedule)} (internal draft only)</span>}
    {a.note ? ' · '+a.note : ''}
    {!a.snapshot && <span className="text-brand-inkMuted"> · Legacy draft: title from current library, not a frozen snapshot</span>}
    {a.snapshot && <span className="block mt-1 text-brand-inkMuted" data-testid="plan-history-activity-snapshot">
      Saved activity definition: {a.snapshot.minutes} minutes · {a.snapshot.ageBand} ·
      Materials: {(a.snapshot.materials ?? []).join('; ') || 'None recorded'} ·
      Steps: {(a.snapshot.steps ?? []).join('; ') || 'None recorded'} ·
      Safety: {(a.snapshot.safety ?? []).join('; ') || 'None recorded'}
    </span>}
  </span>;
}

/**
 * Read-only inspection of versions from a SINGLE already-authorized plan.
 * Never uses mutable endpoints, copies goal measurements, or infers approval.
 */
export function PlanVersionHistory({ plan, templates, target }: { plan: Plan; templates: Template[];
  target?: { versionId: string; goalKey: string };
}) {
  const versions = [...plan.versions].sort((a, b) => b.number - a.number);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [inspectId, setInspectId] = useState(versions[1]?.id ?? versions[0]?.id ?? '');
  const [beforeId, setBeforeId] = useState(versions[1]?.id ?? versions[0]?.id ?? '');
  const [afterId, setAfterId] = useState(versions[0]?.id ?? '');
  const inspect = versions.find(v => v.id === inspectId) ?? versions[0];
  const before = versions.find(v => v.id === beforeId) ?? versions[versions.length - 1];
  const after = versions.find(v => v.id === afterId) ?? versions[0];
  const difference = before && after && before.id !== after.id ? comparePlanVersions(before, after) : null;
  const targetVersion = target ? versions.find(v => v.id === target.versionId &&
    v.goals.some(g => g.key === target.goalKey)) : undefined;
  useEffect(() => {
    if (!targetVersion) return;
    setInspectId(targetVersion.id);
    if (detailsRef.current) detailsRef.current.open = true;
  }, [targetVersion?.id, target?.goalKey]);
  useEffect(() => {
    if (!targetVersion || inspectId !== targetVersion.id) return;
    const frame = requestAnimationFrame(() => {
      const id = 'plan-history-goal-' + plan.id + '-' + targetVersion.id + '-' + target!.goalKey;
      const goal = document.getElementById(id);
      goal?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      goal?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [targetVersion?.id, target?.goalKey, plan.id, inspectId]);
  if (versions.length < 2) return null;

  return (
    <details ref={detailsRef} className="mt-5 rounded-card border border-border-light bg-surface-subtle" data-testid="plan-version-history">
      <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 px-4 py-3 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action">
        <History size={18} className="shrink-0 text-brand-action" aria-hidden="true" />
        Version history & comparison · {versions.length} versions
      </summary>
      <div className="space-y-5 border-t border-border-light p-4 md:p-5">
        <p className="text-[13px] text-brand-inkMuted">
          Internal, read-only drafts. Version status is shown as recorded; superseded or frozen drafts are never approved or released.
          Measurements from different plan versions must be reviewed separately in Progress.
        </p>
        <section aria-label="Saved plan versions">
          <h3 className="text-[15px] font-semibold">Saved versions</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="plan-history-list">
            {versions.map(v => <li key={v.id}>
              <button type="button" onClick={() => setInspectId(v.id)} aria-pressed={inspectId === v.id}
                className={`w-full rounded-control border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${inspectId === v.id ? 'border-brand-action bg-brand-actionTint' : 'border-border-light bg-surface-white'}`}
                data-testid={`plan-history-select-${v.number}`}>
                <span className="block text-[14px] font-semibold">Version {v.number} · {statusNames[v.status]}</span>
                <span className="mt-1 block text-[12px] text-brand-inkMuted">Author: {v.author} · Updated: {shortDate(v.updatedAt)}</span>
              </button>
            </li>)}
          </ul>
        </section>
        {inspect && <Card className="space-y-3 p-4" testId="plan-history-inspection">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-semibold">Version {inspect.number} snapshot</h3>
            <Pill tone="neutral">{statusNames[inspect.status]}</Pill>
          </div>
          <p className="whitespace-pre-wrap break-words text-[13px]">{inspect.summary || 'No summary recorded.'}</p>
          <h4 className="text-[14px] font-semibold">Goal definitions ({inspect.goals.length})</h4>
          {inspect.goals.length ? <ul className="list-inside list-disc space-y-1 text-[13px]">
            {inspect.goals.map(g => <li key={g.key}
              id={'plan-history-goal-' + plan.id + '-' + inspect.id + '-' + g.key} tabIndex={-1}
              className="scroll-mt-20 rounded-control focus-visible:outline-2 focus-visible:outline-brand-action"
              data-testid={'plan-history-goal-' + g.key}>{g.title} · {g.measure} · baseline {g.baseline} · target {g.target} · {g.horizon === 'SHORT_TERM' ? 'Short-term' : g.horizon === 'LONG_TERM' ? 'Long-term' : 'Uncategorized'}{g.targetOn ? ' · Target ' + g.targetOn : ''}{g.reviewOn ? ' · Review ' + g.reviewOn : ''}</li>)}
          </ul> : <p className="text-[13px] text-brand-inkMuted">No goals recorded.</p>}
          <h4 className="text-[14px] font-semibold">Draft home activities ({inspect.homeActivities.length})</h4>
          {inspect.homeActivities.length ? <ul className="list-inside list-disc space-y-1 text-[13px]">
            {inspect.homeActivities.map((a, i) => <li key={a.templateId+'-'+i}><ActivityText a={a} templates={templates} /></li>)}
          </ul> : <p className="text-[13px] text-brand-inkMuted">No draft activities recorded.</p>}
          <HomePracticeCalendar key={inspect.id} activities={inspect.homeActivities} goals={inspect.goals}
            templates={templates} versionNumber={inspect.number} timezone="Asia/Dubai" />
          {!!inspect.goalCheckpoints?.length && <>
            <h4 className="text-[14px] font-semibold">Recorded internal clinician goal checkpoints</h4>
            <ul className="space-y-2 text-[13px]" data-testid="plan-history-checkpoints">
              {inspect.goalCheckpoints.map((checkpoint, i) => <li key={checkpoint.at+'-'+i}
                className="rounded-control border border-border-light bg-surface-white p-3">
                <p className="font-semibold">{inspect.goals.find(g => g.key === checkpoint.goalKey)?.title ?? checkpoint.goalKey} · {checkpoint.reviewedOn}</p>
                <p className="whitespace-pre-wrap break-words">{checkpoint.summary}</p>
                <p className="break-all text-[12px] text-brand-inkMuted">{checkpoint.observationIds.length} explicit source observation(s) · internal, not approved</p>
              </li>)}
            </ul>
          </>}
          <GoalCheckpointComparison key={inspect.id} version={inspect} />
          {inspect.reviewNotes.length > 0 && <>
            <h4 className="text-[14px] font-semibold">Recorded review notes</h4>
            <ul className="space-y-2 text-[13px]">{inspect.reviewNotes.map((note, i) =>
              <li key={i} className="rounded-control bg-surface-subtle p-2">{shortDate(note.at)} · {note.comment}</li>)}</ul>
          </>}
        </Card>}
        <section className="space-y-3" aria-labelledby="plan-compare-heading">
          <h3 id="plan-compare-heading" className="flex items-center gap-2 text-[16px] font-semibold"><GitCompareArrows size={18} className="text-brand-action" aria-hidden="true" />Compare two saved versions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-semibold">Previous version
              <select className={`mt-1 ${field}`} value={before?.id} onChange={e => setBeforeId(e.target.value)} data-testid="plan-compare-before">
                {versions.map(v => <option key={v.id} value={v.id}>Version {v.number} · {statusNames[v.status]}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-semibold">Compared version
              <select className={`mt-1 ${field}`} value={after?.id} onChange={e => setAfterId(e.target.value)} data-testid="plan-compare-after">
                {versions.map(v => <option key={v.id} value={v.id}>Version {v.number} · {statusNames[v.status]}</option>)}
              </select>
            </label>
          </div>
          {!difference ? <p role="status" className="text-[13px] text-brand-inkMuted">Choose two different versions to compare their saved definitions.</p> : <div className="space-y-3" data-testid="plan-history-comparison">
            <p className="text-[13px] text-brand-inkMuted">Version {difference.from} → version {difference.to}. Definition changes only; not an outcome or improvement score.</p>
            <p className="text-[13px]">Plan summary: <strong>{difference.summaryChanged ? 'Changed' : 'Unchanged'}</strong></p>
            <h4 className="text-[14px] font-semibold">Goal changes</h4>
            {difference.goals.filter(g => g.kind !== 'unchanged').length ? <ul className="space-y-2">
              {difference.goals.filter(g => g.kind !== 'unchanged').map(g => <li key={g.key} className="rounded-control border border-border-light bg-surface-white p-3 text-[13px]">
                <strong>{changeNames[g.kind]}:</strong> {g.current?.title ?? g.previous?.title ?? g.key}
                {g.previous && <p className="mt-1 text-brand-inkMuted">Previous: {g.previous.measure}; baseline {g.previous.baseline}, target {g.previous.target} · {g.previous.horizon ?? 'No horizon'} · target date {g.previous.targetOn ?? '—'} · review {g.previous.reviewOn ?? '—'}</p>}
                {g.current && <p className="text-brand-inkMuted">Compared: {g.current.measure}; baseline {g.current.baseline}, target {g.current.target} · {g.current.horizon ?? 'No horizon'} · target date {g.current.targetOn ?? '—'} · review {g.current.reviewOn ?? '—'}</p>}
                {g.definitionChanged && <p className="mt-1 font-medium text-status-caution" data-testid="goal-definition-warning">Goal definition changed. Do not combine measurements across versions without a separately reviewed continuity decision.</p>}
              </li>)}
            </ul> : <p className="text-[13px] text-brand-inkMuted">No goal definition changes.</p>}
            <h4 className="text-[14px] font-semibold">Draft activity changes</h4>
            {difference.activities.filter(a => a.kind !== 'unchanged').length ? <ul className="space-y-2">
              {difference.activities.filter(a => a.kind !== 'unchanged').map(a => <li key={a.templateId} className="rounded-control border border-border-light bg-surface-white p-3 text-[13px]">
                <strong>{changeNames[a.kind]}: </strong>{activityDifferenceTitle(a.templateId, a.current, a.previous, templates)}
                {a.previous && <p className="mt-1 text-brand-inkMuted">Previous: <ActivityText a={a.previous} templates={templates} /></p>}
                {a.current && <p className="text-brand-inkMuted">Compared: <ActivityText a={a.current} templates={templates} /></p>}
              </li>)}
            </ul> : <p className="text-[13px] text-brand-inkMuted">No home activity changes.</p>}
          </div>}
        </section>
      </div>
    </details>
  );
}
