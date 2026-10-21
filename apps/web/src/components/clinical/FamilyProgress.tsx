'use client';

import { Flag, Sprout } from 'lucide-react';
import { GoalChart } from '@/components/clinical/GoalChart';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { FamilyProgress as Data } from '@/lib/reports';

const FAMILY_STATUS = {
  none: 'Nothing recorded for this goal in this period yet.',
  insufficient: 'Just one check-in so far, so it’s too early to show a change.',
  recorded: '',
} as const;

// The warm family-facing progress format. Used for the internal unreleased preview and the synthetic family example.
export function FamilyProgress({ data, banner, testId }: { data: Data; banner: React.ReactNode; testId: string }) {
  return (
    <div className="theme-family-light space-y-5 rounded-card bg-fam-canvas p-4 text-fam-ink md:p-6" data-testid={testId}>
      {banner}
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fam-accentTint text-fam-accent"><Sprout size={22} aria-hidden="true" /></span>
        <div>
          <h2 className="font-display text-[24px] font-bold leading-tight" data-testid={`${testId}-child`}>{data.childName}’s progress</h2>
          <p className="text-[14px] text-fam-muted">{serviceLabel(data.service)} · {data.period.from} to {data.period.to}</p>
        </div>
      </header>
      {data.message ? <p className="whitespace-pre-wrap rounded-control bg-fam-warm p-4 text-[15px] leading-relaxed" data-testid={`${testId}-message`}>{data.message}</p>
        : <p className="rounded-control bg-fam-warm p-4 text-[14px] text-fam-muted" data-testid={`${testId}-message-empty`}>The family-friendly summary hasn’t been written yet.</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.goals.map((g, i) => {
          const last = g.points[g.points.length - 1];
          return (
            <section key={i} className="rounded-card border border-fam-border bg-fam-surface p-4" data-testid={`${testId}-goal-${i}`}>
              <h3 className="flex items-start gap-2 text-[16px] font-semibold"><Flag size={16} className="mt-1 shrink-0 text-fam-accent" aria-hidden="true" />{g.title}</h3>
              <p className="mt-1 text-[13px] text-fam-muted">Started at {g.baseline} · aiming for {g.target}{last ? ` · last check-in ${last.value} on ${last.date}` : ''}</p>
              <div className="mt-3"><GoalChart tone="family" points={g.points} baseline={g.baseline} target={g.target} measure={g.measure} from={data.period.from} to={data.period.to} testId={`${testId}-chart-${i}`} /></div>
              {FAMILY_STATUS[g.status] && <p className="mt-2 rounded-control bg-fam-tile p-2.5 text-[13px]">{FAMILY_STATUS[g.status]}</p>}
            </section>
          );
        })}
      </div>
      {!data.goals.length && <p className="text-[14px] text-fam-muted">No goals are in this example yet.</p>}
    </div>
  );
}
