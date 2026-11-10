// M4-08 Stage 1: source-executed real clinician read-only UI boundary regressions.
// React SSR validates rendered safe states; client interaction coverage remains a separate need.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const render=(Component,props)=>renderToStaticMarkup(h(Component,props));
const {GoalCheckpointComparison}=require('../src/components/clinical/GoalCheckpointComparison');
const {GoalVersionContext}=require('../src/components/clinical/GoalVersionContext');
const {ReportEvidenceDiff}=require('../src/components/clinical/ReportEvidenceDiff');
const {SavedHomePlanPreview}=require('../src/components/clinical/SavedHomePlanPreview');

const goal=(key='g1',extra={})=>({key,title:'Synthetic target',measure:'count',baseline:1,target:5,...extra});
const cp=(key,at,ids,summary)=>({kind:'GOAL_CHECKPOINT',goalKey:key,at,reviewedOn:'2026-11-10',
 observationIds:ids,summary,authorId:'fake-clinician',clinicalAuthorization:false,released:false});
const v=(id='v1',extras={})=>({id,number:1,version:2,status:'DRAFT',summary:'Internal draft',
 author:'Fictional clinician',mine:true,updatedAt:'2026-11-10T09:00:00Z',reviewNotes:[],
 goals:[goal()],goalCheckpoints:[],homeActivities:[],...extras});
const point=(observationId,value)=>({date:'2026-11-10',observationId,value});
const gEvidence=(extras={})=>({key:'g1',planVersionId:'v1',title:'Synthetic target',
 measure:'count',baseline:1,target:5,prior:null,points:[point('a',2)],status:'recorded',...extras});
const evidence=(goals,extra={})=>({period:{from:'2026-11-01',to:'2026-11-30'},
 assessments:[],sessions:{drafts:0,completedVisits:0},plan:null,goals,...extra});

describe('M4-08 source-executed clinician checkpoint comparison UI',()=>{
 it('shows a clear empty state if fewer than two checkpoints share goal and version',()=>{
  const x=render(GoalCheckpointComparison,{version:v()});
  expect(x).toContain('data-testid="checkpoint-compare-empty"');
  expect(x).not.toContain('data-testid="checkpoint-compare-sources"');
 });
 it('shows only same-version, source-ID changes, never a treatment outcome',()=>{
  const version=v('v1',{goalCheckpoints:[
   cp('g1','2026-11-09T09:00:00Z',['a','b'],'First synthetic note'),
   cp('g1','2026-11-10T09:00:00Z',['b','c'],'Second synthetic note'),
   cp('other','2026-11-10T08:00:00Z',['secret-foreign'],'Other goal')]});
  const x=render(GoalCheckpointComparison,{version});
  expect(x).toContain('data-testid="checkpoint-compare-notes"');
  expect(x).toContain('First synthetic note');
  expect(x).toContain('Second synthetic note');
  expect(x).toContain('Only in later review');
  expect(x).toContain('not clinical outcome');
  expect(x).not.toContain('secret-foreign');
 });
});

describe('M4-08 evidence snapshot comparison component',()=>{
 it('warns on changed period, removed assessment and altered source values',()=>{
  const saved=evidence([gEvidence()],{assessments:[{id:'old',assessedOn:'2026-11-01',summary:''}]});
  const current=evidence([gEvidence({points:[point('a',9)]})],{
   period:{from:'2026-12-01',to:'2026-12-31'},assessments:[],
   sessions:{drafts:1,completedVisits:0}});
  const x=render(ReportEvidenceDiff,{saved,current});
  expect(x).toContain('data-testid="report-evidence-period-warning"');
  expect(x).toContain('assessment references differ');
  expect(x).toContain('session counts differ');
  expect(x).toContain('Recorded observation source references or values differ');
  expect(x).toContain('NOT clinical validation');
 });
 it('does not invent a difference for identical stable sources',()=>{
  const e=evidence([gEvidence()]);
  const x=render(ReportEvidenceDiff,{saved:e,current:e});
  expect(x).toContain('0 goal source difference(s)');
  expect(x).toContain('Same recorded source IDs');
  expect(x).not.toContain('data-testid="report-evidence-period-warning"');
 });
});

describe('M4-08 saved plan staff-only projection UI',()=>{
 const template={id:'t1',title:'Current library',minutes:25,ageBand:'6–8',
  materials:['paper'],steps:['follow directions'],safety:['supervise']};
 const activity=(extra={})=>({templateId:'t1',goalKey:'g1',
  frequency:'weekly',note:'Fictional guidance',...extra});
 it('renders saved snapshot and unsaved editor warning without implying family release',()=>{
  const snap={...template,title:'Saved activity',minutes:15,safety:['saved supervision']};
  const x=render(SavedHomePlanPreview,{title:'Saved draft',service:'speech',unsaved:true,
   version:v('v1',{homeActivities:[activity({snapshot:snap,durationMinutes:10})]}),
   templates:[template]});
  expect(x).toContain('data-testid="saved-plan-preview-unsaved"');
  expect(x).toContain('Saved activity');
  expect(x).not.toContain('Current library</p>');
  expect(x).toContain('data-testid="saved-plan-duration-override"');
  expect(x).toContain('No signing, consent, family distribution or clinical release');
  expect(x).toContain('Server-saved activity snapshot');
 });
 it('warns about missing source report, invalid schedule and missing legacy safety metadata',()=>{
  const x=render(SavedHomePlanPreview,{title:'Fictional',service:'ot',
   version:v('v1',{homeActivities:[activity({templateId:'missing',goalKey:'not-in-plan',
    schedule:{cadence:'WEEKLY',startsOn:'2026-11-10',endsOn:'2026-11-09',weekdays:[1]}})]}),
   templates:[]});
  expect(x).toContain('data-testid="saved-plan-preview-no-report"');
  expect(x).toContain('data-testid="saved-plan-preview-invalid-schedule"');
  expect(x).toContain('Activity definition unavailable');
  expect(x).toContain('clinician review required');
 });
 it('displays origin but does not carry old goal mapping into a later version',()=>{
  const origin={originalPlanVersionId:'older',reportId:'r1',reportTitle:'Source report',
   reportVersionNumber:2,selectedGoals:[{planGoalKey:'g1',
    sourceGoalKey:'older-goal',sourcePlanVersionId:'old'}]};
  const x=render(SavedHomePlanPreview,{title:'Draft',service:'speech',
   version:v('current'),templates:[],origin});
  expect(x).toContain('Original goal mappings are NOT inherited');
  expect(x).toContain('href="/app/reports/r1"');
  expect(x).not.toContain('data-testid="saved-plan-preview-origin-goal"');
 });
});

describe('M4-08 exact-version progress context rendered against authorized read model',()=>{
 const old=v('old',{number:1,status:'SUPERSEDED',goals:[goal('g1',{target:2})]});
 const current=v('current',{number:2,goals:[goal('g1',{target:6})],
  goalCheckpoints:[cp('g1','2026-11-10T09:00:00Z',['current-obs'],'Recorded review')]});
 const ws={child:{id:'fictional-child',name:'Fictional Child',services:['speech']},
  plans:[{id:'p1',title:'Synthetic therapy plan',service:'speech',versions:[old,current]}],
  observations:[{id:'current-obs',planVersionId:'current',goalKey:'g1',
   observedOn:'2026-11-10',value:3,note:'Synthetic only'}]};
 it('shows history and explicit source-bound version warning instead of combining old and new',()=>{
  const x=render(GoalVersionContext,{ws,onNavigate:()=>{}});
  expect(x).toContain('data-testid="progress-context-version-boundary"');
  expect(x).toContain('No observation or clinician checkpoint is automatically transferred');
  expect(x).toContain('Recorded review');
  expect(x).toContain('fictional-child');
  expect(x).toContain('current');
  expect(x).toContain('historical');
 });
 it('shows read-only absence of evidence for an authorized empty workspace',()=>{
  const x=render(GoalVersionContext,{ws:{...ws,plans:[],observations:[]},
   onNavigate:()=>{}});
  expect(x).toContain('data-testid="progress-context-empty"');
  expect(x).toContain('No saved goal definitions');
  expect(x).not.toContain('data-testid="progress-context-goal"');
 });
});
