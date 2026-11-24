#!/usr/bin/env node
// WU-LIC-02: exact-version + tracked-asset release-rights disposition queue.
// All source and local-candidate evidence is NON-AUTHORIZING.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {qualify} from './build-wu-lic-01-qualification.mjs';

const hex=/^[0-9a-f]{64}$/, oci=/^sha256:[0-9a-f]{64}$/;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id=x=>JSON.stringify([x.name,x.version]);
const fail=x=>{throw Error('WU_LIC_02_'+x)};
const EDITIONS=['SAAS','ENTERPRISE'];
const ASSET_CLASSES={IMAGE_OR_ICON:73,BRAND:15,CONTAINER_BUILD:4};
const SUPPLEMENTAL=[
 {category:'OS_RUNTIME_CONTAINER',requirement:'Immutable base image OS packages, native libraries, distribution obligations and exact SBOM'},
 {category:'POSTGRES_REDIS',requirement:'Exact deployed/redistributed server versions, notice and hosting or redistribution scope'},
 {category:'MODELS_DATASETS_EXTERNAL_SERVICES',requirement:'Model weights, external AI/data terms, provider privacy and processing rights'},
 {category:'FONTS_BRAND_MEDIA',requirement:'Fonts, trademarks, icons, illustrations and copyrighted media permission per edition'}
];
function makeQueue(ledger,root,token,comparison,wu1,release){
 const validated=qualify(ledger,root,token,comparison);
 if(wu1?.schema!=='therabridge-wu-lic-01-technical-provenance-reconciliation-v1'||
    wu1.status!=='TECHNICAL_TRIAGE_COMPLETE_EXTERNAL_ATTESTATION_AND_RIGHTS_OPEN'||
    wu1.commercialApproval!==false||wu1.saasReleaseApproved!==false||
    wu1.enterpriseReleaseApproved!==false||
    wu1.g2ClinicalApproved!==false||wu1.g2bClinicalApproved!==false||
    sha(wu1)!==sha(validated))fail('WU01_SAME_RUN_RECEIPT_MISMATCH');
 if(release?.schema!=='therabridge-com02-release-file-evidence-v1'||
    release.commercialApproval!==false||!Array.isArray(release.images)||
    release.images.length>2||
    ledger.sourceEvidenceSha256?.candidateRelease!==sha(release))
    fail('RELEASE_MANIFEST_NOT_BOUND_TO_LEDGER');
 const images=new Map();
 for(const im of release.images){
  if(!EDITIONS.includes(im.edition)||images.has(im.edition)||
     !oci.test(im.ociDigest||'')||
     typeof im.imageRef!=='string'||im.imageRef.length>200||
     !/^[a-zA-Z0-9][a-zA-Z0-9._/:-]*$/.test(im.imageRef)||
     im.filesystemCaptureStatus!=='UNATTESTED_CANDIDATE'||im.releaseApproval!==false||
     !Array.isArray(im.files)||im.files.length>100000||
     im.captureLimitations?.independentSignatureVerified===true)
     fail('FORGED_IMAGE_CANDIDATE');
  const paths=new Set(),hashes=new Set();
  for(const f of im.files){
   if(!f||typeof f.path!=='string'||!f.path||f.path.startsWith('/')||
      f.path.includes('\\')||f.path.split('/').some(s=>!s||s==='.'||s==='..')||
      /[\u0000-\u001f\u007f]/.test(f.path)||
      paths.has(f.path)||!hex.test(f.sha256||'')||
      !Number.isSafeInteger(f.bytes)||f.bytes<0)
      fail('FORGED_IMAGE_FILE_LIST');
   paths.add(f.path);hashes.add(f.sha256);
  }
  images.set(im.edition,{imageRef:im.imageRef,ociDigest:im.ociDigest,hashes,filesCount:im.files.length});
 }
 const packageIds=new Set();
 const rootById=new Map(comparison.records.map(x=>[id(x),x]));
 const packages=ledger.packages.map(p=>{
  if(packageIds.has(id(p)))fail('DUPLICATE_PACKAGE');
  packageIds.add(id(p));
  const rootRecord=rootById.get(id(p));
  if((p.group==='SOURCE_ROOT_MANIFEST_ONLY')!==!!rootRecord)fail('SOURCE_ROOT_JOIN');
  const sourceEvidence=p.group!=='SOURCE_ROOT_MANIFEST_ONLY'?
     'NO_INDEPENDENT_NPM_PUBLISHER_BUILD_TO_SOURCE_ATTESTATION':
     p.name==='unicode-emoji-modifier-base'?
     'IMMUTABLE_GIT_NPM_ROOT_MANIFEST_MATCH_NO_PUBLISHER_ATTESTATION':
     p.name==='@tokenizer/token'?
     'ORIGINAL_NPM_GIT_ROOT_BYTES_DIFFER_SEMANTICALLY_CLASSIFIED_NO_PUBLISHER_ATTESTATION':
     rootRecord.status==='PUBLISHED_MANIFEST_BYTES_MATCH_IMMUTABLE_SOURCE_UNATTESTED'?
     'SAME_RUN_MANIFEST_BYTES_MATCH_NOT_PUBLISHER_ATTESTATION':
     'NOT_VERIFIED';
  if(sourceEvidence==='NOT_VERIFIED')fail('UNVERIFIED_ROOT_CANNOT_BE_REPORTED_AS_MATCH');
  if(p.legalDecision!=='UNRESOLVED'||p.commercialApproval!==false||
    p.independentPublisherToSourceBuildAttestation!==false||
    p.actualSaasDistributionVerified!==false||p.actualEnterpriseDistributionVerified!==false)
    fail('PACKAGE_FALSE_APPROVAL');
  return {name:p.name,version:p.version,group:p.group,
   originalNpmArchiveSha256:p.publisherTarballSha256,
   immutableGitCommitCandidate:p.sourceCommitCandidate,
   sourceEvidence,exactPublisherBuildAttested:false,
   editions:Object.fromEntries(EDITIONS.map(e=>[e,{
    actualShippedScope:'UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE',
    publicationOrCustomerDeliveryAttested:false,
    exactVersionSbomMatched:false,
    licenseTextReviewedByCounsel:false,
    networkOrRedistributionRights:'PENDING_COUNSEL_REVIEW',
    decision:'BLOCKED'}])),
   legalDecision:'UNRESOLVED',commercialApproval:false};
 });
 const tracked=new Set(),categories={IMAGE_OR_ICON:0,BRAND:0,CONTAINER_BUILD:0};
 const assets=ledger.assets.map(a=>{
  if(!a?.path||tracked.has(a.path)||!hex.test(a.sha256||'')||
     !Object.hasOwn(categories,a.category)||
     a.legalDecision!=='UNRESOLVED'||a.commercialApproval!==false||
     a.independentlyVerifiedDistribution!==false)
     fail('ASSET_FALSE_APPROVAL_OR_DUPLICATE');
  tracked.add(a.path);categories[a.category]++;
  const editions={};
  for(const edition of EDITIONS){
   const candidate=images.get(edition);
   const expected=a.localCandidateComparison?.[edition];
   const actual=!candidate?'NO_PINNED_RELEASE_IMAGE_PROVIDED':
     candidate.hashes.has(a.sha256)?
     'BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST':
     'BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST';
   if(expected!==actual)fail('RELEASE_ASSET_HASH_JOIN_DRIFT');
   editions[edition]={
    localUnattestedFileComparison:actual,
    authenticatedShippedScope:'UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE',
    rightsHolder:'NOT_VERIFIED',
    permissionEvidence:'NOT_VERIFIED',
    applicableLicenseAndNotice:'NOT_APPROVED',
    networkOrRedistributionRights:'PENDING_COUNSEL_REVIEW',
    decision:'BLOCKED'};
  }
  return {path:a.path,sha256:a.sha256,category:a.category,
   editions,legalDecision:'UNRESOLVED',commercialApproval:false};
 });
 if(assets.length!==92||packages.length!==44||
    Object.entries(ASSET_CLASSES).some(([k,n])=>categories[k]!==n))
    fail('RIGHTS_POPULATION_DRIFT');
 const editions=EDITIONS.map(edition=>{
  const candidate=images.get(edition),ledgerEdition=ledger.editions.find(x=>x.edition===edition);
  if(!ledgerEdition||ledgerEdition.commercialLicenseGranted!==false||
     ledgerEdition.signedRegistryPublicationIndependentlyVerified!==false||
     ledgerEdition.authenticatedProductionDeploymentOrCustomerDelivery!==false||
     ledgerEdition.candidateOCIImageDigest!==(candidate?.ociDigest??null))
    fail('RELEASE_EDITION_JOIN_DRIFT');
  return {edition,candidateOCIImageDigest:candidate?.ociDigest??null,
   candidateFileCount:candidate?.filesCount??null,
   candidateEvidenceKind:candidate?'UNATTESTED_LOCAL_FILES':'NO_CANDIDATE_IMAGE',
   independentlySignedRegistryPublication:false,
   authenticatedProductionDeploymentOrCustomerDelivery:false,
   independentlyVerifiedImageSBOM:false,
   editionDistributionInventoryStatus:'UNKNOWN',
   approval:'BLOCKED_REQUIRE_REAL_IMAGE_PROVENANCE_AND_COUNSEL'};
 });
 return {
  schema:'therabridge-wu-lic-02-edition-rights-provenance-queue-v1',
  status:'EVIDENCE_QUEUE_PREPARED_EXTERNAL_ATTESTATIONS_AND_LEGAL_RIGHTS_REQUIRED',
  sources:{closureLedgerSha256:sha(ledger),wuLic01Sha256:sha(wu1),
   releaseManifestSha256:sha(release),root405Sha256:sha(root),
   tokenizer402Sha256:sha(token),sameRunComparisonSha256:sha(comparison)},
  counts:{npmExceptions:44,definitelyTyped:21,nonDefinitelyTyped:23,
   sourceRootCandidates:10,rootRawMatches:9,rootByteDifferences:1,
   authenticPublisherBuildLineages:0,trackedAssets:92,
   assetCategories:categories,independentReleaseImages:0,legallyApproved:0},
  editions,packages,assets,
  supplementalDistributionObligations:SUPPLEMENTAL.map(x=>({...x,
   saas:{status:'UNRESOLVED'},enterprise:{status:'UNRESOLVED'},
   counselApproval:false})),
  evidenceSubmissionRequirements:{
   publisher:'Independent publisher-signed exact original npm archive digest, immutable upstream source commit and build recipe or independently attested nonshipment',
   saas:'Independently signed registry OCI digest, complete deployed file inventory and matching independent runtime SBOM plus deployment receipt',
   enterprise:'Independently signed distributed OCI or install bundle digest, file inventory, SBOM and authenticated customer-delivery receipt',
   rights:'Actual rights-holder authorization, exact license and notices, attribution, per-edition scope, counsel and owner signoff',
   evidenceInPublicRepository:'ONLY_HASHES_AND_REDACTED_STATUS_NO_PRIVATE_CONTRACT_OR_SECRET'},
  commercialApproval:false,saasReleaseApproved:false,
  enterpriseReleaseApproved:false,g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const paths=process.argv.slice(2);
  if(paths.length!==7||new Set(paths).size!==7)fail('USAGE');
  const objects=paths.slice(0,6).map(p=>{
   if(statSync(p).size>32*1024*1024)fail('OVERSIZED_INPUT');
   return JSON.parse(readFileSync(p,'utf8'));
  });
  const result=makeQueue(...objects);
  writeFileSync(paths[6],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('WU_LIC_02_NOT_AUTHORIZED',e.message);process.exitCode=1;}
}
export {makeQueue};
