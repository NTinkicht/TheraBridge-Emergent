import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {repoIdentity,sourcePackageUrl,checkSourcePackage,sourceCorrespondenceCandidates} from './corroborate-source-revisions.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const commit='a'.repeat(40);
function fixture(){
 const a={name:'alpha',version:'1.2.3',candidateGitHead:commit,
  candidateRepositoryUrl:'git+https://github.com/org/repo.git',
  registryManifestSha256:'b'.repeat(64),publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
  manifestMatchesLockedIntegrity:true,legalReviewStatus:'UNRESOLVED',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',commercialApproval:false};
 const b={...a,name:'@scope/beta',version:'3.1.4',candidateGitHead:null};
 return {schema:'therabridge-com02-upstream-authority-candidates-v1',
  counts:{exceptions:2,legallyApproved:0},records:[a,b],unresolvedNonPackageAssets:91,
  otherDistributionObligations:[],finalNoticesIssued:false,commercialLicenseGranted:false};
}
test('only strict https github repository origin and full sha are accepted',()=>{
 assert.deepEqual(repoIdentity('git+https://github.com/org/repo.git'),{owner:'org',repository:'repo'});
 assert.equal(sourcePackageUrl('https://github.com/org/repo',commit),'https://raw.githubusercontent.com/org/repo/'+commit+'/package.json');
 for(const value of [
  'git@github.com:org/repo.git','ssh://github.com/org/repo','https://github.com.evil.net/org/repo',
  'https://user:pass@github.com/org/repo','https://github.com/org/repo/tree/main',
  'https://github.com/org/repo?redirect=evil','https://github.com/org/repo#main',
  'http://github.com/org/repo','https://github.com/org/%2e%2e',
  'https://github.com/org/repo.git/../../x','https://github.com/org/repo.git@evil.net'
 ])assert.throws(()=>repoIdentity(value));
 for(const bad of ['main','f'.repeat(39),'A'.repeat(40),'../'+commit])
  assert.throws(()=>sourcePackageUrl('https://github.com/org/repo',bad),/UNTRUSTED_COMMIT/);
});
test('exact root package name and version must match immutable source bytes',()=>{
 const b=Buffer.from(JSON.stringify({name:'alpha',version:'1.2.3'}));
 assert.deepEqual(checkSourcePackage(b,'alpha','1.2.3'),{sourcePackageSha256:sha(b),sourcePackageBytes:b.length});
 for(const x of [Buffer.from('bad'),Buffer.from([0xff]),Buffer.from(JSON.stringify({name:'alpha',version:'9.0.0'})),Buffer.from(JSON.stringify({name:'beta',version:'1.2.3'})),Buffer.alloc(512*1024+1)])
  assert.throws(()=>checkSourcePackage(x,'alpha','1.2.3'));
});
test('root matching evidence does not itself attest npm release provenance, text, or rights',async()=>{
 const r=fixture(),urls=[];
 const out=await sourceCorrespondenceCandidates(r,{fetcher:async url=>{
  urls.push(url);return Buffer.from(JSON.stringify({name:'alpha',version:'1.2.3'}));
 }});
 assert.deepEqual(urls,['https://raw.githubusercontent.com/org/repo/'+commit+'/package.json']);
 assert.equal(out.counts.exceptions,2);
 assert.equal(out.counts.sourceRootManifestMatches,1);
 assert.equal(out.counts.stillRequiresIndependentAttestation,2);
 assert.equal(out.counts.authoritativeLicenseTextsVerified,0);
 assert.equal(out.counts.legallyApproved,0);
 assert(out.records.every(x=>x.commercialApproval===false&&x.sourceVersionCorrespondence==='NOT_INDEPENDENTLY_ATTESTED'));
 assert.equal(out.unresolvedNonPackageAssets,91);
});
test('missing Git head, untrusted repository and wrong source version remain visible',async()=>{
 const r=fixture();r.records[0].candidateRepositoryUrl='https://github.com/evil.org/repo';
 const out=await sourceCorrespondenceCandidates(r,{fetcher:async()=>Buffer.from('{}')});
 assert.equal(out.records.find(x=>x.name==='alpha').evidenceStatus,'UNTRUSTED_REPOSITORY');
 assert.equal(out.records.find(x=>x.name==='@scope/beta').evidenceStatus,'SOURCE_REVISION_CANDIDATE_UNAVAILABLE');
 assert.equal(out.counts.sourceRootManifestMatches,0);
});
test('registry-fabricated approvals, mismatched counts, missing obligations and duplicates fail closed',async()=>{
 const mutations=[
  r=>r.records[0].commercialApproval=true,
  r=>r.records[0].legalReviewStatus='APPROVED',
  r=>r.records[0].saasNetworkRights='APPROVED',
  r=>r.counts.legallyApproved=1,
  r=>r.counts.exceptions=1,
  r=>r.records.push({...r.records[0]}),
  r=>r.commercialLicenseGranted=true,
  r=>r.otherDistributionObligations=null
 ];
 for(const mutation of mutations){
  const r=fixture();mutation(r);
  await assert.rejects(sourceCorrespondenceCandidates(r,{fetcher:async()=>Buffer.from('{}')}));
 }
});
test('bounded parallelism preserves all versions and never silently discards failures',async()=>{
 const r=fixture();r.records[1].candidateGitHead=commit;
 r.records[1].candidateRepositoryUrl='https://github.com/org/repo';
 let current=0,max=0;
 const out=await sourceCorrespondenceCandidates(r,{concurrency:1,fetcher:async url=>{
  max=Math.max(max,++current);await Promise.resolve();current--;
  if(url.includes('repo'))throw Error('UPSTREAM_HTTP_404');
  return Buffer.from('{}');
 }});
 assert.equal(max,1);assert.equal(out.records.length,2);
 assert(out.records.every(x=>x.evidenceStatus==='UPSTREAM_HTTP_404'));
});
