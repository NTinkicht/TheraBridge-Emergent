'use client';

import Link from 'next/link';
import { FileText, GitBranch, ClipboardList } from 'lucide-react';
import type { PlanOrigin, PlanVersion, Workspace } from '@/lib/clinical';
import { goalEvidenceRows } from '@/lib/plan-evidence';

// Staff-only read projection from an authorized Child 360° workspace.
// A source report is a provenance pointer, NOT a grant, diagnosis, approval,
// evidence transfer, or a guardian-facing report.
export function PlanEvidenceTrail({ version, origin, observations }: {
  version: PlanVersion; origin?: PlanOrigin | null; observations: Workspace['observations'];
}) {
  const rows = goalEvidenceRows(version.goals, observations, version.id, origin);
  const total = rows.reduce((count, row) => count + row.count, 0);
  return <section aria-label="Plan evidence trace" className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-4"
    data-testid="plan-evidence-trail">
    <div className="flex items-center gap-2">
      <GitBranch size={17} className="text-brand-action" aria-hidden="true" />
      <h3 className="text-[15px] font-semibold">Sources & recorded evidence</h3>
    </div>
    <p className="text-[12px] text-brand-inkMuted">
      Staff-only trace for this exact plan version. Counts indicate existing observations, not improvement, effectiveness or approval. No observations are copied from a report.
    </p>
    {origin ? <div className="space-y-2 rounded-control border border-border-light bg-surface-white p-3" data-testid="plan-source-report">
      <div className="flex items-center gap-2 text-[13px] font-semibold"><FileText size={16} aria-hidden="true" />Originating saved report</div>
      <p className="break-words text-[13px]">{origin.reportTitle} · Saved version {origin.reportVersionNumber}</p>
      <p className="text-[12px] text-brand-inkMuted">
        Linked during internal draft creation on {origin.draftedAt.slice(0, 10)}. Not signed, approved or released.
        {version.id !== origin.originalPlanVersionId ? ' This is a later plan version: original report goal mappings are not assumed to carry forward.' : ''}
      </p>
      <Link href={`/app/reports/${origin.reportId}`}
        className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-brand-action underline"
        data-testid="plan-source-report-open">Open source report (permission required)</Link>
    </div> : <p className="text-[12px] text-brand-inkMuted" data-testid="plan-source-none">
      No report-to-plan source is recorded for this plan. Manual or legacy drafts do not receive an inferred origin.
    </p>}
    <div className="flex items-center gap-2 text-[12px] font-semibold">
      <ClipboardList size={15} className="text-brand-action" aria-hidden="true" />
      {rows.length} goal(s) · {total} recorded observation(s) for version {version.number}
    </div>
    {!rows.length && <p className="text-[12px] text-brand-inkMuted">No goals are defined in this version.</p>}
    <ul className="space-y-2" data-testid="plan-evidence-goals">
      {rows.map(({ goal, count, records, source }) => <li key={goal.key}
        className="space-y-2 rounded-control border border-border-light bg-surface-white p-3" data-testid={`plan-evidence-goal-${goal.key}`}>
        <p className="text-[13px] font-semibold">{goal.title}</p>
        <p className="text-[12px] text-brand-inkMuted">
          Goal key: {goal.key} · {goal.measure} · baseline {goal.baseline} · target {goal.target}
        </p>
        {source && <p className="break-all text-[12px] text-brand-inkMuted" data-testid={`plan-evidence-source-${goal.key}`}>
          Origin: saved report goal {source.sourceGoalKey} from plan-version source {source.sourcePlanVersionId}.
          This is a definition reference only.
        </p>}
        <p className="text-[12px]" data-testid={`plan-evidence-count-${goal.key}`}>
          {count === 0 ? 'No observations recorded for this goal in this plan version.' :
            count + ' observation(s) recorded in this plan version.'}
        </p>
        {records.length > 0 && <details className="text-[12px]" data-testid={`plan-evidence-records-${goal.key}`}>
          <summary className="min-h-[40px] cursor-pointer font-semibold text-brand-action">
            Inspect {records.length} source record(s)
          </summary>
          <ul className="mt-2 space-y-1">
            {records.map(o => <li key={o.id} className="break-words rounded-control bg-surface-subtle px-3 py-2">
              <span className="font-semibold">{o.observedOn}</span> · Recorded value {o.value} ({goal.measure})
              {o.author ? ' · ' + o.author : ''}
              {o.sessionNoteId && <span className="block text-brand-inkMuted">Linked session note on record</span>}
              {o.note && <span className="block whitespace-pre-wrap">{o.note}</span>}
            </li>)}
          </ul>
        </details>}
      </li>)}
    </ul>
  </section>;
}
