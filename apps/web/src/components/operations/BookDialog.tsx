'use client';

import { useEffect, useState } from 'react';
import { Field, FormAlert } from '@/components/auth/Field';
import { SelectField, errorText } from '@/components/centers/kit';
import { Button } from '@/components/design/ui';
import { Dialog } from '@/components/design/states';
import { SPECIALTY_OPTIONS } from '@/lib/auth';
import { getCenterTz, opsApi, zonedParts, zonedToUtc, type Appointment, type ChildRow, type Therapist } from '@/lib/operations';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => zonedParts(d.toISOString()).date ?? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const serviceLabel = (s: string) => SPECIALTY_OPTIONS.find((o) => o.value === s)?.label ?? s;

// Books a new appointment, or reschedules `editing`. Times are entered in the center's time zone.
export function BookDialog({ centerId, open, onClose, onDone, onError, childId, editing }: {
  centerId: string; open: boolean; onClose: () => void; onDone: (msg: string) => void; onError: (e: unknown) => void; childId?: string; editing?: Appointment | null;
}) {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const tomorrow = new Date(Date.now() + 86_400_000);
  const [f, setF] = useState({ childId: '', membershipId: '', service: '', date: localDate(tomorrow), start: '09:00', minutes: '45', room: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    if (editing) {
      const s = new Date(editing.startsAt);
      const p = zonedParts(editing.startsAt);
      setF({ childId: editing.childId, membershipId: editing.membershipId, service: editing.service, date: p.date, start: p.time, minutes: String(Math.round((new Date(editing.endsAt).getTime() - s.getTime()) / 60000)), room: editing.room ?? '' });
      return;
    }
    setF((x) => ({ ...x, childId: childId ?? '', membershipId: '', service: '' }));
    Promise.all([opsApi.children(centerId, {}), opsApi.therapists(centerId)]).then(([c, t]) => {
      setChildren(c.items);
      setTherapists(t.items);
      const only = c.items.find((x) => x.id === childId);
      if (only?.services.length === 1) setF((x) => ({ ...x, service: only.services[0] }));
    }).catch((e) => setMsg(errorText(e, onError)));
  }, [open, editing, childId, centerId, onError]);

  async function save() {
    const startsAt = zonedToUtc(f.date, f.start);
    const endsAt = new Date(startsAt.getTime() + Number(f.minutes) * 60000);
    if (!editing && (!f.childId || !f.membershipId || !f.service)) return setMsg('Choose the child, therapist and service.');
    if (Number.isNaN(startsAt.getTime())) return setMsg('Enter a valid date and start time.');
    setBusy(true);
    setMsg(null);
    try {
      if (editing) await opsApi.reschedule(centerId, editing.id, { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), room: f.room, version: editing.version });
      else await opsApi.book(centerId, { childId: f.childId, membershipId: f.membershipId, service: f.service, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), room: f.room || undefined });
      onDone(editing ? 'Appointment moved.' : 'Appointment booked.');
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }

  const child = children.find((c) => c.id === f.childId);
  return (
    <Dialog open={open} onClose={onClose} title={editing ? `Move ${editing.child}’s appointment` : 'Book an appointment'} testId="book-dialog"
      footer={<><Button variant="secondary" onClick={onClose} data-testid="book-cancel">Cancel</Button><Button onClick={() => void save()} disabled={busy} data-testid="book-save">{busy ? 'Saving…' : editing ? 'Move appointment' : 'Book'}</Button></>}>
      <div className="space-y-4">
        {msg && <FormAlert tone="danger" testId="book-error">{msg}</FormAlert>}
        {!editing && (
          <>
            <SelectField label="Child" value={f.childId} onChange={(v) => setF({ ...f, childId: v, service: children.find((c) => c.id === v)?.services.length === 1 ? children.find((c) => c.id === v)!.services[0] : '' })} testId="book-child-select"
              options={[{ value: '', label: 'Choose a child' }, ...children.map((c) => ({ value: c.id, label: `${c.preferredName ?? c.firstName} ${c.lastName}` }))]} />
            <SelectField label="Service" value={f.service} onChange={(v) => setF({ ...f, service: v })} testId="book-service-select"
              options={[{ value: '', label: 'Choose a service' }, ...(child?.services ?? []).map((s) => ({ value: s, label: serviceLabel(s) }))]} />
            <SelectField label="Therapist" value={f.membershipId} onChange={(v) => setF({ ...f, membershipId: v })} testId="book-therapist-select"
              options={[{ value: '', label: 'Choose a therapist' }, ...therapists.map((t) => ({ value: t.membershipId, label: t.displayName }))]} />
            <p className="text-[13px] text-brand-inkMuted">The therapist must be assigned to this child for the chosen service.</p>
          </>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} testId="book-date-input" />
          <Field label="Start" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} testId="book-start-input" />
          <SelectField label="Length" value={f.minutes} onChange={(v) => setF({ ...f, minutes: v })} testId="book-length-select"
            options={['30', '45', '60', '90'].map((m) => ({ value: m, label: `${m} minutes` }))} />
        </div>
        <p className="text-[13px] text-brand-inkMuted" data-testid="book-timezone-note">Times are in the center’s time zone{getCenterTz() ? ` (${getCenterTz()!.replace('_', ' ')})` : ''}.</p>
        <Field label="Room (optional)" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} maxLength={80} testId="book-room-input" />
      </div>
    </Dialog>
  );
}
