'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, CalendarCheck2, ChevronRight, HeartHandshake, ListChecks, MapPin, MessagesSquare, Repeat, ShieldCheck } from 'lucide-react';
import { useLoad } from '@/components/centers/kit';
import { Card, Pill } from '@/components/design/ui';
import { DisclosureSection } from '@/components/design/workspace-patterns';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { messagesApi } from '@/lib/messages';
import { STATUS_LABEL, dayLabel, opsApi, timeRange, type FamilyOverview, type FamilyVisit } from '@/lib/operations';
import { serviceLabel } from './BookDialog';
import { GuardianPhotoConsent } from './GuardianPhotoConsent';

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

function Reminders({ centerId, kid, onError, onSaved, busy, onBusy, error, onFailure, onClearError }: { centerId: string; kid: Kid; onError: (e: unknown) => void; onSaved: (id: string, enabled: boolean) => void; busy: boolean; onBusy: (id: string, busy: boolean) => void; error: boolean; onFailure: (id: string) => void; onClearError: (id: string) => void }) {
  // The parent owns server-confirmed state and pending operations across sibling switches.
  const on = kid.remindersEnabled;
  const toggle = async () => {
    if (busy) return;
    onBusy(kid.id, true);
    onClearError(kid.id);
    try {
      const saved = (await opsApi.setReminders(centerId, kid.id, !on)).remindersEnabled;
      onSaved(kid.id, saved);
    } catch (e) {
      onFailure(kid.id);
      try { onError(e); } catch { /* shown inline */ }
    } finally {
      onBusy(kid.id, false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-control bg-fam-tile p-3" data-testid={`family-reminders-${kid.id}`}>
      <span className="flex min-w-0 items-start gap-2 text-[14px]"><BellRing size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><span className="block font-semibold">Appointment emails</span><span className="text-fam-muted">{error ? 'That didn’t save. Try again.' : 'A reminder the day before, and a note if a visit in the next two weeks moves or is cancelled.'}</span></span>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={`Appointment emails for ${kid.name}`} disabled={busy} onClick={() => void toggle()} data-testid={`family-reminders-toggle-${kid.id}`}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-fam-accent' : 'bg-fam-border'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function ChildCard({ centerId, centerName, kid, onError, onReminderSaved, reminderBusy, onReminderBusy, reminderError, onReminderFailure, onReminderClearError }: { centerId: string; centerName: string; kid: Kid; onError: (e: unknown) => void; onReminderSaved: (id: string, enabled: boolean) => void; reminderBusy: boolean; onReminderBusy: (id: string, busy: boolean) => void; reminderError: boolean; onReminderFailure: (id: string) => void; onReminderClearError: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const [allUp, setAllUp] = useState(false);
  const history = showAll ? kid.history : kid.history.slice(0, 4);
  const t = kid.attendance;
  const next = kid.upcoming.find(a => a.status === 'SCHEDULED');
  return (
    <Card tone="family" className="space-y-4 p-4 sm:p-5 md:p-7" testId={`family-child-${kid.id}`}>
      <h2 className="font-display text-[22px] font-bold">{kid.name}</h2>
      <p className="text-[14px] text-fam-muted">{kid.fullName} · {centerName}</p>
      <div className="rounded-card bg-fam-tile p-4" data-testid={`family-next-${kid.id}`}>
        <h3 className="text-sm font-semibold">Your next booked visit</h3>
        {next ? <p className="mt-1 text-sm">{dayLabel(next.startsAt)} · {timeRange(next.startsAt,next.endsAt)} · {serviceLabel(next.service)}</p>
          : <p className="mt-1 text-sm text-fam-muted">No future confirmed visit is listed. A scheduled visit is not proof of attendance.</p>}
      </div>
      <GuardianPhotoConsent centerId={centerId} childId={kid.id}/>
      <DisclosureSection tone="family" title="Appointments, care team and preferences"
        summary="Upcoming visits, attendance history, care team and reminders">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
        <section className="space-y-3 self-start"><Reminders centerId={centerId} kid={kid} onError={onError} onSaved={onReminderSaved} busy={reminderBusy} onBusy={onReminderBusy} error={reminderError} onFailure={onReminderFailure} onClearError={onReminderClearError} /></section>
      </div>
      </DisclosureSection>
    </Card>
  );
}

export function FamilyHome({ centerId, onError, permissions }: { centerId: string; onError: (e: unknown) => void; permissions?: readonly string[] }) {
  // Keyed remount erases selected sibling and unread state when the tenant changes.
  return <ScopedFamilyHome key={centerId} centerId={centerId} onError={onError} permissions={permissions} />;
}

function ScopedFamilyHome({ centerId, onError, permissions }: { centerId: string; onError: (e: unknown) => void; permissions?: readonly string[] }) {
  const fetcher = useCallback(() => opsApi.family(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [unread, setUnread] = useState(0);
  const [chosen, setChosen] = useState('');
  const [reminderValues, setReminderValues] = useState<Record<string, boolean>>({});
  const [reminderErrors, setReminderErrors] = useState<ReadonlySet<string>>(() => new Set());
  const setReminderError = (id: string, failed: boolean) => setReminderErrors(previous => {
    const next = new Set(previous);
    if (failed) next.add(id); else next.delete(id);
    return next;
  });
  const [pendingReminders, setPendingReminders] = useState<ReadonlySet<string>>(() => new Set());
  const markPending = (id: string, busy: boolean) => setPendingReminders(previous => {
    const next = new Set(previous);
    if (busy) next.add(id); else next.delete(id);
    return next;
  });
  const can = (permission: string) => permissions === undefined || permissions.includes(permission);
  const selected = data?.children.find(child => child.id === chosen) ?? data?.children[0];
  useEffect(() => {
    let alive = true;
    setUnread(0);
    if (permissions && !permissions.includes('center.messages.use')) return;
    void messagesApi.list(centerId, 'OPEN')
      .then(r => { if (alive) setUnread(r.unread); })
      .catch(() => { if (alive) setUnread(0); });
    return () => { alive = false; };
  }, [centerId, permissions]);
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="family-error" />;
  if (!data) return <Card tone="family" className="p-5"><SkeletonRows rows={3} testId="family-loading" /></Card>;
  if (!data.children.length) return <div className="theme-family-auto rounded-card bg-fam-canvas"><EmptyState tone="family" icon={HeartHandshake} title="No children linked yet" body={`${data.center.name} will connect your child to your account.`} testId="family-empty" /></div>;
  return (
    <div className="theme-family-auto space-y-5 rounded-card bg-fam-canvas p-3 text-fam-ink sm:p-4 md:p-6" data-testid="family-home">
      <div className="space-y-2">
        <p className="text-sm font-medium text-fam-muted">Family workspace · {data.center.name}</p>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your family's day</h1>
        <p className="max-w-2xl text-sm text-fam-muted">Upcoming visits and approved information, in one place. Sample home practice is clearly labelled and is not a released therapy plan.</p>
      </div>
      {data.children.length > 1 && <div role="group" aria-label="Choose a child"
        className="flex max-w-full flex-wrap gap-2" data-testid="family-sibling-switcher">
        {data.children.map(kid => <button key={kid.id} type="button"
          aria-pressed={selected?.id === kid.id} aria-controls="family-active-child-detail" data-testid={`family-switch-${kid.id}`}
          onClick={() => setChosen(kid.id)}
          className={`min-h-11 rounded-control border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-fam-focus ${selected?.id===kid.id
            ? 'border-fam-accent bg-fam-accentTint text-fam-ink'
            : 'border-fam-border bg-fam-surface text-fam-muted hover:bg-fam-tile'}`}>
          {kid.name}
        </button>)}
      </div>}
      {selected && <p role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="family-active-child-announcement">
        Showing the family workspace for {selected.name}. Only currently authorized information for this child is displayed.
      </p>}
      {selected && <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={`Quick tasks for ${selected.name}`}
        data-testid="family-quick-tasks">
        {can('family.practice.read') && <Link href="/app/practice"
          className="flex min-h-20 items-center gap-3 rounded-card border border-fam-border bg-fam-surface p-4 focus-visible:outline-2 focus-visible:outline-fam-focus"
          data-testid="family-quick-practice"><ListChecks aria-hidden="true" className="shrink-0 text-fam-accent" />
          <span><strong className="block">Sample home practice</strong><span className="text-xs text-fam-muted">View activities for your linked children · not a released plan</span></span><ChevronRight size={16} aria-hidden="true" /></Link>}
        {can('family.progress.demo') && <Link href="/app/family-progress"
          className="flex min-h-20 items-center gap-3 rounded-card border border-fam-border bg-fam-surface p-4 focus-visible:outline-2 focus-visible:outline-fam-focus"
          data-testid="family-quick-documents"><ShieldCheck aria-hidden="true" className="shrink-0 text-fam-accent" />
          <span><strong className="block">Family documents</strong><span className="text-xs text-fam-muted">View only what the server has released; no approval implied</span></span><ChevronRight size={16} aria-hidden="true" /></Link>}
      </section>}
      {can('center.messages.use') && <Link href="/app/messages" className="flex items-center justify-between gap-3 rounded-card border border-fam-border bg-fam-surface p-4 transition-colors hover:bg-fam-tile" data-testid="family-messages-link">
        <span className="flex items-center gap-3"><MessagesSquare size={20} className="text-fam-accent" aria-hidden="true" />
          <span><span className="block font-semibold">Messages with the center</span><span className="text-[13px] text-fam-muted">Visits, attendance and everyday arrangements</span></span>
        </span>
        {unread > 0 ? <Pill tone="info" testId="family-unread">{unread} new</Pill> : <CalendarCheck2 size={18} className="text-fam-muted" aria-hidden="true" />}
      </Link>}
      {selected && <section id="family-active-child-detail" aria-label={`Details for ${selected.name}`}><ChildCard key={selected.id} centerId={centerId} centerName={data.center.name}
        kid={{ ...selected, remindersEnabled: reminderValues[selected.id] ?? selected.remindersEnabled }}
        onReminderSaved={(id, enabled) => setReminderValues(prev => ({ ...prev, [id]: enabled }))}
        reminderBusy={pendingReminders.has(selected.id)} onReminderBusy={markPending}
        reminderError={reminderErrors.has(selected.id)} onReminderFailure={id => setReminderError(id, true)}
        onReminderClearError={id => setReminderError(id, false)} onError={onError} /></section>}
    </div>
  );
}
