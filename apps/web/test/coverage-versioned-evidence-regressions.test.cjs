// M4-08 Stage 1: real source-executing, synthetic-only cross-version evidence regressions.
// No API/network fixture: these projections must never authorize treatment or release.
const {checkpointTimeline,compareCheckpointReferences}=require('../src/lib/goal-checkpoint-compare');
const {goalVersionContext}=require('../src/lib/goal-version-context');
const {savedPlanProjection}=require('../src/lib/saved-home-plan-preview');
const {compareRecordedReportEvidence}=require('../src/lib/report-evidence-diff');

const goal=(key='g1',overrides={})=>({key,title:'Synthetic goal',measure:'count',baseline:1,target:5,...overrides});
const cp=(goalKey,at,observationIds)=>({kind:'GOAL_CHECKPOINT',goalKey,at,reviewedOn:'2026-11-10',observationIds});
const version=(id='v1',overrides={})=>({
 id,number:1,version:1,status:'DRAFT',summary:'Synthetic unsent draft',
 author:'Fictional therapist',updatedAt:'2026-11-10T09:00:00Z',
 goals:[goal()],goalCheckpoints:[],homeActivities:[],...overrides
});
const point=(observationId,value=1)=>({observationId,date:'2026-11-10',value});
const evidence=(goals=[],overrides={})=>({
 period:{from:'2026-11-01',to:'2026-11-30'},
 goals,assessments:[],sessions:{drafts:0,completedVisits:0},...overrides
});
const evGoal=(key='g1',overrides={})=>({
 key,planVersionId:'v1',title:'Synthetic goal',measure:'count',
 baseline:1,target:5,prior:null,points:[point('obs-1')],...overrides
});

describe('M4-08: saved checkpoint identity and source-difference checks',()=>{
 it('sorts only an exact goal key and records stable equal-timestamp order',()=>{
  const v=version('v1',{goals:[goal('g1'),goal('g2')],goalCheckpoints:[
   cp('g1','2026-11-10T10:00:00Z',['obs-a']),
   cp('g2','2026-11-10T09:00:00Z',['foreign']),
   cp('g1','2026-11-10T08:00:00Z',['obs-b']),
   cp('g1','2026-11-10T10:00:00Z',['obs-c'])]});
  expect(checkpointTimeline(v,'g1').map(x=>x.index)).toEqual([2,0,3]);
  expect(checkpointTimeline(v,'absent')).toEqual([]);
  expect(checkpointTimeline(v,'g2').map(x=>x.index)).toEqual([1]);
 });
 it('compares distinct observation reference sets and de-duplicates without asserting improvement',()=>{
  const v=version('v1',{goalCheckpoints:[
   cp('g1','2026-11-09T09:00:00Z',['a','a','b']),
   cp('g1','2026-11-10T09:00:00Z',['b','c','c'])]});
  expect(compareCheckpointReferences(v,0,1)).toMatchObject({
   planVersionId:'v1',goalKey:'g1',
   shared:['b'],earlierOnly:['a'],laterOnly:['c']});
  expect(compareCheckpointReferences(v,1,0)).toBeNull();
  expect(compareCheckpointReferences(v,0,0)).toBeNull();
  expect(compareCheckpointReferences(v,-1,1)).toBeNull();
  expect(compareCheckpointReferences(v,0,0.5)).toBeNull();
 });
 it('rejects cross-goal, missing-goal, invalid and inverted equal timestamp comparisons',()=>{
  const base=cp('g1','2026-11-10T10:00:00Z',['x']);
  const v=version('v1',{goalCheckpoints:[base,cp('g2','2026-11-10T11:00:00Z',[]),base]});
  expect(compareCheckpointReferences(v,0,1)).toBeNull();
  expect(compareCheckpointReferences(v,2,0)).toBeNull();
  expect(compareCheckpointReferences(v,0,9)).toBeNull();
  expect(compareCheckpointReferences({...v,goals:[]},0,2)).toBeNull();
 });
});

describe('M4-08: versioned goal evidence never transfers same-key history implicitly',()=>{
 const obs=(id,planVersionId,goalKey,observedOn='2026-11-10')=>({
  id,planVersionId,goalKey,observedOn,value:2
 });
 it('keeps current and historical same-key observations/checkpoints strictly separate',()=>{
  const old=version('old',{number:1,status:'SUPERSEDED',
   goals:[goal('g1',{title:'Prior definition',target:2})],
   goalCheckpoints:[cp('g1','2026-10-01T00:00:00Z',['a'])]});
  const next=version('next',{number:2,status:'DRAFT',
   goals:[goal('g1',{target:4}),goal('g2')],
   goalCheckpoints:[cp('g1','2026-11-09T00:00:00Z',['b'])]});
  const ws={plans:[{id:'plan',title:'Synthetic plan',service:'speech',versions:[old,next]}],
   observations:[obs('b','next','g1'),obs('a','old','g1'),obs('foreign','old','g2')]};
  const rows=goalVersionContext(ws)[0].rows;
  const latest=rows.find(r=>r.versionId==='next'&&r.goalKey==='g1');
  const earlier=rows.find(r=>r.versionId==='old'&&r.goalKey==='g1');
  expect(latest).toMatchObject({currentVersion:true,sameKeyOlderVersion:1,
   definitionDifferences:expect.arrayContaining(['title','target'])});
  expect(latest.observations.map(x=>x.id)).toEqual(['b']);
  expect(latest.checkpoints).toHaveLength(1);
  expect(earlier.currentVersion).toBe(false);
  expect(earlier.observations.map(x=>x.id)).toEqual(['a']);
  expect(rows.find(r=>r.goalKey==='g2'&&r.versionId==='next').observations).toEqual([]);
 });
 it('does not choose withdrawn or superseded versions as current, or invent records for empty plans',()=>{
  const ws={plans:[{id:'p1',title:'A',service:'ot',
   versions:[version('a',{status:'WITHDRAWN'}),version('b',{status:'SUPERSEDED'})]},
   {id:'empty',title:'Empty',service:'speech',versions:[]}],observations:[]};
  const result=goalVersionContext(ws);
  expect(result).toHaveLength(1);
  expect(result[0].rows.every(r=>!r.currentVersion)).toBe(true);
  expect(goalVersionContext({plans:[],observations:[]})).toEqual([]);
 });
});

describe('M4-08: saved home-plan projection is read-only and explicitly unapproved',()=>{
 const template={id:'t1',title:'Current editable library title',minutes:30,
  ageBand:'6-8',materials:['paper'],steps:['practice'],safety:['supervise']};
 const act=(changes={})=>({
  templateId:'t1',goalKey:'g1',frequency:'twice weekly',note:'Internal only',...changes
 });
 it('prefers persisted snapshot over newly changed library metadata',()=>{
  const snapshot={...template,title:'Original saved definition',minutes:15,
   materials:['saved'],steps:['saved step'],safety:['saved warning']};
  const p=savedPlanProjection(version('v1',{homeActivities:[act({snapshot,durationMinutes:10})]}),[template]);
  expect(p.activities[0]).toMatchObject({
   title:'Original saved definition',definitionSource:'SAVED_SNAPSHOT',
   durationMinutes:10,templateDurationMinutes:15,durationOverridden:true,
   safety:['saved warning'],linkedGoalTitle:'Synthetic goal'});
  expect(p.status).toBe('DRAFT');
 });
 it('labels library fallback and missing definitions without fabricating safety',()=>{
  const p=savedPlanProjection(version('v1',{homeActivities:[
   act(),act({templateId:'missing',goalKey:'unknown',schedule:undefined})
  ]}),[template]);
  expect(p.activities[0]).toMatchObject({definitionSource:'CURRENT_LIBRARY',
   durationMinutes:30,durationOverridden:false});
  expect(p.activities[1]).toMatchObject({definitionSource:'MISSING',
   title:'Activity definition unavailable',safety:[],goalKey:'unknown',
   linkedGoalTitle:null,durationMinutes:null});
 });
 it('rejects cross-version goal source inference while displaying report provenance',()=>{
  const origin={originalPlanVersionId:'old',reportId:'r1',reportTitle:'Synthetic report',
   reportVersionNumber:3,selectedGoals:[{planGoalKey:'g1',
    sourceGoalKey:'clinical-g1',sourcePlanVersionId:'old'}]};
  const current=savedPlanProjection(version('v1'),[],origin);
  expect(current.origin.goalMappingApplies).toBe(false);
  expect(current.goals[0].source).toBeNull();
  const same=savedPlanProjection(version('old'),[],origin);
  expect(same.origin.goalMappingApplies).toBe(true);
  expect(same.goals[0].source).toEqual({
   sourcePlanVersionId:'old',sourceGoalKey:'clinical-g1'});
 });
});

describe('M4-08: frozen report evidence drift and source attribution',()=>{
 it('does not mistake reorderings of stable observation IDs for changed sources',()=>{
  const initial=evidence([evGoal('g1',{points:[point('a',1),point('b',2)]})]);
  const current=evidence([evGoal('g1',{points:[point('b',2),point('a',1)]})]);
  expect(compareRecordedReportEvidence(initial,current).goals[0].status)
   .toBe('UNCHANGED_REFERENCES');
 });
 it('detects changed evidence values even when source IDs remain the same',()=>{
  const change=compareRecordedReportEvidence(
   evidence([evGoal()]),evidence([evGoal('g1',{points:[point('obs-1',2)]})]));
  expect(change.goals[0]).toMatchObject({status:'DIFFERENT_REFERENCES',
   savedSources:1,currentSources:1});
 });
 it('does not treat reused goal key in another version as the same evidence',()=>{
  const r=compareRecordedReportEvidence(
   evidence([evGoal('g1')]),evidence([evGoal('g1',{planVersionId:'v2'})]));
  expect(r.goals.map(x=>x.status)).toEqual(['NOT_IN_CURRENT','ADDED_SINCE_SNAPSHOT']);
 });
 it('flags missing stable identity, missing source IDs, changed definitions and no observations',()=>{
  const legacy=evGoal('legacy',{planVersionId:null});
  const noIds=evGoal('g2',{points:[{date:'2026-11-10',value:1}]});
  const different=evGoal('g3');
  const noObs=evGoal('g4',{points:[]});
  const old=evidence([legacy,noIds,different,noObs]);
  const next=evidence([legacy,noIds,evGoal('g3',{target:11}),noObs]);
  expect(compareRecordedReportEvidence(old,next).goals.map(g=>g.status)).toEqual([
   'LEGACY_IDENTITY_UNAVAILABLE','SOURCE_IDS_UNAVAILABLE','DIFFERENT_DEFINITION','NO_OBSERVATIONS']);
 });
 it('reports period, assessment-set and session-count differences without claiming approval',()=>{
  const old=evidence([],{assessments:[{id:'a'},{id:'a'},{id:'b'}]});
  const newer=evidence([],{period:{from:'2026-12-01',to:'2026-12-31'},
   assessments:[{id:'b'},{id:'c'}],sessions:{drafts:1,completedVisits:0}});
  expect(compareRecordedReportEvidence(old,newer)).toMatchObject({
   samePeriod:false,assessmentIdsOnlyInSaved:['a'],
   assessmentIdsOnlyInCurrent:['c'],sessionsCountChanged:true});
 });
});
