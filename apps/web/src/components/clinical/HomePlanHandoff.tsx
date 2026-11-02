'use client';

import { ClipboardList } from 'lucide-react';
import type { HandoffSummary } from '@/lib/home-plan-handoff';

export function HomePlanHandoff({ result, versionNumber }: { result: HandoffSummary; versionNumber: number }) {
  return <section className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-4"
    data-testid="home-plan-handoff" aria-label="Home-plan draft handoff checklist">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <ClipboardList size={18} className="text-brand-action" aria-hidden="true" />
        Draft handoff checklist
      </h3>
      <span className="rounded-control border border-border-light bg-surface-white px-2 py-1 text-[12px] text-brand-inkMuted">
        Plan version {versionNumber}
      </span>
    </div>
    <p className="text-[12px] text-brand-inkMuted">
      A planning completeness check, not a clinical safety review, approval, consent or release.
      No observations or outcome claims are inferred. Clinicians must evaluate all goals, instructions and safeguards themselves.
    </p>
    {result.blockingReason ? <p role="status" className="rounded-control border border-border-light bg-status-cautionSurface p-3 text-[13px]"
      data-testid="home-plan-handoff-blocked">
      <strong>Send for review is unavailable.</strong> {result.blockingReason}
      Saving or discarding local edits is required to ensure the submitted version matches the version on screen.
    </p> : <p role="status" className="rounded-control border border-border-light bg-surface-white p-3 text-[13px]"
      data-testid="home-plan-handoff-saved">
      The version on screen has no pending plan edits. You can request supervisor review of the saved draft;
      this does not mean the content is complete or clinically approved.
    </p>}
    <p className="text-[12px] text-brand-inkMuted" data-testid="home-plan-handoff-count">
      {result.goalCount} goal(s) · {result.activityCount} home activity/activities · {result.attention.length} planning item type(s) to inspect
    </p>
    {result.attention.length ? <ul className="grid gap-2 sm:grid-cols-2" data-testid="home-plan-handoff-attention">
      {result.attention.map(item =>
        <li key={item.id} data-testid={'home-plan-handoff-'+item.id}
          className="min-w-0 rounded-control border border-border-light bg-surface-white p-3 text-[12px]">
          <span className="font-semibold">{item.count} to check</span>
          <p className="mt-1 break-words text-brand-inkMuted">{item.description}</p>
        </li>)}
    </ul> : <p className="text-[12px] text-brand-inkMuted" data-testid="home-plan-handoff-no-attention">
      No missing planning fields detected by this checklist. Clinical review is still required.
    </p>}
    <p className="text-[12px] text-brand-inkMuted">
      Attention items are advisory, not automated medical decisions. Existing server-side validations remain authoritative.
    </p>
  </section>;
}
