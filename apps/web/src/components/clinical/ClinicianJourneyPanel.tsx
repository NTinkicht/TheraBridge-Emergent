'use client';

import { ArrowRight, ClipboardList, FileText, House, TrendingUp } from 'lucide-react';
import type { Workspace } from '@/lib/clinical';
import { clinicianJourneySummary } from '@/lib/clinician-journey';

type Destination = 'plan' | 'progress' | 'reports';
const destinations = [
  { key: 'goals', number: '01', title: 'Plan goals',
    description: 'Review saved objectives, version boundaries and review dates.',
    destination: 'plan' as const, icon: ClipboardList },
  { key: 'evidence', number: '02', title: 'Measured evidence',
    description: 'Inspect recorded observations tied to the exact goal version.',
    destination: 'progress' as const, icon: TrendingUp },
  { key: 'reports', number: '03', title: 'Draft reports',
    description: 'Review authored text, source references and saved report history.',
    destination: 'reports' as const, icon: FileText },
  { key: 'home', number: '04', title: 'Home-plan drafts',
    description: 'Inspect goal-linked activities and internal practice schedules.',
    destination: 'plan' as const, icon: House },
];

export function ClinicianJourneyPanel({ ws, onNavigate }: {
  ws: Workspace; onNavigate: (tab: Destination) => void;
}) {
  const count = clinicianJourneySummary(ws);
  const extra: Record<string, string> = {
    goals: `${count.currentGoals} goal(s) in ${count.currentPlanVersions} current plan version(s)`,
    evidence: `${count.currentGoalObservations} recorded observation(s) for current version goals`,
    reports: 'Report status loaded only when the authorized Reports tab opens',
    home: `${count.internalHomeActivities} draft activity/activities · ${count.scheduledHomeActivities} with a recorded schedule`,
  };
  return <section className="space-y-3 rounded-card border border-border-light bg-surface-white p-4 sm:p-5"
    data-testid="clinician-care-journey" aria-labelledby="clinician-care-journey-heading">
    <div className="space-y-1">
      <h3 id="clinician-care-journey-heading" className="text-[17px] font-semibold">Follow the clinician care journey</h3>
      <p className="text-[12px] text-brand-inkMuted">
        Move between the existing permitted plan, progress and report workspaces for this child.
        Each destination retains the same authorized child context. No clinical approval,
        diagnosis, family release or treatment outcome is inferred from these record counts.
      </p>
    </div>
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {destinations.map(({key,number,title,description,destination,icon:Icon}) =>
        <li key={key} className="min-w-0">
          <button type="button" onClick={() => onNavigate(destination)}
            data-testid={`clinician-journey-${key}`}
            className="flex h-full min-h-[150px] w-full min-w-0 flex-col items-start gap-2 rounded-control border border-border-light bg-surface-subtle p-3 text-left hover:border-brand-action focus-visible:outline-2 focus-visible:outline-brand-action">
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-brand-inkMuted">{number}</span>
              <Icon size={18} className="text-brand-action" aria-hidden="true"/>
            </span>
            <span className="break-words text-[14px] font-semibold">{title}</span>
            <span className="break-words text-[12px] text-brand-inkMuted">{description}</span>
            <span className="mt-auto flex w-full items-center justify-between gap-2 pt-1 text-[11px] text-brand-inkMuted">
              <span className="min-w-0 break-words">{extra[key]}</span>
              <ArrowRight size={15} className="shrink-0 text-brand-action" aria-hidden="true"/>
            </span>
          </button>
        </li>)}
    </ol>
    <p className="text-[12px] text-brand-inkMuted">
      Activity schedules are internal drafts, not attended sessions or activities released to the family.
      Report counts and review status are never guessed from the child workspace.
    </p>
  </section>;
}
