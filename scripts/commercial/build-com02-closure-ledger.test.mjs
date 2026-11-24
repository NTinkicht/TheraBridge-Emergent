import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcile,expectedNonTypes} from './build-com02-closure-ledger.mjs';
import {expected as types} from './build-definitelytyped-triage.mjs';
const hash='a'.repeat(64),commit='b'.repeat(40);
const clone=x=>structuredClone(x);
const rightsField={saasNetworkRights:'PENDING_COUNSEL_REVIEW',
 enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
 decision:'UNRESOLVED',commercialApproval:false};
const typesIds=types.map(x=>'@types/'+x);
function splitId(value){const i=value.lastIndexOf('@');return {name:value.slice(0,i),version:value.slice(i+1)};}
function buildInputs(){
 const versionIds=[...typesIds,...expectedNonTypes];
 const rootNames=new Set(['@tokenizer/token','abstract-logging','cssesc','dlv',
  'emoji-regex','jsesc','postcss-selector-parser','type-fest','unicode-emoji-modifier-base']);
 const group=key=>{
  const n=splitId(key).name;
  if(n.startsWith('@types/'))return 'DT';
  // Subpath-published signed libvips binaries: repository root has no manifest.
  if(n.startsWith('@img/sharp-libvips-'))return 'MONO';
  // Monorepo subpath package whose root manifest has a different identity.
  if(n==='@pkgr/core')return 'MONO_ID';
  if(['eastasianwidth','exit-x','natural-compare'].includes(n))return 'LEGACY';
  if(rootNames.has(n))return 'ROOT';
  return 'MISSING';
 };
 const exceptions=versionIds.map((key,i)=>({
  ...splitId(key),tarballSha256:hash,dependencyScope:'INSTALLED_NON_DIRECT',...rightsField
 }));
 const correspondence=versionIds.map((key,i)=>{
  const g=group(key);return {...splitId(key),
   candidateGitHead:g==='ROOT'||g==='MONO'||g==='MONO_ID'?commit:null,
   sourcePackageSha256:g==='ROOT'?hash:null,
   evidenceStatus:g==='DT'||g==='MISSING'?'SOURCE_REVISION_CANDIDATE_UNAVAILABLE':
    g==='ROOT'?'REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY':
    g==='MONO'?'UPSTREAM_HTTP_404':g==='MONO_ID'?'SOURCE_PACKAGE_IDENTITY_MISMATCH':'UNTRUSTED_REPOSITORY',
   sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
   commercialApproval:false};
 });
 const bulkPackages=versionIds.map(key=>({...splitId(key),
  publisherTarballSha256:hash,verifiedPublisherToSourceArtifact:false,
  sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
  releaseImagePresence:'NOT_VERIFIED_AGAINST_RELEASE_IMAGE',...rightsField}));
 const assets=Array.from({length:92},(_,i)=>({
  path:i===91?'Dockerfile.artwork-custody':'test/category_'+i+'.svg',sha256:hash,category:i<73?'IMAGE_OR_ICON':i<88?'BRAND':'CONTAINER_BUILD',
  ...rightsField
 }));
 const bulkAssets=assets.map(x=>({
  ...x,releaseImagePresence:'NOT_VERIFIED_AGAINST_RELEASE_IMAGE'
 }));
 const dtRecords=types.map(x=>({...splitId('@types/'+x),
   publisherTarballSha256:hash,immutableSourceCommit:null,
   githubSourceManifestCorroborated:false,
   npmPublisherToSourceIndependentlyVerified:false,
   authoritativeSourceLicenseVerified:false,
   candidateSourceRepository:'DefinitelyTyped/DefinitelyTyped',
   candidateSourceSubdirectory:'types/'+splitId(x).name,
   commercialApproval:false}));
 return [
  {schema:'therabridge-com02-exact-version-rights-queue-v1',
   counts:{exceptions:44,nonPackageAssets:92},exceptions,nonPackage:assets,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
   counts:{exceptions:44},records:correspondence,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-bulk-rights-review-v1',
   counts:{packages:44,nonPackageAssets:92,packagesStillRequiringIndependentAttestation:44,
    legallyApproved:0},packages:bulkPackages,nonPackageAssets:bulkAssets,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-definitelytyped-26-pinned-triage-v1',
   counts:{definitelyTypedVersions:21,publisherToSourceAttested:0},
   records:dtRecords,finalNoticesIssued:false,commercialApproval:false},
  {schema:'therabridge-com02-release-file-evidence-v1',commercialApproval:false,images:[]}
 ];
}
test('comprehensive exact-version, asset and two-edition zero-approval report',()=>{
 const r=reconcile(...buildInputs());
 assert.equal(r.counts.npmExceptionVersions,44);
 assert.equal(r.counts.definitelyTypedVersions,21);
 assert.equal(r.counts.otherNpmVersions,23);
 assert.equal(r.counts.SOURCE_ROOT_MANIFEST_ONLY,10);
 assert.equal(r.counts.MISSING_IMMUTABLE_SOURCE_REVISION,7);
 assert.equal(r.counts.MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED,3);
 assert.equal(r.counts.LEGACY_REPO_ORIGIN_UNTRUSTED,3);
 assert.deepEqual(r.counts.assetCategories,{IMAGE_OR_ICON:73,BRAND:15,CONTAINER_BUILD:4});
 assert.equal(r.assets.length,92);
 assert.deepEqual(r.editions.map(x=>x.edition),['SAAS','ENTERPRISE']);
 assert.ok(r.editions.every(x=>x.candidateOCIImageDigest===null&&
   x.readiness.startsWith('BLOCKED')&&!x.commercialLicenseGranted));
 assert.equal(r.commercialLicenseGranted,false);
});
test('rejects missing or substituted DefinitelyTyped versions',()=>{
 const a=buildInputs();a[3].records.pop();
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[3].records[0].version='99.99.99';
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
});
test('rejects missing source row or repeated 44-version identity',()=>{
 const a=buildInputs();a[1].records.pop();
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[0].exceptions[1].name=b[0].exceptions[0].name;
 b[0].exceptions[1].version=b[0].exceptions[0].version;
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
});
test('rejects fake historical package revision, publication or legal approval',()=>{
 const a=buildInputs();a[3].records[0].immutableSourceCommit=commit;
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[2].packages[0].verifiedPublisherToSourceArtifact=true;
 assert.throws(()=>reconcile(...b),/UNSAFE_PACKAGE_ATTESTATION/);
 const c=buildInputs();c[0].exceptions[0].decision='APPROVED';
 assert.throws(()=>reconcile(...c),/COM02_FULL_SCOPE_/);
});
test('rejects changed 23-version group or imaginary upstream Git root hash',()=>{
 const root=buildInputs()[1].records.findIndex(x=>x.name==='@tokenizer/token');
 const a=buildInputs();a[1].records[root].evidenceStatus='SOURCE_REVISION_CANDIDATE_UNAVAILABLE';
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[1].records[root].sourcePackageSha256=null;
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
});
test('only the pinned subpath-published packages may carry a root-manifest 404',()=>{
 const idx=name=>buildInputs()[1].records.findIndex(x=>x.name===name);
 const a=buildInputs();a[1].records[idx('@tokenizer/token')].evidenceStatus='UPSTREAM_HTTP_404';
 a[1].records[idx('@tokenizer/token')].sourcePackageSha256=null;
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_UNEXPECTED_OTHER_SOURCE_GROUP/);
 const b=buildInputs();b[1].records[idx('@img/sharp-libvips-linux-x64')].evidenceStatus='UPSTREAM_HTTP_500';
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_UNEXPECTED_OTHER_SOURCE_GROUP/);
 const c=buildInputs();c[1].records[idx('@img/sharp-libvips-linux-x64')].sourcePackageSha256='a'.repeat(64);
 assert.throws(()=>reconcile(...c),/COM02_FULL_SCOPE_/);
});
test('only pinned subpath packages may be monorepo-classified; unrs bindings stay missing-revision',()=>{
 const idx=name=>buildInputs()[1].records.findIndex(x=>x.name===name);
 const a=buildInputs();a[1].records[idx('@unrs/resolver-binding-linux-x64-gnu')].evidenceStatus='SOURCE_PACKAGE_IDENTITY_MISMATCH';
 a[1].records[idx('@unrs/resolver-binding-linux-x64-gnu')].candidateGitHead=commit;
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_MONOREPO_ORIGIN_CLASSIFICATION/);
 const b=buildInputs();b[1].records[idx('@pkgr/core')].evidenceStatus='UPSTREAM_HTTP_404';
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_UNEXPECTED_OTHER_SOURCE_GROUP/);
});
test('signed Next.js packages without registry gitHead stay in the missing-revision group',()=>{
 const i=buildInputs()[1].records.findIndex(x=>x.name==='@next/env');
 const a=buildInputs();a[1].records[i].candidateGitHead=commit;
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_NEXTJS_SOURCE_CLASSIFICATION/);
 const b=buildInputs();b[1].records[i].evidenceStatus='SOURCE_PACKAGE_IDENTITY_MISMATCH';
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
});
test('rejects omitted asset, forged source hash, altered category and invented rights',()=>{
 const a=buildInputs();a[0].nonPackage.pop();
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[2].nonPackageAssets[0].sha256='c'.repeat(64);
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
 const c=buildInputs();c[0].nonPackage[0].category='BRAND';
 assert.throws(()=>reconcile(...c),/COM02_FULL_SCOPE_/);
 const d=buildInputs();d[2].nonPackageAssets[0].commercialApproval=true;
 assert.throws(()=>reconcile(...d),/UNSAFE_SOURCE_ASSET/);
});
test('forged image approval or fabricated digest cannot authorize release',()=>{
 const a=buildInputs();a[4].commercialApproval=true;
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[4].images=[{edition:'SAAS',imageRef:'fake',
  ociDigest:'sha256:'+'a'.repeat(64),filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
  releaseApproval:true,files:[]}];
 assert.throws(()=>reconcile(...b),/INVALID_IMAGE_SCOPE/);
});
test('independent local candidate file bytes do not authenticate production',()=>{
 const a=buildInputs();
 a[4].images=[{edition:'ENTERPRISE',imageRef:'example/release',
  ociDigest:'sha256:'+'c'.repeat(64),filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
  releaseApproval:false,files:[]}];
 const r=reconcile(...a);
 assert.equal(r.editions[0].candidateOCIImageDigest,null);
 assert.equal(r.editions[1].candidateOCIImageDigest,'sha256:'+'c'.repeat(64));
 assert.equal(r.editions[1].signedRegistryPublicationIndependentlyVerified,false);
 assert.equal(r.editions[1].authenticatedProductionDeploymentOrCustomerDelivery,false);
 assert.equal(r.editions[1].commercialLicenseGranted,false);
});

test('custody Dockerfile cannot be omitted or replaced while maintaining the total asset count',()=>{
 const input=buildInputs();
 const row=input[0].nonPackage.find(a=>a.path==='Dockerfile.artwork-custody');
 const bulk=input[2].nonPackageAssets.find(a=>a.path===row.path);
 row.path='Dockerfile.unrelated';bulk.path=row.path;
 assert.throws(()=>reconcile(...input),/ARTWORK_CUSTODY_BUILD_INPUT_MISSING/);
});
