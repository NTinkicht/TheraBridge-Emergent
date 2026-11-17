#!/usr/bin/env node
// WU-LIC-03 — ONLY a counsel-facing BLOCKED decision matrix.
// Neither this program nor an unauthenticated JSON claim can grant legal or clinical rights.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const editions=['SAAS','ENTERPRISE'];
const required={
 SAAS:['ipChainOfTitle','contractingEntity','saasContract','privacyDpa','thirdPartyNetworkRights','saasReleaseScope','assetRights','counselApproval','ownerApproval'],
 ENTERPRISE:['ipChainOfTitle','contractingEntity','enterpriseContract','thirdPartyRedistributionRights','enterpriseReleaseScope','assetRights','thirdPartyNotices','counselApproval','ownerApproval']
};
const fail=x=>{throw Error('WU_LIC_03_'+x)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function buildLaunchPackage(rights,decision) {
 if(rights?.schema!=='therabridge-wu-lic-02-edition-rights-provenance-queue-v1'||
    rights.status!=='EVIDENCE_QUEUE_PREPARED_EXTERNAL_ATTESTATIONS_AND_LEGAL_RIGHTS_REQUIRED'||
    rights.commercialApproval!==false||rights.saasReleaseApproved!==false||
    rights.enterpriseReleaseApproved!==false||rights.g2ClinicalApproved!==false||
    rights.g2bClinicalApproved!==false||
    rights.counts?.npmExceptions!==44||rights.counts?.definitelyTyped!==21||
    rights.counts?.nonDefinitelyTyped!==23||rights.counts?.trackedAssets!==91||
    rights.counts?.authenticPublisherBuildLineages!==0||
    rights.counts?.independentReleaseImages!==0||rights.counts?.legallyApproved!==0||
    !Array.isArray(rights.packages)||rights.packages.length!==44||
    !Array.isArray(rights.assets)||rights.assets.length!==91||
    !Array.isArray(rights.editions)||rights.editions.length!==2||
    !Array.isArray(rights.supplementalDistributionObligations)||
    rights.supplementalDistributionObligations.length!==4||
    !rights.sources||Object.values(rights.sources).some(x=>!HEX.test(x||'')))
   fail('INVALID_EXACT_RIGHTS_SOURCE');
 if(decision?.schema!=='therabridge-commercial-launch-decision-register-v1'||
    decision.scope!=='NON_AUTHORIZING_PUBLIC_TRACKING_ONLY'||
    decision.commercialLicenseGranted!==false||
    decision.finalThirdPartyNoticesIssued!==false||
    decision.clinical?.g2!=='NO_GO'||decision.clinical?.g2b!=='NO_GO'||
    decision.clinical?.realPatientProcessingAllowed!==false||
    decision.clinical?.consentOrReportReleaseAllowed!==false||
    !eq(Object.keys(decision.editions||{}).sort(),[...editions].sort()))
   fail('FALSE_APPROVAL_OR_MISSING_EDITION');
 const srcEditions=new Map();
 for(const entry of rights.editions) {
  if(!editions.includes(entry.edition)||srcEditions.has(entry.edition)||
     entry.independentlySignedRegistryPublication!==false||
     entry.authenticatedProductionDeploymentOrCustomerDelivery!==false||
     entry.independentlyVerifiedImageSBOM!==false||
     entry.editionDistributionInventoryStatus!=='UNKNOWN'||
     entry.approval!=='BLOCKED_REQUIRE_REAL_IMAGE_PROVENANCE_AND_COUNSEL'||
     (entry.candidateOCIImageDigest!==null&&!/^sha256:[a-f0-9]{64}$/.test(entry.candidateOCIImageDigest)))
    fail('FORGED_IMAGE_APPROVAL');
  srcEditions.set(entry.edition,entry);
 }
 if(srcEditions.size!==2)fail('MISSING_RELEASE_EDITION');
 const packageKeys=new Set();
 const packages=rights.packages.map(p=>{
  const key=JSON.stringify([p?.name,p?.version]);
  if(packageKeys.has(key)||!p?.name||!p?.version||
     !HEX.test(p.originalNpmArchiveSha256||'')||
     p.exactPublisherBuildAttested!==false||p.legalDecision!=='UNRESOLVED'||
     p.commercialApproval!==false)fail('INVALID_OR_DUPLICATE_PACKAGE');
  packageKeys.add(key);
  const scope={};
  for(const edition of editions){
   const e=p.editions?.[edition];
   if(e?.actualShippedScope!=='UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE'||
      e.publicationOrCustomerDeliveryAttested!==false||
      e.exactVersionSbomMatched!==false||
      e.licenseTextReviewedByCounsel!==false||
      e.networkOrRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
      e.decision!=='BLOCKED')fail('FORGED_PACKAGE_LEGAL_SCOPE');
   scope[edition]={shipment:'UNKNOWN',copyrightAndLicense:'UNRESOLVED',
     publisherToSource:'UNVERIFIED',notices:'DRAFT_NOT_FINAL',decision:'BLOCKED'};
  }
  return {name:p.name,version:p.version,exactPublishedArchiveSha256:p.originalNpmArchiveSha256,
    immutableSourceCandidate:p.immutableGitCommitCandidate??null,
    sourceEvidence:p.sourceEvidence,editions:scope};
 });
 const assetPaths=new Set();
 const assets=rights.assets.map(a=>{
  if(!a?.path||assetPaths.has(a.path)||!HEX.test(a.sha256||'')||
     a.legalDecision!=='UNRESOLVED'||a.commercialApproval!==false)
    fail('INVALID_OR_DUPLICATE_ASSET');
  assetPaths.add(a.path);
  const scope={};
  for(const edition of editions){
   const e=a.editions?.[edition];
   if(e?.authenticatedShippedScope!=='UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE'||
     e.rightsHolder!=='NOT_VERIFIED'||e.permissionEvidence!=='NOT_VERIFIED'||
     e.applicableLicenseAndNotice!=='NOT_APPROVED'||
     e.networkOrRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
     e.decision!=='BLOCKED')fail('FORGED_ASSET_RIGHTS');
   scope[edition]={shipment:'UNKNOWN',owner:'NOT_VERIFIED',
     originalLicense:'UNRESOLVED',attribution:'PENDING',decision:'BLOCKED'};
  }
  return {path:a.path,sha256:a.sha256,category:a.category,editions:scope};
 });
 const extra=new Set();
 for(const s of rights.supplementalDistributionObligations) {
  if(!s?.category||extra.has(s.category)||s.saas?.status!=='UNRESOLVED'||
     s.enterprise?.status!=='UNRESOLVED'||s.counselApproval!==false)
    fail('UNSAFE_SUPPLEMENTAL_SCOPE');
  extra.add(s.category);
 }
 const approvals={};
 for(const edition of editions) {
  const d=decision.editions[edition],source=srcEditions.get(edition);
  if(!d||d.status!=='BLOCKED'||d.releaseDigest!==null||
     !eq(d.required,required[edition])||
     !d.evidence||Object.keys(d.evidence).length!==0||
     source.candidateOCIImageDigest!==null)
    fail('FORGED_COUNSEL_OR_IMAGE_AUTHORIZATION');
  approvals[edition]={status:'BLOCKED',releaseDigest:null,
   requirements:required[edition].map(name=>({name,status:'UNVERIFIED',evidence:null})),
   publisherLineagesAttested:0,assetRightsApproved:0,
   releaseRegistryAndDeliveryAuthenticated:false,
   licenseNoticesApproved:false,ownerAndCounselSigned:false,
   clinicalReleaseGranted:false};
 }
 return {schema:'therabridge-wu-lic-03-counsel-launch-readiness-v1',
  status:'COUNSEL_REVIEW_DRAFT_NOT_COMMERCIAL_OR_CLINICAL_AUTHORIZATION',
  sourceHashes:{rightsQueueSha256:sha(rights),decisionRegisterSha256:sha(decision)},
  counts:{npmExceptions:packages.length,assets:assets.length,unresolvedPublisherLineages:44,
   unresolvedAssetRights:91,supplementalSystems:extra.size,
   legallyApproved:0,independentlyAttestedReleaseImages:0},
  sourceWorkstreams:{ip:'COM-01 #312',provenance:'COM-02 #356/#360',
   repositoryNotices:'COM-03 #314',contracts:'COM-04 #315',
   subscriptions:'COM-05 #316',billingAndLaunch:'COM-06 #317',
   consolidatedApproval:'COM-LAUNCH #371'},
  packageObligations:packages,assetObligations:assets,
  supplementalObligations:rights.supplementalDistributionObligations.map(s=>({
   category:s.category,requirement:s.requirement,
   SAAS:'UNVERIFIED',ENTERPRISE:'UNVERIFIED',counselApproval:false})),
  editions:approvals,publicRepositoryAccess:'VISIBLE_NOT_COPYRIGHT_LICENSE',
  reservedRights:'DRAFT_REQUIRES_VERIFIED_IP_OWNER',
  finalLicenseIssued:false,finalNoticesIssued:false,
  commercialLicenseGranted:false,saasLaunchAllowed:false,
  enterpriseLaunchAllowed:false,clinical:{g2:'NO_GO',g2b:'NO_GO',
   realPatientProcessingAllowed:false,consentOrReportReleaseAllowed:false}};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==3||new Set(args).size!==3)fail('USAGE');
  const input=args.slice(0,2).map(p=>{
   const n=statSync(p).size;if(n<2||n>32*1024*1024)fail('INVALID_INPUT_SIZE');
   return JSON.parse(readFileSync(p,'utf8'));
  });
  const result=buildLaunchPackage(...input);
  writeFileSync(args[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('WU_LIC_03_BLOCKED',e.message);process.exitCode=1;}
}
export {buildLaunchPackage,required};
