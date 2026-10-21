'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Baby, CalendarClock, CalendarDays, HeartHandshake, MapPin, UserX, Users } from 'lucide-react';
import { useLoad } from '@/components/centers/kit';
import { Card, Meter, Metric, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { dayLabel, opsApi, timeRange, type Appointment, type Trial } from '@/lib/operations';
import { serviceLabel } from './BookDialog';

export function TrialBanner({ trial }: { trial: Trial }) {
  if (!trial.onTrial) return null;
  return (
    <Card className={`flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between ${trial.expired ? 'border-status-danger/50' : ''}`} testId="trial-banner">
      <div className="min-w-0">
        <p className="text-[16px] font-semibold" data-testid="trial-status">{trial.expired ? 'Your trial has ended' : `Free trial · ${trial.daysLeft} days left`}</p>
        <p className="text-[14px] text-brand-inkMuted">{trial.expired ? 'Everything stays visible. Changes are paused until TheraBridge extends the trial.' : `Ends ${new Date(trial.endsAt!).toLocaleDateString(undefined, { dateStyle: 'medium' })}. No payment details are needed.`}</p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:w-[420px]">
        <Meter label="Therapist seats" value={trial.therapistSeats.used} max={trial.therapistSeats.limit} hint="Pending invitations count" state={trial.therapistSeats.used >= trial.therapistSeats.limit ? 'warn' : 'ok'} testId="trial-seats" />
        <Meter label="Children" value={trial.children.used} max={trial.children.limit} state={trial.children.used >= trial.children.limit ? 'warn' : 'ok'} testId="trial-children" />
      </div>
    </Card>
  );
}

const STATUS_TONE = { SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'neutral', NO_SHOW: 'caution' } as const;
const STATUS_LABEL = { SCHEDULED: 'Scheduled', COMPLETED: 'Attended', CANCELLED: 'Cancelled', NO_SHOW: 'No-show' };
export const ApptPill = ({ a }: { a: Pick<Appointment, 'status'> }) => <Pill tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Pill>;

export function DayList({ items, testId, showTherapist = true }: { items: Appointment[]; testId: string; showTherapist?: boolean }) {
  if (!items.length) return <EmptyState icon={CalendarDays} title="Nothing booked today" body="Appointments for today appear here." testId={`${testId}-empty`} />;
  return (
    <ul className="divide-y divide-border-light" data-testid={testId}>
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`${testId}-${a.id}`}>
          <span className="min-w-0">
            <span className="tnum block text-[13px] font-semibold text-brand-action">{timeRange(a.startsAt, a.endsAt)}</span>
            <Link href={`/app/children/${a.childId}`} className="block break-words font-semibold hover:underline">{a.childFull}</Link>
            <span className="block text-[13px] text-brand-inkMuted">{serviceLabel(a.service)}{showTherapist ? ` · ${a.therapist}` : ''}{a.room ? ` · ${a.room}` : ''}</span>
          </span>
          <ApptPill a={a} />
        </li>
      ))}
    </ul>
  );
}

export function CenterDashboard({ centerId, isTherapist, onError }: { centerId: string; isTherapist: boolean; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => opsApi.dashboard(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="dashboard-error" />;
  if (!data) return <Card className="p-5"><SkeletonRows rows={3} testId="dashboard-loading" /></Card>;
  const k = data.counts;
  return (
    <div className="space-y-6" data-testid="center-dashboard">
      {!isTherapist && <TrialBanner trial={data.trial} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={isTherapist ? 'My children' : 'Active children'} value={k.activeChildren} sub={isTherapist ? 'Assigned to you' : 'Registered at the center'} icon={Baby} testId="metric-children" />
        <Metric label="Today" value={data.today.filter((a) => a.status === 'SCHEDULED').length} sub="Appointments still to come or open" icon={CalendarClock} testId="metric-today" />
        <Metric label="Next 7 days" value={k.upcomingWeek} sub="Scheduled appointments" icon={CalendarDays} testId="metric-week" />
        {isTherapist ? <Metric label="Therapists" value={k.therapists} sub="Active at the center" icon={Users} testId="metric-therapists" />
          : <Metric label="Needs attention" value={k.unassigned + k.noGuardian} sub={`${k.unassigned} without a therapist · ${k.noGuardian} without a guardian`} icon={UserX} accent={k.unassigned + k.noGuardian ? 'caution' : 'success'} testId="metric-attention" />}
      </div>
      <Card className="p-5 md:p-6" testId="today-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-semibold">{isTherapist ? 'My day' : 'Today at the center'}</h2>
          <Link href="/app/schedule" className="text-[14px] font-medium text-brand-action hover:underline" data-testid="today-open-schedule">Open schedule</Link>
        </div>
        <p className="text-[13px] text-brand-inkMuted">{dayLabel(data.dayStart)} · {data.timezone.replace('_', ' ')}</p>
        <div className="mt-2"><DayList items={data.today} testId="today-list" showTherapist={!isTherapist} /></div>
      </Card>
    </div>
  );
}

export function FamilyHome({ centerId, onError }: { centerId: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => opsApi.family(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="family-error" />;
  if (!data) return <Card tone="family" className="p-5"><SkeletonRows rows={3} testId="family-loading" /></Card>;
  if (!data.children.length) return <div className="theme-family-light rounded-card bg-fam-canvas"><EmptyState tone="family" icon={HeartHandshake} title="No children linked yet" body={`${data.center.name} will connect your child to your account.`} testId="family-empty" /></div>;
  return (
    <div className="theme-family-light space-y-6 rounded-card bg-fam-canvas p-1 text-fam-ink" data-testid="family-home">
      {data.children.map((c) => (
        <Card key={c.id} tone="family" className="p-5 md:p-7" testId={`family-child-${c.id}`}>
          <h2 className="font-display text-[22px] font-bold">{c.name}</h2>
          <p className="text-[14px] text-brand-inkMuted">{c.fullName} · {data.center.name}</p>
          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-[15px] font-semibold">Care team</h3>
              {c.team.length ? (
                <ul className="mt-2 space-y-2" data-testid={`family-team-${c.id}`}>
                  {c.team.map((t, i) => <li key={i} className="rounded-control bg-surface-subtle p-3 text-[14px]"><span className="block font-semibold">{t.name}{t.isLead ? ' · lead' : ''}</span>{serviceLabel(t.service)}{t.title ? ` · ${t.title}` : ''}</li>)}
                </ul>
              ) : <p className="mt-2 text-[14px] text-brand-inkMuted">Your care team will appear here once assigned.</p>}
            </section>
            <section>
              <h3 className="text-[15px] font-semibold">Coming up</h3>
              {c.upcoming.length ? (
                <ul className="mt-2 space-y-2" data-testid={`family-upcoming-${c.id}`}>
                  {c.upcoming.map((a) => (
                    <li key={a.id} className="rounded-control border border-border-light p-3 text-[14px]">
                      <span className="block font-semibold">{dayLabel(a.startsAt)}</span>
                      <span className="tnum block">{timeRange(a.startsAt, a.endsAt)} · {serviceLabel(a.service)} with {a.therapist}</span>
                      {a.room && <span className="flex items-center gap-1 text-brand-inkMuted"><MapPin size={13} aria-hidden="true" />{a.room}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-[14px] text-brand-inkMuted">No visits booked in the next 60 days.</p>}
            </section>
          </div>
        </Card>
      ))}
    </div>
  );
}
