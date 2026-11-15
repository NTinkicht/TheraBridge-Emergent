import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcile} from './reconcile-independent-root-observations.mjs';
const evidence=JSON.parse(readFileSync(new URL('../../docs/commercial/com02-independent-root-observations.json',import.meta.url),'utf8'));
const clone=x=>structuredClone(x);
function fixture(){
 const candidates=evidence.records.map(r=>({
  name:r.name,version:r.version,candidateGitHead:r.commit,
  candidateRepositoryUrl:'git+https://github.com/'+r.registryClaimedRepository+'.git',
  lockedIntegrityMatchesRegistry:true,
  registryManifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
  evidenceStatus:'REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY',
  sourcePackageSha256:r.sourceManifestSha256,
  sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
  commercialApproval:false
 }));
 for(let i=0;i<38;i++)candidates.push({
  name:'unmapped-test-'+i,version:'1.0.0',
  sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',commercialApproval:false
 });
 return {candidates:{schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
  counts:{exceptions:53,stillRequiresIndependentAttestation:53,legallyApproved:0},
  finalNoticesIssued:false,commercialLicenseGranted:false,records:candidates},
  observations:clone(evidence)};
}
test('reconciles all 15 separately inspected roots against full 53-version queue',()=>{
 const {candidates,observations}=fixture(),out=reconcile(candidates,observations);
 assert.deepEqual(out.counts,{originalVersions:53,observedSourceRoots:15,sourceManifestSha256Matches:15,
  claimedRepositoriesDirect:13,alternateRepositoriesNotLineageProven:2,
  publicationToSourceBuildCorrespondenceVerified:0,legallyApproved:0});
 assert.equal(out.commercialLicenseGranted,false);
 assert.ok(out.records.every(x=>x.npmSourceRevisionIndependentlyVerified===false));
 assert.ok(out.records.filter(x=>x.status.startsWith('ALTERNATE_')).length===2);
});
test('rejects invented repo identity, changed revision or altered immutable manifest',()=>{
 const a=fixture();a.candidates.records[0].candidateGitHead='f'.repeat(40);
 assert.throws(()=>reconcile(a.candidates,a.observations),/OBSERVATION_NOT_BOUND/);
 const b=fixture();b.candidates.records[0].sourcePackageSha256='0'.repeat(64);
 assert.throws(()=>reconcile(b.candidates,b.observations),/LIVE_IMMUTABLE/);
 const c=fixture();c.candidates.records[0].candidateRepositoryUrl='git+https://github.com/attacker/a.git';
 assert.throws(()=>reconcile(c.candidates,c.observations),/REPOSITORY_DIFFERS/);
});
test('rejects fake official repository identity for historic moved/alternate roots',()=>{
 const {candidates,observations}=fixture();
 const row=observations.records.find(x=>x.name==='tr46');
 row.observedRepository=row.registryClaimedRepository;row.observationStatus='DIRECT_CLAIMED_REPOSITORY_EXACT_COMMIT_MANIFEST_MATCH';
 assert.throws(()=>reconcile(candidates,observations),/HISTORICAL_REPOSITORY_ALIAS_UNVERIFIED/);
});
test('rejects missing, duplicated or truncated 53-package queue',()=>{
 const a=fixture();a.observations.records.pop();
 assert.throws(()=>reconcile(a.candidates,a.observations),/UNTRUSTED_OBSERVATION_ENVELOPE/);
 const b=fixture();b.candidates.records[15]=clone(b.candidates.records[0]);
 assert.throws(()=>reconcile(b.candidates,b.observations),/INVALID_OR_DUPLICATED_CANDIDATE/);
 const c=fixture();c.candidates.records.pop();
 assert.throws(()=>reconcile(c.candidates,c.observations),/INVALID_COM02_SOURCE_CORRESPONDENCE/);
});
test('forged approval flags or synthetic license permission never accepted',()=>{
 const a=fixture();a.observations.commercialLicenseGranted=true;
 assert.throws(()=>reconcile(a.candidates,a.observations),/UNTRUSTED_OBSERVATION_ENVELOPE/);
 const b=fixture();b.observations.records[0].commercialApproval=true;
 assert.throws(()=>reconcile(b.candidates,b.observations),/UNTRUSTED_SOURCE_ROOT_OBSERVATION/);
 const c=fixture();c.observations.records[0].npmTarballBuiltFromSourceIndependentlyVerified=true;
 assert.throws(()=>reconcile(c.candidates,c.observations),/UNTRUSTED_SOURCE_ROOT_OBSERVATION/);
});
test('safe transient network failure preserves existing unresolved observation',()=>{
 const {candidates,observations}=fixture();
 candidates.records[0].evidenceStatus='UPSTREAM_TIMEOUT';
 candidates.records[0].sourcePackageSha256=null;
 const report=reconcile(candidates,observations);
 assert.equal(report.counts.sourceManifestSha256Matches,14);
 assert.equal(report.records.filter(x=>x.status==='TRANSIENT_SOURCE_READ_UNAVAILABLE_REMAIN_UNVERIFIED').length,1);
 assert.equal(report.counts.legallyApproved,0);
});
test('Git blob SHA-1 is metadata not npm tarball SRI; incomplete or altered evidence fails',()=>{
 const a=fixture();a.observations.records[0].gitManifestBlobSha1='invalid';
 assert.throws(()=>reconcile(a.candidates,a.observations),/UNTRUSTED_SOURCE_ROOT_OBSERVATION/);
 const b=fixture();b.observations.records[0].manifestLicenseMetadata='PROPRIETARY_CUSTOMER_LICENSE';
 assert.throws(()=>reconcile(b.candidates,b.observations),/UNTRUSTED_SOURCE_ROOT_OBSERVATION/);
});
