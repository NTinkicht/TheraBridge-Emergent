'use client';

import Link from 'next/link';
import { ClipboardCheck, FileText } from 'lucide-react';
import type { PlanOrigin, PlanVersion, Template } from '@/lib/clinical';
import { savedPlanProjection } from '@/lib/saved-home-plan-preview';
import { scheduleDescription, scheduledDays, scheduleProblem } from '@/lib/home-schedule';

// Staff-only projection of the already authorized persisted version supplied
// by the workspace. Never read unsaved editor state or grant parent access.
export function SavedHomePlanPreview({ version, templates, origin, title, service, unsaved = false }: {
  version: PlanVersion;
  templates: Template[];
  origin?: PlanOrigin | null;
  title: string;
  service: string;
  unsaved?: boolean;
}) {
  const plan = savedPlanProjection(version, templates, origin);
  return <details className="rounded-card border border-border-light bg-surface-white"
    data-testid="saved-home-plan-preview">
    <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 p-3 text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-brand-action sm:p-4">
      <ClipboardCheck size={17} className="shrink-0 text-brand-action" aria-hidden="true"/>
      Inspect saved home-plan version {plan.number}
    </summary>
    <div className="space-y-4 border-t border-border-light p-3 sm:p-4"
      data-testid="saved-plan-preview-body">
      <div className="space-y-2">
        <p className="text-[16px] font-semibold break-words">{title}</p>
        <p className="break-words text-[12px] text-brand-inkMuted">
          {service} · Version {plan.number} · Revision {plan.revision} · {plan.status.replaceAll('_',' ')}
          {' · '}Saved at {plan.updatedAt.slice(0, 10)} · Author: {plan.author}
        </p>
        <p className="rounded-control border border-border-light bg-surface-subtle p-3 text-[12px] text-brand-inkMuted"
          data-testid="saved-plan-preview-disclaimer">
          Internal clinician inspection only. This renders the persisted version currently loaded in the authorized workspace,
          not an attested or approved record. No signing, consent, family distribution or clinical release.
        </p>
        {unsaved && <p role="status" className="rounded-control border border-border-light bg-status-cautionSurface p-3 text-[12px]"
          data-testid="saved-plan-preview-unsaved">
          The editor has unsaved changes. This view deliberately shows the previously saved version only;
          save or discard changes before requesting supervisor review.
        </p>}
      </div>
      <section className="space-y-2" aria-label="Saved plan summary">
        <h4 className="text-[14px] font-semibold">Saved plan summary</h4>
        <p className="whitespace-pre-wrap break-words text-[13px]" data-testid="saved-plan-preview-summary">
          {plan.summary || 'No saved summary.'}
        </p>
      </section>
      <section className="space-y-2" aria-label="Source report metadata">
        <h4 className="flex items-center gap-2 text-[14px] font-semibold">
          <FileText size={15} className="text-brand-action" aria-hidden="true"/>Report-to-plan provenance
        </h4>
        {plan.origin ? <div className="rounded-control border border-border-light bg-surface-subtle p-3 text-[12px]"
          data-testid="saved-plan-preview-report">
          <p className="break-words font-semibold">{plan.origin.reportTitle} · Report version {plan.origin.reportVersionNumber}</p>
          <p className="mt-1 text-brand-inkMuted">{plan.origin.goalMappingApplies
            ? 'Original version: only explicitly recorded report-to-goal definition links are displayed.'
            : 'Later plan version: source report remains an origin pointer. Original goal mappings are NOT inherited.'}</p>
          <Link href={`/app/reports/${plan.origin.reportId}`}
            className="mt-2 inline-flex min-h-[40px] items-center font-semibold text-brand-action underline">
            Inspect report (existing clinical permissions apply)
          </Link>
        </div> : <p className="text-[12px] text-brand-inkMuted" data-testid="saved-plan-preview-no-report">
          No source report recorded. A manual or legacy plan is not automatically attributed to a report.
        </p>}
      </section>
      <section className="space-y-2" aria-label="Saved plan goals">
        <h4 className="text-[14px] font-semibold">Goal definitions · {plan.goals.length}</h4>
        {plan.goals.length ? <ul className="grid gap-2 sm:grid-cols-2">
          {plan.goals.map(g => <li key={g.key}
            className="min-w-0 rounded-control border border-border-light bg-surface-subtle p-3 text-[12px]"
            data-testid="saved-plan-preview-goal">
            <p className="break-words font-semibold">{g.title}</p>
            <p className="mt-1 text-brand-inkMuted">{g.measure} · baseline {g.baseline} · target {g.target}</p>
            <p className="mt-1 text-brand-inkMuted">{g.horizon?.replace('_','-') ?? 'No objective horizon'}
              {' · '}Target date: {g.targetOn ?? 'not set'} · Review: {g.reviewOn ?? 'not set'}</p>
            {g.source && <p className="mt-1 break-all text-brand-inkMuted" data-testid="saved-plan-preview-origin-goal">
              Explicit report definition reference: goal {g.source.sourceGoalKey} in source plan-version {g.source.sourcePlanVersionId}.
              This is not copied evidence or a continuity claim.
            </p>}
          </li>)}
        </ul> : <p className="text-[12px] text-brand-inkMuted">No saved goals.</p>}
      </section>
      <section className="space-y-2" aria-label="Saved home activity definitions">
        <h4 className="text-[14px] font-semibold">Saved home activities · {plan.activities.length}</h4>
        {plan.activities.length ? <ul className="space-y-3">
          {plan.activities.map((a, index) => {
            const error = a.schedule ? scheduleProblem(a.schedule) : null;
            const dates = a.schedule && !error ? scheduledDays(a.schedule, 8) : [];
            return <li key={a.templateId+'-'+index}
              className="min-w-0 space-y-2 rounded-control border border-border-light bg-surface-subtle p-3 text-[12px]"
              data-testid="saved-plan-preview-activity">
              <p className="break-words text-[13px] font-semibold">{a.title}</p>
              <p className="text-brand-inkMuted">
                {a.durationMinutes !== null ? a.durationMinutes+' minutes · ' : 'Duration unavailable · '}
                {a.ageBand ?? 'Age band unavailable'} · {a.frequency}
              </p>
              {a.durationOverridden && <p className="text-brand-inkMuted" data-testid="saved-plan-duration-override">Plan-specific duration: {a.durationMinutes} min; unchanged template snapshot: {a.templateDurationMinutes ?? 'unavailable'} min.</p>}
              <p className="text-brand-inkMuted" data-testid="saved-plan-preview-source">
                {a.definitionSource === 'SAVED_SNAPSHOT' ? 'Server-saved activity snapshot for this version.' :
                  a.definitionSource === 'CURRENT_LIBRARY' ? 'Legacy fallback: current library content, NOT a saved definition.' :
                  'Saved activity definition unavailable; do not assume the current library matches history.'}
              </p>
              <p className="break-words">
                Linked goal: {a.linkedGoalTitle ?? (a.goalKey ? 'Missing in this exact version ('+a.goalKey+')' : 'Not linked (legacy draft)')}
              </p>
              {a.schedule && (error ? <p className="text-status-caution" data-testid="saved-plan-preview-invalid-schedule">
                Recorded schedule is invalid: {error}. No dates inferred.
              </p> : <div className="space-y-1">
                <p>Planned schedule: {scheduleDescription(a.schedule)}</p>
                <p className="text-brand-inkMuted">First planned dates: {dates.join(' · ') || 'No valid dates'}</p>
              </div>)}
              <p className="break-words">Materials: {a.materials.join(' · ') || 'Not recorded'}</p>
              <p className="break-words">Steps: {a.steps.join(' · ') || 'Not recorded'}</p>
              <p className="break-words">Safety guidance: {a.safety.join(' · ') || 'Not recorded — clinician review required'}</p>
              {a.note && <p className="whitespace-pre-wrap break-words font-medium"
                data-testid="saved-plan-preview-therapist-note">Therapist instructions: {a.note}</p>}
            </li>;
          })}
        </ul> : <p className="text-[12px] text-brand-inkMuted">No saved home activities.</p>}
      </section>
      <p className="text-[12px] text-brand-inkMuted">
        These are scheduled draft activities, not attended sessions, family tasks, progress measurements or
        approved treatment instructions. Only the existing protected workflow can change review status.
      </p>
    </div>
  </details>;
}
