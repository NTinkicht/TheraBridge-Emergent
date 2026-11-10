import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {manifestUrl,parseManifest,buildUpstreamCandidates} from './collect-upstream-license-candidates.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function register(){
 const a={name:'alpha',version:'1.0.0',dependencyScope:'DIRECT_DECLARED',
  publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
  lockedIntegrity:'sha512-AAAA',pinnedSourceUrl:'https://registry.npmjs.org/alpha/-/alpha-1.0.0.tgz',
  commercialApproval:false,decision:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'};
 const b={...a,name:'@scope/beta',version:'2.0.0',dependencyScope:'INSTALLED_NON_DIRECT',
  publisherEvidenceStatus:'UNRESOLVED_UNSUPPORTED_PAX_SEMANTICS'};
 return {schema:'therabridge-com02-exact-version-rights-queue-v1',
  counts:{legallyApproved:0,exceptions:2,nonPackageAssets:1},exceptions:[a,b],
  nonPackage:[{path:'logo.png',commercialApproval:false}],
  supplementalReview:[{category:'OS_RUNTIME_CONTAINER',status:'UNRESOLVED'}],
  finalNoticesIssued:false,commercialLicenseGranted:false};
}
test('encodes complete scoped name, rejects traversal and mutable version selectors',()=>{
 assert.equal(manifestUrl('@scope/beta','2.0.0'),'https://registry.npmjs.org/%40scope%2Fbeta/2.0.0');
 for(const [n,v] of [['../alpha','1.0.0'],['alpha','latest'],['alpha','1.0.0/../../foo'],['alpha','1.0.0?x=1'],['http://evil','1.0.0']])
  assert.throws(()=>manifestUrl(n,v),/INVALID_EXACT_NPM_NAME_VERSION/);
});
test('registry manifest candidate is version-locked, hashed and never called a verified license text',async()=>{
 const r=register(),seen=[];
 const fetcher=async url=>{
  seen.push(url);
  const name=url.includes('%40scope')?'@scope/beta':'alpha', version=name==='alpha'?'1.0.0':'2.0.0';
  return Buffer.from(JSON.stringify({name,version,license:'MIT',
   repository:{type:'git',url:'git+https://github.com/example/alpha.git'},
   dist:{integrity:'sha512-AAAA',tarball:'https://registry.npmjs.org/alpha/-/alpha-1.0.0.tgz'}}));
 };
 const out=await buildUpstreamCandidates(r,{fetcher,concurrency:2});
 assert.equal(out.counts.exceptions,2);assert.equal(out.counts.exactVersionMetadata,2);
 assert.equal(out.counts.authoritativeLicenseTextsVerified,0);assert.equal(out.counts.legallyApproved,0);
 assert.equal(out.records[0].candidateLicenseExpression,'MIT');
 assert.equal(out.records[0].manifestMatchesLockedIntegrity,true);
 assert.equal(out.records[0].authoritativeLicenseTextSource,null);
 assert.equal(out.records[0].sourceRefVersionVerified,false);
 assert.equal(out.records[0].saasNetworkRights,'PENDING_COUNSEL_REVIEW');
 assert.equal(out.records[0].registryManifestSha256,hash(await fetcher(seen[0])));
 assert.equal(out.unresolvedNonPackageAssets,1);
 assert.equal(out.finalNoticesIssued,false);
});
test('mixed unavailable and wrong-version registry responses never lose a version or imply license approval',async()=>{
 const r=register(),out=await buildUpstreamCandidates(r,{fetcher:async url=>{
  if(url.includes('%40scope'))throw Error('REGISTRY_HTTP_404');
  return Buffer.from(JSON.stringify({name:'alpha',version:'9.9.9',license:'MIT'}));
 }});
 assert.equal(out.records.length,2);assert.equal(out.counts.exactVersionMetadata,0);
 assert.deepEqual(out.records.map(x=>x.manifestEvidenceStatus).sort(),['REGISTRY_HTTP_404','REGISTRY_VERSION_IDENTITY_MISMATCH']);
 assert(out.records.every(x=>x.commercialApproval===false&&x.authoritativeLicenseTextSha256===null));
});
test('response bytes are bounded and corrupt metadata never becomes authority',()=>{
 const invalid=[Buffer.alloc(256*1024+1,32),Buffer.from('{'),Buffer.from(JSON.stringify({name:'alpha',version:'1.0.1',license:'MIT'}))];
 for(const bytes of invalid)assert.throws(()=>parseManifest(bytes,'alpha','1.0.0'));
});
test('fail-closed against fabricated approvals, missing rows, bad asset count and duplicates',async()=>{
 for(const mut of [
  r=>r.exceptions[0].commercialApproval=true,
  r=>r.exceptions[0].saasNetworkRights='APPROVED',
  r=>r.counts.exceptions=1,
  r=>r.exceptions.push({...r.exceptions[0]}),
  r=>r.counts.legallyApproved=1,
  r=>r.finalNoticesIssued=true,
  r=>r.counts.nonPackageAssets=10,
 ]){
  const r=register();mut(r);
  await assert.rejects(buildUpstreamCandidates(r,{fetcher:async()=>Buffer.from('{}')})); 
 }
});
test('bounded concurrency never exceeds configured workers and preserves source ordering',async()=>{
 const r=register();let live=0,peak=0;
 const out=await buildUpstreamCandidates(r,{concurrency:1,fetcher:async url=>{
  peak=Math.max(peak,++live);await Promise.resolve();live--;
  const isBeta=url.includes('%40scope');
  return Buffer.from(JSON.stringify({name:isBeta?'@scope/beta':'alpha',version:isBeta?'2.0.0':'1.0.0'}));
 }});
 assert.equal(peak,1);
 assert.deepEqual(out.records.map(x=>x.name),['@scope/beta','alpha'].sort((a,b)=>a.localeCompare(b,'en')));
 assert.equal(out.counts.exactVersionMetadata,2);
});
