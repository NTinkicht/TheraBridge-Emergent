// M4-08: source-executing exact saved statement provenance and synthetic
// release no-go gates. Records are fictional; matches never equal clinical PASS.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const draw=(Component,props)=>renderToStaticMarkup(h(Component,props));
const {ReportStatementTrace}=require('../src/components/clinical/ReportStatementTrace');
const {SyntheticReleaseActions}=require('../src/components/clinical/SyntheticReleaseActions');
const evGoal=()=>({key:'g1',planVersionId:'plan-v1',title:'Fictional goal',
  measure:'count',baseline:1,target:4,prior:null,
  points:[{date:'2026-11-10',value:2,observationId:'ob-1'}],status:'recorded'});
const version=(trace=[])=>({
 id:'r-v1',number:1,kind:'SAVED',author:'Fictional',createdAt:'2026-11-10T09:00:00Z',
 sections:{goals:'Fictional wording'},
 evidence:{period:{from:'2026-11-01',to:'2026-11-30'},assessments:[],
  plan:null,sessions:{drafts:0,completedVisits:0},goals:[evGoal()],
  checkpoints:[{ref:'goalCheckpoint:checkpoint-1',planVersionId:'plan-v1',
    goalKey:'g1',reviewedOn:'2026-11-10',fingerprint:'fake'}]},
 statementTrace:trace
});
const source=(ref,label)=>({ref,label});
const row=(status,section='goals',claims=[])=>({section,status,
 decisionId:'fictional-decision',passage:null,claims,claimValidation:'REFERENCED_NOT_VERIFIED'});
describe('M4-08 signed-off narrative must retain exact statement provenance',()=>{
 it('never attributes evidence when no clinician-applied statements exist',()=>{
  const out=draw(ReportStatementTrace,{version:version(),childId:'fictional-child'});
  expect(out).toContain('data-testid="statement-trace-empty"');
  expect(out).toContain('not establish the clinical accuracy');
  expect(out).not.toContain('data-testid="statement-trace-source"');
 });
 it('links saved exact-version records with explicit clinical non-validation notice',()=>{
  const trace=row('LINKED_TO_SAVED_TEXT','goals',[{
   index:1,text:'Fictional observation count',sources:[
    source('observation:ob-1','Observation one'),
    source('goalCheckpoint:checkpoint-1','Recorded review'),
    source('unknown:legacy','Unlinked legacy evidence')
   ]
  }]);
  const out=draw(ReportStatementTrace,{version:version([trace]),childId:'fictional-child'});
  expect(out).toContain('data-testid="statement-trace-result-count"');
  expect(out).toContain('Saved statement and source fingerprints match');
  expect(out).toContain('Fictional observation count');
  expect(out).toContain('href="/app/clinical/fictional-child#plan?version=plan-v1&amp;goal=g1"');
  expect(out).toContain('Unlinked legacy evidence');
  expect(out).toContain('References are recorded, not clinically verified');
 });
 it.each(['SECTION_EDITED','SOURCE_MISMATCH','PASSAGE_MISMATCH'])(
  'refuses to attribute source identity after %s',status=>{
   const trace=row(status,'goals',[{index:1,text:'Potentially stale claim',
    sources:[source('observation:ob-1','Private source')]}]);
   const out=draw(ReportStatementTrace,{version:version([trace]),childId:'fictional-child'});
   expect(out).toContain('No source is presented as supporting the saved wording');
   expect(out).not.toContain('href="/app/clinical/fictional-child#plan?');
   expect(out).not.toContain('Private source');
  });
});

describe('M4-08 synthetic release interface does not self-authorize real clinical release',()=>{
 const submission={fromStatus:'DRAFT',toStatus:'IN_REVIEW',snapshotId:'fake-snapshot'};
 it('is entirely absent for draft, withdrawn, or non-submitted review records',()=>{
  for(const status of ['DRAFT','WITHDRAWN','FROZEN_INTERNAL']){
   const out=draw(SyntheticReleaseActions,{centerId:'c',
    document:{status},history:[submission]});
   expect(out).toBe('');
  }
  expect(draw(SyntheticReleaseActions,{centerId:'c',document:{status:'IN_REVIEW'},
   history:[]})).toBe('');
 });
 it('shows explicit server-policy caveat only after saved submission',()=>{
  const out=draw(SyntheticReleaseActions,{centerId:'c',
   document:{status:'IN_REVIEW'},history:[submission]});
  expect(out).toContain('data-testid="synthetic-family-release-actions"');
  expect(out).toContain('Clinical production signing and release remain disabled');
  expect(out).toContain('server-controlled synthetic flags');
  expect(out).not.toContain('Release approved version');
  expect(out).not.toContain('Authorized guardian');
  expect(out).not.toContain('Revoke');
 });
});
