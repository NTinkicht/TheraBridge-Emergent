'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { PageTitle, ReasonField, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { BookDialog, serviceLabel } from '@/components/operations/BookDialog';
import { ApptPill } from '@/components/operations/Dashboards';
import { Button, Card } from '@/components/design/ui';
import { Dialog, EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { dayKey, dayLabel, opsApi, timeRange, type Appointment, type Therapist } from '@/lib/operations';
import { CalendarDays } from 'lucide-react';

const weekStart = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
};

function Schedule({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const manage = session.permissions.includes('center.schedule.manage');
  const isTherapist = session.activeContext?.role === 'THERAPIST';
  const [week, setWeek] = useState(0);
  const [therapist, setTherapist] = useState('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [booking, setBooking] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [closing, setClosing] = useState<{ a: Appointment; status: 'CANCELLED' | 'NO_SHOW' } | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const from = useMemo(() => weekStart(week), [week]);
  const to = useMemo(() => new Date(from.getTime() + 7 * 86_400_000), [from]);
  const fetcher = useCallback(() => opsApi.appointments(centerId, { from: from.toISOString(), to: to.toISOString(), membershipId: therapist || undefined }), [centerId, from, to, therapist]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  useEffect(() => { if (!isTherapist) void opsApi.therapists(centerId).then((r) => setTherapists(r.items)).catch(() => setTherapists([])); }, [centerId, isTherapist]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setNotice({ tone: 'success', text: ok });
      await reload();
      return true;
    } catch (e) {
      const t = errorText(e, onError);
      if (t) setNotice({ tone: 'danger', text: t });
      return false;
    }
  };
  const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * 86_400_000));
  const now = Date.now();
  return (
    <div className="space-y-5">
      <PageTitle title="Schedule" body={isTherapist ? 'Your appointments.' : 'Appointments across the center.'} testId="schedule-title"
        action={manage ? <Button onClick={() => setBooking(true)} data-testid="book-appointment-button"><CalendarPlus size={17} aria-hidden="true" /> Book appointment</Button> : undefined} />
      {notice && <FormAlert tone={notice.tone} testId={`schedule-notice-${notice.tone}`}>{notice.text}</FormAlert>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" aria-label="Previous week" onClick={() => setWeek(week - 1)} data-testid="week-prev"><ChevronLeft size={16} aria-hidden="true" /></Button>
          <p className="tnum min-w-[180px] text-center text-[15px] font-semibold" data-testid="week-label">{from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(to.getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
          <Button size="sm" variant="secondary" aria-label="Next week" onClick={() => setWeek(week + 1)} data-testid="week-next"><ChevronRight size={16} aria-hidden="true" /></Button>
          {week !== 0 && <Button size="sm" variant="ghost" onClick={() => setWeek(0)} data-testid="week-today">This week</Button>}
        </div>
        {!isTherapist && <div className="sm:w-64"><SelectField label="Therapist" value={therapist} onChange={setTherapist} testId="schedule-therapist-filter" options={[{ value: '', label: 'All therapists' }, ...therapists.map((t) => ({ value: t.membershipId, label: t.displayName }))]} /></div>}
      </div>
      {failed && <ErrorState onRetry={() => void reload()} testId="schedule-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={5} testId="schedule-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={CalendarDays} title="Nothing booked this week" body={manage ? 'Book an appointment for a child with an assigned therapist.' : 'Appointments booked for you will appear here.'} testId="schedule-empty" />}
      {data && data.items.length > 0 && (
        <div className="space-y-4" data-testid="schedule-week">
          {days.map((d) => {
            const items = data.items.filter((a) => dayKey(a.startsAt) === dayKey(new Date(d.getTime() + 12 * 3_600_000)));
            if (!items.length) return null;
            return (
              <Card key={d.toISOString()} className="p-5" testId={`schedule-day-${d.getDay()}`}>
                <h2 className="text-[15px] font-semibold">{dayLabel(items[0].startsAt)}</h2>
                <ul className="mt-2 divide-y divide-border-light">
                  {items.map((a) => {
                    const started = new Date(a.startsAt).getTime() <= now;
                    const mine = manage || a.membershipId === (session.activeContext?.type === 'center' ? session.activeContext.membershipId : '');
                    return (
                      <li key={a.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between" data-testid={`appointment-${a.id}`}>
                        <span className="min-w-0"><span className="tnum block text-[13px] font-semibold text-brand-action">{timeRange(a.startsAt, a.endsAt)}</span><span className="block break-words font-semibold">{a.childFull}</span><span className="block text-[13px] text-brand-inkMuted">{serviceLabel(a.service)} · {a.therapist}{a.room ? ` · ${a.room}` : ''}{a.statusReason ? ` · “${a.statusReason}”` : ''}</span></span>
                        <span className="flex flex-wrap items-center gap-2">
                          <ApptPill a={a} />
                          {a.status === 'SCHEDULED' && mine && started && <Button size="sm" variant="secondary" onClick={() => void act(() => opsApi.setStatus(centerId, a.id, 'COMPLETED'), 'Marked as attended.')} data-testid={`appointment-attended-${a.id}`}>Attended</Button>}
                          {a.status === 'SCHEDULED' && mine && started && <Button size="sm" variant="ghost" onClick={() => { setClosing({ a, status: 'NO_SHOW' }); setReason(''); }} data-testid={`appointment-noshow-${a.id}`}>No-show</Button>}
                          {a.status === 'SCHEDULED' && manage && !started && <Button size="sm" variant="secondary" onClick={() => setEditing(a)} data-testid={`appointment-move-${a.id}`}>Move</Button>}
                          {a.status === 'SCHEDULED' && manage && <Button size="sm" variant="ghost" onClick={() => { setClosing({ a, status: 'CANCELLED' }); setReason(''); }} data-testid={`appointment-cancel-${a.id}`}>Cancel</Button>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
      <BookDialog centerId={centerId} open={booking || !!editing} editing={editing} onClose={() => { setBooking(false); setEditing(null); }} onError={onError}
        onDone={(m) => { setBooking(false); setEditing(null); setNotice({ tone: 'success', text: m }); void reload(); }} />
      <Dialog open={!!closing} onClose={() => setClosing(null)} title={closing?.status === 'CANCELLED' ? 'Cancel appointment' : 'Record a no-show'} testId="appointment-close-dialog"
        footer={<><Button variant="secondary" onClick={() => setClosing(null)}>Back</Button><Button variant="danger" data-testid="appointment-close-confirm" onClick={() => void (async () => { if (!closing) return; if (reason.trim().length < 3) return setNotice({ tone: 'danger', text: 'Give a reason of at least 3 characters.' }); if (await act(() => opsApi.setStatus(centerId, closing.a.id, closing.status, reason.trim()), closing.status === 'CANCELLED' ? 'Appointment cancelled.' : 'No-show recorded.')) setClosing(null); })()}>Confirm</Button></>}>
        <ReasonField value={reason} onChange={setReason} testId="appointment-close-reason" />
      </Dialog>
    </div>
  );
}

export default function SchedulePage() {
  return <Workspace active="schedule" permission="center.schedule.read" deniedText="The schedule is available to center staff.">{(s, onError) => <Schedule session={s} onError={onError} />}</Workspace>;
}
