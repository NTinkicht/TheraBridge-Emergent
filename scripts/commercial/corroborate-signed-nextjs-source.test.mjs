import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validate,immutableUrl,checkSourceManifest,corroborate} from './corroborate-signed-nextjs-source.mjs';
import {bundleStatements,signedSubject} from './verify-npm-sigstore-bundles.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const sri='sha512-'+Buffer.alloc(64,19).toString('base64'),sriHex=Buffer.alloc(64,19).toString('hex');
const C1='7b940d9ce96faddb9f92ff40f5e35c34ace04eb2';
const C2='5a97b408c2d8668bed1642d382fc1d78ed3731cc';
const targets=[
 ['@next/env','15.5.29',C1],
 ['@next/swc-linux-x64-gnu','15.5.29',C2],
 ['@next/swc-linux-x64-musl','15.5.29',C2]
];
const C3='ebb95f8add54eee8bed840e3fb587e4cbec857d7';
const outOfScope=[
 ['@img/sharp-libvips-linux-x64','1.3.4',C3,'https://github.com/lovell/sharp-libvips','refs/tags/v1.3.4'],
 ['@img/sharp-libvips-linuxmusl-x64','1.3.4',C3,'https://github.com/lovell/sharp-libvips','refs/tags/v1.3.4']
];
const source='https://github.com/vercel/next.js';
const PUBLISH='https://github.com/npm/attestation/tree/main/specs/publish/v0.1';
const SLSA='https://slsa.dev/provenance/v1';
function identity([name,version,commit,repo=source,ref='refs/tags/v15.5.29']){
 const subject=[{name:signedSubject(name,version),digest:{sha512:sriHex}}];
 const pub={_type:'https://in-toto.io/Statement/v0.1',predicateType:PUBLISH,subject,
  predicate:{name,version,registry:'https://registry.npmjs.org'}};
 const slsa={_type:'https://in-toto.io/Statement/v1',predicateType:SLSA,subject,
  predicate:{buildDefinition:{externalParameters:{workflow:{repository:repo}},
   resolvedDependencies:[{uri:'git+'+repo+'@'+ref,digest:{gitCommit:commit}}]}}};
 const wrap=x=>({predicateType:x.predicateType,bundle:{dsseEnvelope:{
  payload:Buffer.from(JSON.stringify(x)).toString('base64'),signatures:[{sig:'fictional-test-only'}]}}});
 return {name,version,attestationBundles:[wrap(pub),wrap(slsa)]};
}
function fixture(){
 const signed=[...targets,...outOfScope];
 const records=signed.map(([name,version])=>({
  name,version,lockedIntegrity:sri,candidateDistIntegrity:sri,
  candidateRegistryAttestationStatus:'UNVERIFIED_REGISTRY_ATTESTATION_POINTER',
  candidateRegistryAttestationUrl:'https://registry.npmjs.org/-/npm/v1/attestations/'+encodeURIComponent(name)+'@'+version,
  manifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
  manifestMatchesLockedIntegrity:true,publisherProvenanceIndependentlyVerified:false,
  commercialApproval:false,legalReviewStatus:'UNRESOLVED',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'
 }));
 for(let i=0;i<42;i++)records.push({
  name:'other'+i,version:'1.0.0',lockedIntegrity:sri,
  candidateRegistryAttestationStatus:'NOT_ADVERTISED',
  publisherProvenanceIndependentlyVerified:false,commercialApproval:false,
  legalReviewStatus:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
 const candidates={schema:'therabridge-com02-upstream-authority-candidates-v1',
  counts:{exceptions:47,registryAttestationPointersAdvertised:5,
   legallyApproved:0,independentlyVerifiedPublisherProvenance:0},
  records,finalNoticesIssued:false,commercialLicenseGranted:false};
 const verifiedRows=signed.map(row=>{
  const [name,version]=row;
  const entry=identity(row);
  return {name,version,signatureEvidenceStatus:'PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST',
   exactRegistryLockMatch:true,matchingSubjectStatements:2,verifiedBundleCount:2,
   independentlyVerifiedPublisherSourceCorrespondence:false,commercialApproval:false,
   signedStatements:bundleStatements(entry,{name,version,lockedIntegrity:sri}).signedStatements};
 });
 const raw=Buffer.from(JSON.stringify({verified:signed.map(x=>identity(x)),invalid:[],missing:[]}));
 const verified={schema:'therabridge-com02-verified-npm-sigstore-candidates-v1',
  trustedVerifier:{name:'npm',version:'11.19.1',exitCode:0,resultHashSha256:sha(raw)},
  inputManifestSha256:sha(Buffer.from(JSON.stringify(candidates))),
  counts:{unresolvedExactVersionPackages:47,attestationCandidates:5,
   verifiedSignedSubjectsAndDigests:5,independentlyCorroboratedPublisherToSource:0,legallyApproved:0},
  records:verifiedRows,finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
 return {candidates,verified,raw};
}
test('cross-check complete 47-version queue, exact 3 Next.js signed sources and 2 accounted out-of-scope signatures',()=>{
 const f=fixture();
 const rows=validate(f.candidates,f.verified,f.raw);
 assert.equal(rows.length,3);
 assert.equal(rows[0].name,'@next/env');
 assert.equal(rows[0].signedRevision,C1);
 assert.deepEqual(rows.slice(1).map(x=>x.signedRevision),[C2,C2]);
});
test('independently hash exact immutable source manifests without claiming native binary reproduction',async()=>{
 const f=fixture(),visited=[];
 const out=await corroborate(f.candidates,f.verified,f.raw,{fetcher:async url=>{
  visited.push(url);
  if(url.includes('/packages/next-env/'))return Buffer.from('{"name":"@next/env","version":"15.5.29"}');
  if(url.includes('/packages/next-swc/'))return Buffer.from('{"name":"@next/swc","version":"15.5.29"}');
  throw Error('UNEXPECTED_URL');
 }});
 assert.equal(out.counts.allOriginalUnresolvedVersions,47);
 assert.equal(out.counts.sigstoreSignedPackages,3);
 assert.equal(out.counts.outOfScopeSigstoreSignedPackages,2);
 assert.equal(out.counts.sourceManifestMatches,3);
 assert.equal(out.counts.exactPackageSourceManifestMatches,1);
 assert.equal(out.counts.nativeBinaryParentSourceMatches,2);
 assert.equal(out.counts.remainingWithoutAdvertisedSigstore,42);
 assert.equal(out.records.some(x=>x.name.startsWith('@img/')),false);
 assert.equal(out.counts.independentlyReproducedPublishedNpmTarballs,0);
 assert.equal(out.counts.legallyApproved,0);
 assert.equal(out.records.every(x=>x.commercialApproval===false&&
  x.exactNpmTarballReproducedFromSource===false),true);
 assert.equal(out.commercialLicenseGranted,false);
 assert.equal(out.g2ClinicalApproved,false);
 assert.equal(out.g2bClinicalApproved,false);
 assert.equal(visited.length,3);
 assert(visited.every(x=>x.startsWith('https://raw.githubusercontent.com/vercel/next.js/')));
});
test('source manifest missing, wrong version or upstream outage never promotes correspondence',async()=>{
 const f=fixture();
 const out=await corroborate(f.candidates,f.verified,f.raw,{fetcher:async url=>{
  if(url.includes('/packages/next-env/'))return Buffer.from('{"name":"@next/env","version":"15.5.28"}');
  throw Error('UPSTREAM_TIMEOUT');
 }});
 assert.equal(out.counts.sourceManifestMatches,0);
 assert.equal(out.records.find(x=>x.name==='@next/env').sourceManifestStatus,'SOURCE_VERSION_IDENTITY_MISMATCH');
 assert.equal(out.records.filter(x=>x.sourceManifestStatus==='UPSTREAM_TIMEOUT').length,2);
 assert.equal(out.counts.legallyApproved,0);
});
test('reject forged Sigstore receipt, modified raw bundles, missing original packages, changed signed commit',()=>{
 for(const change of [
  f=>{f.verified.trustedVerifier.resultHashSha256='f'.repeat(64);},
  f=>{f.verified.trustedVerifier.exitCode=1;},
  f=>{f.verified.counts.verifiedSignedSubjectsAndDigests=0;},
  f=>{f.verified.counts.legallyApproved=1;},
  f=>{f.verified.records[0].commercialApproval=true;},
  f=>{f.verified.records[0].signedStatements[1].sourceRevisionClaims[0].revisionClaim='a'.repeat(40);},
  f=>{f.candidates.records.pop();},
  f=>{f.candidates.records[1].name='@next/unknown';},
  f=>{f.verified.records.push({...f.verified.records[0]});},
  f=>{f.raw=Buffer.from('{"verified":[],"invalid":[],"missing":[]}');},
  // An out-of-scope signed package must stay accounted for and verified.
  f=>{f.candidates.records.splice(3,1);f.candidates.counts.exceptions=46;},
  f=>{f.candidates.records[3].name='@img/sharp-libvips-darwin-arm64';},
  f=>{f.verified.records[3].signatureEvidenceStatus='UNVERIFIED_OR_NOT_EXPORTED';},
  f=>{f.verified.records[4].commercialApproval=true;},
  // A previously pinned Next.js version or source ref is no longer trusted.
  f=>{f.candidates.records[0].version='14.2.35';}
 ]){
  const f=fixture();change(f);
  assert.throws(()=>validate(f.candidates,f.verified,f.raw));
 }
});
test('reject arbitrary upstream domains, path traversal, wrong exact package manifests',()=>{
 for(const path of ['../package.json','packages/other/package.json','packages/next-env/../../etc']){
  assert.throws(()=>immutableUrl(C1,path),/UNTRUSTED_SOURCE_PATH/);
 }
 assert.throws(()=>immutableUrl('z'.repeat(40),'packages/next-env/package.json'));
 assert.throws(()=>checkSourceManifest(Buffer.from('{"name":"@next/env","version":"14.2.34"}'),
   {version:'15.5.29',sourceSpec:{sourceName:'@next/env'}}),/SOURCE_VERSION_IDENTITY_MISMATCH/);
 assert.throws(()=>checkSourceManifest(Buffer.from('{INVALID'),
   {version:'15.5.29',sourceSpec:{sourceName:'@next/env'}}));
});
