#!/usr/bin/env node
// COM-02: exhaustive source-vs-release evidence readiness, not rights approval.
// Crosschecks all 53 exact-version packages, 91 tracked assets, and both editions.
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewReleaseScope} from './review-release-scope.mjs';
import {expected as typeVersions} from './build-definitelytyped-triage.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const hex=/^[0-9a-f]{64}$/;
const id=x=>JSON.stringify([x.name,x.version]);
const categoryMap=new Map([
 ['REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY','SOURCE_ROOT_MANIFEST_ONLY'],
 ['SOURCE_REVISION_CANDIDATE_UNAVAILABLE','MISSING_IMMUTABLE_SOURCE_REVISION'],
 ['SOURCE_PACKAGE_IDENTITY_MISMATCH','MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED'],
 ['UNTRUSTED_REPOSITORY','LEGACY_REPO_ORIGIN_UNTRUSTED']
]);
const expectedNonTypes=[
 '@next/env@14.2.35','@next/swc-linux-x64-gnu@14.2.33',
 '@next/swc-linux-x64-musl@14.2.33','@swc/counter@0.1.3',
 '@tokenizer/token@0.3.0','abstract-logging@2.0.1','busboy@1.6.0',
 'client-only@0.0.1','consola@2.15.3','cssesc@3.0.0',
 'dlv@1.1.3','eastasianwidth@0.2.0','emoji-regex@8.0.0',
 'emoji-regex@9.2.2','esrecurse@4.3.0','exit@0.1.2',
 'glob-to-regexp@0.4.1','imurmurhash@0.1.4',
 'jest-pnp-resolver@1.2.3','jsesc@3.1.0',
 'natural-compare@1.4.0','postcss-selector-parser@6.1.5',
 'punycode@2.3.1','streamsearch@1.1.0',
 'tmp@0.0.33','tr46@0.0.3','type-fest@4.41.0'
];
const groupNames=['DEFINITELYTYPED_HISTORICAL_RELEASE','SOURCE_ROOT_MANIFEST_ONLY',
 'MISSING_IMMUTABLE_SOURCE_REVISION','MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED',
 'LEGACY_REPO_ORIGIN_UNTRUSTED'];
const allowedAssetCategories=new Set(['IMAGE_OR_ICON','BRAND','CONTAINER_BUILD']);
const fail=(code)=>{throw Error('COM02_FULL_SCOPE_'+code);};
function indexed(rows,expected,name){
 if(!Array.isArray(rows)||rows.length!==expected)fail('COUNT_'+name);
 const m=new Map();
 for(const r of rows){
  if(!r||typeof r.name!=='string'||typeof r.version!=='string'||m.has(id(r)))fail('DUPLICATE_'+name);
  m.set(id(r),r);
 }
 return m;
}
function reconcile(rights,correspondence,bulk,types,release){
 if(rights?.schema!=='therabridge-com02-exact-version-rights-queue-v1'||
    correspondence?.schema!=='therabridge-com02-githead-source-corroboration-candidates-v1'||
    bulk?.schema!=='therabridge-com02-bulk-rights-review-v1'||
    types?.schema!=='therabridge-com02-definitelytyped-26-pinned-triage-v1'||
    release?.schema!=='therabridge-com02-release-file-evidence-v1'||
    rights.counts?.exceptions!==53||rights.counts?.nonPackageAssets!==91||
    correspondence.counts?.exceptions!==53||
    bulk.counts?.packages!==53||bulk.counts?.nonPackageAssets!==91||
    types.counts?.definitelyTypedVersions!==26||
    types.counts?.publisherToSourceAttested!==0||
    rights.finalNoticesIssued!==false||bulk.finalNoticesIssued!==false||
    correspondence.finalNoticesIssued!==false||types.finalNoticesIssued!==false||
    rights.commercialLicenseGranted!==false||bulk.commercialLicenseGranted!==false||
    correspondence.commercialLicenseGranted!==false||types.commercialApproval!==false||
    release.commercialApproval!==false)fail('UNSAFE_INPUT_ENVELOPE');
 const r=indexed(rights.exceptions,53,'RIGHTS');
 const c=indexed(correspondence.records,53,'SOURCE');
 const b=indexed(bulk.packages,53,'BULK');
 const d=indexed(types.records,26,'TYPES');
 const sourceIds=new Set([...r.keys()]);
 if([...c.keys(),...b.keys()].some(k=>!sourceIds.has(k)))fail('MISSING_EXACT_VERSION_JOIN');
 const mustTypes=typeVersions.map(x=>'@types/'+x).sort();
 if(JSON.stringify([...d.values()].map(x=>x.name+'@'+x.version).sort())!==JSON.stringify(mustTypes))
  fail('DEFINITELYTYPED_VERSION_DRIFT');
 const mustOther=expectedNonTypes.slice().sort();
 const seenOther=[...r.values()].filter(x=>!x.name.startsWith('@types/'))
    .map(x=>x.name+'@'+x.version).sort();
 if(JSON.stringify(seenOther)!==JSON.stringify(mustOther))fail('NON_TYPES_VERSION_DRIFT');
 const scoped=reviewReleaseScope(bulk,release); // independently validates actual candidate file hashes
 if(scoped.counts.nonPackageAssets!==91||scoped.counts.packages!==53||
    scoped.counts.independentlyAttestedReleaseImages!==0||
    scoped.counts.independentlyAttestedPackagePublicationLineages!==0||
    scoped.counts.legallyApproved!==0||scoped.commercialLicenseGranted!==false)
   fail('UNSAFE_RELEASE_SCOPE');
 const packages=[];
 for(const [key,e] of r){
  const s=c.get(key),p=b.get(key),dt=d.get(key);
  if(!s||!p||!hex.test(e.tarballSha256||'')||
     e.commercialApproval!==false||e.decision!=='UNRESOLVED'||
     e.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     e.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
     s.commercialApproval!==false||
     s.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED'||
     p.commercialApproval!==false||p.decision!=='UNRESOLVED'||
     p.verifiedPublisherToSourceArtifact!==false||
     p.publisherTarballSha256!==e.tarballSha256||
     p.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED'||
     p.releaseImagePresence!=='NOT_VERIFIED_AGAINST_RELEASE_IMAGE')
     fail('FORGED_PUBLISHER_SOURCE_OR_RIGHTS');
  let group;
  if(e.name.startsWith('@types/')){
   if(!dt||dt.publisherTarballSha256!==e.tarballSha256||
      dt.immutableSourceCommit!==null||
      dt.githubSourceManifestCorroborated!==false||
      dt.npmPublisherToSourceIndependentlyVerified!==false||
      dt.authoritativeSourceLicenseVerified!==false||
      dt.commercialApproval!==false||
      dt.candidateSourceRepository!=='DefinitelyTyped/DefinitelyTyped'||
      dt.candidateSourceSubdirectory!=='types/'+e.name.slice(7)||
      s.candidateGitHead!==null||
      s.evidenceStatus!=='SOURCE_REVISION_CANDIDATE_UNAVAILABLE')
      fail('FORGED_DT_HISTORICAL_LINEAGE');
   group='DEFINITELYTYPED_HISTORICAL_RELEASE';
  }else{
   if(dt||!categoryMap.has(s.evidenceStatus))fail('UNEXPECTED_OTHER_SOURCE_GROUP');
   group=categoryMap.get(s.evidenceStatus);
   if((group==='MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED')!==e.name.startsWith('@next/'))
     fail('MONOREPO_ORIGIN_CLASSIFICATION');
   if(group==='SOURCE_ROOT_MANIFEST_ONLY'&&(!hex.test(s.sourcePackageSha256||'')||
        !/^[a-f0-9]{40}$/.test(s.candidateGitHead||'')))fail('ROOT_SOURCE_CANDIDATE_MISSING');
  }
  packages.push({name:e.name,version:e.version,group,
   dependencyScope:e.dependencyScope,publisherTarballSha256:e.tarballSha256,
   sourceCommitCandidate:s.candidateGitHead??null,
   independentPublisherToSourceBuildAttestation:false,
   historicalSourceReview:group==='DEFINITELYTYPED_HISTORICAL_RELEASE'?
    'REQUIRES_IMMUTABLE_UPSTREAM_REVISION_EXACT_SUBTREE_AND_PUBLISHER_LINK':
    'REQUIRES_INDEPENDENT_PUBLICATION_BUILD_LINEAGE',
   actualSaasDistributionVerified:false,actualEnterpriseDistributionVerified:false,
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   legalDecision:'UNRESOLVED',commercialApproval:false});
 }
 packages.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 const groups=Object.fromEntries(groupNames.map(g=>[g,packages.filter(x=>x.group===g).length]));
 if(groups.DEFINITELYTYPED_HISTORICAL_RELEASE!==26||
    groups.SOURCE_ROOT_MANIFEST_ONLY!==15||
    groups.MISSING_IMMUTABLE_SOURCE_REVISION!==7||
    groups.MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED!==3||
    groups.LEGACY_REPO_ORIGIN_UNTRUSTED!==2)fail('GROUP_COUNT_DRIFT');
 const assetByPath=new Map();
 if(rights.nonPackage.length!==91||bulk.nonPackageAssets.length!==91||
    scoped.assets.length!==91)fail('ASSET_COUNT_DRIFT');
 for(const a of rights.nonPackage){
  if(!a||typeof a.path!=='string'||assetByPath.has(a.path)||
     !hex.test(a.sha256||'')||!allowedAssetCategories.has(a.category)||
     a.commercialApproval!==false||a.decision!=='UNRESOLVED')
    fail('UNSAFE_ASSET');
  assetByPath.set(a.path,a);
 }
 const assetCounts={IMAGE_OR_ICON:0,BRAND:0,CONTAINER_BUILD:0};
 const assets=scoped.assets.map(a=>{
  const src=assetByPath.get(a.path);
  if(!src||src.sha256!==a.sha256||src.category!==a.category||
     a.commercialApproval!==false||a.decision!=='UNRESOLVED'||
     a.releasePresence!=='NOT_INDEPENDENTLY_ATTESTED'||
     !['NO_PINNED_RELEASE_IMAGE_PROVIDED','BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST',
        'BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST'].includes(a.releaseImageComparisons.SAAS)||
     !['NO_PINNED_RELEASE_IMAGE_PROVIDED','BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST',
        'BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST'].includes(a.releaseImageComparisons.ENTERPRISE))
      fail('ASSET_RELEASE_RIGHTS_CONTRADICTION');
  assetCounts[a.category]++;
  return {path:a.path,sha256:a.sha256,category:a.category,
    localCandidateComparison:a.releaseImageComparisons,
    independentlyVerifiedDistribution:false,rightsHolder:'NOT_VERIFIED',
    saasNetworkRights:'PENDING_COUNSEL_REVIEW',
    enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
    legalDecision:'UNRESOLVED',commercialApproval:false};
 });
 if(assetCounts.IMAGE_OR_ICON!==73||assetCounts.BRAND!==15||assetCounts.CONTAINER_BUILD!==3)
  fail('ASSET_CATEGORY_DRIFT');
 const editionIds=['SAAS','ENTERPRISE'];
 const editions=editionIds.map(edition=>{
  const candidate=scoped.imageCandidates.find(x=>x.edition===edition);
  return {edition,candidateOCIImageDigest:candidate?.ociDigest??null,
   localCandidateFileCount:candidate?.filesCount??null,
   signedRegistryPublicationIndependentlyVerified:false,
   authenticatedProductionDeploymentOrCustomerDelivery:false,
   immutableReleaseSBOMIndependent:false,
   completeRedistributionRightsApproved:false,
   assetRightsApproved:0,packageRightsApproved:0,commercialLicenseGranted:false,
   readiness:'BLOCKED_NO_INDEPENDENT_RELEASE_AND_RIGHTS_EVIDENCE'};
 });
 return {schema:'therabridge-com02-exhaustive-closure-evidence-v1',
  status:'NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE',
  sourceEvidenceSha256:{rights:sha(JSON.stringify(rights)),
    correspondence:sha(JSON.stringify(correspondence)),
    bulk:sha(JSON.stringify(bulk)),definitelyTyped:sha(JSON.stringify(types)),
    candidateRelease:sha(JSON.stringify(release))},
  counts:{npmExceptionVersions:53,definitelyTypedVersions:26,otherNpmVersions:27,
   ...groups,nonPackageAssets:91,assetCategories:assetCounts,
   productionSaasImagesIndependentlyAuthenticated:0,
   enterpriseDeliverablesIndependentlyAuthenticated:0,
   packagePublicationLineagesIndependentlyAuthenticated:0,
   legallyApprovedComponents:0},
  packages,assets,editions,
  approvedCopyrightOwner:false,contractingEntityVerified:false,
  finalThirdPartyNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const args=process.argv.slice(2);
 try{
  if(args.length!==6||new Set(args).size!==6)
   throw Error('USAGE: build-com02-closure-ledger.mjs rights.json correspondence.json bulk.json types26.json release-files.json new-output.json');
  const values=args.slice(0,5).map(path=>{
   if(statSync(path).size>32*1024*1024)fail('INPUT_LIMIT');
   return JSON.parse(readFileSync(path,'utf8'));
  });
  const result=reconcile(...values);
  writeFileSync(args[5],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('COM02_CLOSURE_NOT_AUTHORIZED',e.message);process.exitCode=1;}
}
export {reconcile,expectedNonTypes};
