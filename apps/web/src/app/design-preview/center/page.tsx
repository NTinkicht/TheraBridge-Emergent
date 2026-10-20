'use client';

import { useState } from 'react';
import { CalendarClock, Check, Circle, Lock, MailPlus, RotateCw, Timer, Users } from 'lucide-react';
import { AppShell } from '@/components/design/AppShell';
import { PageHeader } from '@/components/design/PageHeader';
import { usePreview } from '@/components/design/PreviewContext';
import { Dialog, EmptyState, StateGate } from '@/components/design/states';
import { Avatar, Button, Card, CardHeader, LockedAction, Meter, Pill, SpecialtyTag } from '@/components/design/ui';
import { centerSessions, daysFromNow, shortDate, staff } from '@/lib/design/fixtures';

const STEPS: { label: string; done: boolean; locked?: string }[] = [
  { label: 'Confirm center profile', done: true },
  { label: 'Set timezone and operating hours', done: true },
  { label: 'Invite your first therapist', done: true },
  { label: 'Fill all three trial therapist seats', done: true },
  { label: 'Register your first child', done: false, locked: 'Child registration arrives in Phase 2' },
];
const STATUS = {
  active: <Pill tone="success" icon={Check}>Active</Pill>,
  pending: <Pill tone="caution" icon={Timer}>Pending</Pill>,
  expired: <Pill tone="neutral">Expired</Pill>,
};

export default function CenterPreview() {
  const { notify } = usePreview();
  const [revoke, setRevoke] = useState<string | null>(null);
  const done = STEPS.filter((s) => s.done).length;

  return (
    <AppShell workspace="center" active="overview" title="Overview">
      <div className="tb-rise mb-6 flex flex-col gap-3 rounded-card border border-[#F2DDB4] bg-status-cautionSurface px-4 py-4 md:flex-row md:items-center md:px-5" data-testid="trial-banner">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70 text-status-caution"><Timer size={20} aria-hidden="true" /></span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[#6B4100]">Your trial ends in 3 days, on {shortDate(daysFromNow(3))}</p>
          <p className="text-[13px] text-[#7A4D06]">When it ends the center becomes read-only. Nothing is deleted.</p>
        </div>
        <LockedAction id="convert-locked" label="Convert to a plan" reason="Billing isn’t configured in V1. Contact the platform team." size="sm" align="end" />
      </div>

      <PageHeader crumbs={[{ label: 'Cedar Grove Kids Clinic' }, { label: 'Overview' }]} title="Good morning, Maya"
        context="Cedar Grove Kids Clinic · Trial plan · Europe/London"
        actions={<LockedAction id="invite-therapist-locked" label="Invite therapist" reason="Trial limit reached: 3 of 3 seats, including pending invitations." align="end" />} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 md:p-6" testId="usage-card">
          <CardHeader title="Trial usage" subtitle="Limits are enforced on the server, not just in the interface." />
          <div className="mt-5 space-y-5">
            <Meter testId="meter-days" label="Trial days used" value={27} max={30} state="warn" hint="3 days remaining" />
            <Meter testId="meter-therapists" label="Therapist seats" value={3} max={3} state="limit" hint="2 active + 1 pending invitation. Expired invitations don’t count." />
            <Meter testId="meter-children" label="Children" value={1} max={1} state="planned" hint="Planned: the 1-child limit is enforced once child registration ships." />
          </div>
        </Card>

        <Card className="p-5 md:p-6" testId="onboarding-card">
          <CardHeader title="Getting set up" subtitle={<span className="tnum">{done} of {STEPS.length} complete</span>} />
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-status-success" style={{ width: `${(done / STEPS.length) * 100}%` }} /></div>
          <ol className="mt-4 space-y-1">
            {STEPS.map((s) => (
              <li key={s.label} className="flex min-h-[44px] items-center gap-3 rounded-control px-2 text-[14px]">
                {s.done ? <span className="grid h-6 w-6 place-items-center rounded-full bg-status-success text-white"><Check size={14} aria-hidden="true" /></span> : s.locked ? <Lock size={18} className="mx-[3px] text-brand-inkMuted" aria-hidden="true" /> : <Circle size={22} className="text-border-strong" aria-hidden="true" />}
                <span className={`flex-1 ${s.done ? 'text-brand-inkMuted line-through decoration-border-strong' : 'font-medium'}`}>{s.label}<span className="sr-only">{s.done ? ' (done)' : ' (not done)'}</span></span>
                {s.locked && <span className="text-right text-[12px] text-brand-inkMuted">{s.locked}</span>}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card className="p-5 md:p-6" testId="staff-card">
          <CardHeader title="Staff & invitations" subtitle="Therapists can hold several specialties." />
          <StateGate testId="staff" empty={<EmptyState icon={Users} title="No therapists yet" body="Invite up to three therapists during your trial." testId="staff-empty" />}>
            <ul className="mt-2 divide-y divide-border-light">
              {staff.map((p) => (
                <li key={p.email} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid={`staff-${p.name.split(' ')[0].toLowerCase()}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p.name} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold">{p.name} {p.specialties.map((s) => <SpecialtyTag key={s} s={s} />)}</p>
                      <p className="truncate text-[13px] text-brand-inkMuted">{p.email} · {p.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    {STATUS[p.status]}
                    {p.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => notify('Preview only: no invitation was resent.')} data-testid="invite-resend"><RotateCw size={14} aria-hidden="true" /> Resend</Button>
                        <Button variant="ghost" size="sm" className="!text-status-danger hover:!bg-status-dangerSurface" onClick={() => setRevoke(p.name)} data-testid="invite-revoke">Revoke</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </StateGate>
        </Card>

        <Card className="p-5 md:p-6" testId="sessions-card">
          <CardHeader title="Upcoming sessions" subtitle="Layout preview. Scheduling arrives in Phase 2." />
          <StateGate testId="sessions" empty={<EmptyState icon={CalendarClock} title="No sessions scheduled" body="Once scheduling is available, the next sessions across your center appear here." testId="sessions-empty" />}>
            <ul className="mt-4 space-y-3">
              {centerSessions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 rounded-control border border-border-light p-3" data-testid={`session-${s.id}`}>
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-brand-inkMuted">{s.day}</p>
                    <p className="tnum text-[17px] font-semibold">{s.time}</p>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-border-light pl-4">
                    <p className="truncate text-[14px] font-semibold">{s.child}</p>
                    <p className="truncate text-[13px] text-brand-inkMuted">{s.therapist} · {s.room}</p>
                  </div>
                  <SpecialtyTag s={s.specialty} />
                </li>
              ))}
            </ul>
          </StateGate>
        </Card>
      </div>

      <Dialog open={!!revoke} onClose={() => setRevoke(null)} title="Revoke this invitation?" testId="revoke-dialog"
        footer={<>
          <Button variant="secondary" onClick={() => setRevoke(null)} data-testid="revoke-cancel">Keep invitation</Button>
          <Button variant="danger" onClick={() => { setRevoke(null); notify('Preview only: nothing was revoked. This screen isn’t connected to the API.'); }} data-testid="revoke-confirm">Revoke invitation</Button>
        </>}>
        <p className="text-[14px] text-brand-inkMuted">{revoke}’s link will stop working immediately and their trial seat will be freed. You can invite them again later.</p>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-brand-inkMuted"><MailPlus size={15} aria-hidden="true" /> They won’t be notified automatically.</p>
      </Dialog>
    </AppShell>
  );
}
