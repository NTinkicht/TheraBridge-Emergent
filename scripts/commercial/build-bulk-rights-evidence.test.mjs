import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildBulkEvidence,classify,classifyAsset} from './build-bulk-rights-evidence.mjs';
const digest=x=>createHash('sha256').update(x).digest('hex');
const commit='a'.repeat(40);
function fixtures(){
 const version=(name,version)=>({
  name,version,dependencyScope:'INSTALLED_NON_DIRECT',
  publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
  tarballSha256:'c'.repeat(64),lockedIntegrity:'sha512-synthetic',
  decision:'UNRESOLVED',commercialApproval:false,
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
 const corr=(name,version,evidenceStatus)=>({
  name,version,evidenceStatus,sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
  candidateGitHead:commit,candidateRepositoryUrl:'git+https://github.com/org/repo.git',
  registryManifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
  registryManifestSha256:'a'.repeat(64),lockedIntegrityMatchesRegistry:true,
  sourcePackageSha256:'b'.repeat(64),
  commercialApproval:false,saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
 const assets=[
  {path:'apps/api/Dockerfile',sha256:'a'.repeat(64),category:'CONTAINER_BUILD',
   commercialApproval:false,decision:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'},
  {path:'design/sample.png',sha256:'b'.repeat(64),category:'IMAGE_OR_ICON',
   commercialApproval:false,decision:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'}
 ];
 const register={schema:'therabridge-com02-exact-version-rights-queue-v1',
  counts:{exceptions:3,nonPackageAssets:2,legallyApproved:0},
  exceptions:[version('alpha','1.0.0'),version('@next/env','14.2.35'),version('@types/thing','1.2.3')],
  nonPackage:assets,supplementalReview:[{category:'OS_RUNTIME_CONTAINER',status:'UNRESOLVED'}],
  finalNoticesIssued:false,commercialLicenseGranted:false};
 const correspondence={schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
  counts:{exceptions:3,sourceRootManifestMatches:1,stillRequiresIndependentAttestation:3,
   authoritativeLicenseTextsVerified:0,legallyApproved:0},
  records:[corr('alpha','1.0.0','REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY'),
   corr('@next/env','14.2.35','SOURCE_PACKAGE_IDENTITY_MISMATCH'),
   corr('@types/thing','1.2.3','SOURCE_REVISION_CANDIDATE_UNAVAILABLE')],
  unresolvedNonPackageAssets:2,
  finalNoticesIssued:false,commercialLicenseGranted:false};
 const config={schema:'therabridge-com02-curated-source-license-paths-v1',
  commercialApproval:false,records:[{name:'alpha',version:'1.0.0',owner:'org',repository:'repo',
   commit,paths:['LICENSE-MIT.txt','NOTICE'],commercialApproval:false}]};
 return {register,correspondence,config};
}
test('joins every package and source asset; hashes immutable candidate bytes without declaring rights',async()=>{
 const {register,correspondence,config}=fixtures(),seen=[];
 const evidence=await buildBulkEvidence(register,correspondence,config,{fetcher:async url=>{
  seen.push(url);return Buffer.from('Synthetic notice terms for unit test only.\n');
 }});
 assert.equal(evidence.counts.packages,3);
 assert.equal(evidence.counts.nonPackageAssets,2);
 assert.equal(evidence.counts.sourceTextFilesHashed,2);
 assert.equal(evidence.counts.curatedSourceVersions,1);
 assert.equal(evidence.counts.packagesStillRequiringIndependentAttestation,3);
 assert.equal(evidence.counts.legallyApproved,0);
 assert.equal(evidence.counts.authoritativeLicenseTextsLegallyVerified,0);
 assert(evidence.packages.every(x=>!x.commercialApproval&&!x.legalSourceTextVerified&&!x.verifiedPublisherToSourceArtifact));
 assert(evidence.nonPackageAssets.every(x=>x.releaseImagePresence==='NOT_VERIFIED_AGAINST_RELEASE_IMAGE'));
 assert.equal(evidence.finalNoticesIssued,false);
 assert.equal(evidence.commercialLicenseGranted,false);
 assert(seen.every(x=>x.startsWith('https://raw.githubusercontent.com/org/repo/'+commit+'/')));
 const source=evidence.packages.find(x=>x.name==='alpha');
 assert.equal(source.textCandidateStatus,'ALL_CURATED_TEXT_CANDIDATES_HASHED_NOT_LEGALLY_AUTHORIZED');
 assert(source.sourceTextCandidates.every(x=>x.sha256===digest('Synthetic notice terms for unit test only.\n')));
});
test('classifies exact follow-up profiles without turning them into proved provenance',async()=>{
 const {register,correspondence,config}=fixtures();
 const r=await buildBulkEvidence(register,correspondence,config,{fetcher:async()=>{throw Error('UPSTREAM_HTTP_404');}});
 assert.equal(r.counts.sourceTextFilesHashed,0);
 assert.equal(r.packages.find(x=>x.name==='alpha').textCandidateStatus,'SOME_CURATED_TEXT_CANDIDATES_UNAVAILABLE');
 assert.equal(r.packages.find(x=>x.name==='@next/env').provenanceCategory,'MONOREPO_SUBPACKAGE_PATH_UNRESOLVED');
 assert.equal(r.packages.find(x=>x.name==='@types/thing').provenanceCategory,'DEFINITELYTYPED_HISTORY_NOT_ATTESTED');
 assert.equal(classify({name:'alpha',evidenceStatus:'UNTRUSTED_REPOSITORY'}),'UNSAFE_LEGACY_REPOSITORY_SCHEME_REQUIRES_REVIEW');
 assert.equal(classifyAsset({category:'BRAND'}),'BRAND_PERMISSION_AND_RELEASE_PRESENCE_NOT_VERIFIED');
});
test('adversarial false grants, missing rows, asset drift and forged license mapping fail closed',async()=>{
 for(const mut of [
  ({register})=>{register.exceptions[0].commercialApproval=true;},
  ({register})=>{register.exceptions[0].saasNetworkRights='APPROVED';},
  ({register})=>{register.counts.exceptions=4;},
  ({register})=>{register.nonPackage[0].commercialApproval=true;},
  ({register})=>{register.nonPackage.push({...register.nonPackage[0]});},
  ({register})=>{register.finalNoticesIssued=true;},
  ({correspondence})=>{correspondence.records.pop();},
  ({correspondence})=>{correspondence.records[0].sourceVersionCorrespondence='PROVED';},
  ({correspondence})=>{correspondence.counts.legallyApproved=1;},
  ({correspondence})=>{correspondence.records[0].lockedIntegrityMatchesRegistry=false;},
  ({config})=>{config.records[0].commit='f'.repeat(40);},
  ({config})=>{config.records[0].owner='other';},
  ({config})=>{config.records[0].paths=['../LICENSE'];},
  ({config})=>{config.records[0].paths=['NOTICE','NOTICE'];},
  ({config})=>{config.records.push({...config.records[0]});},
  ({config})=>{config.commercialApproval=true;}
 ]){
  const f=fixtures();mut(f);
  await assert.rejects(buildBulkEvidence(f.register,f.correspondence,f.config,{fetcher:async()=>Buffer.from('abc')}));
 }
});
test('upstream timeout or transient HTTP failure does not erase unresolved package evidence',async()=>{
 for(const status of ['UPSTREAM_TIMEOUT','UPSTREAM_HTTP_503','SOURCE_FETCH_FAILED']){
  const {register,correspondence,config}=fixtures();
  correspondence.records[0].evidenceStatus=status;
  let requests=0;
  const out=await buildBulkEvidence(register,correspondence,config,{fetcher:async()=>{
   requests++;throw Error('source should not be fetched after failed corroboration');
  }});
  assert.equal(requests,0);
  assert.equal(out.packages.length,3);
  const row=out.packages.find(x=>x.name==='alpha');
  assert.equal(row.textCandidateStatus,'PRIOR_SOURCE_CORROBORATION_UNAVAILABLE_NO_LICENSE_FETCH');
  assert.equal(row.sourceTextCandidates.length,0);
  assert.equal(out.counts.curatedSourceVersions,1);
  assert.equal(out.counts.packagesStillRequiringIndependentAttestation,3);
  assert.equal(out.counts.legallyApproved,0);
 }
});
test('contradictory version source identity still rejects curated mapping',async()=>{
 const {register,correspondence,config}=fixtures();
 correspondence.records[0].evidenceStatus='SOURCE_PACKAGE_IDENTITY_MISMATCH';
 await assert.rejects(buildBulkEvidence(register,correspondence,config,{fetcher:async()=>Buffer.from('text')}),/CURATED_SOURCE_CORRESPONDENCE_CONTRADICTED/);
});
test('zero curated source files still preserves entire review queue',async()=>{
 const {register,correspondence,config}=fixtures();config.records=[];
 let n=0;
 const r=await buildBulkEvidence(register,correspondence,config,{fetcher:async()=>{n++;throw Error('unexpected');}});
 assert.equal(n,0);assert.equal(r.counts.curatedSourceFiles,0);
 assert.equal(r.packages.length,3);assert.equal(r.nonPackageAssets.length,2);
});
test('unsafe raw file bytes never become hashed or authorized license text',async()=>{
 const {register,correspondence,config}=fixtures();
 const r=await buildBulkEvidence(register,correspondence,config,{fetcher:async()=>Buffer.from([0xff])});
 assert(r.packages.find(x=>x.name==='alpha').sourceTextCandidates.every(x=>x.status==='INVALID_UTF8_LICENSE_TEXT'&&x.sha256===null));
 assert.equal(r.counts.legallyApproved,0);
});
test('concurrency limit bounds network evidence checks and does not lose candidates',async()=>{
 const {register,correspondence,config}=fixtures();let live=0,peak=0;
 const r=await buildBulkEvidence(register,correspondence,config,{concurrency:1,fetcher:async()=>{
  peak=Math.max(peak,++live);await Promise.resolve();live--;
  return Buffer.from('license text');
 }});
 assert.equal(peak,1);assert.equal(r.counts.curatedSourceFiles,2);
});
