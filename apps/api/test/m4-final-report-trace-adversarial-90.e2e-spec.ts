// M4-08 ≥90% source-executed immutable report trace, including adversarial
// provenance tampering. No clinical semantics or authorization asserted.
import {traceSavedStatements,TraceDecision} from '../src/clinical/report-statement-trace';
import {suggestionSources} from '../src/clinical/report-source-catalog';
import {orderedJsonFingerprint as hash} from '../src/common/fingerprints';
import type {Evidence} from '../src/clinical/reports.service';
const reportId='fictional-report';
const e=()=>({
 period:{from:'2026-11-01',to:'2026-11-11'},
 assessments:[{id:'assessment-a',assessedOn:'2026-11-10',summary:'Synthetic recorded context'}],
 sessions:{drafts:2,completedVisits:1},
 goals:[{key:'goal-a',planVersionId:'plan-v1',title:'Fictional goal',
  baseline:1,target:8,measure:'count',prior:null,
  points:[{date:'2026-11-10',value:3,observationId:'observation-a',note:'Synthetic measured entry'}]}],
 checkpoints:[]
}) as unknown as Evidence;
type Section='assessment'|'goals'|'sessions';
const fixture=(section:Section,passage='Fictional recorded observation',count=1)=>{
 const source=suggestionSources(e(),reportId,section)[0];
 const claims=Array.from({length:count},(_,i)=>'Fictional recorded observation'+(i?' '+i:''));
 const text=claims.join('\n\n');
 const marker='Evidence references (internal draft; '+section+'):';
 const sectionText=text+'\n\n'+marker+'\n- Claim 1: '+source.ref;
 const decision:TraceDecision={id:'decision-a',section,action:'APPLIED',
  sectionHash:hash(sectionText),passageHash:hash(text),
  sourceManifest:[{ref:source.ref,fingerprint:source.fingerprint}],
  claimMap:claims.map((c,i)=>({index:i,textHash:hash(c),sourceRefs:[source.ref]}))};
 return {sections:{[section]:sectionText},decision,source};
};
const trace=(section:Section,mutate:(x:ReturnType<typeof fixture>)=>void=()=>{})=>{
 const x=fixture(section);mutate(x);return traceSavedStatements(x.sections,e(),[x.decision],reportId);
};
describe('M4-08 immutable source-linked report trace cannot invent source support',()=>{
 it('no decision produces no fabricated claim mapping',()=>{
  expect(traceSavedStatements({assessment:'Unrelated fictional narrative'},e(),[],reportId)).toEqual([]);
 });
 it('only APPLIED decision yields a trace; omitted comments are not evidence',()=>{
  const x=fixture('sessions');x.decision.action='OMITTED';
  expect(traceSavedStatements(x.sections,e(),[x.decision],reportId)).toEqual([]);
 });
 it.each(['assessment','goals','sessions'] as Section[])('%s exact saved source can be linked with hash validation',section=>{
  const r=trace(section);
  expect(r).toHaveLength(1);
  expect(r[0]).toMatchObject({section,status:'LINKED_TO_SAVED_TEXT',
   decisionId:'decision-a',claimValidation:'REFERENCED_NOT_VERIFIED'});
  expect(r[0].claims).toHaveLength(1);
  expect(r[0].claims[0].sources).toHaveLength(1);
 });
 it('a modified clinician section removes all source support without guessing a passage',()=>{
  const r=trace('assessment',x=>{x.sections.assessment+=' changed';});
  expect(r[0].status).toBe('SECTION_EDITED');
  expect(r[0].claims).toEqual([]);
 });
 it('missing section text is distinct from a valid source-linked passage',()=>{
  const x=fixture('assessment');
  const r=traceSavedStatements({},e(),[x.decision],reportId);
  expect(r[0].status).toBe('SECTION_EDITED');
 });
 it('missing or malformed passage hash cannot claim that evidence was linked',()=>{
  for(const bad of [null,'bad','0'.repeat(63)]) {
   const r=trace('assessment',x=>{x.decision.passageHash=bad as any});
   expect(r[0].status).toBe('PASSAGE_MISMATCH');
  }
 });
 it('a valid-looking but incorrect passage hash is not sufficient for attribution',()=>{
  const r=trace('assessment',x=>{x.decision.passageHash=hash('different text')});
  expect(r[0].status).toBe('PASSAGE_MISMATCH');
 });
 it('malformed references header is not silently accepted as a valid saved marker',()=>{
  const x=fixture('goals');
  x.sections.goals=x.sections.goals.replace('Evidence references (internal draft; goals):','Fictional unsupported notes:');
  x.decision.sectionHash=hash(x.sections.goals);
  const r=traceSavedStatements(x.sections,e(),[x.decision],reportId);
  expect(r[0].status).toBe('PASSAGE_MISMATCH');
 });
 it('legacy evidence reference header preserves legacy attribution only with exact signed hash',()=>{
  const x=fixture('assessment');
  x.sections.assessment=x.sections.assessment.replace(
   'Evidence references (internal draft; assessment):','Evidence references (internal draft):'
  );
  x.decision.sectionHash=hash(x.sections.assessment);
  const r=traceSavedStatements(x.sections,e(),[x.decision],reportId);
  expect(r[0].status).toBe('LINKED_TO_SAVED_TEXT');
 });
 it('saved source arrays must be well-formed, nonempty and immutable',()=>{
  for(const bad of [null,{},[],[null]]) {
   const r=trace('assessment',x=>{x.decision.sourceManifest=bad as any});
   expect(r[0].status).toBe('SOURCE_MISMATCH');
  }
 });
 it('saved claim map must be an actual array with complete claims',()=>{
  for(const bad of [null,{},[]]) {
   const r=trace('assessment',x=>{x.decision.claimMap=bad as any});
   expect(r[0].status).toBe('SOURCE_MISMATCH');
  }
 });
 it('invalid source-manifest ref or fingerprint cannot authenticate a saved claim',()=>{
  for(const bad of [{ref:null,fingerprint:'f'}, {ref:'r',fingerprint:4},
   {ref:'r',fingerprint:'wrong'}]) {
   const r=trace('assessment',x=>{x.decision.sourceManifest=[bad]});
   expect(r[0].status).toBe('SOURCE_MISMATCH');
  }
 });
 it('reordered claim indices cannot fake sequential authenticated attribution',()=>{
  const r=trace('assessment',x=>{x.decision.claimMap=[{index:8,
   textHash:hash('Fictional recorded observation'),sourceRefs:[x.source.ref]}]});
  expect(r[0].status).toBe('SOURCE_MISMATCH');
 });
 it('invalid text fingerprint is detected before inspecting fake source references',()=>{
  const r=trace('assessment',x=>{x.decision.claimMap=[{index:0,textHash:'bad',sourceRefs:[x.source.ref]}]});
  expect(r[0].status).toBe('PASSAGE_MISMATCH');
 });
 it('changed clinician paragraph after exact source hash is rejected',()=>{
  const r=trace('assessment',x=>{x.decision.claimMap=[{index:0,
   textHash:hash('Different fictional statement'),sourceRefs:[x.source.ref]}]});
  expect(r[0].status).toBe('PASSAGE_MISMATCH');
 });
 it('empty, oversized or nonstring source reference lists do not receive source labels',()=>{
  for(const bad of [[],Array(21).fill('a'),[123],null]) {
   const r=trace('assessment',x=>{x.decision.claimMap=[{index:0,
    textHash:hash('Fictional recorded observation'),sourceRefs:bad}]});
   expect(r[0].status).toBe('SOURCE_MISMATCH');
  }
 });
 it('an unknown source ref cannot borrow the manifest of an authorized assessment',()=>{
  const r=trace('assessment',x=>{x.decision.claimMap=[{index:0,
   textHash:hash('Fictional recorded observation'),sourceRefs:['assessment:foreign']}]});
  expect(r[0].status).toBe('SOURCE_MISMATCH');
 });
 it('modified source fingerprint cannot authenticate a historical assessment',()=>{
  const r=trace('assessment',x=>{x.decision.sourceManifest=[{
   ref:x.source.ref,fingerprint:hash('tampered')
  }]});
  expect(r[0].status).toBe('SOURCE_MISMATCH');
 });
 it('multiple cryptographic claims require ordered exact paragraph boundaries',()=>{
  const x=fixture('assessment','',2);
  // Fixture references are irrelevant to the source-map for paragraph extraction.
  x.decision.sectionHash=hash(x.sections.assessment);
  const r=traceSavedStatements(x.sections,e(),[x.decision],reportId);
  expect(r[0].status).toBe('LINKED_TO_SAVED_TEXT');
  expect(r[0].claims).toHaveLength(2);
 });
 it('claim text not split on a single newline or fake separator',()=>{
  const x=fixture('assessment','',2);
  x.sections.assessment=x.sections.assessment.replace('observation\n\nFictional','observation\nFictional');
  x.decision.sectionHash=hash(x.sections.assessment);
  x.decision.passageHash=hash('Fictional recorded observation\nFictional recorded observation 1');
  const r=traceSavedStatements(x.sections,e(),[x.decision],reportId);
  expect(r[0].status).toBe('PASSAGE_MISMATCH');
 });
 it('a later matching source decision is preferred over stale unmatching preceding audit event',()=>{
  const x=fixture('sessions');const old={...x.decision,id:'old',sectionHash:hash('old text')};
  const r=traceSavedStatements(x.sections,e(),[old,x.decision],reportId);
  expect(r[0]).toMatchObject({status:'LINKED_TO_SAVED_TEXT',decisionId:'decision-a'});
 });
});
