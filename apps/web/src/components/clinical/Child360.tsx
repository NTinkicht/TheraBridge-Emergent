'use client';

import { CalendarDays, ClipboardList, FileText, Target, Activity, ArrowRight, Users } from 'lucide-react';
import type { Workspace } from '@/lib/clinical';
import { currentGoals } from '@/lib/progress-analysis';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Card, Pill } from '@/components/design/ui';

type Tab = 'plan' | 'assessments' | 'sessions' | 'progress' | 'reports';
const dateOnly = (x: string) => x.slice(0,10);

export function Child360({ ws, onNavigate }: {ws: Workspace;onNavigate:(tab:Tab)=>void}) {
  // Legacy/session-test fixtures can omit this newly additive read-model field.
  // Fail closed to an empty team rather than crash the clinical workspace.
  const careTeam = ws.careTeam ?? [];
  const goals = currentGoals(ws);
  const upcoming = [...ws.appointments].filter(x=>x.status === 'SCHEDULED' && Date.parse(x.endsAt) >= Date.now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const lastNotes = [...ws.notes].sort((a,b)=>b.sessionDate.localeCompare(a.sessionDate)).slice(0,5);
  const timeline = [
    ...ws.notes.map(n=>({id:'note-'+n.id,date:n.sessionDate,label:'Session note',detail:serviceLabel(n.service),section:'sessions' as const})),
    ...ws.assessments.map(a=>({id:'assessment-'+a.id,date:a.assessedOn,label:'Draft assessment',detail:serviceLabel(a.service),section:'assessments' as const})),
    ...ws.observations.map(o=>({id:'observation-'+o.id,date:o.observedOn,label:'Recorded observation',detail:'Goal-specific measured value',section:'progress' as const})),
  ].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,12);
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
              <span className="font-semibold">Child-wide referent:</span> {ws.childWideReferent?.displayName ?? 'Not designated'}
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
          {upcoming.length ? <ul className="mt-3 space-y-2">{upcoming.slice(0,4).map(a=><li key={a.id} className="text-[14px]"><span className="font-semibold">{dateOnly(a.startsAt)}</span> · {serviceLabel(a.service)} · Scheduled</li>)}</ul> : <p className="mt-3 text-[14px] text-brand-inkMuted">No upcoming assigned appointments within your scope.</p>}
          <h4 className="mt-4 text-[13px] font-semibold">Recent session evidence</h4>
          {lastNotes.length ? <ul className="mt-2 space-y-2">{lastNotes.map(n=><li key={n.id} className="text-[13px]">{n.sessionDate} · {serviceLabel(n.service)} · {n.executionStatus==='COMPLETED'?'Completed unsigned session':'In-progress draft'}</li>)}</ul> : <p className="mt-2 text-[13px] text-brand-inkMuted">No session notes recorded.</p>}
          <button className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-action" type="button" onClick={()=>onNavigate('sessions')}>Open sessions <ArrowRight size={14}/></button>
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="text-[17px] font-semibold">Clinical activity timeline</h3>
        <p className="mt-1 text-[13px] text-brand-inkMuted">The latest recorded events shown here are drafts and operational observations, not clinical interpretations.</p>
        {timeline.length===0 ? <p className="mt-3 text-[14px]">No authorized activity available.</p> :
          <ol className="mt-3 divide-y divide-border-light" data-testid="child360-timeline">
            {timeline.map(e=><li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-[14px] font-semibold">{e.label}</p><p className="text-[12px] text-brand-inkMuted">{e.date} · {e.detail}</p></div>
              <button type="button" onClick={()=>onNavigate(e.section)} className="text-[13px] font-semibold text-brand-action hover:underline">View section</button>
            </li>)}
          </ol>
        }
      </Card>
    </div>
  );
}
