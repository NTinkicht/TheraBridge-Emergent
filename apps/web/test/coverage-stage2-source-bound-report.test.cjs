// M4-08 Stage 2: exercise actual deterministic source-bound draft generator.
// Evidence is entirely fictional and never used as clinical advice or approval.
// Assert exact source scope, omission caps and non-inference, not source strings.
const {reportSourceSnapshot,proposeSyntheticReportSection}=require('../src/lib/synthetic-report-draft');
const base=()=>({
 period:{from:'2026-11-01',to:'2026-11-30'},
 sessions:{drafts:2,completedVisits:0},assessments:[],goals:[],
 plan:null
});
const assessment=(id,summary)=>({id,summary,assessedOn:'2026-11-10'});
const goal=(key,points=[])=>({key,title:'Fictional turn-taking',planVersionId:'pv1',
 measure:'count',baseline:1,target:5,points});
const scope='center:fictional-center:child:fictional-child:service:speech';
describe('M4-08 Stage 2 real offline synthetic report source validation',()=>{
 it('never infers a finding when assessment records are absent or incomplete',()=>{
  const e=base();e.assessments=[
   assessment('empty',' '),assessment('', 'Missing identifier')];
  const p=proposeSyntheticReportSection(e,'assessment',scope);
  expect(p.sourceRefs).toEqual([]);
  expect(p.pinnedSources).toEqual([]);
  expect(p.text).toContain('No eligible recorded evidence.');
  expect(p.warnings).toContain('No eligible recorded sources: do not infer findings.');
  expect(p.validation).toBe('REFERENCED_NOT_VERIFIED');
  expect(p.released).toBe(false);
 });
 it('pins assessment content to exact supplied immutable identity and authorized scope',()=>{
  const e=base();e.assessments=[assessment('a1','  Synthetic observed task  ')];
  const snapshot=reportSourceSnapshot(e,'assessment',scope);
  expect(snapshot).toHaveLength(1);
  expect(snapshot[0]).toMatchObject({kind:'assessment',id:'a1',scope,
   revision:'2026-11-10',validation:'REFERENCED_NOT_VERIFIED'});
  const p=proposeSyntheticReportSection(e,'assessment',scope);
  expect(p.sourceRefs).toEqual(['assessment:a1']);
  expect(p.pinnedSources).toEqual(snapshot);
  expect(p.text).toContain('[assessment:a1] Recorded 2026-11-10: Synthetic observed task');
  expect(p.text).not.toContain('approved');
 });
 it('limits both snapshot and draft to first twenty provided assessment sources',()=>{
  const e=base();e.assessments=Array.from({length:24},(_,i)=>
   assessment('a'+i,'Fictional observation '+i));
  const p=proposeSyntheticReportSection(e,'assessment',scope);
  expect(p.sourceRefs).toHaveLength(20);
  expect(p.pinnedSources).toHaveLength(20);
  expect(p.sourceRefs).not.toContain('assessment:a20');
 });
 it('bounds prose and records omitted large source content instead of truncating silently',()=>{
  const e=base();e.assessments=[assessment('huge','x'.repeat(10000)),
   ...Array.from({length:18},(_,i)=>assessment('long'+i,'y'.repeat(500)))];
  const p=proposeSyntheticReportSection(e,'assessment',scope);
  expect(p.text.length).toBeLessThanOrEqual(7000);
  expect(p.warnings).toContain('Additional sources omitted to respect the report section length limit.');
  expect(p.sourceRefs.length).toBeLessThan(19);
  expect(p.pinnedSources.map(s=>s.id)).toEqual(p.sourceRefs.map(s=>s.split(':')[1]));
 });
 it('reports missing recorded goal evidence and keeps exact version association',()=>{
  const e=base();e.goals=[goal('g1')];
  const p=proposeSyntheticReportSection(e,'goals',scope);
  expect(p.sourceRefs).toEqual(['goal:pv1:g1']);
  expect(p.pinnedSources).toMatchObject([{id:'pv1:g1',kind:'goal',scope}]);
  expect(p.text).toContain('no recorded observation in this period');
  expect(p.warnings).toContain('Goal g1 lacks recorded observations.');
  expect(p.released).toBe(false);
 });
 it('uses the last recorded point only, without predicting improvement',()=>{
  const e=base();e.goals=[goal('g1',[
   {date:'2026-11-09',value:2,observationId:'ob1'},
   {date:'2026-11-10',value:3,observationId:'ob2'}])];
  const p=proposeSyntheticReportSection(e,'goals',scope);
  expect(p.text).toContain('latest recorded 3 count (2026-11-10)');
  expect(p.text).not.toContain('improved');
  expect(p.text).not.toContain('on track');
  expect(p.pinnedSources[0].snapshot).toContain('ob2');
  expect(p.warnings).toEqual([]);
 });
 it('handles unversioned fictional goal without silently borrowing current version',()=>{
  const e=base();e.goals=[{...goal('g1'),planVersionId:null}];
  const p=proposeSyntheticReportSection(e,'goals',scope);
  expect(p.sourceRefs).toEqual(['goal:unversioned:g1']);
  expect(p.pinnedSources[0].revision).toBe('unversioned');
 });
 it('labels session counts as non-clinical and never invents progress',()=>{
  const p=proposeSyntheticReportSection(base(),'sessions',scope);
  expect(p.sourceRefs).toEqual(['session:period-counts']);
  expect(p.pinnedSources).toMatchObject([{kind:'session-count',
   id:'period-counts',scope,revision:'2026-11-01:2026-11-30'}]);
  expect(p.text).toContain('0 completed visits and 2 session drafts');
  expect(p.warnings).toContain('Session counts do not establish outcomes or clinical progress.');
  expect(p.promptVersion).toBe('m3-ai02-offline-v1');
  expect(p.released).toBe(false);
 });
});