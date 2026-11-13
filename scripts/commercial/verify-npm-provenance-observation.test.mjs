import {test} from 'node:test';
import assert from 'node:assert/strict';
import {select,summarise} from './verify-npm-provenance-observation.mjs';
const url='https://registry.npmjs.org/-/npm/v1/attestations/@next%2fenv@14.2.35';
function fixture(){
 const make=(name,version,advertised)=>({
  name,version,lockedIntegrity:'sha512-aBcD',
  candidateDistIntegrity:'sha512-aBcD',
  candidateRegistryAttestationUrl:advertised?url:null,
  candidateRegistryAttestationStatus:advertised?
   'UNVERIFIED_REGISTRY_ATTESTATION_POINTER':'NOT_ADVERTISED',
  publisherProvenanceIndependentlyVerified:false,
  manifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
  manifestMatchesLockedIntegrity:true,
  commercialApproval:false,legalReviewStatus:'UNRESOLVED',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'
 });
 const records=[make('@next/env','14.2.35',true),make('other','1.0.0',false)];
 return {schema:'therabridge-com02-upstream-authority-candidates-v1',
  counts:{exceptions:2,registryAttestationPointersAdvertised:1,
   independentlyVerifiedPublisherProvenance:0,legallyApproved:0},
  records,finalNoticesIssued:false,commercialLicenseGranted:false};
}
test('selects exactly advertised verified-integrity exact version candidates, not 50 unadvertised',()=>{
 const x=select(fixture());
 assert.equal(x.length,1);
 assert.deepEqual(x[0],{name:'@next/env',version:'14.2.35',
  lockedIntegrity:'sha512-aBcD',advertisedAttestationUrl:url});
});
test('even successful official npm audit remains subject/source and legal review',()=>{
 const input=fixture(),record=select(input)[0];
 const lock={packages:{'node_modules/@next/env':{
  version:record.version,integrity:record.lockedIntegrity,
  resolved:'https://registry.npmjs.org/@next/env/-/env-14.2.35.tgz'}}};
 const auditBytes=Buffer.from(JSON.stringify({verified:[{name:'@next/env'}],attestations:1}));
 const x=summarise(input,[record],lock,auditBytes,0);
 assert.equal(x.counts.exactRegistryLockMatches,1);
 assert.equal(x.counts.independentlyVerifiedPublisherSourceLinks,0);
 assert.equal(x.records[0].auditStatus,'NPM_AUDIT_SIGNATURES_SUCCEEDED_BUT_SUBJECT_REVIEW_REQUIRED');
 assert.equal(x.records[0].publisherProvenanceIndependentlyVerified,false);
 assert.equal(x.commercialApproval,false);
 assert.equal(x.g2ClinicalApproved,false);
 assert.equal(x.g2bClinicalApproved,false);
});
test('failed npm verification or mismatched lock SRI cannot become publisher proof',()=>{
 const input=fixture(),record=select(input)[0];
 for(const exitCode of [0,1,255]){
  const x=summarise(input,[record],{packages:{'node_modules/@next/env':{
   version:record.version,integrity:'sha512-CHANGED',
   resolved:'https://registry.npmjs.org/@next/env/-/env-14.2.35.tgz'}}},
   Buffer.from('{"error":"signature invalid"}'),exitCode);
  assert.equal(x.counts.exactRegistryLockMatches,0);
  assert.equal(x.records[0].auditStatus,'NPM_AUDIT_SIGNATURES_NOT_ESTABLISHED');
  assert.equal(x.counts.legallyApproved,0);
 }
});
test('rejects forged approvals, missing exact rows, compromised origins and counterfeit attestation hints',()=>{
 for(const change of [
  x=>x.records.pop(),
  x=>x.records.push({...x.records[0]}),
  x=>{x.counts.registryAttestationPointersAdvertised=0;},
  x=>{x.counts.independentlyVerifiedPublisherProvenance=1;},
  x=>{x.records[0].publisherProvenanceIndependentlyVerified=true;},
  x=>{x.records[0].commercialApproval=true;},
  x=>{x.records[0].manifestMatchesLockedIntegrity=false;},
  x=>{x.records[0].candidateRegistryAttestationUrl='https://evil.invalid/attestation';},
  x=>{x.records[0].candidateRegistryAttestationUrl='https://registry.npmjs.org:444/-/npm/v1/attestations/pkg';},
  x=>{x.records[0].lockedIntegrity='sha512-notMatching';},
  x=>{x.finalNoticesIssued=true;}
 ]){
  const x=fixture();change(x);
  assert.throws(()=>select(x));
 }
});
test('rejects attempts to smuggle unselected or repeated version observations into audit',()=>{
 const x=fixture(),one=select(x)[0];
 for(const observed of [[one,one],[{name:'other',version:'1.0.0'}],[{name:'evil',version:'1.0.0'}]]){
  assert.throws(()=>summarise(x,observed,{packages:{}},Buffer.from('{}'),1),
   /UNEXPECTED_AUDITED_PACKAGES/);
 }
});
