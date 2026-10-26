'use client';

import { CalendarDays, ClipboardList, FileText, Target, Activity, ArrowRight, Users, House } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clinicalApi, type Workspace, type PracticeFeedbackReadModel } from '@/lib/clinical';
import { currentGoals } from '@/lib/progress-analysis';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Card, Pill } from '@/components/design/ui';
import { Child360ClinicalTimeline } from './Child360ClinicalTimeline';
import { ClinicianJourneyPanel } from './ClinicianJourneyPanel';

type Tab = 'plan' | 'assessments' | 'sessions' | 'progress' | 'reports';
const dateOnly = (x: string) => x.slice(0,10);

export function Child360({ ws, centerId, onNavigate }: {ws: Workspace;centerId: string;onNavigate:(tab:Tab)=>void}) {
  // Legacy/session-test fixtures can omit this newly additive read-model field.
  // Fail closed to an empty team rather than crash the clinical workspace.
  const careTeam = ws.careTeam ?? [];
  // Practice feedback remains NON-CLINICAL and is fetched exclusively using
  // the already-permissioned practice-feedback endpoint for therapists.
  // Supervisors cannot access this panel or family message threads.
  const [practice, setPractice] = useState<{ status: 'loading' | 'ready' | 'error'; items: PracticeFeedbackReadModel['items'] }>({ status: 'loading', items: [] });
  const [practiceAttempt, setPracticeAttempt] = useState(0);
  useEffect(() => {
    if (!ws.canEdit || !centerId) return;
    let alive = true;
    setPractice({ status: 'loading', items: [] });
    clinicalApi.practiceFeedback(centerId, ws.child.id)
      .then(result => {
        if (!alive) return;
        if (result.synthetic !== true || result.notClinical !== true) {
          setPractice({ status: 'error', items: [] });
          return;
        }
        setPractice({ status: 'ready', items: result.items.filter(item =>
          item.childId === ws.child.id && ws.child.services.includes(item.service)) });
      })
      .catch(() => { if (alive) setPractice({ status: 'error', items: [] }); });
    return () => { alive = false; };
  }, [centerId, ws.child.id, ws.canEdit, ws.child.services.join('|'), practiceAttempt]);
  const goals = currentGoals(ws);
  const upcoming = [...ws.appointments].filter(x=>x.status === 'SCHEDULED' && Date.parse(x.endsAt) >= Date.now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const lastNotes = [...ws.notes].sort((a,b)=>b.sessionDate.localeCompare(a.sessionDate)).slice(0,5);
  const cards = [
    {name:'Current draft goals',count:goals.length,icon:Target,tab:'progress' as const},
    {name:'Recorded observations',count:ws.observations.length,icon:Activity,tab:'progress' as const},
    {name:'Session notes',count:ws.notes.length,icon:ClipboardList,tab:'sessions' as const},
    {name:'Draft assessments',count:ws.assessments.length,icon:FileText,tab:'assessments' as const},
  ];
  return (
    <div className="space-y-5" data-testid="child-360">
      <div className="space-y-1">
        <h2 className="text-[22px] font-bold">Child 360° overview</h2>
        <p className="text-[13px] text-brand-inkMuted">One authorized clinical view · {ws.child.services.map(serviceLabel).join(' · ') || 'No service recorded'} · draft/internal evidence only</p>
        <p className="text-[12px] text-brand-inkMuted">Information is limited to your permitted specialties and assignments. This overview is never a family release.</p>
      </div>
      <ClinicianJourneyPanel ws={ws} onNavigate={onNavigate} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({name,count,icon:Icon,tab})=>(
          <button type="button" key={name} onClick={()=>onNavigate(tab)} className="rounded-card border border-border-light bg-surface-white p-4 text-left hover:border-brand-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action" data-testid={"child360-"+tab+"-"+name.replaceAll(' ','-')}>
            <Icon size={19} className="text-brand-action" aria-hidden="true" />
            <span className="mt-2 block text-[27px] font-bold tabular-nums">{count}</span>
            <span className="block text-[12px] text-brand-inkMuted">{name}</span>
          </button>
        ))}
      </div>
      <section data-testid="child360-care-team" aria-labelledby="child360-care-team-heading">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Users className="mt-1 shrink-0 text-brand-action" size={18} aria-hidden="true" />
              <div>
                <h3 id="child360-care-team-heading" className="text-[17px] font-semibold">Assigned care team</h3>
                <p className="mt-1 text-[12px] text-brand-inkMuted">Active named therapists only, limited to your authorized specialty scope.</p>
              </div>
            </div>
            <p className="rounded-control bg-surface-subtle px-3 py-2 text-[12px]" data-testid="child360-referent">
              <span className="font-semibold">Child-wide referent:</span> {ws.childWideReferent?.displayName ?? (ws.childWideReferentStatus === 'UNAVAILABLE' ? 'Referent details unavailable in this view' : 'Not designated')}
            </p>
          </div>
          {careTeam.length === 0 ? (
            <p className="mt-4 text-[13px] text-brand-inkMuted" data-testid="child360-care-team-empty">No active assigned therapists in your authorized services.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="child360-care-team-list">
              {careTeam.map(member => (
                <li key={member.assignmentId} className="min-w-0 rounded-control border border-border-light bg-surface-white p-3">
                  <p className="break-words text-[14px] font-semibold">{member.displayName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill tone="neutral">{serviceLabel(member.service)}</Pill>
                    {member.isSpecialtyLead && <span className="rounded-control bg-surface-subtle px-2 py-1 text-[11px] font-semibold">Specialty lead</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-brand-inkMuted">Specialty leads are assigned per therapy service; they are not automatically child-wide referents.</p>
        </Card>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-[17px] font-semibold">Care goals and evidence</h3>
          {goals.length === 0 && <p className="mt-3 text-[14px] text-brand-inkMuted">No current draft goals are available within your scope.</p>}
          <ul className="mt-3 space-y-3">
            {goals.slice(0,8).map(g=>{
              const points=ws.observations.filter(o=>o.planVersionId===g.planVersionId&&o.goalKey===g.key).sort((a,b)=>a.observedOn.localeCompare(b.observedOn));
              return <li key={g.planVersionId+"|"+g.key} className="rounded-control border border-border-light p-3">
                <div className="flex flex-wrap justify-between gap-2"><span className="text-[14px] font-semibold">{g.title}</span><Pill tone="neutral">{serviceLabel(g.service)}</Pill></div>
                <p className="mt-1 text-[12px] text-brand-inkMuted">Plan v{g.planVersionNumber} · baseline {g.baseline} · target {g.target} ({g.measure})</p>
                <p className="mt-1 text-[13px]">{points.length ? points.length+' recorded measurements · latest '+points[points.length-1].value+' on '+points[points.length-1].observedOn : 'No measurements recorded for this exact plan version.'}</p>
              </li>;
            })}
          </ul>
          <button className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-action" onClick={()=>onNavigate('progress')} type="button">Explore progress <ArrowRight size={14} /></button>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2"><CalendarDays className="text-brand-action" size={18} /><h3 className="text-[17px] font-semibold">Appointments and recent sessions</h3></div>
          <p className="mt-1 text-[12px] text-brand-inkMuted">Upcoming visits shown for the next 42 days within your permitted specialties.</p>
          {upcoming.length ? <ul className="mt-3 space-y-2">{upcoming.slice(0,4).map(a=><li key={a.id} className="text-[14px]"><span className="font-semibold">{dateOnly(a.startsAt)}</span> · {serviceLabel(a.service)} · Scheduled</li>)}</ul> : <p className="mt-3 text-[14px] text-brand-inkMuted">No assigned appointments in the next 42 days.</p>}
          <h4 className="mt-4 text-[13px] font-semibold">Recent session evidence</h4>
          {lastNotes.length ? <ul className="mt-2 space-y-2">{lastNotes.map(n=><li key={n.id} className="text-[13px]">{n.sessionDate} · {serviceLabel(n.service)} · {n.executionStatus==='COMPLETED'?'Completed unsigned session':'In-progress draft'}</li>)}</ul> : <p className="mt-2 text-[13px] text-brand-inkMuted">No session notes recorded.</p>}
          <button className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-action" type="button" onClick={()=>onNavigate('sessions')}>Open sessions <ArrowRight size={14}/></button>
        </Card>
      </div>
      {ws.canEdit && (
        <Card className="space-y-3 p-5" testId="child360-family-practice">
          <div className="flex items-start gap-2">
            <House className="mt-0.5 shrink-0 text-brand-action" size={18} aria-hidden="true" />
            <div>
              <h3 className="text-[17px] font-semibold">Family practice feedback</h3>
              <p className="mt-1 text-[12px] text-brand-inkMuted">Synthetic sample activity outcomes only. This is not a clinical measurement, report release or family conversation.</p>
            </div>
          </div>
          {practice.status === 'loading' ? <p className="text-[13px] text-brand-inkMuted">Loading permitted practice feedback…</p> :
            practice.status === 'error' ? (
              <div role="alert" className="space-y-2" data-testid="child360-family-practice-error">
                <p className="text-[13px] text-status-danger">Family practice feedback could not be loaded. No conclusion about recorded outcomes can be drawn.</p>
                <button type="button" className="text-[13px] font-semibold text-brand-action underline focus-visible:outline" data-testid="child360-family-practice-retry" onClick={() => setPracticeAttempt(n => n + 1)}>Retry loading</button>
              </div>
            ) : practice.items.length === 0 ? <p className="text-[13px] text-brand-inkMuted" data-testid="child360-family-practice-empty">No permitted family practice outcomes are recorded.</p> :
            <>
              <p className="text-[13px] font-medium">Recent outcomes: {practice.items.length} (limited to your assigned specialties)</p>
              <ul className="space-y-2" data-testid="child360-family-practice-outcomes">
                {practice.items.slice(0,5).map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-subtle px-3 py-2 text-[13px]">
                  <span>{item.practiceDate} · {serviceLabel(item.service)}</span>
                  <span className="font-semibold">{({ COMPLETED:'Completed', NEEDED_HELP:'Needed help', NOT_COMPLETED:'Not completed', SKIPPED:'Skipped' } as const)[item.choice]}</span>
                </li>)}
              </ul>
              <p className="text-[12px] text-brand-inkMuted">Only the five most recent outcomes are shown. Responses do not establish progress toward clinical goals.</p>
            </>
          }
        </Card>
      )}
      <Child360ClinicalTimeline ws={ws} onNavigate={onNavigate} />
    </div>
  );
}
