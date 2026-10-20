'use client';

import { useState } from 'react';
import { AlertTriangle, Building2, CircleCheck, CircleX, Clock, Gauge, Inbox, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { AppShell } from '@/components/design/AppShell';
import { PageHeader } from '@/components/design/PageHeader';
import { usePreview, type DataState } from '@/components/design/PreviewContext';
import { Dialog, EmptyState, StateGate } from '@/components/design/states';
import { Avatar, Button, Card, CardHeader, LockedAction, Meter, Metric, Pill, SpecialtyTag } from '@/components/design/ui';
import { ago, applications, centers, events, longDate, type ApplicationFx, type EventType } from '@/lib/design/fixtures';

const EVENT_ICON = { application: Inbox, center: Building2, access: KeyRound };
const FILTERS: { key: 'all' | EventType; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'application', label: 'Applications' }, { key: 'center', label: 'Centers' }, { key: 'access', label: 'Access' },
];

function ApplicationRow({ a, onReview }: { a: ApplicationFx; onReview: () => void }) {
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" data-testid={`application-${a.id}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-surface-subtle text-brand-action"><Building2 size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{a.name}</p>
          <p className="text-[13px] text-brand-inkMuted"><span className="tnum">{a.ref}</span> · {a.city} · {a.staff} staff</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{a.specialties.map((s) => <SpecialtyTag key={s} s={s} />)}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        {a.status === 'pending' ? <Pill tone="caution" icon={Clock}>Pending · {ago(a.submittedMin)}</Pill> : a.status === 'approved' ? <Pill tone="success" icon={CircleCheck}>Approved</Pill> : <Pill tone="danger" icon={CircleX}>Rejected</Pill>}
        <Button variant="secondary" size="sm" onClick={onReview} data-testid={`application-${a.id}-review`}>{a.status === 'pending' ? 'Review' : 'View'}</Button>
      </div>
    </li>
  );
}

function platformMetrics(state: DataState) {
  const live = centers.filter((c) => c.status !== 'restricted');
  const trial = centers.filter((c) => c.status === 'trial');
  const pending = applications.filter((a) => a.status === 'pending');
  const restricted = centers.filter((c) => c.status === 'restricted');
  const v = (n: number) => (state === 'error' ? '—' : state === 'empty' ? 0 : n);
  const s = (populated: string, empty: string) => (state === 'error' ? 'Couldn’t load · retry below' : state === 'empty' ? empty : populated);
  return [
    { testId: 'metric-active-centers', label: 'Active centers', value: v(live.length), sub: s(`${trial.length} on trial · ${live.length - trial.length} subscribed`, 'No centers yet'), icon: Building2 },
    { testId: 'metric-pending-applications', label: 'Pending applications', value: v(pending.length), sub: s(`Oldest waiting ${ago(Math.max(...pending.map((a) => a.submittedMin))).replace(' ago', '')}`, 'Nothing waiting for review'), icon: Inbox, accent: 'caution' as const },
    { testId: 'metric-trial-centers', label: 'Trial centers', value: v(trial.length), sub: s(`${trial.filter((c) => 30 - c.daysUsed <= 3).length} ends within 3 days`, 'No centers on trial'), icon: Gauge, accent: 'success' as const },
    { testId: 'metric-restricted', label: 'Restricted', value: v(restricted.length), sub: s('Trial expired, data kept', 'None restricted'), icon: ShieldAlert, accent: 'danger' as const },
  ];
}

export default function PlatformPreview() {
  const { dataState } = usePreview();
  const [tab, setTab] = useState<'pending' | 'decided'>('pending');
  const [filter, setFilter] = useState<'all' | EventType>('all');
  const [review, setReview] = useState<ApplicationFx | null>(null);
  const apps = applications.filter((a) => (tab === 'pending' ? a.status === 'pending' : a.status !== 'pending'));
  const trials = centers.filter((c) => c.status !== 'active');

  return (
    <AppShell workspace="platform" active="overview" title="Overview">
      <PageHeader crumbs={[{ label: 'Platform' }, { label: 'Overview' }]} title="Platform overview"
        context={`${longDate(new Date())} · operational metadata only`}
        actions={<LockedAction id="create-center-locked" label="Create center" reason="Direct provisioning ships in TB-EM-003." align="end" />} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4" data-testid="platform-metrics" data-state={dataState}>
        {platformMetrics(dataState).map((m) => <Metric key={m.testId} {...m} loading={dataState === 'loading'} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card className="p-5 md:p-6" testId="applications-card">
          <CardHeader title="Center applications" subtitle="Decisions need a written rationale and are audited."
            action={
              <div role="tablist" aria-label="Application status" className="inline-flex rounded-control bg-surface-subtle p-1">
                {(['pending', 'decided'] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`applications-tab-${t}`}
                    className={`min-h-[36px] rounded-[9px] px-3 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'bg-surface-white text-brand-ink shadow-sm' : 'text-brand-inkMuted'}`}>
                    {t} <span className="tnum">({applications.filter((a) => (t === 'pending' ? a.status === 'pending' : a.status !== 'pending')).length})</span>
                  </button>
                ))}
              </div>
            } />
          <div className="mt-2">
            <StateGate testId="applications" empty={<EmptyState icon={Inbox} title="No applications waiting" body="New center applications appear here as soon as they’re submitted." testId="applications-empty" />}>
              <ul className="divide-y divide-border-light">{apps.map((a) => <ApplicationRow key={a.id} a={a} onReview={() => setReview(a)} />)}</ul>
            </StateGate>
          </div>
        </Card>

        <Card className="p-5 md:p-6" testId="trials-card">
          <CardHeader title="Trials & restrictions" subtitle="30 days · 1 child · 3 therapists per trial" />
          {dataState === 'populated' && (
          <div className="mt-3 flex items-start gap-2 rounded-control bg-status-cautionSurface px-3 py-2.5 text-[13px] text-status-caution" data-testid="trial-alert">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Cedar Grove Kids Clinic’s trial ends in 3 days.
          </div>
          )}
          <StateGate testId="trials" rows={2} empty={<EmptyState icon={Gauge} title="No centers on trial" body="Centers appear here while on a trial or after it expires." />}>
            <ul className="mt-4 space-y-5">
              {trials.map((c) => (
                <li key={c.id} data-testid={`trial-${c.id}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-semibold">{c.name}</p>
                    {c.status === 'restricted' ? <Pill tone="danger" icon={Lock}>Restricted</Pill> : <Pill tone="info">Day {c.daysUsed} of 30</Pill>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Meter label="Therapists (incl. pending)" value={c.therapists + c.pending} max={3} state={c.therapists + c.pending >= 3 ? 'limit' : 'ok'} />
                    <Meter label="Children" value={c.children} max={1} state="planned" hint="Limit enforced from Phase 2" />
                  </div>
                </li>
              ))}
            </ul>
          </StateGate>
        </Card>
      </div>

      <Card className="mt-6 p-5 md:p-6" testId="events-card">
        <CardHeader title="Operational events" subtitle="Metadata only. No clinical content is ever shown to the platform."
          action={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter events">
              {FILTERS.map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} data-testid={`events-filter-${f.key}`}
                  className={`min-h-[36px] rounded-full border px-3 text-[13px] font-medium transition-colors ${filter === f.key ? 'border-brand-action bg-brand-actionTint text-brand-action' : 'border-border-light text-brand-inkMuted hover:border-border-strong'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          } />
        <StateGate testId="events" rows={4} empty={<EmptyState icon={Clock} title="No events yet" body="Platform events will be listed here with actor and time." />}>
          <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-border-light">
            {events.filter((e) => filter === 'all' || e.type === filter).map((e) => {
              const Icon = EVENT_ICON[e.type];
              return (
                <li key={e.id} className="relative flex gap-4" data-testid={`event-${e.id}`}>
                  <span className="z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-light bg-surface-white text-brand-action"><Icon size={16} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-[14px]"><span className="font-semibold">{e.action}</span> · {e.subject}</p>
                    <p className="text-[12px] text-brand-inkMuted">{e.actor} · {ago(e.min)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </StateGate>
      </Card>

      <Dialog open={!!review} onClose={() => setReview(null)} title={review ? review.name : ''} testId="application-dialog"
        footer={review?.status === 'pending' ? (
          <>
            <LockedAction id="reject-locked" label="Reject" reason="Decisions ship in TB-EM-003." />
            <LockedAction id="approve-locked" label="Approve & provision" reason="Creates tenant, trial and admin invitation (TB-EM-003)." />
          </>
        ) : undefined}>
        {review && (
          <dl className="grid gap-4 text-[14px] sm:grid-cols-2">
            <div><dt className="text-[12px] text-brand-inkMuted">Reference</dt><dd className="tnum font-medium">{review.ref}</dd></div>
            <div><dt className="text-[12px] text-brand-inkMuted">Location</dt><dd className="font-medium">{review.city}, United Kingdom</dd></div>
            <div className="flex items-center gap-3 sm:col-span-2"><Avatar name={review.contact} /><div><dd className="font-medium">{review.contact}</dd><dd className="text-[13px] text-brand-inkMuted">{review.email}</dd></div></div>
            <div><dt className="text-[12px] text-brand-inkMuted">Expected staff</dt><dd className="font-medium">{review.staff}</dd></div>
            <div><dt className="text-[12px] text-brand-inkMuted">Synthetic-data confirmation</dt><dd className="font-medium text-status-success">Confirmed by applicant</dd></div>
            <div className="sm:col-span-2"><dt className="mb-1 text-[12px] text-brand-inkMuted">Specialties</dt><dd className="flex flex-wrap gap-1.5">{review.specialties.map((s) => <SpecialtyTag key={s} s={s} long />)}</dd></div>
          </dl>
        )}
      </Dialog>
    </AppShell>
  );
}
