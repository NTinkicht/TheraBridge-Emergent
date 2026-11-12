#!/usr/bin/env node
// COM-02: cryptographically reverify the signed capture claim and join its
// candidate file hashes to the still-unapproved component rights inventory.
// Signing a local export does NOT prove publication/deployment or a license.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkAttestation} from './verify-oci-dsse.mjs';
import {reviewReleaseScope} from './review-release-scope.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const editions=['SAAS','ENTERPRISE'];
const keys=(x,expected)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===expected.length&&expected.every(k=>Object.hasOwn(x,k));

function reconcileSignedReleaseRights(bulk,capture,envelope,pem,expectedKeyFingerprint){
 // Do not accept a detached "signature verified" JSON from the caller.
 // Re-run Ed25519 verification with a separately provided trust fingerprint.
 const signed=checkAttestation(capture,envelope,pem,expectedKeyFingerprint);
 const scope=reviewReleaseScope(bulk,capture);
 if(scope.releaseManifestSha256!==sha(JSON.stringify(capture))||
    scope.bulkEvidenceSha256!==sha(JSON.stringify(bulk))||
    scope.counts.pinnedImageCandidates!==2||
    scope.counts.independentlyAttestedReleaseImages!==0||
    scope.counts.independentlyAttestedPackagePublicationLineages!==0||
    scope.counts.legallyApproved!==0||
    scope.finalNoticesIssued!==false||
    scope.commercialLicenseGranted!==false||
    scope.g2ClinicalApproved!==false||scope.g2bClinicalApproved!==false||
    signed.dsseSignatureVerified!==true||
    signed.signerIdentityOrAuthorityIndependentlyVerified!==false||
    signed.registryArtifactOrDeploymentIndependentlyVerified!==false||
    signed.commercialApproval!==false||signed.finalNoticesIssued!==false)
  throw Error('UNSAFE_RELEASE_SCOPE_OR_SIGNING');
 const scoped=new Map(scope.imageCandidates.map(x=>[x.edition,x]));
 if(scoped.size!==2||signed.imageCandidates.length!==2)throw Error('MISSING_SIGNED_EDITION');
 for(const edition of editions){
  const image=scoped.get(edition),signedImage=signed.imageCandidates.find(x=>x.edition===edition);
  if(!image||!signedImage||image.imageRef!==signedImage.imageRef||
     image.ociDigest!==signedImage.digest||
     image.filesCount<0||image.filesystemCaptureStatus!=='UNATTESTED_CANDIDATE'||
     image.independentSignatureVerified!==false||image.commercialApproval!==false)
   throw Error('MISMATCHED_RELEASE_IMAGE_SCOPE');
 }
 if(!Array.isArray(scope.assets)||!Array.isArray(scope.packages)||
    scope.counts.nonPackageAssets!==scope.assets.length||
    scope.counts.packages!==scope.packages.length)
  throw Error('MISSING_RIGHTS_ITEMS');
 const supplementalExpected=new Map([
  ['OS_RUNTIME_CONTAINER','REQUIRE_RELEASE_IMAGE_DIGEST_AND_COMPONENT_LEVEL_OBLIGATIONS'],
  ['POSTGRES_REDIS','REQUIRE_EXACT_SHIPPED_VERSION_AND_DISTRIBUTION_SCOPE'],
  ['MODELS_DATASETS_EXTERNAL_SERVICES','REQUIRE_PROVIDER_TERMS_INPUT_RIGHTS_AND_DATA_PROCESSING_ASSESSMENT']
 ]);
 if(!Array.isArray(bulk.supplementalDistributionReview)||
    bulk.supplementalDistributionReview.length!==supplementalExpected.size)
   throw Error('MISSING_SUPPLEMENTAL_DISTRIBUTION_RIGHTS');
 const supplementalSeen=new Set();
 const supplementalDistributionReview=bulk.supplementalDistributionReview.map(item=>{
  if(!keys(item,['category','status','reason'])||
     !supplementalExpected.has(item.category)||
     supplementalSeen.has(item.category)||
     item.status!=='UNRESOLVED'||
     item.reason!==supplementalExpected.get(item.category))
    throw Error('UNSAFE_SUPPLEMENTAL_DISTRIBUTION_RIGHTS');
  supplementalSeen.add(item.category);
  return {category:item.category,status:'UNRESOLVED',reason:item.reason,
   actualDistributionIndependentlyVerified:false,
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   decision:'UNRESOLVED',commercialApproval:false};
 }).sort((a,b)=>a.category.localeCompare(b.category,'en'));
 const assets=scope.assets.map(item=>{
  if(!keys(item.releaseImageComparisons,editions)||
     item.releasePresence!=='NOT_INDEPENDENTLY_ATTESTED'||
     item.decision!=='UNRESOLVED'||item.commercialApproval!==false||
     item.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     item.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
    throw Error('UNSAFE_ASSET_RELEASE_RIGHTS');
  const comparisons={};
  for(const edition of editions){
   const raw=item.releaseImageComparisons[edition];
   if(raw!=='BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST'&&
      raw!=='BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST')
    throw Error('INVALID_CAPTURE_COMPARISON');
   comparisons[edition]={
    candidateByteMatch:raw==='BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST',
    claimSignatureMatchesPinnedKey:true,
    actualDistributionIndependentlyVerified:false,
    rightsVerified:false,
    status:raw==='BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST'?
     'SIGNED_LOCAL_CANDIDATE_BYTES_MATCH_NOT_DISTRIBUTION_PROOF':
     'SIGNED_LOCAL_CANDIDATE_BYTES_ABSENT_NOT_EXCLUSION_PROOF'
   };
  }
  return {path:item.path,sha256:item.sha256,category:item.category,editions:comparisons,
    rightsHolder:'NOT_VERIFIED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
    enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
    decision:'UNRESOLVED',commercialApproval:false};
 });
 const packages=scope.packages.map(item=>{
  if(item.releasePresence!=='NOT_INDEPENDENTLY_ATTESTED'||
     item.publicationToSourceAttestation!=='NOT_INDEPENDENTLY_VERIFIED'||
     item.decision!=='UNRESOLVED'||item.commercialApproval!==false||
     item.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
     item.saasNetworkRights!=='PENDING_COUNSEL_REVIEW')
    throw Error('UNSAFE_PACKAGE_RIGHTS');
  return {name:item.name,version:item.version,
   provenanceCategory:item.provenanceCategory,
   exactNpmPublisherToSourceIndependentlyVerified:false,
   actualImageInstallationIndependentlyVerified:false,
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   decision:'UNRESOLVED',commercialApproval:false};
 });
 return {
  schema:'therabridge-com02-signed-candidate-rights-reconciliation-v1',
  status:'PINNED_KEY_SIGNATURE_ON_LOCAL_CANDIDATES_NOT_RELEASE_OR_RIGHTS_APPROVAL',
  sourceEvidence:{bulkEvidenceSha256:scope.bulkEvidenceSha256,
   captureManifestSha256:scope.releaseManifestSha256,
   signedStatementSha256:signed.signedStatementSha256,
   trustedKeySpkiSha256:signed.trustedKeySpkiSha256},
  images:editions.map(edition=>{
   const im=scoped.get(edition);
   return {edition,imageRef:im.imageRef,ociDigest:im.ociDigest,
    fileInventorySha256:signed.imageCandidates.find(x=>x.edition===edition).fileInventorySha256,
    candidateFileCount:im.filesCount,
    dsseSignatureVerifiedAgainstPinnedKey:true,
    signerIdentityOrAuthorityIndependentlyVerified:false,
    independentlyVerifiedRegistryPublication:false,
    independentlyVerifiedProductionDeployment:false,commercialApproval:false};
  }),
  counts:{candidateImages:2,assets:assets.length,packages:packages.length,
   supplementalDistributionObligations:supplementalDistributionReview.length,
   independentlyAttestedReleaseImages:0,
   independentlyVerifiedNpmPublisherSourceLinks:0,
   legallyApproved:0},
  assets,packages,supplementalDistributionReview,
  finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
function readBounded(path,limit){
 if(statSync(path).size>limit)throw Error('INPUT_BUDGET');
 return readFileSync(path);
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const paths=process.argv.slice(2);
 if(paths.length!==6||new Set([paths[0],paths[1],paths[2],paths[3],paths[5]]).size!==5){
  console.error('Usage: reconcile-signed-release-rights.mjs bulk.json captures.json envelope.json public-key.pem pinned-spki-sha256 new-output.json');
  process.exit(2);
 }
 try{
  const report=reconcileSignedReleaseRights(
   JSON.parse(readBounded(paths[0],32*1024*1024)),
   JSON.parse(readBounded(paths[1],32*1024*1024)),
   JSON.parse(readBounded(paths[2],128*1024)),
   readBounded(paths[3],8192),paths[4]);
  writeFileSync(paths[5],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {reconcileSignedReleaseRights};
