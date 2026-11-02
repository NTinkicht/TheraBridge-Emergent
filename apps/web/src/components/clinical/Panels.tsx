'use client';

import { useRef, useState } from 'react';
import { SessionEditor } from './SessionEditor';
import { Field } from '@/components/auth/Field';
import { SelectField } from '@/components/centers/kit';
import { GoalChart } from '@/components/clinical/GoalChart';
import { GoalVersionContext } from './GoalVersionContext';
import { currentGoals, historicalGoals, summarizeObservations, type Granularity } from '@/lib/progress-analysis';
import { Button, Card, LockedAction, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import { LOCKED_REASON, clinicalApi, type Workspace } from '@/lib/clinical';
import { dayLabel, zonedParts } from '@/lib/operations';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
const input = 'mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';
const today = () => zonedParts(new Date().toISOString()).date;
const SECTIONS = [['focus', 'Session focus'], ['activities', 'Activities used'], ['response', 'Child’s response'], ['nextSteps', 'Next steps']] as const;

export function AssessmentsPanel({ centerId, ws, run, pagination }: { centerId: string; ws: Workspace; run: Run;
  pagination: { hasMore: boolean; loading: boolean; error: string; load: () => Promise<void> } }) {
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
      {pagination.hasMore && <Button variant="secondary" disabled={pagination.loading} onClick={() => void pagination.load()} data-testid="assessments-load-more">
        {pagination.loading ? 'Loading earlier assessments…' : 'Load earlier assessments'}
      </Button>}
      {pagination.error && <p role="alert" className="text-[13px] text-status-caution" data-testid="assessments-load-error">{pagination.error}</p>}
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

export function ProgressPanel({ centerId, ws, run, onNavigate }: { centerId: string; ws: Workspace; run: Run; onNavigate: () => void }) {
  const goals = currentGoals(ws).map(g => ({ ...g, versionId: g.planVersionId, plan: g.planTitle }));
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [showHistory, setShowHistory] = useState(false);
  const history = historicalGoals(ws);
  const [f, setF] = useState({ goal: goals[0] ? `${goals[0].versionId}|${goals[0].key}` : '', value: '', observedOn: today(), note: '' });
  return (
    <div className="space-y-4" data-testid="progress-panel">
      <div className="max-w-xs"><SelectField label="Recorded evidence by" value={granularity} onChange={(value)=>setGranularity(value as Granularity)} options={[{value:'week',label:'Week (Monday–Sunday)'},{value:'month',label:'Month'}]} testId="progress-granularity" /></div>
      <p className="text-[12px] text-brand-inkMuted">Recorded values only. Grouped summaries are descriptive, not medical trends or predictions. Each goal is tied to its exact plan version.</p>
      {!goals.length && <p className="text-[14px] text-brand-inkMuted" data-testid="progress-empty">Add goals to a plan to record observations.</p>}
      {goals.map((g) => {
        const hist = ws.observations.filter((o) => o.goalKey === g.key && o.planVersionId === g.versionId).sort((a,b)=>a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id));
        const periods = summarizeObservations(ws.observations, g.versionId, g.key, granularity);
        return (
          <Card key={`${g.versionId}-${g.key}`} className="p-5" testId={`progress-goal-${g.key}`}>
            <h3 className="text-[16px] font-semibold">{g.title}</h3>
            <p className="text-[13px] text-brand-inkMuted">{g.plan} · version {g.planVersionNumber} · {serviceLabel(g.service)} · baseline {g.baseline} → target {g.target} ({g.measure})</p>
            {hist.length ? (
              <div className="mt-3">
                <GoalChart points={hist.map((o) => ({ date: o.observedOn, value: o.value }))} baseline={g.baseline} target={g.target} measure={g.measure} from={hist[0].observedOn} to={hist[hist.length - 1].observedOn} testId={`progress-chart-${g.key}`} />
                {hist.length === 1 && <p className="mt-1 text-[13px] text-brand-inkMuted">Only one observation recorded, not enough to show change.</p>}
                <div className="mt-4 overflow-x-auto" data-testid={`progress-periods-${g.key}`}>
                  <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
                    <caption className="mb-2 text-left font-semibold">{granularity === 'week' ? 'Weekly' : 'Monthly'} measurements · exactly plan version {g.planVersionNumber}</caption>
                    <thead><tr className="border-b border-border-light"><th scope="col" className="py-2">Period</th><th scope="col" className="py-2">Samples</th><th scope="col" className="py-2">Range</th><th scope="col" className="py-2">Average*</th><th scope="col" className="py-2">Most recent</th><th scope="col" className="py-2">Evidence</th></tr></thead>
                    <tbody>{periods.map(period => <tr key={period.periodStart} className="border-b border-border-light"><td className="py-2">{period.periodStart} – {period.periodEnd}</td><td className="py-2 tabular-nums">{period.count}</td><td className="py-2 tabular-nums">{period.min}–{period.max}</td><td className="py-2 tabular-nums">{period.average}</td><td className="py-2 tabular-nums">{period.latest} ({period.latestOn})</td><td className="py-2"><details data-testid={`progress-source-${g.key}-${period.periodStart}`}><summary className="cursor-pointer text-brand-action">{period.sourceIds.length} sources</summary><ul className="mt-1 space-y-1">{period.sourceIds.map(id=><li key={id} className="break-all font-mono text-[11px]">{id}</li>)}</ul></details></td></tr>)}</tbody>
                  </table>
                  <p className="mt-2 text-[12px] text-brand-inkMuted">*Arithmetic mean of recorded samples only; unequal observation frequency, clinical context and measurement reliability are not accounted for. No interpolation.</p>
                </div>
              </div>
            ) : <p className="mt-2 text-[14px] text-brand-inkMuted">No observations yet.</p>}
          </Card>
        );
      })}
      <GoalVersionContext ws={ws} onNavigate={onNavigate} />
      {history.length > 0 && (
        <section className="space-y-3" aria-label="Previous plan version evidence" data-testid="progress-history">
          <Button variant="secondary" onClick={()=>setShowHistory(!showHistory)}
            aria-expanded={showHistory} data-testid="progress-history-toggle">
            {showHistory ? 'Hide earlier plan-version measurements' : 'Review earlier plan-version measurements'} ({history.length} goals)
          </Button>
          {showHistory && <>
            <p className="text-[13px] text-brand-inkMuted">Historical evidence is read-only, presented by the exact originating plan version. Measurements are not combined with newer goals even if a goal key or title was reused.</p>
            {history.map(g=>{
              const points=ws.observations.filter(o=>o.planVersionId===g.planVersionId&&o.goalKey===g.key)
                .sort((a,b)=>a.observedOn.localeCompare(b.observedOn)||a.id.localeCompare(b.id));
              const periods=summarizeObservations(ws.observations,g.planVersionId,g.key,granularity);
              return <Card className="space-y-2 p-5" key={g.planVersionId+'|'+g.key} testId={'progress-historical-'+g.planVersionId+'-'+g.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold">{g.title}</h3>
                  <span className="text-[12px] text-brand-inkMuted">{g.status.replaceAll('_',' ')} · read-only</span>
                </div>
                <p className="text-[12px] text-brand-inkMuted">{g.planTitle} · {serviceLabel(g.service)} · plan v{g.planVersionNumber} · baseline {g.baseline} → target {g.target} ({g.measure})</p>
                {points.length===0 ? <p className="text-[13px]">No recorded observations for this historical goal.</p> :
                  <>
                    <GoalChart points={points.map(o=>({date:o.observedOn,value:o.value}))}
                      baseline={g.baseline} target={g.target} measure={g.measure}
                      from={points[0].observedOn} to={points[points.length-1].observedOn}
                      testId={'historical-chart-'+g.planVersionId+'-'+g.key} />
                    {points.length===1 && <p className="text-[12px] text-brand-inkMuted">A single measurement cannot establish change.</p>}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[450px] text-left text-[12px]">
                        <caption className="mb-1 text-left">Historical {granularity === 'week' ? 'weekly' : 'monthly'} recorded observations (v{g.planVersionNumber})</caption>
                        <thead><tr className="border-b border-border-light"><th scope="col" className="py-2">Period</th><th scope="col">Samples</th><th scope="col">Last measured</th><th scope="col">Provenance</th></tr></thead>
                        <tbody>{periods.map(period=><tr key={period.periodStart} className="border-b border-border-light">
                          <td className="py-2">{period.periodStart} – {period.periodEnd}</td><td>{period.count}</td>
                          <td>{period.latest} ({period.latestOn})</td>
                          <td><details><summary className="cursor-pointer text-brand-action">{period.sourceIds.length} observations</summary>
                            <ul className="mt-1 space-y-1">{period.sourceIds.map(id=><li key={id} className="break-all font-mono text-[11px]">{id}</li>)}</ul>
                          </details></td>
                        </tr>)}</tbody>
                      </table>
                    </div>
                  </>
                }
              </Card>;
            })}
          </>}
        </section>
      )}
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
