'use client';

import { useEffect, useState } from 'react';
import { BellRing, Repeat as RepeatIcon } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { ReasonField, SelectField, errorText } from '@/components/centers/kit';
import { Button } from '@/components/design/ui';
import { Dialog } from '@/components/design/states';
import { dayLabel, opsApi, timeRange, zonedParts, type Appointment, type Series } from '@/lib/operations';
import { serviceLabel } from './BookDialog';
import { ApptPill } from './Dashboards';
import { WEEKDAYS } from './RepeatFields';

type Mode = 'view' | 'cancel' | 'noshow' | 'seriesEdit' | 'seriesCancel';

// Details and every action for one visit, including "this and following" changes to its series.
export function AppointmentPanel({ centerId, appt, manage, mine, onClose, onMove, onDone, onError }: {
  centerId: string; appt: Appointment | null; manage: boolean; mine: boolean; onClose: () => void; onMove: (a: Appointment) => void; onDone: (msg: string) => void; onError: (e: unknown) => void;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [series, setSeries] = useState<Series | null>(null);
  const [edit, setEdit] = useState({ start: '09:00', minutes: '45' });

  useEffect(() => {
    setMode('view');
    setReason('');
    setErr(null);
    setSeries(null);
    if (appt?.seriesId) opsApi.series(centerId, appt.seriesId).then(setSeries).catch(() => setSeries(null));
    if (appt) setEdit({ start: zonedParts(appt.startsAt).time, minutes: String(Math.round((Date.parse(appt.endsAt) - Date.parse(appt.startsAt)) / 60000)) });
  }, [appt, centerId]);

  if (!appt) return <Dialog open={false} onClose={onClose} title="" testId="appt-panel">{null}</Dialog>;
  const started = Date.parse(appt.startsAt) <= Date.now();
  const open = appt.status === 'SCHEDULED';
  const fromDate = zonedParts(appt.startsAt).date;

  const run = async (fn: () => Promise<unknown>, ok: string, needReason = false) => {
    if (needReason && reason.trim().length < 3) return setErr('Give a reason of at least 3 characters.');
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onDone(ok);
    } catch (e) {
      setErr(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  };

  const footer = mode === 'view' ? (
    <>
      {open && mine && started && <Button variant="secondary" disabled={busy} onClick={() => void run(() => opsApi.setStatus(centerId, appt.id, 'COMPLETED'), 'Marked as attended.')} data-testid="appt-attended">Attended</Button>}
      {open && mine && started && <Button variant="ghost" onClick={() => setMode('noshow')} data-testid="appt-noshow">No-show</Button>}
      {open && manage && !started && <Button variant="secondary" onClick={() => onMove(appt)} data-testid="appt-move">Move this visit</Button>}
      {open && manage && <Button variant="ghost" onClick={() => setMode('cancel')} data-testid="appt-cancel">Cancel visit</Button>}
      {!open || (!manage && !(mine && started)) ? <Button variant="secondary" onClick={onClose} data-testid="appt-close">Close</Button> : null}
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => { setMode('view'); setErr(null); }} data-testid="appt-back">Back</Button>
      {mode === 'cancel' && <Button variant="danger" disabled={busy} onClick={() => void run(() => opsApi.setStatus(centerId, appt.id, 'CANCELLED', reason.trim()), 'Visit cancelled.', true)} data-testid="appt-cancel-confirm">Cancel this visit</Button>}
      {mode === 'noshow' && <Button variant="danger" disabled={busy} onClick={() => void run(() => opsApi.setStatus(centerId, appt.id, 'NO_SHOW', reason.trim()), 'No-show recorded.', true)} data-testid="appt-noshow-confirm">Record no-show</Button>}
      {mode === 'seriesCancel' && series && <Button variant="danger" disabled={busy} onClick={() => void run(() => opsApi.cancelSeries(centerId, series.id, fromDate, reason.trim()), 'This and following visits cancelled.', true)} data-testid="series-cancel-confirm">Cancel this and following</Button>}
      {mode === 'seriesEdit' && series && <Button disabled={busy} onClick={() => void run(() => opsApi.updateSeries(centerId, series.id, { fromDate, startTime: edit.start, durationMinutes: Number(edit.minutes), version: series.version }), 'This and following visits updated.')} data-testid="series-edit-confirm">Update this and following</Button>}
    </>
  );

  return (
    <Dialog open onClose={onClose} title={appt.childFull} testId="appt-panel" footer={footer}>
      <div className="space-y-4">
        {err && <FormAlert tone="danger" testId="appt-error">{err}</FormAlert>}
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[14px]">
          <dt className="text-brand-inkMuted">When</dt><dd className="tnum" data-testid="appt-when">{dayLabel(appt.startsAt)} · {timeRange(appt.startsAt, appt.endsAt)}</dd>
          <dt className="text-brand-inkMuted">Service</dt><dd>{serviceLabel(appt.service)} with {appt.therapist}</dd>
          {appt.room && <><dt className="text-brand-inkMuted">Room</dt><dd>{appt.room}</dd></>}
          <dt className="text-brand-inkMuted">Status</dt><dd className="flex flex-wrap items-center gap-2" data-testid="appt-status"><ApptPill a={appt} />{appt.statusReason && <span className="text-brand-inkMuted">“{appt.statusReason}”</span>}</dd>
          <dt className="text-brand-inkMuted">Reminder</dt><dd className="flex items-center gap-1.5" data-testid="appt-reminder"><BellRing size={14} aria-hidden="true" />{appt.reminderSentAt ? `Sent to the family ${new Date(appt.reminderSentAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Sent to connected guardians 24 hours before'}</dd>
        </dl>
        {series && <SeriesSummary series={series} exception={appt.isException} cancelled={appt.status === 'CANCELLED'} />}
        {mode === 'view' && open && manage && series?.status === 'ACTIVE' && !started && (
          <div className="flex flex-wrap gap-2" data-testid="series-actions">
            {!appt.isException && <Button size="sm" variant="secondary" onClick={() => setMode('seriesEdit')} data-testid="series-edit">Change this and following</Button>}
            <Button size="sm" variant="ghost" onClick={() => setMode('seriesCancel')} data-testid="series-cancel">Cancel this and following</Button>
          </div>
        )}
        {mode === 'seriesEdit' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="New start time" type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} testId="series-edit-start" />
            <SelectField label="Length" value={edit.minutes} onChange={(v) => setEdit({ ...edit, minutes: v })} testId="series-edit-length" options={['30', '45', '60', '90'].map((m) => ({ value: m, label: `${m} minutes` }))} />
            <p className="text-[13px] text-brand-inkMuted sm:col-span-2">Applies to this visit and every later one that hasn’t been moved separately. Dates stay the same.</p>
          </div>
        )}
        {(mode === 'cancel' || mode === 'noshow' || mode === 'seriesCancel') && <ReasonField value={reason} onChange={setReason} testId="appt-reason" label="Reason (kept in the history, not shown to the family)" />}
      </div>
    </Dialog>
  );
}

function SeriesSummary({ series, exception, cancelled }: { series: Series; exception: boolean; cancelled: boolean }) {
  const days = series.weekdays.map((d) => WEEKDAYS[d - 1]).join(', ');
  const left = series.occurrences.filter((o) => o.status === 'SCHEDULED' && Date.parse(o.startsAt) > Date.now()).length;
  return (
    <div className="flex items-start gap-2 rounded-control bg-surface-subtle p-3 text-[14px]" data-testid="series-summary">
      <RepeatIcon size={16} className="mt-0.5 shrink-0 text-brand-action" aria-hidden="true" />
      <p>
        {series.intervalWeeks === 2 ? 'Every 2 weeks' : 'Every week'} on {days} · {left} upcoming
        {series.status === 'ENDED' ? ' · series ended' : ''}{exception ? (cancelled ? ' · this visit was cancelled on its own' : ' · this visit was moved on its own') : ''}
      </p>
    </div>
  );
}
