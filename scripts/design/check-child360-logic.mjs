import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Load the identical pure TS source shipped to the browser, without stubs.
async function pureModule(path) {
  const code = readFileSync(path, 'utf8');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const progress = await pureModule('apps/web/src/lib/progress-analysis.ts');
const assist = await pureModule('apps/web/src/lib/evidence-assist.ts');
const comparison = await pureModule('apps/web/src/lib/plan-version-compare.ts');
const schedule = await pureModule('apps/web/src/lib/home-schedule.ts');
const pts = [
  { id:'p1', planVersionId:'v1', goalKey:'shared', observedOn:'2026-10-05', value:2 },
  { id:'p2', planVersionId:'v1', goalKey:'shared', observedOn:'2026-10-11', value:4 },
  { id:'p3', planVersionId:'v2', goalKey:'shared', observedOn:'2026-10-12', value:99 },
  { id:'p4', planVersionId:'v1', goalKey:'shared', observedOn:'2026-10-13', value:6 },
  { id:'p5', planVersionId:'v1', goalKey:'other', observedOn:'2026-10-20', value:8 },
];
const weekly = progress.summarizeObservations(pts, 'v1','shared','week');
assert.equal(weekly.length,2);
assert.deepEqual(weekly[0].sourceIds,['p1','p2']);
assert.equal(weekly[0].periodStart,'2026-10-05');
assert.equal(weekly[0].periodEnd,'2026-10-11');
assert.equal(weekly[0].average,3);
assert.equal(weekly[1].latest,6);
assert(!weekly.some(x=>x.sourceIds.includes('p3')||x.sourceIds.includes('p5')));
const monthly=progress.summarizeObservations(pts,'v1','shared','month');
assert.equal(monthly.length,1);
assert.deepEqual(monthly[0].sourceIds,['p1','p2','p4']);
assert.equal(monthly[0].periodEnd,'2026-10-31');
assert.deepEqual(progress.summarizeObservations([], 'v1','shared','month'),[]);
const ws={
 plans:[{id:'plan1',service:'speech',title:'Speech draft',versions:[
   {id:'v2',number:2,status:'IN_REVIEW',goals:[{key:'shared',title:'Current goal',measure:'count',baseline:0,target:6}]},
   {id:'v1',number:1,status:'SUPERSEDED',goals:[{key:'shared',title:'Old goal',measure:'count',baseline:0,target:2}]}]}],
 templates:[
   {id:'speech1',title:'Picture cards',service:'speech',library:'center'},
   {id:'ot1',title:'Pegs',service:'occupational',library:'center'},
   {id:'global',title:'Global sample',service:'speech',library:'synthetic'},
 ],
};
const goals=progress.currentGoals(ws);
assert.equal(goals.length,1);
assert.equal(goals[0].planVersionId,'v2');
const historical=progress.historicalGoals(ws);
assert.equal(historical.length,1);
assert.equal(historical[0].planVersionId,'v1');
assert.equal(historical[0].status,'SUPERSEDED');
assert.equal(progress.summarizeObservations(pts,historical[0].planVersionId,historical[0].key,'month')[0].sourceIds.length,3);
assert(!progress.summarizeObservations(pts,'v2','shared','month')[0].sourceIds.includes('p1'));
assert.equal(assist.draftHomeActivitySuggestions(ws,'speech',[]).length,1);
assert.equal(assist.draftHomeActivitySuggestions(ws,'speech',[{templateId:'speech1'}]).length,0);
const report={report:{id:'report1'},evidence:{
 period:{from:'2026-10-01',to:'2026-10-23'},
 assessments:[{id:'assessment1',assessedOn:'2026-10-01',summary:'Fictional assessment summary'}],
 goals:[{key:'shared',title:'Shared goal',baseline:1,target:7,measure:'count',planVersionId:'v2',points:[{date:'2026-10-05',value:2,observationId:'obs-a'},{date:'2026-10-12',value:4,observationId:'obs-b',sessionNoteId:'session-b'}]}],
 sessions:{drafts:2,completedVisits:3},
}};
const marker=assist.evidenceReferenceHeader('goals');
assert.equal(marker, 'Evidence references (internal draft; goals):');
assert.equal(assist.hasEvidenceReferenceBlock('Reviewed note.\n\n'+marker+'\n- Observation original', 'goals'),true);
assert.equal(assist.hasEvidenceReferenceBlock('Reviewed note edited.\n\n'+marker+'\n- Observation changed', 'goals'),true);
assert.equal(assist.hasEvidenceReferenceBlock('Evidence references (internal draft):\n- Legacy reference', 'goals'),true);
assert.equal(assist.hasEvidenceReferenceBlock('Referenced passage without evidence header', 'goals'),false);
assert.equal(assist.hasEvidenceReferenceBlock(assist.evidenceReferenceHeader('assessment'), 'goals'),false);
const suggestions=assist.factualReportSuggestions(report);
assert(suggestions.every(s=>s.sources.length>0));
const sources=suggestions.find(s=>s.section==='goals')?.sources??[];
assert(sources.includes('Observation obs-a / 2026-10-05 / 2 count'));
assert(sources.includes('Observation obs-b / 2026-10-12 / 4 count'));
assert(sources.includes('Linked session session-b'));
assert(!sources.includes('Observation p3'));

assert(suggestions.some(s=>s.text.includes('2 recorded points') && s.text.includes('to 4')));
assert(suggestions.every(s=>!s.text.includes('achieved')&&!s.text.includes('diagnosis')));
assert(!suggestions.some(s=>s.section==='recommendations'||s.section==='summary'));

// Read-only cross-version diff compares definitions, NOT clinical results.
// Reused goal key with a different measure must NOT import old measurements.
const older = {
  id: 'older', number: 1, status: 'SUPERSEDED', summary: 'Older text',
  goals: [{ key: 'shared', title: 'Naming objects', measure: 'count', baseline: 1, target: 5 },
    { key: 'removed', title: 'Old target', measure: 'level', baseline: 1, target: 3 }],
  homeActivities: [{ templateId: 'picture', frequency: 'Once weekly', goalKey: 'shared' },
    { templateId: 'removed-activity', frequency: 'Daily' }],
};
const newer = {
  id: 'newer', number: 2, status: 'DRAFT', summary: 'Updated text',
  goals: [{ key: 'shared', title: 'Naming objects', measure: 'percent', baseline: 10, target: 75 },
    { key: 'added', title: 'New target', measure: 'count', baseline: 0, target: 2 }],
  homeActivities: [{ templateId: 'picture', frequency: 'Twice weekly', goalKey: 'added' },
    { templateId: 'added-activity', frequency: 'Daily' }],
};
const delta = comparison.comparePlanVersions(older, newer);
assert.equal(delta.from, 1);
assert.equal(delta.to, 2);
assert.equal(delta.summaryChanged, true);
assert.deepEqual(delta.goals.map(g => [g.key, g.kind]), [['added','added'], ['removed','removed'], ['shared','changed']]);
assert.equal(delta.goals.find(g => g.key === 'shared').definitionChanged, true);
assert(!('measurements' in delta.goals.find(g => g.key === 'shared')));
assert.deepEqual(delta.activities.map(a => [a.templateId, a.kind]), [
  ['added-activity','added'], ['picture','changed'], ['removed-activity','removed']]);
// Persisted activity snapshot content must win over a mutable library title.
// A template can be removed/re-added with the same ID and a new saved definition.
const savedBase = { title: 'Original name', service: 'speech', ageBand: '6-8',
  minutes: 15, materials: ['cards'], steps: ['Point'], safety: ['Supervise'],
  version: 1, capturedAt: '2026-10-01T09:00:00Z' };
const priorSaved = { ...older, homeActivities: [{ templateId: 'picture', goalKey: 'shared',
  frequency: 'Weekly', snapshot: savedBase }] };
const laterSaved = { ...newer, homeActivities: [{ templateId: 'picture', goalKey: 'shared',
  frequency: 'Weekly', snapshot: { ...savedBase, title: 'Renamed at capture',
    steps: ['Say the word'], safety: ['Check vision'], version: 2,
    capturedAt: '2026-10-23T09:00:00Z' } }] };
assert.equal(comparison.comparePlanVersions(priorSaved, laterSaved).activities[0].kind, 'changed');
const metadataOnly = { ...newer, homeActivities: [{
  ...priorSaved.homeActivities[0],
  snapshot: { ...savedBase, version: 3, capturedAt: '2026-10-25T09:00:00Z' },
}] };
assert.equal(comparison.comparePlanVersions(priorSaved, metadataOnly).activities[0].kind, 'unchanged');
assert.equal(comparison.comparePlanVersions(older, older).goals.every(g => g.kind === 'unchanged'), true);
assert.equal(comparison.comparePlanVersions(older, older).activities.every(a => a.kind === 'unchanged'), true);
assert.equal(comparison.comparePlanVersions(newer, older).from, 2);
// Caller supplies two versions of ONE already-authorized plan; this module has
// no backend access and does not modify either persisted snapshot.
assert.equal(older.goals[0].measure, 'count');


// Structured home-plan recurrence is local-calendar-only and bounded.
// Missing day 31 does not roll over to another month or invent a task.
const monthlySchedule = { cadence: 'MONTHLY', startsOn: '2026-10-01', endsOn: '2027-03-31', monthDay: 31 };
assert.equal(schedule.scheduleProblem(monthlySchedule), null);
assert.deepEqual(schedule.scheduledDays(monthlySchedule), ['2026-10-31', '2026-12-31', '2027-01-31', '2027-03-31']);
const weeklySchedule = { cadence: 'WEEKLY', startsOn: '2026-10-19', endsOn: '2026-10-29', weekdays: [1, 3] };
assert.deepEqual(schedule.scheduledDays(weeklySchedule), ['2026-10-19','2026-10-21','2026-10-26','2026-10-28']);
assert.equal(schedule.isCalendarDay('2028-02-29'), true);
assert.equal(schedule.isCalendarDay('2027-02-29'), false);
assert.equal(schedule.isCalendarDay('2027-04-31'), false);
assert(schedule.scheduleProblem({ ...weeklySchedule, weekdays: [1,1] }));
assert(schedule.scheduleProblem({ ...weeklySchedule, weekdays: [] }));
assert(schedule.scheduleProblem({ ...weeklySchedule, endsOn: '2026-10-18' }));
assert(schedule.scheduleProblem({ ...monthlySchedule, monthDay: 32 }));
assert(schedule.scheduleProblem({ ...monthlySchedule, weekdays: [1] }));
assert(schedule.scheduleProblem({ cadence: 'MONTHLY', startsOn: '2027-02-01', endsOn: '2027-02-28', monthDay: 31 }));
assert(schedule.scheduleProblem({ cadence: 'WEEKLY', startsOn: '2026-10-19', endsOn: '2026-10-19', weekdays: [2] }));
assert.deepEqual(schedule.scheduledDays({ ...monthlySchedule, monthDay: 32 }), []);
// Pure version-history comparison must include planning metadata, but never
// imports observations from another version under the same goal key.
const plannedGoal = { key: 'goal', title: 'Synthetic naming', measure: 'count', baseline: 1, target: 5 };
const basePlan = { number: 1, summary: 'draft', goals: [plannedGoal], homeActivities: [
  { templateId: 'picture', frequency: 'Weekly calendar draft', goalKey: 'goal', schedule: weeklySchedule }
] };
const plannedPlan = { number: 2, summary: 'draft', goals: [
  { ...plannedGoal, horizon: 'LONG_TERM', reviewOn: '2026-11-12', targetOn: '2027-02-28' }
], homeActivities: [
  { templateId: 'picture', frequency: 'Weekly calendar draft', goalKey: 'goal', schedule: { ...weeklySchedule, weekdays: [2] } }
] };
const planningDelta = comparison.comparePlanVersions(basePlan, plannedPlan);
assert.equal(planningDelta.goals[0].kind, 'changed');
assert.equal(planningDelta.goals[0].definitionChanged, true);
assert.equal(planningDelta.activities[0].kind, 'changed');
assert(!('measurements' in planningDelta.goals[0]));

console.log('PASS: strict plan-version isolation, weekly/monthly bucket boundaries, source IDs, no fabricated trend, specialty-only activity shortlist, manual factual suggestions');
