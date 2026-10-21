'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Baby, CalendarClock, CalendarDays, UserX, Users } from 'lucide-react';
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

