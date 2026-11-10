// M4-08 source-executed report evidence/review/history comparison and
// clinical timeline; synthetic, version-scoped, read-only assertions.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement,draw=(C,p)=>renderToStaticMarkup(h(C,p));
const {Evidence,Review,HistoryList,Compare}=require('../src/components/clinical/ReportSide');
const {Child360ClinicalTimeline}=require('../src/components/clinical/Child360ClinicalTimeline');
const evidence=(extra={})=>({
 period:{from:'2026-11-01',to:'2026-11-30'},assessments:[],
 plan:null,goals:[],sessions:{drafts:1,completedVisits:0},...extra
});
const report=(extra={})=>({
 synthetic:true,released:false,locked:'No release',canEdit:false,canReview:false,
 evidence:evidence(),versions:[],
 report:{id:'r1',childId:'fictional-child',childName:'Alex Fictional',title:'Fictional report',
 service:'speech',periodStart:'2026-11-01',periodEnd:'2026-11-30',
 status:'DRAFT',sections:{summary:'Saved fictional'},reviewNotes:[],version:1,
 author:'Fictional Clinician',mine:true,updatedAt:'2026-11-10T09:00:00Z'},...extra
});
const goal=(extra={})=>({key:'g1',title:'Fictional goal',planVersionId:'v1',status:'recorded',
 measure:'count',baseline:1,target:5,prior:null,
 points:[{date:'2026-11-10',value:2,observationId:'ob1'}],...extra});
const version=(e=evidence())=>({
 id:'report-v1',number:1,kind:'SAVED',author:'Fictional Clinician',
 createdAt:'2026-11-09T09:00:00Z',sections:{summary:'Historical wording'},
 evidence:e,statementTrace:[]
});
describe('M4-08 report evidence/source and supervisor review boundaries',()=>{
 it('identifies the absence of a source plan rather than fabricating reported goals',()=>{
  const out=draw(Evidence,{d:report()});
  expect(out).toContain('data-testid="report-evidence"');
  expect(out).toContain('data-testid="evidence-no-plan"');
  expect(out).toContain('No therapy plan for this service yet');
  expect(out).not.toContain('data-testid="evidence-goal-g1"');
 });
 it('links each recorded goal only to its original plan version and observation identities',()=>{
  const e=evidence({plan:{id:'p1',title:'Fictional plan',versionNumber:2,status:'DRAFT'},
   goals:[goal()]});
  const out=draw(Evidence,{d:report({evidence:e})});
  expect(out).toContain('data-testid="evidence-goal-g1"');
  expect(out).toContain('data-testid="report-evidence-open-goal-g1"');
  expect(out).toContain('href="/app/clinical/fictional-child#plan?version=v1&amp;goal=g1"');
  expect(out).toContain('Observation ob1');
  expect(out).toContain('current plan must never be substituted');
 });
 it('keeps previous supervisor comments read-only to non-reviewer roles',()=>{
  const d=report({report:{...report().report,reviewNotes:[
   {byName:'Fictional Supervisor',at:'2026-11-09T09:00:00Z',
    comment:'Please record supporting evidence.',kind:'returned'}]}});
  const out=draw(Review,{centerId:'c1',d,onReload:async()=>{},onError:()=>{}});
  expect(out).toContain('Fictional Supervisor');
  expect(out).toContain('Returned for revision');
  expect(out).not.toContain('data-testid="review-return"');
 });
 it('exposes review comments and return action only to explicitly authorized supervisor',()=>{
  const d=report({canReview:true});
  const out=draw(Review,{centerId:'c1',d,onReload:async()=>{},onError:()=>{}});
  expect(out).toContain('data-testid="review-empty"');
  expect(out).toContain('data-testid="review-comment"');
  expect(out).toContain('data-testid="review-return"');
 });
 it('shows genuine saved history but never claims review by just opening a version',()=>{
  const d=report({versions:[{id:'v1',number:1,kind:'SAVED',author:'Fictional',
   createdAt:'2026-11-10T09:00:00Z'}]});
  const out=draw(HistoryList,{centerId:'c1',d,onError:()=>{},onCompare:()=>{}});
  expect(out).toContain('data-testid="history-1"');
  expect(out).toContain('data-testid="history-compare-1"');
  expect(out).toContain('Saved versions are kept unchanged');
 });
 it('shows current-vs-saved differences and checks evidence without treating changes as outcomes',()=>{
  const v=version(evidence({goals:[goal()]}));
  const out=draw(Compare,{v,current:{summary:'New wording'},
   currentEvidence:evidence({goals:[goal()]}),
   childId:'fictional-child',onClose:()=>{}});
  expect(out).toContain('data-testid="report-compare"');
  expect(out).toContain('data-testid="compare-summary"');
  expect(out).toContain('1 of');
  expect(out).toContain('data-testid="saved-statement-trace"');
  expect(out).toContain('data-testid="report-evidence-diff"');
 });
});
describe('M4-08 clinical 360 timeline uses only already-scoped records',()=>{
 const w=(extra={})=>({
  synthetic:true,canEdit:false,plans:[],assessments:[],notes:[],
  observations:[],appointments:[],...extra
 });
 it('shows empty clinical history without fabricating family practice as clinical events',()=>{
  const out=draw(Child360ClinicalTimeline,{ws:w(),onNavigate:()=>{}});
  expect(out).toContain('data-testid="child360-timeline-empty"');
  expect(out).toContain('Family practice feedback and appointments are not treated as clinical evidence');
  expect(out).not.toContain('data-testid="child360-timeline-event"');
 });
 it('sorts and labels actual source-attributed observations and draft versions',()=>{
  const ws=w({plans:[{id:'p1',service:'speech',title:'Fictional',
   versions:[{id:'v1',number:1,status:'DRAFT',updatedAt:'2026-11-10T09:00:00Z',
    goals:[{key:'g1',title:'Fictional goal',measure:'count',baseline:1,target:5}],
    goalCheckpoints:[],homeActivities:[]}]}],
   observations:[{id:'ob1',planVersionId:'v1',goalKey:'g1',observedOn:'2026-11-10',value:2}]});
  const out=draw(Child360ClinicalTimeline,{ws,onNavigate:()=>{}});
  expect(out).toContain('data-testid="child360-timeline"');
  expect(out).toContain('data-testid="child360-timeline-event"');
  expect(out).toContain('data-testid="child360-timeline-count"');
  expect(out).toContain('All authorized specialties');
  expect(out).toContain('not a clinical outcome or approval');
 });
});
