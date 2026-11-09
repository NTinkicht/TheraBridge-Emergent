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

const {isCalendarDay,scheduleProblem,scheduledDays,scheduleDescription,practiceCalendarMonth}=require('../src/lib/home-schedule');
const {evidenceForGoal,sourceForGoal,goalEvidenceRows}=require('../src/lib/plan-evidence');
const {clinicianJourneySummary}=require('../src/lib/clinician-journey');

describe('M4-08: internal practice scheduling never converts to booking or delivery',()=>{
 const weekly={startsOn:'2026-11-09',endsOn:'2026-11-23',cadence:'WEEKLY',weekdays:[1,3]};
 it('validates dates, ranges, pattern and unique weekdays',()=>{
  expect(isCalendarDay('2026-02-30')).toBe(false);
  expect(isCalendarDay('2026-11-09')).toBe(true);
  expect(scheduleProblem(weekly)).toBe(null);
  expect(scheduleProblem({...weekly,endsOn:'2026-11-08'})).toMatch(/end must follow/);
  expect(scheduleProblem({...weekly,weekdays:[1,1]})).toMatch(/unique weekday/);
  expect(scheduleProblem({...weekly,weekdays:[]})).toMatch(/weekday/);
  expect(scheduleProblem({...weekly,cadence:'UNKNOWN'})).toMatch(/valid schedule pattern/);
 });
 it('returns only planned days within date window and month; never invents 31 February',()=>{
  expect(scheduledDays(weekly,3)).toEqual(['2026-11-09','2026-11-11','2026-11-16']);
  expect(scheduledDays(weekly,0)).toEqual([]);
  expect(scheduleDescription(weekly)).toContain('Weekly on Mon, Wed');
  expect(practiceCalendarMonth([{templateId:'t1',goalKey:'g1',schedule:weekly}], '2026-11')
   .map(x=>x.date)).toEqual(['2026-11-09','2026-11-11','2026-11-16','2026-11-18','2026-11-23']);
  expect(practiceCalendarMonth([{templateId:'t2',schedule:{
   startsOn:'2026-02-01',endsOn:'2026-02-28',cadence:'MONTHLY',monthDay:31}}], '2026-02')).toEqual([]);
  expect(practiceCalendarMonth([], '2026-13')).toEqual([]);
 });
});

describe('M4-08: source identity and non-clinical navigation aggregation',()=>{
 const obs=(id,versionId,goalKey,day='2026-11-09')=>({
  id,planVersionId:versionId,goalKey,observedOn:day,value:1
 });
 it('binds evidence to exact current version and goal, not reused goal key',()=>{
  const o=[obs('a','v1','g1'),obs('b','v2','g1'),obs('c','v1','g2'),obs('d','v1','g1','2026-11-10')];
  const e=evidenceForGoal(o,'v1','g1');
  expect(e.count).toBe(2);expect(e.records.map(x=>x.id)).toEqual(['a','d']);
  const origin={originalPlanVersionId:'v1',selectedGoals:[{planGoalKey:'g1',sourceGoalKey:'sg1'}]};
  expect(sourceForGoal(origin,'v2','g1')).toBe(null);
  expect(sourceForGoal(origin,'v1','g1').sourceGoalKey).toBe('sg1');
  expect(goalEvidenceRows([goal()],o,'v1',origin)[0]).toMatchObject({count:2});
  expect(goalEvidenceRows([goal()],o,'v2',origin)[0].source).toBe(null);
 });
 it('excludes superseded plan evidence and never fabricates clinical report counts',()=>{
  const ws={plans:[plan({versions:[
    version({id:'old',status:'SUPERSEDED',homeActivities:[activity()]}),
    version({id:'current',status:'DRAFT',homeActivities:[activity(),activity({id:'a2',schedule:undefined})]})
   ]})],observations:[obs('a','old','g1'),obs('b','current','g1'),obs('c','current','other')]};
  const r=clinicianJourneySummary(ws);
  expect(r).toEqual({currentPlanVersions:1,currentGoals:1,
   currentGoalObservations:1,internalHomeActivities:2,scheduledHomeActivities:1});
 });
});

const {evidenceReferenceHeader,hasEvidenceReferenceBlock,factualReportSuggestions,draftHomeActivitySuggestions}=require('../src/lib/evidence-assist');

describe('M4-08: evidence assistance remains source-bound and non-clinical',()=>{
 it('recognizes both legacy and section-specific evidence markers without duplicates',()=>{
  expect(evidenceReferenceHeader('goals')).toBe('Evidence references (internal draft; goals):');
  expect(hasEvidenceReferenceBlock('Draft\\n  Evidence references (internal draft; goals):  ','goals')).toBe(true);
  expect(hasEvidenceReferenceBlock('Evidence references (internal draft):','sessions')).toBe(true);
  expect(hasEvidenceReferenceBlock('No evidence references yet','assessment')).toBe(false);
 });
 it('never turns observations into invented treatment outcomes',()=>{
  const report={report:{id:'r1'},evidence:{
   plan:{id:'p1'},period:{from:'2026-11-01',to:'2026-11-30'},
   assessments:[{id:'as1',assessedOn:'2026-11-03',summary:'Synthetic recorded note'}],
   goals:[{key:'g1',title:'Synthetic goal',baseline:1,target:3,measure:'count',
    planVersionId:'v1',points:[
     {date:'2026-11-05',value:1,observationId:'o1'},
     {date:'2026-11-15',value:2,observationId:'o2'}
    ]}],
   sessions:{drafts:2,completedVisits:1}
  }};
  const out=factualReportSuggestions(report);
  expect(out.map(x=>x.section)).toEqual(['assessment','goals','sessions']);
  expect(out[1].text).toContain('No clinical conclusion inferred.');
  expect(out[1].sources).toEqual(expect.arrayContaining([
   'Plan version v1 / goal g1','Observation o1 / 2026-11-05 / 1 count']));
  expect(out[2].text).toContain('Counts do not represent outcomes.');
 });
 it('only proposes matching unchosen centre templates as unverified drafts',()=>{
  const ws={templates:[
   {id:'t3',title:'C',service:'speech',library:'center'},
   {id:'t1',title:'A',service:'speech',library:'center'},
   {id:'t2',title:'B',service:'ot',library:'center'},
   {id:'t4',title:'D',service:'speech',library:'system'}]};
  const out=draftHomeActivitySuggestions(ws,'speech',[{templateId:'t3'}]);
  expect(out.map(x=>x.templateId)).toEqual(['t1']);
  expect(out[0].reason).toMatch(/Therapist must verify/);
  expect(out[0].proposed.note).toMatch(/not verified or released/);
 });
});
