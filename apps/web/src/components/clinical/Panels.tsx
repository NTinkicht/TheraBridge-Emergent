'use client';

import { useRef, useState } from 'react';
import { SessionEditor } from './SessionEditor';
import { Field } from '@/components/auth/Field';
import { SelectField } from '@/components/centers/kit';
import { GoalChart } from '@/components/clinical/GoalChart';
import { Button, Card, LockedAction, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import { LOCKED_REASON, clinicalApi, type Workspace } from '@/lib/clinical';
import { dayLabel, zonedParts } from '@/lib/operations';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
const input = 'mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';
const today = () => zonedParts(new Date().toISOString()).date;
const SECTIONS = [['focus', 'Session focus'], ['activities', 'Activities used'], ['response', 'Child’s response'], ['nextSteps', 'Next steps']] as const;

export function AssessmentsPanel({ centerId, ws, run }: { centerId: string; ws: Workspace; run: Run }) {
  const [f, setF] = useState({ service: ws.child.services[0] ?? '', assessedOn: today(), summary: '', area: '', finding: '' });
  return (
    <div className="space-y-4" data-testid="assessments-panel">
      {ws.assessments.map((a) => (
        <Card key={a.id} className="p-5" testId={`assessment-${a.id}`}>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-semibold">{serviceLabel(a.service)} assessment · {a.assessedOn}</h3><Pill tone="neutral">Draft</Pill></div>
          <p className="text-[13px] text-brand-inkMuted">by {a.author}</p>
          <p className="mt-2 whitespace-pre-wrap text-[14px]">{a.summary}</p>
          {a.areas.length > 0 && <ul className="mt-2 list-disc pl-5 text-[14px]">{a.areas.map((x, i) => <li key={i}><span className="font-semibold">{x.area}:</span> {x.finding}</li>)}</ul>}
        </Card>
      ))}
      {!ws.assessments.length && <p className="text-[14px] text-brand-inkMuted" data-testid="assessments-empty">No initial assessment recorded yet.</p>}
      {ws.canEdit && (
        <Card className="space-y-3 p-5" testId="assessment-form">
          <h3 className="text-[16px] font-semibold">New initial assessment (draft)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service })} testId="assessment-service" options={ws.child.services.map((s) => ({ value: s, label: serviceLabel(s) }))} />
            <Field label="Assessed on" type="date" value={f.assessedOn} onChange={(e) => setF({ ...f, assessedOn: e.target.value })} testId="assessment-date" />
          </div>
          <label className="block text-[14px] font-medium">Summary<textarea className={input} rows={3} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} data-testid="assessment-summary" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Area (optional)" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} testId="assessment-area" />
            <Field label="Finding" value={f.finding} onChange={(e) => setF({ ...f, finding: e.target.value })} testId="assessment-finding" />
          </div>
          <Button onClick={() => void (async () => { if (f.summary.trim().length < 3) return run(() => Promise.reject(Object.assign(new Error('Write a summary of at least 3 characters.'), { status: 422 })), ''); if (await run(() => clinicalApi.assess(centerId, ws.child.id, { service: f.service, assessedOn: f.assessedOn, summary: f.summary, areas: f.area.trim().length > 1 ? [{ area: f.area.trim(), finding: f.finding }] : [] }), 'Assessment draft saved.')) setF({ ...f, summary: '', area: '', finding: '' }); })()} data-testid="assessment-save">Save assessment draft</Button>
        </Card>
      )}
    </div>
  );
}

export function SessionsPanel({ centerId, ws, run, onPending }: { centerId: string; ws: Workspace; run: Run; onPending: (id: string, pending: boolean) => void }) {
  const [service, setService] = useState(ws.child.services[0] ?? '');
  const startRequest = useRef<Parameters<typeof clinicalApi.startSession>[2] | null>(null);
  const [busy, setBusy] = useState(false);
  async function start(service: string, appointmentId?: string) {
    if (busy) return; setBusy(true);
    if (!startRequest.current || startRequest.current.service !== service || startRequest.current.appointmentId !== appointmentId) {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: ws.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const part = (type: string) => parts.find(p => p.type === type)?.value;
      startRequest.current = { service, sessionDate: `${part('year')}-${part('month')}-${part('day')}`, appointmentId, actualStart: now.toISOString(), startKey: crypto.randomUUID() };
    }
    const request = startRequest.current;
    const ok = await run(() => clinicalApi.startSession(centerId, ws.child.id, request), 'Session started.');
    if (ok) startRequest.current = null;
    setBusy(false);
  }
  return <div className="space-y-4" data-testid="sessions-panel">
    {ws.canEdit && <Card className="space-y-3 p-5" testId="session-start"><h3 className="font-semibold">Start a session</h3>
      {ws.appointments.filter(a => !a.hasNote && a.status === 'SCHEDULED').map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-light p-3"><span>{dayLabel(a.startsAt)} · {serviceLabel(a.service)} {a.room ? `· ${a.room}` : ''}</span><Button disabled={busy || Date.parse(a.startsAt) > Date.now()} onClick={() => void start(a.service, a.id)}>Start scheduled session</Button></div>)}
      <SelectField label="Ad-hoc session specialty" value={service} onChange={setService} options={ws.child.services.map(value => ({ value, label: serviceLabel(value) }))} testId="session-specialty" />
      <Button disabled={busy || !service} onClick={() => void start(service)}>Start ad-hoc session</Button>
    </Card>}
    {ws.notes.map(n => <SessionEditor key={n.id} centerId={centerId} n={n} ws={ws} onPending={onPending} />)}
    {!ws.notes.length && <p>No sessions yet.</p>}
  </div>;
}

export function ProgressPanel({ centerId, ws, run }: { centerId: string; ws: Workspace; run: Run }) {
  const goals = ws.plans.flatMap((p) => p.versions.filter((v) => v.status !== 'SUPERSEDED').flatMap((v) => v.goals.map((g) => ({ ...g, versionId: v.id, plan: p.title }))));
  const [f, setF] = useState({ goal: goals[0] ? `${goals[0].versionId}|${goals[0].key}` : '', value: '', observedOn: today(), note: '' });
  return (
    <div className="space-y-4" data-testid="progress-panel">
      {!goals.length && <p className="text-[14px] text-brand-inkMuted" data-testid="progress-empty">Add goals to a plan to record observations.</p>}
      {goals.map((g) => {
        const hist = ws.observations.filter((o) => o.goalKey === g.key && ws.plans.some((p) => p.versions.some((v) => v.id === o.planVersionId) && p.versions.some((v) => v.id === g.versionId)));
        return (
          <Card key={`${g.versionId}-${g.key}`} className="p-5" testId={`progress-goal-${g.key}`}>
            <h3 className="text-[16px] font-semibold">{g.title}</h3>
            <p className="text-[13px] text-brand-inkMuted">{g.plan} · baseline {g.baseline} → target {g.target} ({g.measure})</p>
            {hist.length ? (
              <div className="mt-3">
                <GoalChart points={hist.map((o) => ({ date: o.observedOn, value: o.value }))} baseline={g.baseline} target={g.target} measure={g.measure} from={hist[0].observedOn} to={hist[hist.length - 1].observedOn} testId={`progress-chart-${g.key}`} />
                {hist.length === 1 && <p className="mt-1 text-[13px] text-brand-inkMuted">Only one observation recorded, not enough to show change.</p>}
              </div>
            ) : <p className="mt-2 text-[14px] text-brand-inkMuted">No observations yet.</p>}
          </Card>
        );
      })}
      {ws.canEdit && goals.length > 0 && (
        <Card className="grid grid-cols-1 items-end gap-3 p-5 md:grid-cols-[1fr_110px_160px_auto]" testId="observation-form">
          <SelectField label="Goal" value={f.goal} onChange={(goal) => setF({ ...f, goal })} testId="observation-goal" options={goals.map((g) => ({ value: `${g.versionId}|${g.key}`, label: g.title }))} />
          <Field label="Value" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} testId="observation-value" />
          <Field label="Observed on" type="date" value={f.observedOn} onChange={(e) => setF({ ...f, observedOn: e.target.value })} testId="observation-date" />
          <Button onClick={() => void (async () => { if (f.value.trim() === '' || Number.isNaN(Number(f.value))) return run(() => Promise.reject(Object.assign(new Error('Enter a number for the observation.'), { status: 422 })), ''); const [planVersionId, goalKey] = f.goal.split('|'); if (await run(() => clinicalApi.observe(centerId, ws.child.id, { planVersionId, goalKey, value: Number(f.value), observedOn: f.observedOn }), 'Observation recorded.')) setF({ ...f, value: '' }); })()} data-testid="observation-save">Record</Button>
        </Card>
      )}
    </div>
  );
}
