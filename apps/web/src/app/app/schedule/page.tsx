'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { PageTitle, SelectField, Workspace, useLoad } from '@/components/centers/kit';
import { AppointmentPanel } from '@/components/operations/AppointmentPanel';
import { BookDialog, serviceLabel } from '@/components/operations/BookDialog';
import { CalendarGrid, dayTitle, weekOf } from '@/components/operations/Calendar';
import { ApptPill } from '@/components/operations/Dashboards';
import { Button, Card } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { addDays, dayKey, getCenterTz, opsApi, timeRange, zonedToUtc, type Appointment, type ChildRow, type Therapist } from '@/lib/operations';

type View = 'day' | 'week';

function Agenda({ days, items, onOpen }: { days: string[]; items: Appointment[]; onOpen: (a: Appointment) => void }) {
  return (
    <div className="space-y-3" data-testid="schedule-agenda">
      {days.map((d) => {
        const list = items.filter((a) => dayKey(a.startsAt) === d);
        if (!list.length) return null;
        return (
          <Card key={d} className="p-4" testId={`agenda-day-${d}`}>
            <h2 className="text-[15px] font-semibold">{dayTitle(d, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
            <ul className="mt-1 divide-y divide-border-light">
              {list.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => onOpen(a)} className="flex w-full items-center justify-between gap-3 py-3 text-left" data-testid={`appointment-${a.id}`}>
                    <span className="min-w-0">
                      <span className="tnum block text-[13px] font-semibold text-brand-action">{timeRange(a.startsAt, a.endsAt)}</span>
                      <span className="block break-words font-semibold">{a.childFull}</span>
                      <span className="block text-[13px] text-brand-inkMuted">{serviceLabel(a.service)} · {a.therapist}{a.room ? ` · ${a.room}` : ''}{a.seriesId ? ' · repeating' : ''}</span>
                    </span>
                    <ApptPill a={a} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function useIsWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const q = window.matchMedia('(min-width: 768px)');
    const f = () => setWide(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return wide;
}

function Schedule({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const ctx = session.activeContext?.type === 'center' ? session.activeContext : null;
  const centerId = ctx?.centerId ?? '';
  const manage = session.permissions.includes('center.schedule.manage');
  const isTherapist = ctx?.role === 'THERAPIST';
  const wide = useIsWide();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => dayKey(new Date()));
  const [tz, setTz] = useState(getCenterTz());
  const [therapist, setTherapist] = useState('');
  const [child, setChild] = useState('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistSearch, setTherapistSearch] = useState('');
  const [therapistNext, setTherapistNext] = useState<number | null>(null);
  const [therapistLoading, setTherapistLoading] = useState(false);
  const [chosenTherapistName, setChosenTherapistName] = useState('');
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [booking, setBooking] = useState<{ date: string; start: string } | null | false>(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const days = useMemo(() => (view === 'day' ? [anchor] : weekOf(anchor)), [view, anchor]);
  const from = useMemo(() => zonedToUtc(days[0], '00:00'), [days, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const to = useMemo(() => zonedToUtc(addDays(days[days.length - 1], 1), '00:00'), [days, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const fetcher = useCallback(() => opsApi.appointments(centerId, { from: from.toISOString(), to: to.toISOString(), membershipId: therapist || undefined, childId: child || undefined }), [centerId, from, to, therapist, child]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  useEffect(() => {
    if (data && getCenterTz() !== tz) {
      setTz(getCenterTz());
      setAnchor(dayKey(new Date()));
    }
  }, [data, tz]);
  useEffect(() => {
    void opsApi.children(centerId, {}).then((r) => setChildren(r.items)).catch(() => setChildren([]));
  }, [centerId]);
  useEffect(() => {
    if (isTherapist) return;
    let live = true;
    setTherapistLoading(true); setTherapists([]); setTherapistNext(null);
    void opsApi.therapists(centerId, { search: therapistSearch.trim(), limit: 100 })
      .then(page => { if (live) { setTherapists(page.items); setTherapistNext(page.nextOffset); } })
      .catch(() => { if (live) setTherapists([]); })
      .finally(() => { if (live) setTherapistLoading(false); });
    return () => { live = false; };
  }, [centerId, isTherapist, therapistSearch]);
  const loadMoreTherapists = async () => {
    if (therapistLoading || therapistNext === null) return;
    setTherapistLoading(true);
    try {
      const page = await opsApi.therapists(centerId, { search: therapistSearch.trim(), offset: therapistNext, limit: 100 });
      setTherapists(prev => [...prev, ...page.items]); setTherapistNext(page.nextOffset);
    } catch { /* The existing directory remains available; retry via Load more. */ }
    finally { setTherapistLoading(false); }
  };

  const shown = data ? data.items.filter((a) => days.includes(dayKey(a.startsAt))) : [];
  const step = view === 'day' ? 1 : 7;
  const label = view === 'day' ? dayTitle(anchor, { weekday: 'long', month: 'short', day: 'numeric' }) : `${dayTitle(days[0], { month: 'short', day: 'numeric' })} – ${dayTitle(days[6], { month: 'short', day: 'numeric' })}`;
  const done = (m: string) => { setBooking(false); setEditing(null); setSelected(null); setNotice(m); void reload(); };
  const mine = (a: Appointment) => manage || a.membershipId === ctx?.membershipId;
  const grid = view === 'day' || wide;
  return (
    <div className="space-y-5">
      <PageTitle title="Schedule" body={isTherapist ? 'Your visits, in the center’s time zone.' : 'Every visit across the center, in the center’s time zone.'} testId="schedule-title"
        action={manage ? <Button onClick={() => setBooking(null)} data-testid="book-appointment-button"><CalendarPlus size={17} aria-hidden="true" /> Book appointment</Button> : undefined} />
      {notice && <FormAlert tone="success" testId="schedule-notice-success">{notice}</FormAlert>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Calendar view" className="inline-flex rounded-control border border-border-light p-0.5">
            {(['day', 'week'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} data-testid={`view-${v}`}
                className={`min-h-[38px] rounded-[8px] px-3 text-[14px] font-semibold capitalize transition-colors ${view === v ? 'bg-brand-action text-white' : 'hover:bg-surface-subtle'}`}>{v}</button>
            ))}
          </div>
          <Button size="sm" variant="secondary" aria-label={`Previous ${view}`} onClick={() => setAnchor(addDays(anchor, -step))} data-testid="week-prev"><ChevronLeft size={16} aria-hidden="true" /></Button>
          <p className="tnum min-w-[128px] text-center text-[14px] font-semibold sm:min-w-[170px] sm:text-[15px]" aria-live="polite" data-testid="week-label">{label}</p>
          <Button size="sm" variant="secondary" aria-label={`Next ${view}`} onClick={() => setAnchor(addDays(anchor, step))} data-testid="week-next"><ChevronRight size={16} aria-hidden="true" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(dayKey(new Date()))} data-testid="week-today">Today</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[480px]">
          {!isTherapist && <div className="space-y-2">
            <label className="block text-[12px] font-medium">Find therapist
              <input type="search" className="mt-1 w-full rounded-control border border-border-light px-3 py-2 text-[14px]" value={therapistSearch}
                onChange={e => setTherapistSearch(e.target.value)} data-testid="schedule-therapist-search" placeholder="Search name" />
            </label>
            <SelectField label="Therapist" value={therapist} onChange={value => { setTherapist(value); setChosenTherapistName(therapists.find(t => t.membershipId === value)?.displayName ?? 'Selected therapist'); }} testId="schedule-therapist-filter" options={[
              { value: '', label: 'All therapists' },
              ...(therapist && !therapists.some(t => t.membershipId === therapist) ? [{ value: therapist, label: chosenTherapistName }] : []),
              ...therapists.map(t => ({ value: t.membershipId, label: t.displayName })),
            ]} />
            {therapistNext !== null && <Button size="sm" variant="secondary" disabled={therapistLoading}
              onClick={() => void loadMoreTherapists()} data-testid="schedule-therapist-more">Load more therapists</Button>}
          </div>}
          <SelectField label="Child" value={child} onChange={setChild} testId="schedule-child-filter" options={[{ value: '', label: 'All children' }, ...children.map((c) => ({ value: c.id, label: `${c.preferredName ?? c.firstName} ${c.lastName}` }))]} />
        </div>
      </div>
      {failed && <ErrorState onRetry={() => void reload()} testId="schedule-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={6} testId="schedule-loading" /></Card>}
      {data && !shown.length && !grid && <EmptyState icon={CalendarDays} title="Nothing booked this week" body={manage ? 'Book a visit for a child with an assigned therapist.' : 'Visits booked for you will appear here.'} testId="schedule-empty" />}
      {data && !shown.length && grid && <p className="text-[14px] text-brand-inkMuted" data-testid="schedule-empty">Nothing booked {view === 'day' ? 'on this day' : 'this week'}{therapist || child ? ' for this filter' : ''}.{manage ? ' Choose an empty slot to book.' : ''}</p>}
      {data && grid && <div data-testid="schedule-week"><CalendarGrid days={days} items={shown} onOpen={setSelected} onSlot={manage ? (date, start) => setBooking({ date, start }) : undefined} /></div>}
      {data && !grid && shown.length > 0 && <Agenda days={days} items={shown} onOpen={setSelected} />}
      <div className="flex flex-wrap gap-3 text-[12px] text-brand-inkMuted" data-testid="schedule-legend">
        {[['bg-brand-action', 'Scheduled'], ['bg-status-success', 'Attended'], ['bg-status-caution', 'No-show'], ['bg-border-strong', 'Cancelled']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} aria-hidden="true" />{l}</span>)}
        <span>↻ repeating</span>
      </div>
      <BookDialog centerId={centerId} open={booking !== false || !!editing} editing={editing} initial={booking || null} onClose={() => { setBooking(false); setEditing(null); }} onError={onError} onDone={done} />
      <AppointmentPanel centerId={centerId} appt={editing ? null : selected} manage={manage} mine={!!selected && mine(selected)} canOpenClinical={!!selected && isTherapist && selected.membershipId === ctx?.membershipId && session.permissions.includes('center.clinical.read')} onClose={() => setSelected(null)} onError={onError}
        onMove={(a) => setEditing(a)} onDone={done} />
    </div>
  );
}

export default function SchedulePage() {
  return <Workspace active="schedule" permission="center.schedule.read" deniedText="The schedule is available to center staff.">{(s, onError) => <Schedule session={s} onError={onError} />}</Workspace>;
}
