import test from 'node:test';
import assert from 'node:assert/strict';
import {build,expected} from './build-definitelytyped-triage.mjs';
const tar='a'.repeat(64),registry='b'.repeat(64),sri='sha512-'+Buffer.alloc(64,4).toString('base64');
const make=()=>{
 const u=[],c=[],q=[];
 for(const x of expected){
  const idx=x.lastIndexOf('@'),name='@types/'+x.slice(0,idx),version=x.slice(idx+1);
  u.push({name,version,dependencyScope:'INSTALLED_NON_DIRECT',
   publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
   registryManifestSha256:registry,lockedIntegrity:sri,candidateDistIntegrity:sri,
   candidateRepositoryUrl:'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
   candidateGitHead:null,manifestMatchesLockedIntegrity:true,
   publisherProvenanceIndependentlyVerified:false,legalReviewStatus:'UNRESOLVED',
   commercialApproval:false,saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
  c.push({name,version,registryManifestSha256:registry,candidateGitHead:null,
   candidateRepositoryUrl:'https://github.com/DefinitelyTyped/DefinitelyTyped.git',
   lockedIntegrityMatchesRegistry:true,evidenceStatus:'SOURCE_REVISION_CANDIDATE_UNAVAILABLE',
   sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',commercialApproval:false});
  q.push({name,version,dependencyScope:'INSTALLED_NON_DIRECT',
   publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
   tarballSha256:tar,lockedIntegrity:sri,decision:'UNRESOLVED',commercialApproval:false,
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
 }
 // Verify rejection of a missing external 53-version population, too.
 for(let i=0;i<27;i++){
  const name='other-'+i,version='1.0.0';
  u.push({name,version});c.push({name,version});q.push({name,version});
 }
 return [
  {schema:'therabridge-com02-upstream-authority-candidates-v1',
   counts:{exceptions:53},records:u,commercialLicenseGranted:false,finalNoticesIssued:false},
  {schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
   counts:{exceptions:53},records:c,commercialLicenseGranted:false,finalNoticesIssued:false},
  {schema:'therabridge-com02-exact-version-rights-queue-v1',
   counts:{exceptions:53},exceptions:q,commercialLicenseGranted:false,finalNoticesIssued:false}
 ];
};
const clone=x=>structuredClone(x);
test('26 exact SRI-bound package rights rows and zero invented source lineage',()=>{
 const report=build(...make());
 assert.equal(report.counts.definitelyTypedVersions,26);
 assert.equal(report.counts.publisherToSourceAttested,0);
 assert.equal(report.records.length,26);
 assert.equal(report.commercialApproval,false);
 assert.ok(report.records.every(x=>x.immutableSourceCommit===null&&
  x.npmPublisherToSourceIndependentlyVerified===false&&
  x.enterpriseRedistributionRights==='PENDING_COUNSEL_REVIEW'));
 const names=report.records.filter(x=>x.name==='@types/node');
 assert.deepEqual(names.map(x=>x.version),['20.19.43','26.6.5']);
});
test('missing, duplicate, or version-drifted type package rejected',()=>{
 const a=make();a[0].records=a[0].records.filter(x=>x.name!=='@types/react');
 assert.throws(()=>build(...a),/EXPECTED_53|DEFINITELYTYPED/);
 const b=make();b[0].records[0].version='8.0.0';
 assert.throws(()=>build(...b),/MISSING_53_WAY_JOIN|DEFINITELYTYPED/);
 const c=make();c[0].records[1]=clone(c[0].records[0]);
 assert.throws(()=>build(...c),/DUPLICATE_UPSTREAM/);
});
test('untrusted tarball and registry integrity disagreements rejected',()=>{
 const a=make();a[2].exceptions[0].lockedIntegrity='sha512-'+Buffer.alloc(64,9).toString('base64');
 assert.throws(()=>build(...a),/INVALID_DEFINITELYTYPED/);
 const b=make();b[1].records[0].registryManifestSha256='c'.repeat(64);
 assert.throws(()=>build(...b),/INVALID_DEFINITELYTYPED/);
 const c=make();c[0].records[0].manifestMatchesLockedIntegrity=false;
 assert.throws(()=>build(...c),/INVALID_DEFINITELYTYPED/);
});
test('mutable source commit, false attestation and fabricated source authority rejected',()=>{
 const a=make();a[1].records[0].candidateGitHead='f'.repeat(40);
 assert.throws(()=>build(...a),/INVALID_DEFINITELYTYPED/);
 const b=make();b[0].records[0].publisherProvenanceIndependentlyVerified=true;
 assert.throws(()=>build(...b),/INVALID_DEFINITELYTYPED/);
 const c=make();c[0].records[0].candidateRepositoryUrl='https://evil.example/repo';
 assert.throws(()=>build(...c),/INVALID_DEFINITELYTYPED/);
});
test('commercial rights or clinical and notices claims never upgraded from source metadata',()=>{
 const a=make();a[2].exceptions[0].commercialApproval=true;
 assert.throws(()=>build(...a),/INVALID_DEFINITELYTYPED/);
 const b=make();b[0].commercialLicenseGranted=true;
 assert.throws(()=>build(...b),/UNSAFE_COM02_EVIDENCE_ENVELOPE/);
 const c=make();c[1].finalNoticesIssued=true;
 assert.throws(()=>build(...c),/UNSAFE_COM02_EVIDENCE_ENVELOPE/);
 const d=make();d[0].records[0].enterpriseRedistributionRights='APPROVED';
 assert.throws(()=>build(...d),/INVALID_DEFINITELYTYPED/);
});
test('missing/forged cross-source joining of 53 version population rejected',()=>{
 const a=make();a[1].records[30].version='0.0.1';
 assert.throws(()=>build(...a),/MISSING_53_WAY_JOIN/);
 const b=make();b[2].counts.exceptions=52;
 assert.throws(()=>build(...b),/UNSAFE_COM02_EVIDENCE_ENVELOPE/);
});
