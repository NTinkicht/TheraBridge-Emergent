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
const planEvidence = await pureModule('apps/web/src/lib/plan-evidence.ts');
const review = await pureModule('apps/web/src/lib/goal-review.ts');
const schedule = await pureModule('apps/web/src/lib/home-schedule.ts');
const checkpointCompare = await pureModule('apps/web/src/lib/goal-checkpoint-compare.ts');
const handoff = await pureModule('apps/web/src/lib/home-plan-handoff.ts');
const homeDetail = await pureModule('apps/web/src/lib/home-activity-detail.ts');
const savedPreview = await pureModule('apps/web/src/lib/saved-home-plan-preview.ts');

// TB-EM-041: a staff-only preview projects only the exact, already-authorized
// persisted version. No unsaved working-copy input, clinical inference,
// cross-version report goal mapping or mutable-library replacement.
const basePreviewVersion = {
  id:'saved-version-a',number:1,version:7,status:'DRAFT',
  summary:'Original saved synthetic plan',author:'Synthetic therapist',
  updatedAt:'2026-10-25T09:00:00Z',
  goals:[{key:'goal-a',title:'Saved naming objective',measure:'count',
    baseline:1,target:5,horizon:'SHORT_TERM',targetOn:'2026-11-12'}],
  homeActivities:[{templateId:'t-a',frequency:'Weekly calendar draft',
    goalKey:'goal-a',note:'Saved therapist instructions',
    schedule:{cadence:'WEEKLY',startsOn:'2026-10-26',endsOn:'2026-11-09',weekdays:[1]},
    snapshot:{id:'t-a',title:'Saved cards',service:'speech',ageBand:'6-8',
      minutes:12,steps:['Show card'],materials:['Cards'],safety:['Adult supervision'],
      version:2,capturedAt:'2026-10-25T09:00:00Z'}}],
};
const sourceReportPreview = {
  reportId:'r-a',reportTitle:'Synthetic report',reportVersionNumber:3,
  reportVersionId:'r-v3',originalPlanVersionId:'saved-version-a',
  draftedAt:'2026-10-25',selectedGoals:[{planGoalKey:'goal-a',
    sourcePlanVersionId:'report-source-plan-v8',sourceGoalKey:'original-goal'}],
  draftOnly:true,released:false,
};
const changedLiveTemplate = {id:'t-a',title:'Altered live library title',
  service:'speech',ageBand:'6-8',minutes:24,steps:['New step'],
  materials:['New item'],safety:['Changed safety']};
const exactSavedPreview = savedPreview.savedPlanProjection(
  basePreviewVersion,[changedLiveTemplate],sourceReportPreview);
assert.equal(exactSavedPreview.id,'saved-version-a');
assert.equal(exactSavedPreview.summary,'Original saved synthetic plan');
assert.equal(exactSavedPreview.activities[0].title,'Saved cards');
assert.equal(exactSavedPreview.activities[0].durationMinutes,12);
assert.deepEqual(exactSavedPreview.activities[0].safety,['Adult supervision']);
assert.equal(exactSavedPreview.activities[0].note,'Saved therapist instructions');
assert.equal(exactSavedPreview.activities[0].linkedGoalTitle,'Saved naming objective');
assert.equal(exactSavedPreview.activities[0].definitionSource,'SAVED_SNAPSHOT');
assert.deepEqual(exactSavedPreview.goals[0].source,{
  sourcePlanVersionId:'report-source-plan-v8',sourceGoalKey:'original-goal'});
assert.equal(exactSavedPreview.origin.goalMappingApplies,true);
const laterSavedPreview=savedPreview.savedPlanProjection({
  ...basePreviewVersion,id:'saved-version-b',number:2,version:1,
  summary:'Later version title',goals:[{...basePreviewVersion.goals[0],title:'New definition'}],
},[changedLiveTemplate],sourceReportPreview);
assert.equal(laterSavedPreview.origin.goalMappingApplies,false);
assert.equal(laterSavedPreview.goals[0].source,null,
  'The report mapping of the original version MUST NOT carry forward');
assert.equal(laterSavedPreview.activities[0].linkedGoalTitle,'New definition',
  'Goal labels must resolve within this exact version only');
const invalidGoalPreview=savedPreview.savedPlanProjection({
  ...basePreviewVersion,goals:[],homeActivities:[{
    templateId:'t-a',goalKey:'goal-a',frequency:'Undated'}],
},[changedLiveTemplate],null);
assert.equal(invalidGoalPreview.activities[0].linkedGoalTitle,null);
assert.equal(invalidGoalPreview.activities[0].definitionSource,'CURRENT_LIBRARY');
assert.equal(invalidGoalPreview.activities[0].durationMinutes,24);
assert.equal(invalidGoalPreview.origin,null);
const unavailablePreview=savedPreview.savedPlanProjection({
  ...basePreviewVersion,homeActivities:[{templateId:'missing',frequency:'As directed'}],
},[],null);
assert.equal(unavailablePreview.activities[0].definitionSource,'MISSING');
assert.equal(unavailablePreview.activities[0].durationMinutes,null);
assert(!('approved' in exactSavedPreview) && !('released' in exactSavedPreview),
  'The preview cannot imply approval or family release');
assert.equal(basePreviewVersion.homeActivities[0].snapshot.title,'Saved cards');

// TB-EM-040: clinician notes belong to the exact plan activity. Saved
// definition wins over a newer, changed library template; no extra write path.
const oldDefinition = {
  id: 't1', title:'Saved picture activity', service:'speech', ageBand:'6-8',
  minutes:12, materials:['Saved cards'], steps:['Name picture'],
  safety:['Adult stays nearby'], version:2,capturedAt:'2026-10-20T09:00:00Z',
};
const mutableDefinition = {
  ...oldDefinition,title:'Updated library picture activity',minutes:23,
  steps:['Updated step'],safety:['Updated warning'],
};
const savedDetail = homeDetail.homeActivityDefinition({
  templateId:'t1',frequency:'Weekly',note:'Clinician authored adaptation.',
  snapshot:oldDefinition,
},[mutableDefinition]);
assert.equal(savedDetail.title,'Saved picture activity');
assert.equal(savedDetail.minutes,12);
assert.deepEqual(savedDetail.steps,['Name picture']);
assert.deepEqual(savedDetail.safety,['Adult stays nearby']);
assert.equal(savedDetail.note,'Clinician authored adaptation.');
assert.equal(savedDetail.source,'SAVED_SNAPSHOT');
const legacyDetail = homeDetail.homeActivityDefinition({templateId:'t1',frequency:'Weekly'},[mutableDefinition]);
assert.equal(legacyDetail.source,'CURRENT_LIBRARY');
assert.equal(legacyDetail.minutes,23);
assert.equal(legacyDetail.note,'');
const missingDetail = homeDetail.homeActivityDefinition({templateId:'missing',frequency:'As directed'},[mutableDefinition]);
assert.equal(missingDetail.source,'MISSING');
assert.equal(missingDetail.minutes,null);
assert.deepEqual(missingDetail.safety,[]);
assert.equal(homeDetail.MAX_THERAPIST_INSTRUCTION_LENGTH,500);
const noteBefore={ number:1,summary:'Draft',goals:[],homeActivities:[
  {templateId:'t1',frequency:'Weekly',snapshot:oldDefinition,note:'Before'},
]};
const noteAfter={...noteBefore,homeActivities:[
  {...noteBefore.homeActivities[0],note:'After'},
]};
assert.equal(comparison.comparePlanVersions(noteBefore,noteAfter).activities[0].kind,'changed');
assert.equal(oldDefinition.title,'Saved picture activity');

// TB-EM-039: advisory planning checklist is NOT a clinical approval; only a
// dirty-state guard prevents submitting a draft different from the screen.
const goalHandoff = { key:'g1',title:'Synthetic naming',measure:'count',
  baseline:0,target:5,targetOn:'2027-01-05',reviewOn:'2026-12-05' };
const handoffTemplate = {id:'activity1',title:'Picture cards',service:'speech',
  ageBand:'6-8',minutes:10,materials:[],steps:['Point'],safety:['Adult supervises']};
const goodHandoff = {
  summary:'Plan to practice fictional naming tasks',
  goals:[goalHandoff],
  activities:[{templateId:'activity1',goalKey:'g1',
    frequency:'Weekly calendar draft',schedule:{
      cadence:'WEEKLY',startsOn:'2026-11-02',endsOn:'2026-11-16',weekdays:[1],
    },snapshot:{...handoffTemplate,version:1,capturedAt:'2026-10-25T08:00:00Z'}}],
  templates:[],
  hasUnsavedEdits:false,hasOtherPlanEdits:false,newlyAddedUnlinked:false,
};
const readyHandoff=handoff.homePlanHandoff(goodHandoff,schedule.scheduleProblem);
assert.equal(readyHandoff.canSendSavedDraft,true);
assert.equal(readyHandoff.blockingReason,null);
assert.deepEqual(readyHandoff.attention,[]);
assert.equal(handoff.homePlanHandoff({...goodHandoff,hasUnsavedEdits:true},
  schedule.scheduleProblem).canSendSavedDraft,false);
assert.equal(handoff.homePlanHandoff({...goodHandoff,hasOtherPlanEdits:true},
  schedule.scheduleProblem).canSendSavedDraft,false);
assert.equal(handoff.homePlanHandoff({...goodHandoff,newlyAddedUnlinked:true},
  schedule.scheduleProblem).canSendSavedDraft,false);
const incompleteHandoff=handoff.homePlanHandoff({
  ...goodHandoff,summary:'',goals:[{...goalHandoff,targetOn:undefined}],
  activities:[
    {templateId:'activity1',frequency:'As directed'},
    {templateId:'missing',goalKey:'incorrect',frequency:'monthly',
      schedule:{cadence:'MONTHLY',startsOn:'2027-02-01',endsOn:'2027-02-28',monthDay:31}},
  ],
  templates:[handoffTemplate],
},schedule.scheduleProblem);
for(const key of ['summary','goal-links','schedule','undated','template','legacy','dates']){
  assert(incompleteHandoff.attention.some(x=>x.id===key), 'Missing advisory '+key);
}
assert.equal(incompleteHandoff.canSendSavedDraft,true,
  'Advisory omissions cannot become invented clinical gating rules');
assert(!('approved' in readyHandoff) && !('clinicallySafe' in readyHandoff));

// TB-EM-037: checkpoint comparisons stay in ONE immutable plan-version/goal;
// compare only explicit source IDs, never infer values or clinical outcomes.
const checkpointV = {
  id: 'plan-version-exact', goals: [{ key: 'shared', title: 'Same-version goal' }, { key: 'other', title: 'Another goal' }],
  goalCheckpoints: [
    { kind: 'GOAL_CHECKPOINT', goalKey: 'shared', at: '2026-10-10T08:00:00Z',
      reviewedOn: '2026-10-09', summary: 'Earlier narrative', observationIds: ['obs-a', 'obs-b', 'obs-b'] },
    { kind: 'GOAL_CHECKPOINT', goalKey: 'other', at: '2026-10-10T09:00:00Z',
      reviewedOn: '2026-10-10', summary: 'Different goal', observationIds: ['obs-x'] },
    { kind: 'GOAL_CHECKPOINT', goalKey: 'shared', at: '2026-10-12T08:00:00Z',
      reviewedOn: '2026-10-02', summary: 'Later recorded, backdated review', observationIds: ['obs-b', 'obs-c'] },
  ],
};
assert.deepEqual(checkpointCompare.checkpointTimeline(checkpointV, 'shared').map(x => x.index), [0, 2]);
assert.deepEqual(checkpointCompare.checkpointTimeline(checkpointV, 'missing'), []);
assert.equal(checkpointCompare.checkpointTimeline({ ...checkpointV, goalCheckpoints: [] }, 'shared').length, 0);
const checkpointDelta = checkpointCompare.compareCheckpointReferences(checkpointV, 0, 2);
assert.equal(checkpointDelta.planVersionId, 'plan-version-exact');
assert.deepEqual(checkpointDelta.shared, ['obs-b']);
assert.deepEqual(checkpointDelta.earlierOnly, ['obs-a']);
assert.deepEqual(checkpointDelta.laterOnly, ['obs-c']);
assert(!('outcome' in checkpointDelta) && !('progress' in checkpointDelta) && !('measurement' in checkpointDelta));
assert.equal(checkpointCompare.compareCheckpointReferences(checkpointV, 2, 0), null);
assert.equal(checkpointCompare.compareCheckpointReferences(checkpointV, 0, 1), null);
assert.equal(checkpointCompare.compareCheckpointReferences(checkpointV, 0, 0), null);
assert.equal(checkpointCompare.compareCheckpointReferences(checkpointV, -1, 2), null);
assert.equal(checkpointCompare.compareCheckpointReferences(checkpointV, 0, 100), null);
const stableEqualTime = { ...checkpointV, goalCheckpoints: [
  { ...checkpointV.goalCheckpoints[0] }, { ...checkpointV.goalCheckpoints[2],
    at: checkpointV.goalCheckpoints[0].at },
] };
assert.deepEqual(checkpointCompare.checkpointTimeline(stableEqualTime, 'shared').map(x => x.index), [0, 1]);
assert.equal(checkpointCompare.compareCheckpointReferences(stableEqualTime, 1, 0), null);
// The module receives the currently authorized version. It has no API, data
// fetch or cross-version re-linking path, even for reused goal keys.
assert.equal(checkpointV.goalCheckpoints[2].reviewedOn, '2026-10-02');

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
// TB-EM-038: month expansion is independent of the 8/40-item preview cap,
// uses only passed-in version activities, and never shifts nonexistent dates.
const octoberPractice = schedule.practiceCalendarMonth([
  { templateId: 'weekly', goalKey: 'g-one', frequency: 'Weekly', schedule: weeklySchedule },
  { templateId: 'monthly', goalKey: 'g-two', frequency: 'Monthly', schedule: {
    cadence: 'MONTHLY', startsOn: '2026-10-01', endsOn: '2027-03-31', monthDay: 31,
  } },
  { templateId: 'legacy', frequency: 'Every day (free text)' },
  { templateId: 'invalid', frequency: 'Invalid', schedule: { cadence: 'MONTHLY',
    startsOn: '2027-02-01', endsOn: '2027-02-28', monthDay: 31 } },
], '2026-10');
assert.deepEqual(octoberPractice.map(x => [x.date,x.activityIndex]), [
  ['2026-10-19',0], ['2026-10-21',0], ['2026-10-26',0],
  ['2026-10-28',0], ['2026-10-31',1],
]);
assert(octoberPractice.every(x => x.templateId !== 'legacy' && x.templateId !== 'invalid'));
assert.deepEqual(schedule.practiceCalendarMonth([
  { templateId: 'month31', frequency:'Monthly', schedule:{
    cadence: 'MONTHLY', startsOn:'2027-01-01', endsOn:'2027-03-31', monthDay:31,
  }},
], '2027-02'), []);
assert.deepEqual(schedule.practiceCalendarMonth([], '2027-15'), []);
assert.deepEqual(schedule.practiceCalendarMonth([], '1999-12'), []);
const overlapPractice = schedule.practiceCalendarMonth([
  { templateId:'same-a', goalKey:'one', frequency:'weekly',schedule:weeklySchedule },
  { templateId:'same-b', goalKey:'two', frequency:'weekly',schedule:weeklySchedule },
], '2026-10');
assert.deepEqual(overlapPractice.slice(0,2).map(x=>[x.date,x.templateId]),
  [['2026-10-19','same-a'],['2026-10-19','same-b']]);
assert.equal(overlapPractice.every(x=>!('completion' in x) && !('outcome' in x) && !('visit' in x)),true);
const nearYearEnd = { cadence: 'WEEKLY', startsOn:'2026-10-01',
  endsOn:'2027-09-30',weekdays:[0,1,2,3,4,5,6] };
assert.equal(schedule.scheduleProblem(nearYearEnd),null);
assert.equal(schedule.scheduledDays(nearYearEnd,1000).length,40);
assert.equal(schedule.practiceCalendarMonth([{templateId:'late',frequency:'daily',
  schedule:nearYearEnd}], '2027-09').length,30, 'Late month must not truncate at preview limit');
assert.deepEqual(schedule.practiceCalendarMonth([{templateId:'later-version',
  frequency:'monthly',schedule:monthlySchedule}], '2026-10').map(x=>x.templateId),
  ['later-version'], 'Caller-supplied one version only; never infer same-goal continuity');

// Negative old/legacy schedule shapes must never leak invalid entries.
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

// TB-EM-032: no cross-version inference even when goal keys are identical.
// The report source maps only initial g1; a new plan version never inherits
// prior observations or source definition identity implicitly.
const sourceOrigin = {
  originalPlanVersionId: 'v-initial', reportId: 'r-saved', reportVersionId: 'rv1',
  reportTitle: 'Saved report', reportVersionNumber: 1, draftedAt: '2026-10-25',
  selectedGoals: [{ planGoalKey: 'g1', sourcePlanVersionId: 'previous-plan-v2', sourceGoalKey: 'shared' }],
  draftOnly: true, released: false,
};
const planObservations = [
  { id: 'o1', planVersionId: 'previous-plan-v2', goalKey: 'shared', observedOn: '2026-10-01', value: 42 },
  { id: 'o2', planVersionId: 'v-initial', goalKey: 'g1', observedOn: '2026-10-20', value: 3 },
  { id: 'o3', planVersionId: 'v-initial', goalKey: 'g1', observedOn: '2026-10-19', value: 2 },
  { id: 'o4', planVersionId: 'v-followup', goalKey: 'g1', observedOn: '2026-10-21', value: 7 },
  { id: 'o5', planVersionId: 'v-initial', goalKey: 'g-other', observedOn: '2026-10-22', value: 9 },
];
const initial = planEvidence.goalEvidenceRows([{ key: 'g1', title: 'Test goal' }],
  planObservations, 'v-initial', sourceOrigin)[0];
assert.equal(initial.count, 2);
assert.deepEqual(initial.records.map(x => x.id), ['o3','o2']);
assert.deepEqual(initial.source, sourceOrigin.selectedGoals[0]);
const followup = planEvidence.goalEvidenceRows([{ key: 'g1', title: 'Test goal' }],
  planObservations, 'v-followup', sourceOrigin)[0];
assert.equal(followup.count, 1);
assert.equal(followup.source, null);
assert.equal(planEvidence.evidenceForGoal(planObservations, 'no-such-version', 'g1').count, 0);
assert.equal(planEvidence.sourceForGoal(null, 'v-initial', 'g1'), null);

// TB-EM-033: review dates are centre-local scheduling flags ONLY.
assert.equal(review.centerLocalDay('Asia/Dubai', new Date('2026-10-25T21:30:00Z')), '2026-10-26');
assert.equal(review.centerLocalDay('Asia/Not_A_Zone', new Date('2026-10-25T21:30:00Z')), null);
assert.equal(review.nextReviewDayDelay('Asia/Not_A_Zone', new Date('2026-10-25T19:59:00Z')), null);
const midnightDelay = review.nextReviewDayDelay('Asia/Dubai', new Date('2026-10-25T19:59:00Z'));
assert(midnightDelay >= 60_000 && midnightDelay < 61_000, 'Centre midnight updates on the local boundary');
const dstSpring = review.nextReviewDayDelay('America/Los_Angeles', new Date('2026-03-08T08:00:00Z'));
const dstFall = review.nextReviewDayDelay('America/Los_Angeles', new Date('2026-11-01T07:00:00Z'));
assert(dstSpring >= 23 * 3_600_000 && dstSpring < 23 * 3_600_000 + 1000,
  'DST spring-forward date has a 23-hour local day, not a fixed 24-hour timer');
assert(dstFall >= 25 * 3_600_000 && dstFall < 25 * 3_600_000 + 1000,
  'DST fall-back date has a 25-hour local day, not a fixed 24-hour timer');

assert.equal(review.reviewTiming('2026-10-25', null), 'DATE_UNAVAILABLE');

assert.equal(review.centerLocalDay('America/Los_Angeles', new Date('2026-10-25T21:30:00Z')), '2026-10-25');
const REVIEW_TODAY = '2026-10-25';
assert.equal(review.reviewTiming('2026-10-24', REVIEW_TODAY), 'PAST_DUE');
assert.equal(review.reviewTiming('2026-10-25', REVIEW_TODAY), 'DUE_TODAY');
assert.equal(review.reviewTiming('2026-11-08', REVIEW_TODAY), 'COMING_UP');
assert.equal(review.reviewTiming('2026-11-09', REVIEW_TODAY), 'SCHEDULED_LATER');
assert.equal(review.reviewTiming('2026-02-30', REVIEW_TODAY), 'NOT_SCHEDULED');
assert.equal(review.reviewTiming(undefined, REVIEW_TODAY), 'NOT_SCHEDULED');
const reviewWs = {
  plans: [
    { id: 'p1', service: 'speech', title: 'Speech', versions: [
      { id: 'new-v', number: 2, goals: [
        { key: 'same', title: 'Current', reviewOn: '2026-10-24', horizon: 'SHORT_TERM' },
        { key: 'later', title: 'Later', reviewOn: '2026-11-09' },
      ], homeActivities: [{ templateId: 'a1', goalKey: 'same' }, { templateId: 'a2', goalKey: 'other' }] },
      { id: 'old-v', number: 1, goals: [{ key: 'same', title: 'Historical', reviewOn: '2026-10-20' }], homeActivities: [] },
    ] },
    { id: 'p2', service: 'occupational', title: 'OT', versions: [
      { id: 'ot-v', number: 1, goals: [{ key: 'a', title: 'Unscheduled' }], homeActivities: [] },
    ] },
  ],
  observations: [
    { id: 'o-new', planVersionId: 'new-v', goalKey: 'same' },
    { id: 'o-old', planVersionId: 'old-v', goalKey: 'same' },
    { id: 'o-other', planVersionId: 'new-v', goalKey: 'other' },
    { id: 'o-ot', planVersionId: 'ot-v', goalKey: 'a' },
  ],
};
const goalReviewRows = review.goalReviewRows(reviewWs, REVIEW_TODAY);
assert.deepEqual(goalReviewRows.map(r => r.goalKey), ['same', 'later', 'a']);
assert.equal(goalReviewRows[0].observationCount, 1);
assert.equal(goalReviewRows[0].linkedActivityCount, 1);
assert.equal(goalReviewRows[0].versionId, 'new-v');
assert.equal(goalReviewRows[0].timing, 'PAST_DUE');
assert.equal(goalReviewRows[2].timing, 'NOT_SCHEDULED');
assert.equal(review.goalReviewAnchor('p1', 'same'), 'goal-review-p1-same');

console.log('PASS: strict plan-version isolation, weekly/monthly bucket boundaries, source IDs, no fabricated trend, specialty-only activity shortlist, manual factual suggestions');
