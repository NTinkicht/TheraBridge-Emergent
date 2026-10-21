'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, CalendarCheck2, HeartHandshake, MapPin, MessagesSquare, Repeat } from 'lucide-react';
import { useLoad } from '@/components/centers/kit';
import { Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { messagesApi } from '@/lib/messages';
import { STATUS_LABEL, dayLabel, opsApi, timeRange, type FamilyOverview, type FamilyVisit } from '@/lib/operations';
import { serviceLabel } from './BookDialog';

type Kid = FamilyOverview['children'][number];
const TONE = { SCHEDULED: 'info', COMPLETED: 'success', CANCELLED: 'neutral', NO_SHOW: 'caution' } as const;
const FAMILY_LABEL = { ...STATUS_LABEL, SCHEDULED: 'Booked', NO_SHOW: 'Missed' };

function Visit({ a, past }: { a: FamilyVisit; past?: boolean }) {
  const label = past && a.status === 'SCHEDULED' ? 'Not recorded yet' : FAMILY_LABEL[a.status];
  return (
    <li className={`rounded-control border border-fam-border p-3 text-[14px] ${a.status === 'CANCELLED' ? 'opacity-75' : ''}`} data-testid={`family-visit-${a.id}`}>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-semibold ${a.status === 'CANCELLED' ? 'line-through' : ''}`}>{dayLabel(a.startsAt)}</span>
        <Pill tone={past && a.status === 'SCHEDULED' ? 'neutral' : TONE[a.status]} testId={`family-visit-status-${a.id}`}>{label}</Pill>
      </span>
      <span className="tnum block">{timeRange(a.startsAt, a.endsAt)} · {serviceLabel(a.service)} with {a.therapist}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-fam-muted">
        {a.room && <span className="flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{a.room}</span>}
        {a.recurring && <span className="flex items-center gap-1"><Repeat size={13} aria-hidden="true" />Repeating visit</span>}
        {a.changed && <span className="font-semibold text-fam-caution" data-testid={`family-visit-changed-${a.id}`}>Time changed</span>}
        {a.status === 'CANCELLED' && !past && <span>The center cancelled this visit. Message them if you have questions.</span>}
      </span>
    </li>
  );
}

function Reminders({ centerId, kid, onError }: { centerId: string; kid: Kid; onError: (e: unknown) => void }) {
  const [on, setOn] = useState(kid.remindersEnabled);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const toggle = async () => {
    setBusy(true);
    setErr(false);
    try {
      setOn((await opsApi.setReminders(centerId, kid.id, !on)).remindersEnabled);
    } catch (e) {
      setErr(true);
      try { onError(e); } catch { /* shown inline */ }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-control bg-fam-tile p-3" data-testid={`family-reminders-${kid.id}`}>
      <span className="flex min-w-0 items-start gap-2 text-[14px]"><BellRing size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><span className="block font-semibold">Appointment emails</span><span className="text-fam-muted">{err ? 'That didn’t save. Try again.' : 'A reminder the day before, and a note if a visit in the next two weeks moves or is cancelled.'}</span></span>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={`Appointment emails for ${kid.name}`} disabled={busy} onClick={() => void toggle()} data-testid={`family-reminders-toggle-${kid.id}`}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-fam-accent' : 'bg-fam-border'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function ChildCard({ centerId, centerName, kid, onError }: { centerId: string; centerName: string; kid: Kid; onError: (e: unknown) => void }) {
  const [showAll, setShowAll] = useState(false);
  const [allUp, setAllUp] = useState(false);
  const history = showAll ? kid.history : kid.history.slice(0, 4);
  const t = kid.attendance;
  return (
    <Card tone="family" className="p-5 md:p-7" testId={`family-child-${kid.id}`}>
      <h2 className="font-display text-[22px] font-bold">{kid.name}</h2>
      <p className="text-[14px] text-fam-muted">{kid.fullName} · {centerName}</p>
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby={`up-${kid.id}`}>
          <h3 id={`up-${kid.id}`} className="text-[15px] font-semibold">Coming up</h3>
          {kid.upcoming.length ? <ul className="mt-2 space-y-2" data-testid={`family-upcoming-${kid.id}`}>{(allUp ? kid.upcoming : kid.upcoming.slice(0, 6)).map((a) => <Visit key={a.id} a={a} />)}</ul>
            : <p className="mt-2 text-[14px] text-fam-muted" data-testid={`family-upcoming-empty-${kid.id}`}>No visits booked in the next 60 days.</p>}
          {kid.upcoming.length > 6 && <button type="button" onClick={() => setAllUp(!allUp)} className="mt-2 text-[14px] font-semibold text-fam-link hover:underline" data-testid={`family-upcoming-more-${kid.id}`}>{allUp ? 'Show fewer' : `Show all ${kid.upcoming.length}`}</button>}
        </section>
        <section aria-labelledby={`hist-${kid.id}`} className="space-y-3">
          <h3 id={`hist-${kid.id}`} className="text-[15px] font-semibold">Attendance</h3>
          <dl className="grid grid-cols-3 gap-2 text-center" data-testid={`family-attendance-${kid.id}`}>
            {[['Attended', t.attended], ['Missed', t.noShow], ['Cancelled', t.cancelled]].map(([l, n]) => (
              <div key={l} className="rounded-control bg-fam-tile p-2"><dt className="text-[12px] text-fam-muted">{l}</dt><dd className="tnum text-[20px] font-bold">{n}</dd></div>
            ))}
          </dl>
          <p className="text-[12px] text-fam-muted">Last {t.days} days.</p>
          {kid.history.length ? (
            <>
              <ul className="space-y-2" data-testid={`family-history-${kid.id}`}>{history.map((a) => <Visit key={a.id} a={a} past />)}</ul>
              {kid.history.length > 4 && <button type="button" onClick={() => setShowAll(!showAll)} className="text-[14px] font-semibold text-fam-link hover:underline" data-testid={`family-history-more-${kid.id}`}>{showAll ? 'Show fewer' : `Show all ${kid.history.length}`}</button>}
            </>
          ) : <p className="text-[14px] text-fam-muted" data-testid={`family-history-empty-${kid.id}`}>Past visits will appear here.</p>}
        </section>
        <section aria-labelledby={`team-${kid.id}`}>
          <h3 id={`team-${kid.id}`} className="text-[15px] font-semibold">Care team</h3>
          {kid.team.length ? (
            <ul className="mt-2 space-y-2" data-testid={`family-team-${kid.id}`}>
              {kid.team.map((m, i) => <li key={i} className="rounded-control bg-fam-tile p-3 text-[14px]"><span className="block font-semibold">{m.name}{m.isLead ? ' · lead' : ''}</span>{serviceLabel(m.service)}{m.title ? ` · ${m.title}` : ''}</li>)}
            </ul>
          ) : <p className="mt-2 text-[14px] text-fam-muted">Your care team will appear here once assigned.</p>}
        </section>
        <section className="space-y-3 self-start"><Reminders centerId={centerId} kid={kid} onError={onError} /></section>
      </div>
    </Card>
  );
}

export function FamilyHome({ centerId, onError }: { centerId: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => opsApi.family(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [unread, setUnread] = useState(0);
  useEffect(() => { void messagesApi.list(centerId, 'OPEN').then((r) => setUnread(r.unread)).catch(() => setUnread(0)); }, [centerId]);
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="family-error" />;
  if (!data) return <Card tone="family" className="p-5"><SkeletonRows rows={3} testId="family-loading" /></Card>;
  if (!data.children.length) return <div className="theme-family-light rounded-card bg-fam-canvas"><EmptyState tone="family" icon={HeartHandshake} title="No children linked yet" body={`${data.center.name} will connect your child to your account.`} testId="family-empty" /></div>;
  return (
    <div className="theme-family-light space-y-6 rounded-card bg-fam-canvas p-4 text-fam-ink md:p-6" data-testid="family-home">
      <Link href="/app/messages" className="flex items-center justify-between gap-3 rounded-card border border-fam-border bg-fam-surface p-4 transition-colors hover:bg-fam-tile" data-testid="family-messages-link">
        <span className="flex items-center gap-3"><MessagesSquare size={20} className="text-fam-accent" aria-hidden="true" />
          <span><span className="block font-semibold">Messages with the center</span><span className="text-[13px] text-fam-muted">Visits, attendance and everyday arrangements</span></span>
        </span>
        {unread > 0 ? <Pill tone="info" testId="family-unread">{unread} new</Pill> : <CalendarCheck2 size={18} className="text-fam-muted" aria-hidden="true" />}
      </Link>
      {data.children.map((c) => <ChildCard key={c.id} centerId={centerId} centerName={data.center.name} kid={c} onError={onError} />)}
    </div>
  );
}
