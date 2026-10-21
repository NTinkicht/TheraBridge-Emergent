'use client';

import { useState } from 'react';
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

function NoteEditor({ centerId, n, canEdit, run }: { centerId: string; n: Workspace['notes'][number]; canEdit: boolean; run: Run }) {
  const [s, setS] = useState<Record<string, string>>(n.sections);
  const edit = canEdit && n.mine;
  return (
    <Card className="space-y-3 p-5" testId={`note-${n.id}`}>
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-semibold">{serviceLabel(n.service)} session · {n.sessionDate}</h3><Pill tone="neutral">Draft</Pill><span className="text-[13px] text-brand-inkMuted">by {n.author}</span></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTIONS.map(([k, l]) => <label key={k} className="block text-[14px] font-medium">{l}<textarea className={input} rows={3} value={s[k] ?? ''} disabled={!edit} onChange={(e) => setS({ ...s, [k]: e.target.value })} data-testid={`note-${k}-${n.id}`} /></label>)}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {edit && <Button onClick={() => void run(() => clinicalApi.saveNote(centerId, n.id, s, n.version), 'Session draft saved.')} data-testid={`note-save-${n.id}`}>Save draft</Button>}
        <LockedAction id={`sign-${n.id}`} label="Sign note" reason={LOCKED_REASON} />
      </div>
    </Card>
  );
}

export function SessionsPanel({ centerId, ws, run }: { centerId: string; ws: Workspace; run: Run }) {
  const open = ws.appointments.filter((a) => !a.hasNote && Date.parse(a.startsAt) <= Date.now() + 86_400_000);
  return (
    <div className="space-y-4" data-testid="sessions-panel">
      {ws.canEdit && (
        <Card className="p-5" testId="session-start">
          <h3 className="text-[16px] font-semibold">Start a session draft</h3>
          {open.length ? <ul className="mt-2 space-y-2">{open.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-light p-3 text-[14px]">
              <span>{dayLabel(a.startsAt)} · {serviceLabel(a.service)}</span>
              <Button size="sm" variant="secondary" onClick={() => void run(() => clinicalApi.note(centerId, ws.child.id, { service: a.service, sessionDate: zonedParts(a.startsAt).date, appointmentId: a.id }), 'Session draft started.')} data-testid={`session-start-${a.id}`}>Start draft</Button>
            </li>
          ))}</ul> : <p className="mt-1 text-[14px] text-brand-inkMuted">No recent visits without a draft.</p>}
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => void run(() => clinicalApi.note(centerId, ws.child.id, { service: ws.child.services[0], sessionDate: today() }), 'Session draft started.')} data-testid="session-start-blank">Draft without an appointment</Button>
        </Card>
      )}
      {ws.notes.map((n) => <NoteEditor key={`${n.id}-${n.version}`} centerId={centerId} n={n} canEdit={ws.canEdit} run={run} />)}
      {!ws.notes.length && <p className="text-[14px] text-brand-inkMuted" data-testid="notes-empty">No session drafts yet.</p>}
    </div>
  );
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
