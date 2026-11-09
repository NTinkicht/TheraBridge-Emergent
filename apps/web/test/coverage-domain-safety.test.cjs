// Executed code coverage for non-authorizing clinical-facing presentation helpers.
// Synthetic fixtures only: no persisted data, no clinical conclusions or release.
const {homePlanHandoff}=require('../src/lib/home-plan-handoff');
const {periodStart,summarizeObservations,currentGoals,historicalGoals}=require('../src/lib/progress-analysis');
const {centerLocalDay,nextReviewDayDelay,reviewTiming,goalReviewRows,goalReviewAnchor}=require('../src/lib/goal-review');
const {child360Timeline,filterChild360Timeline}=require('../src/lib/child360-timeline');

const goal=(extra={})=>({key:'g1',title:'Synthetic turn taking',targetOn:'2026-12-01',reviewOn:'2026-11-20',...extra});
const template=(extra={})=>({id:'t1',title:'Synthetic activity',safety:['Practice with therapist guidance'],...extra});
const activity=(extra={})=>({id:'a1',templateId:'t1',goalKey:'g1',snapshot:{safety:['Supervise']},
 schedule:{dates:['2026-11-10']},...extra});
const version=(extra={})=>({id:'v1',number:1,status:'DRAFT',updatedAt:'2026-11-09T10:00:00Z',
 goals:[goal()],homeActivities:[activity()],goalCheckpoints:[],...extra});
const plan=(extra={})=>({id:'p1',title:'Synthetic draft',service:'speech',versions:[version()],...extra});

describe('M4-08: planning handoff fail-closed warnings (executed Web code)',()=>{
 const input=()=>({summary:'Synthetic family tasks',goals:[goal()],activities:[activity()],
  templates:[template()],hasUnsavedEdits:false,hasOtherPlanEdits:false,newlyAddedUnlinked:false});
 it('distinguishes a saved draft from clinical or release permission',()=>{
  const result=homePlanHandoff(input(),()=>null);
  expect(result.canSendSavedDraft).toBe(true);
  expect(result.blockingReason).toBe(null);
  expect(result.attention).toHaveLength(0);
  expect([result.goalCount,result.activityCount]).toEqual([1,1]);
 });
 it('blocks unsaved or newly unlinked drafts and records source-related attention',()=>{
  const x=input();x.hasUnsavedEdits=true;x.newlyAddedUnlinked=true;x.summary='  ';
  x.goals=[goal({title:' ',reviewOn:undefined})];
  x.activities=[activity({goalKey:'unknown',snapshot:null,schedule:undefined})];
  x.templates=[];
  const r=homePlanHandoff(x,()=>null);
  expect(r.canSendSavedDraft).toBe(false);
  expect(r.blockingReason).toMatch(/Save or discard/);
  expect(r.attention.map(item=>item.id)).toEqual(expect.arrayContaining([
   'summary','goals','goal-links','undated','template','dates']));
  x.hasUnsavedEdits=false;
  expect(homePlanHandoff(x,()=>null).blockingReason).toMatch(/Link each newly added/);
 });
 it('reports invalid schedule, legacy mutable template and missing safety notes',()=>{
  const x=input();x.activities=[activity({snapshot:null})];x.templates=[template({safety:[]})];
  const r=homePlanHandoff(x,()=> 'Invalid date');
  expect(r.attention.map(z=>z.id)).toEqual(expect.arrayContaining(['schedule','legacy','safety']));
  expect(homePlanHandoff({...x,hasOtherPlanEdits:true},()=>null).canSendSavedDraft).toBe(false);
 });
});

describe('M4-08: read-only progress and plan-version evidence isolation',()=>{
 const observation=(id,observedOn,value,overrides={})=>({id,observedOn,value,planVersionId:'v1',goalKey:'g1',...overrides});
 it('uses ISO Monday/week and UTC calendar month, rejects invalid dates',()=>{
  expect(periodStart('2026-11-08','week')).toBe('2026-11-02');
  expect(periodStart('2026-11-09','week')).toBe('2026-11-09');
  expect(periodStart('2026-11-30','month')).toBe('2026-11-01');
  expect(()=>periodStart('2026-02-30','week')).toThrow(/Invalid observed date/);
 });
 it('never aggregates observations from another plan version or goal',()=>{
  const rows=[
   observation('a','2026-11-09',20),observation('b','2026-11-10',40),
   observation('c','2026-11-10',99,{planVersionId:'v2'}),
   observation('d','2026-11-10',99,{goalKey:'g2'}),
   observation('e','2026-11-11',Number.NaN),
  ];
  const out=summarizeObservations(rows,'v1','g1','week');
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({periodStart:'2026-11-09',count:2,
   min:20,max:40,average:30,latest:40,sourceIds:['a','b']});
  expect(summarizeObservations(rows,'v2','g1','month')[0].sourceIds).toEqual(['c']);
 });
 it('distinguishes current plan versions and historical versions by exact identity',()=>{
  const old=version({id:'old',status:'SUPERSEDED',number:1,goals:[goal({key:'reuse',title:'Old definition'})]});
  const active=version({id:'new',status:'DRAFT',number:2,goals:[goal({key:'reuse',title:'New definition'})]});
  const ws={plans:[plan({versions:[old,active]})]};
  expect(currentGoals(ws).map(g=>g.planVersionId)).toEqual(['new']);
  expect(historicalGoals(ws).map(g=>g.planVersionId)).toEqual(['old']);
 });
});

describe('M4-08: centre-local goal-review schedule and scoped counts',()=>{
 it('handles invalid timezone, local-day transitions, date validity and due windows',()=>{
  const d=new Date('2026-11-09T22:30:00.000Z');
  expect(centerLocalDay('Asia/Dubai',d)).toBe('2026-11-10');
  expect(centerLocalDay('Invalid/Zone',d)).toBe(null);
  expect(nextReviewDayDelay('Invalid/Zone',d)).toBe(null);
  const delay=nextReviewDayDelay('Asia/Dubai',d);
  expect(delay).toBeGreaterThan(0);
  expect(delay).toBeLessThan(26*3600*1000);
  expect(reviewTiming('2026-11-08','2026-11-09')).toBe('PAST_DUE');
  expect(reviewTiming('2026-11-09','2026-11-09')).toBe('DUE_TODAY');
  expect(reviewTiming('2026-11-23','2026-11-09')).toBe('COMING_UP');
  expect(reviewTiming('2026-11-24','2026-11-09')).toBe('SCHEDULED_LATER');
  expect(reviewTiming('2026-02-30','2026-11-09')).toBe('NOT_SCHEDULED');
  expect(reviewTiming('2026-11-10',null)).toBe('DATE_UNAVAILABLE');
 });
 it('counts only same version+goal and constructs deterministic review anchors',()=>{
  const v=version({goals:[goal({reviewOn:'2026-11-08'}),goal({key:'g2',reviewOn:'2026-11-09'})],
   homeActivities:[activity(),activity({id:'a2',goalKey:'g2'})]});
  const ws={plans:[plan({versions:[v]})],observations:[
   {id:'o1',planVersionId:'v1',goalKey:'g1'},
   {id:'o2',planVersionId:'v2',goalKey:'g1'}]};
  const rows=goalReviewRows(ws,'2026-11-09');
  expect(rows.map(r=>r.goalKey)).toEqual(['g1','g2']);
  expect(rows[0]).toMatchObject({observationCount:1,linkedActivityCount:1,timing:'PAST_DUE'});
  expect(goalReviewAnchor('p1','g1')).toBe('goal-review-p1-g1');
  expect(goalReviewRows({plans:[plan({versions:[]})],observations:[]},'2026-11-09')).toEqual([]);
 });
});

describe('M4-08: Child 360 timeline provenance and filtering',()=>{
 it('keeps unsigned drafts and missing plan attribution explicit',()=>{
  const ws={
   plans:[plan({versions:[version({goalCheckpoints:[{
    kind:'GOAL_CHECKPOINT',goalKey:'g1',at:'2026-11-09T11:00:00Z',reviewedOn:'2026-11-08'
   }]})]})],
   notes:[{id:'n1',sessionDate:'2026-11-08',executionStatus:'COMPLETED',service:'speech'},
    {id:'n2',sessionDate:'invalid',executionStatus:'IN_PROGRESS',service:'speech'}],
   assessments:[{id:'as1',assessedOn:'2026-11-07',service:'ot'}],
   observations:[{id:'ob1',observedOn:'2026-11-09',planVersionId:'v1',goalKey:'g1',value:3},
    {id:'ob2',observedOn:'2026-11-09',planVersionId:'unavailable',goalKey:'g1',value:5}]
  };
  const result=child360Timeline(ws);
  expect(result.map(e=>e.kind)).toEqual(expect.arrayContaining([
   'PLAN_VERSION','GOAL_REVIEW','SESSION','ASSESSMENT','OBSERVATION']));
  expect(result.find(e=>e.id==='session-n1').detail).toMatch(/unsigned/);
  expect(result.find(e=>e.id==='observation-ob2').detail).toMatch(/no attribution inferred/);
  expect(result.find(e=>e.id==='goal-review-v1-0').detail).toMatch(/clinician entered/);
  expect(result.some(e=>e.id==='session-n2')).toBe(false);
  expect(filterChild360Timeline(result,'OBSERVATION','speech')).toHaveLength(1);
  expect(filterChild360Timeline(result,'ALL','ALL')).toHaveLength(result.length);
 });
});
