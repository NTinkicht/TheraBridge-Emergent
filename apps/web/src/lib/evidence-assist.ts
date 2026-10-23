import type { ReportDetail } from './reports';
import type { Workspace, HomeActivity } from './clinical';

// Deterministic, source-based text. No AI provider, diagnosis, release, or patient-data export.
export function factualReportSuggestions(d: ReportDetail) {
 const e=d.evidence;
 const items: {section:'assessment'|'goals'|'sessions';heading:string;text:string;sources:string[]}[]=[];
 if(e.assessments.length) items.push({section:'assessment',heading:'Recorded assessments',text:e.assessments.map(a=>'Assessment '+a.assessedOn+': '+a.summary).join('\n\n'),sources:e.assessments.map(a=>'Assessment '+a.id)});
 if(e.goals.length) items.push({section:'goals',heading:'Goal measurements',text:e.goals.map(g=>{
  const h=g.title+' (baseline '+g.baseline+', target '+g.target+' '+g.measure+').';
  if(!g.points.length)return h+' No observations recorded in this period.';
  if(g.points.length===1)return h+' One value '+g.points[0].value+' on '+g.points[0].date+'; insufficient to compare.';
  const first=g.points[0],last=g.points[g.points.length-1];
  return h+' '+g.points.length+' recorded points: '+first.value+' on '+first.date+' to '+last.value+' on '+last.date+'. No clinical conclusion inferred.';
 }).join('\n\n'),sources:e.goals.map(g=>'Plan version '+(('planVersionId' in g && typeof g.planVersionId==='string')?g.planVersionId:(e.plan?.id??'unknown'))+' / goal '+g.key)});
 items.push({section:'sessions',heading:'Recorded activity',text:'Between '+e.period.from+' and '+e.period.to+', '+e.sessions.drafts+' note drafts and '+e.sessions.completedVisits+' completed visits were recorded. Counts do not represent outcomes.',sources:['Report '+d.report.id,'Period '+e.period.from+' to '+e.period.to]});
 return items;
}

export function draftHomeActivitySuggestions(ws: Workspace, service: string, selected: HomeActivity[]) {
 const chosen=new Set(selected.map(x=>x.templateId));
 return ws.templates.filter(t=>t.service===service && t.library==='center' && !chosen.has(t.id)).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,5).map(t=>({
  templateId:t.id,title:t.title,
  reason:'Matches the selected specialty only. Therapist must verify goal relevance, child age, consent and safety.',
  proposed:{templateId:t.id,frequency:'Therapist to decide',note:'Draft candidate; not verified or released.'} as HomeActivity
 }));
}
