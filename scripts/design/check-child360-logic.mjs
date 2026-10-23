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
assert.equal(assist.draftHomeActivitySuggestions(ws,'speech',[]).length,1);
assert.equal(assist.draftHomeActivitySuggestions(ws,'speech',[{templateId:'speech1'}]).length,0);
const report={report:{id:'report1'},evidence:{
 period:{from:'2026-10-01',to:'2026-10-23'},
 assessments:[{id:'assessment1',assessedOn:'2026-10-01',summary:'Fictional assessment summary'}],
 goals:[{key:'shared',title:'Shared goal',baseline:1,target:7,measure:'count',planVersionId:'v2',points:[{date:'2026-10-05',value:2},{date:'2026-10-12',value:4}]}],
 sessions:{drafts:2,completedVisits:3},
}};
const suggestions=assist.factualReportSuggestions(report);
assert(suggestions.every(s=>s.sources.length>0));
assert(suggestions.some(s=>s.text.includes('first 2')));
assert(suggestions.every(s=>!s.text.includes('achieved')&&!s.text.includes('diagnosis')));
assert(!suggestions.some(s=>s.section==='recommendations'||s.section==='summary'));
console.log('PASS: strict plan-version isolation, weekly/monthly bucket boundaries, source IDs, no fabricated trend, specialty-only activity shortlist, manual factual suggestions');
