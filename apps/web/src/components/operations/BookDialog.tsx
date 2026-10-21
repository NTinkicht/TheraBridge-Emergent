'use client';

import { useEffect, useState } from 'react';
import { Field, FormAlert } from '@/components/auth/Field';
import { SelectField, errorText } from '@/components/centers/kit';
import { Button } from '@/components/design/ui';
import { Dialog } from '@/components/design/states';
import { ApiError } from '@/lib/api';
import { SPECIALTY_OPTIONS } from '@/lib/auth';
import { getCenterTz, isoWeekday, opsApi, zonedParts, zonedToUtc, type Appointment, type Assignment, type ChildRow, type Clash } from '@/lib/operations';
import { RepeatFields, type Repeat } from './RepeatFields';

export const serviceLabel = (s: string) => SPECIALTY_OPTIONS.find((o) => o.value === s)?.label ?? s;
const tomorrow = () => zonedParts(new Date(Date.now() + 86_400_000).toISOString()).date;
const blank = (date: string, start: string) => ({ childId: '', membershipId: '', service: '', date, start, minutes: '45', room: '' });
const fromAppt = (a: Appointment) => {
  const p = zonedParts(a.startsAt);
  return { childId: a.childId, membershipId: a.membershipId, service: a.service, date: p.date, start: p.time, minutes: String(Math.round((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60000)), room: a.room ?? '' };
};

// Books a visit or a weekly series, or moves `editing`. Choices come from the child's active assignments; times are in the center's zone.
export function BookDialog({ centerId, open, onClose, onDone, onError, childId, editing, initial }: {
  centerId: string; open: boolean; onClose: () => void; onDone: (msg: string) => void; onError: (e: unknown) => void; childId?: string; editing?: Appointment | null; initial?: { date: string; start: string } | null;
}) {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [team, setTeam] = useState<Assignment[]>([]);
  const [f, setF] = useState(() => (editing ? fromAppt(editing) : blank(tomorrow(), '09:00')));
  const [repeat, setRepeat] = useState<Repeat>({ mode: 'none', weekdays: [], end: 'count', count: '10', until: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [clashes, setClashes] = useState<Clash[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setClashes(null);
    if (editing) {
      setF(fromAppt(editing));
      return;
    }
    const date = initial?.date ?? tomorrow();
    setF({ ...blank(date, initial?.start ?? '09:00'), childId: childId ?? '' });
    setRepeat({ mode: 'none', weekdays: [isoWeekday(date)], end: 'count', count: '10', until: '' });
    opsApi.children(centerId, {}).then((r) => setChildren(r.items)).catch((e) => setMsg(errorText(e, onError)));
  }, [open, editing, childId, centerId, onError, initial]);

  useEffect(() => {
    if (!open || editing || !f.childId) return setTeam([]);
    opsApi.child(centerId, f.childId).then((d) => {
      const active = d.assignments.filter((a) => !a.endedAt);
      setTeam(active);
      const services = [...new Set(active.map((a) => a.service))];
      setF((x) => {
        const service = services.includes(x.service) ? x.service : services.length === 1 ? services[0] : '';
        const forService = active.filter((a) => a.service === service);
        return { ...x, service, membershipId: forService.some((a) => a.membershipId === x.membershipId) ? x.membershipId : (forService.find((a) => a.isLead) ?? forService[0])?.membershipId ?? '' };
      });
    }).catch((e) => setMsg(errorText(e, onError)));
  }, [open, editing, f.childId, centerId, onError]);

  async function save(skipConflicts = false) {
    const startsAt = zonedToUtc(f.date, f.start);
    const endsAt = new Date(startsAt.getTime() + Number(f.minutes) * 60000);
    if (!editing && (!f.childId || !f.membershipId || !f.service)) return setMsg('Choose the child, service and therapist.');
    if (!f.date || !f.start || Number.isNaN(startsAt.getTime())) return setMsg('Enter a valid date and start time.');
    if (!editing && repeat.mode !== 'none' && !repeat.weekdays.length) return setMsg('Choose at least one day for the repeating visits.');
    setBusy(true);
    setMsg(null);
    try {
      if (editing) {
        await opsApi.reschedule(centerId, editing.id, { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), room: f.room, version: editing.version });
        onDone(editing.seriesId ? 'Visit moved. The rest of the series is unchanged.' : 'Appointment moved.');
      } else if (repeat.mode === 'none') {
        await opsApi.book(centerId, { childId: f.childId, membershipId: f.membershipId, service: f.service, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), room: f.room || undefined });
        onDone('Appointment booked.');
      } else {
        const r = await opsApi.createSeries(centerId, {
          childId: f.childId, membershipId: f.membershipId, service: f.service, room: f.room || undefined, startDate: f.date, startTime: f.start, durationMinutes: Number(f.minutes),
          weekdays: repeat.weekdays, intervalWeeks: repeat.mode === 'biweekly' ? 2 : 1, ...(repeat.end === 'count' ? { count: Number(repeat.count) } : { untilDate: repeat.until }), skipConflicts,
        });
        onDone(`${r.created} repeating ${r.created === 1 ? 'visit' : 'visits'} booked${r.skipped.length ? `, ${r.skipped.length} skipped because of clashes` : ''}.`);
      }
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.details?.conflicts)) setClashes(e.details.conflicts as Clash[]);
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }

  const child = children.find((c) => c.id === f.childId);
  const services = [...new Set(team.map((a) => a.service))];
  const therapists = team.filter((a) => a.service === f.service);
  return (
    <Dialog open={open} onClose={onClose} title={editing ? `Move ${editing.child}’s visit` : 'Book an appointment'} testId="book-dialog"
      footer={<><Button variant="secondary" onClick={onClose} data-testid="book-cancel">Cancel</Button><Button onClick={() => void save()} disabled={busy} data-testid="book-save">{busy ? 'Saving…' : editing ? 'Move visit' : repeat.mode === 'none' ? 'Book' : 'Book series'}</Button></>}>
      <div className="space-y-4">
        {msg && <FormAlert tone="danger" testId="book-error">{msg}</FormAlert>}
        {clashes && clashes.length > 0 && <ClashList clashes={clashes} onSkip={() => void save(true)} busy={busy} />}
        {!editing && (
          <>
            <SelectField label="Child" value={f.childId} onChange={(v) => setF({ ...f, childId: v, service: '', membershipId: '' })} testId="book-child-select"
              options={[{ value: '', label: 'Choose a child' }, ...children.map((c) => ({ value: c.id, label: `${c.preferredName ?? c.firstName} ${c.lastName}` }))]} />
            {child && !services.length && <p className="text-[13px] text-status-caution" data-testid="book-no-team">{child.preferredName ?? child.firstName} has no therapist assigned yet. Assign one on the child’s page first.</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Service" value={f.service} onChange={(v) => setF({ ...f, service: v, membershipId: (team.find((a) => a.service === v && a.isLead) ?? team.find((a) => a.service === v))?.membershipId ?? '' })} testId="book-service-select"
                options={[{ value: '', label: services.length ? 'Choose a service' : 'No assigned services' }, ...services.map((s) => ({ value: s, label: serviceLabel(s) }))]} />
              <SelectField label="Therapist" value={f.membershipId} onChange={(v) => setF({ ...f, membershipId: v })} testId="book-therapist-select"
                options={[{ value: '', label: therapists.length ? 'Choose a therapist' : 'Choose a service first' }, ...therapists.map((t) => ({ value: t.membershipId, label: `${t.therapist}${t.isLead ? ' · lead' : ''}` }))]} />
            </div>
            <p className="text-[13px] text-brand-inkMuted">Only therapists assigned to this child for the chosen service are listed.</p>
          </>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={repeat.mode === 'none' || editing ? 'Date' : 'First visit'} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} testId="book-date-input" />
          <Field label="Start" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} testId="book-start-input" />
          <SelectField label="Length" value={f.minutes} onChange={(v) => setF({ ...f, minutes: v })} testId="book-length-select"
            options={['30', '45', '60', '90'].map((m) => ({ value: m, label: `${m} minutes` }))} />
        </div>
        {!editing && <RepeatFields value={repeat} onChange={setRepeat} />}
        <p className="text-[13px] text-brand-inkMuted" data-testid="book-timezone-note">Times are in the center’s time zone{getCenterTz() ? ` (${getCenterTz()!.replace('_', ' ')})` : ''}. Repeating visits keep the same local time when the clocks change.</p>
        <Field label="Room (optional)" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} maxLength={80} testId="book-room-input" />
      </div>
    </Dialog>
  );
}

function ClashList({ clashes, onSkip, busy }: { clashes: Clash[]; onSkip: () => void; busy: boolean }) {
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  return (
    <div className="rounded-control border border-status-caution/40 bg-status-cautionSurface p-3 text-[14px]" data-testid="book-clashes">
      <p className="font-semibold">These dates clash</p>
      <ul className="mt-1 list-disc pl-5">{clashes.map((c) => <li key={c.date} data-testid={`book-clash-${c.date}`}>{fmt(c.date)} — {c.reason}</li>)}</ul>
      <Button size="sm" variant="secondary" className="mt-3" onClick={onSkip} disabled={busy} data-testid="book-skip-clashes">Book the rest and skip these dates</Button>
    </div>
  );
}
