import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classify,bundleStatements,signedSubject} from './verify-npm-sigstore-bundles.mjs';
const sri='sha512-'+Buffer.alloc(64,17).toString('base64');
const signedSha=Buffer.alloc(64,17).toString('hex');
const pkg='@next/env',version='14.2.35';
const source='git+https://github.com/vercel/next.js';
function input(){
 const record={name:pkg,version,lockedIntegrity:sri,
  candidateRegistryAttestationStatus:'UNVERIFIED_REGISTRY_ATTESTATION_POINTER',
  candidateRegistryAttestationUrl:'https://registry.npmjs.org/-/npm/v1/attestations/%40next%2Fenv@14.2.35',
  manifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
  manifestMatchesLockedIntegrity:true,
  candidateDistIntegrity:sri,
  publisherProvenanceIndependentlyVerified:false,commercialApproval:false,
  legalReviewStatus:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'};
 return {schema:'therabridge-com02-upstream-authority-candidates-v1',
  records:[record],counts:{exceptions:1,legallyApproved:0,independentlyVerifiedPublisherProvenance:0,
   registryAttestationPointersAdvertised:1},finalNoticesIssued:false,commercialLicenseGranted:false};
}
const lock=()=>({packages:{'node_modules/@next/env':{
 version,integrity:sri,resolved:'https://registry.npmjs.org/@next/env/-/env-14.2.35.tgz'}}});
function entry({name=pkg,versionNumber=version,sha=signedSha,
 src=source+'@refs/heads/14-2-1',commit='b'.repeat(40)}={}){
 const purl=signedSubject(name,versionNumber),subject=[{name:purl,digest:{sha512:sha}}];
 const publish={_type:'https://in-toto.io/Statement/v0.1',
  predicateType:'https://github.com/npm/attestation/tree/main/specs/publish/v0.1',
  subject,predicate:{name,version:versionNumber,registry:'https://registry.npmjs.org'}};
 const slsa={_type:'https://in-toto.io/Statement/v1',
  predicateType:'https://slsa.dev/provenance/v1',
  subject,predicate:{buildDefinition:{
   externalParameters:{workflow:{repository:source.slice(4),ref:'refs/heads/14-2-1'}},
   resolvedDependencies:[{uri:src,digest:{gitCommit:commit}}]}}};
 const bundle=x=>({predicateType:x.predicateType,
  bundle:{dsseEnvelope:{payload:Buffer.from(JSON.stringify(x)).toString('base64'),
   signatures:[{sig:'a'}]}}});
 return {name,version:versionNumber,
  attestations:{url:'https://registry.npmjs.org/-/npm/v1/attestations/%40next%2Fenv@14.2.35'},
  attestationBundles:[bundle(publish),bundle(slsa)]};
}
test('canonical npm purl keeps scoped @ symbol encoded',()=>{
 assert.equal(signedSubject('@next/env','14.2.35'),'pkg:npm/%40next/env@14.2.35');
 assert.equal(signedSubject('lib','1.0.0'),'pkg:npm/lib@1.0.0');
});
test('verified npm CLI bundles and exact signed SRI produce source-claim candidates but no rights',()=>{
 const report=classify(input(),lock(),Buffer.from(JSON.stringify({
  verified:[entry()],invalid:[],missing:[]})),0,'11.19.1');
 assert.equal(report.counts.verifiedSignedSubjectsAndDigests,1);
 assert.equal(report.counts.independentlyCorroboratedPublisherToSource,0);
 assert.equal(report.counts.legallyApproved,0);
 assert.equal(report.records[0].signatureEvidenceStatus,'PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST');
 assert.equal(report.records[0].signedStatements[0].signedPackageAndTarballMatch,true);
 assert.equal(report.records[0].signedStatements[1].sourceRevisionClaims[0].revisionClaim,'b'.repeat(40));
 assert.equal(report.records[0].independentlyVerifiedPublisherSourceCorrespondence,false);
 assert.equal(report.commercialLicenseGranted,false);
 assert.equal(report.g2ClinicalApproved,false);
 assert.equal(report.g2bClinicalApproved,false);
});
test('reject different package version and tarball digest even if bundle wrapper claims verified',()=>{
 for(const malicious of [
  entry({name:'@next/wrong'}),entry({versionNumber:'14.2.34'}),
  entry({sha:'f'.repeat(128)})
 ]){
  assert.throws(()=>bundleStatements(malicious,{name:pkg,version,lockedIntegrity:sri}));
  if(malicious.name!==pkg||malicious.version!==version){
   assert.throws(()=>classify(input(),lock(),Buffer.from(JSON.stringify({
    verified:[malicious],invalid:[],missing:[]})),0,'11.19.1'),
    /UNEXPECTED_VERIFIED_ATTESTATION/);
  }else{
   const r=classify(input(),lock(),Buffer.from(JSON.stringify({
    verified:[malicious],invalid:[],missing:[]})),0,'11.19.1');
   assert.equal(r.counts.verifiedSignedSubjectsAndDigests,0);
   assert.equal(r.counts.legallyApproved,0);
  }
 }
});
test('nonzero audit exit, missing verified export, wrong lock SRI, invalid or missing audit remains nonapproved',()=>{
 const audit=Buffer.from(JSON.stringify({verified:[entry()],invalid:[],missing:[]}));
 for(const [l,bytes,exit] of [
  [lock(),audit,1],
  [lock(),Buffer.from('{"invalid":[],"missing":[]}'),0],
  [{packages:{}},audit,0],
  [lock(),Buffer.from('invalid-json'),0],
  [lock(),Buffer.from(JSON.stringify({verified:[entry()],invalid:['bad'],missing:[]})),0]
 ]){
  const r=classify(input(),l,bytes,exit,'11.19.1');
  assert.equal(r.counts.verifiedSignedSubjectsAndDigests,0);
  assert.equal(r.counts.independentlyCorroboratedPublisherToSource,0);
 }
});
test('reject fabricated extra verified package, duplicate verified package and unpinned npm CLI',()=>{
 for(const verified of [[entry(),entry()],[entry(),entry({name:'evil'})]]){
  assert.throws(()=>classify(input(),lock(),Buffer.from(JSON.stringify({verified,invalid:[],missing:[]})),0,'11.19.1'));
 }
 assert.throws(()=>classify(input(),lock(),Buffer.from('{}'),0,'11.4.2'),/UNEXPECTED_NPM_VERIFIER_VERSION/);
});
test('signed source metadata is never elevated to corroborated reproducible upstream lineage',()=>{
 const r=classify(input(),lock(),Buffer.from(JSON.stringify({verified:[
  entry({commit:'c'.repeat(40),src:'git+https://github.com/vercel/next.js@refs/heads/14-2-1'})
 ],invalid:[],missing:[]})),0,'11.19.1');
 assert.equal(r.records[0].signedStatements[1].sourceRevisionClaims[0].revisionClaim,'c'.repeat(40));
 assert.equal(r.records[0].signedStatements[1].publicationToSourceIndependentlyCorroborated,false);
 assert.equal(r.records[0].independentlyVerifiedPublisherSourceCorrespondence,false);
});

test('reject publish-only, provenance-only or source/publish subject disagreement',()=>{
 for(const variant of [
  e=>e.attestationBundles.pop(),
  e=>e.attestationBundles.shift(),
  e=>{const st=JSON.parse(Buffer.from(e.attestationBundles[0].bundle.dsseEnvelope.payload,'base64'));
    st.subject[0].digest.sha512='f'.repeat(128);
    e.attestationBundles[0].bundle.dsseEnvelope.payload=Buffer.from(JSON.stringify(st)).toString('base64');},
  e=>{const st=JSON.parse(Buffer.from(e.attestationBundles[1].bundle.dsseEnvelope.payload,'base64'));
    st.predicate.buildDefinition.externalParameters.workflow.repository='https://github.com/evil/fork';
    e.attestationBundles[1].bundle.dsseEnvelope.payload=Buffer.from(JSON.stringify(st)).toString('base64');},
 ]){
  const bad=entry();variant(bad);
  assert.throws(()=>bundleStatements(bad,{name:pkg,version,lockedIntegrity:sri}));
 }
});
