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
 const rootNames=new Set(['@tokenizer/token','abstract-logging','consola','cssesc','dlv',
  'emoji-regex','esrecurse','glob-to-regexp','jsesc','postcss-selector-parser',
  'punycode','tmp','tr46','type-fest']);
 const group=key=>{
  const n=splitId(key).name;
  if(n.startsWith('@types/'))return 'DT';
  if(n.startsWith('@next/'))return 'MONO';
  if(['eastasianwidth','natural-compare'].includes(n))return 'LEGACY';
  if(rootNames.has(n))return 'ROOT';
  return 'MISSING';
 };
 const exceptions=versionIds.map((key,i)=>({
  ...splitId(key),tarballSha256:hash,dependencyScope:'INSTALLED_NON_DIRECT',...rightsField
 }));
 const correspondence=versionIds.map((key,i)=>{
  const g=group(key);return {...splitId(key),
   candidateGitHead:g==='ROOT'||g==='MONO'?commit:null,
   sourcePackageSha256:g==='ROOT'?hash:null,
   evidenceStatus:g==='DT'||g==='MISSING'?'SOURCE_REVISION_CANDIDATE_UNAVAILABLE':
    g==='ROOT'?'REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY':
    g==='MONO'?'SOURCE_PACKAGE_IDENTITY_MISMATCH':'UNTRUSTED_REPOSITORY',
   sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
   commercialApproval:false};
 });
 const bulkPackages=versionIds.map(key=>({...splitId(key),
  publisherTarballSha256:hash,verifiedPublisherToSourceArtifact:false,
  sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
  releaseImagePresence:'NOT_VERIFIED_AGAINST_RELEASE_IMAGE',...rightsField}));
 const assets=Array.from({length:91},(_,i)=>({
  path:'test/category_'+i+'.svg',sha256:hash,category:i<73?'IMAGE_OR_ICON':i<88?'BRAND':'CONTAINER_BUILD',
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
   counts:{exceptions:53,nonPackageAssets:91},exceptions,nonPackage:assets,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
   counts:{exceptions:53},records:correspondence,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-bulk-rights-review-v1',
   counts:{packages:53,nonPackageAssets:91,packagesStillRequiringIndependentAttestation:53,
    legallyApproved:0},packages:bulkPackages,nonPackageAssets:bulkAssets,
   finalNoticesIssued:false,commercialLicenseGranted:false},
  {schema:'therabridge-com02-definitelytyped-26-pinned-triage-v1',
   counts:{definitelyTypedVersions:26,publisherToSourceAttested:0},
   records:dtRecords,finalNoticesIssued:false,commercialApproval:false},
  {schema:'therabridge-com02-release-file-evidence-v1',commercialApproval:false,images:[]}
 ];
}
test('comprehensive exact-version, asset and two-edition zero-approval report',()=>{
 const r=reconcile(...buildInputs());
 assert.equal(r.counts.npmExceptionVersions,53);
 assert.equal(r.counts.definitelyTypedVersions,26);
 assert.equal(r.counts.otherNpmVersions,27);
 assert.equal(r.counts.SOURCE_ROOT_MANIFEST_ONLY,15);
 assert.equal(r.counts.MISSING_IMMUTABLE_SOURCE_REVISION,7);
 assert.equal(r.counts.MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED,3);
 assert.equal(r.counts.LEGACY_REPO_ORIGIN_UNTRUSTED,2);
 assert.deepEqual(r.counts.assetCategories,{IMAGE_OR_ICON:73,BRAND:15,CONTAINER_BUILD:3});
 assert.equal(r.assets.length,91);
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
test('rejects missing source row or repeated 53-version identity',()=>{
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
 assert.throws(()=>reconcile(...b),/COM02_FULL_SCOPE_/);
 const c=buildInputs();c[0].exceptions[0].decision='APPROVED';
 assert.throws(()=>reconcile(...c),/COM02_FULL_SCOPE_/);
});
test('rejects changed 27-version group or imaginary upstream Git root hash',()=>{
 const a=buildInputs();a[1].records[30].evidenceStatus='SOURCE_REVISION_CANDIDATE_UNAVAILABLE';
 assert.throws(()=>reconcile(...a),/COM02_FULL_SCOPE_/);
 const b=buildInputs();b[1].records[30].sourcePackageSha256=null;
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
 assert.throws(()=>reconcile(...d),/COM02_FULL_SCOPE_/);
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
