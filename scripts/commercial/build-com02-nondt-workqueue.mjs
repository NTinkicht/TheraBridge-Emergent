#!/usr/bin/env node
// COM-02: non-DefinitelyTyped exact-version publication evidence workqueue.
// Runs only on an already reconciled SAME-RUN closure ledger. A workqueue is not an attestation.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const SHA=/^[0-9a-f]{64}$/;
const GROUPS=Object.freeze({
 SOURCE_ROOT_MANIFEST_ONLY:'Independently authenticate exact npm publication build subject, source commit, archive SHA-256 and issuer',
 MISSING_IMMUTABLE_SOURCE_REVISION:'Recover canonical immutable version-specific upstream commit and signed publisher build subject',
 MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED:'Verify exact subpackage build tree/recipe and native LGPL distribution obligations',
 LEGACY_REPO_ORIGIN_UNTRUSTED:'Verify upstream canonical repository and immutable commit without trusting redirects'
});
const fail=code=>{throw Error('COM02_NON_DT_'+code);};
function buildNonDtWorkqueue(ledger){
 if(ledger?.schema!=='therabridge-com02-exhaustive-closure-evidence-v1'||
    ledger.status!=='NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE'||
    !Array.isArray(ledger.packages)||!ledger.counts||!ledger.sourceEvidenceSha256||
    ledger.commercialLicenseGranted!==false||ledger.g2ClinicalApproved!==false||
    ledger.g2bClinicalApproved!==false||ledger.finalThirdPartyNoticesIssued!==false)
   fail('INVALID_LEDGER');
 const c=ledger.counts;
 if(!Number.isSafeInteger(c.npmExceptionVersions)||!Number.isSafeInteger(c.definitelyTypedVersions)||
    !Number.isSafeInteger(c.otherNpmVersions)||c.definitelyTypedVersions<0||
    c.otherNpmVersions<1||c.npmExceptionVersions!==c.definitelyTypedVersions+c.otherNpmVersions||
    ledger.packages.length!==c.npmExceptionVersions||
    c.productionSaasImagesIndependentlyAuthenticated!==0||
    c.enterpriseDeliverablesIndependentlyAuthenticated!==0||
    c.packagePublicationLineagesIndependentlyAuthenticated!==0||
    c.legallyApprovedComponents!==0)fail('COUNT_OR_APPROVAL_DRIFT');
 const evidenceKeys=['rights','correspondence','bulk','definitelyTyped','candidateRelease'];
 if(evidenceKeys.some(k=>!SHA.test(ledger.sourceEvidenceSha256[k]||'')))fail('INPUT_DIGEST_MISSING');
 const unique=new Set(), rows=[], groups={};
 for(const group of Object.keys(GROUPS))groups[group]=0;
 let dt=0;
 for(const p of ledger.packages){
  if(typeof p?.name!=='string'||!p.name||typeof p.version!=='string'||!p.version||
     !SHA.test(p.publisherTarballSha256||'')||typeof p.group!=='string'||
     p.independentPublisherToSourceBuildAttestation!==false||
     p.actualSaasDistributionVerified!==false||p.actualEnterpriseDistributionVerified!==false||
     p.commercialApproval!==false||p.legalDecision!=='UNRESOLVED'||
     p.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     p.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')fail('FORGED_PACKAGE');
  const id=JSON.stringify([p.name,p.version]);
  if(unique.has(id))fail('DUPLICATE_VERSION');
  unique.add(id);
  if(p.name.startsWith('@types/')){
   if(p.group!=='DEFINITELYTYPED_HISTORICAL_RELEASE')fail('DT_CLASSIFICATION');
   dt++;continue;
  }
  if(!Object.hasOwn(GROUPS,p.group))fail('UNEXPECTED_GROUP');
  groups[p.group]++;
  if(p.group==='SOURCE_ROOT_MANIFEST_ONLY'&&!/^[a-f0-9]{40}$/.test(p.sourceCommitCandidate||''))fail('ROOT_COMMIT_MISSING');
  if(p.group!=='SOURCE_ROOT_MANIFEST_ONLY'&&p.sourceCommitCandidate!=null&&
     !/^[a-f0-9]{40}$/.test(p.sourceCommitCandidate))fail('INVALID_COMMIT_CANDIDATE');
  rows.push({name:p.name,version:p.version,category:p.group,
   sourceCommitCandidate:p.sourceCommitCandidate??null,
   publishedTarballSha256:p.publisherTarballSha256,
   nextIndependentEvidence:GROUPS[p.group],
   npmPublicationBuildAttested:false,sourceRightsApproved:false,
   saasNetworkRightsApproved:false,enterpriseRedistributionRightsApproved:false,
   actualEditionDistributionVerified:false,commerciallyCleared:false});
 }
 if(dt!==c.definitelyTypedVersions||rows.length!==c.otherNpmVersions||
    Object.entries(groups).some(([k,v])=>v!==c[k]))fail('GROUP_RECONCILIATION');
 rows.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 return {schema:'therabridge-com02-nondt-publication-evidence-workqueue-v1',
   sourceLedgerSha256:createHash('sha256').update(JSON.stringify(ledger)).digest('hex'),
   sourceEvidenceSha256:{...ledger.sourceEvidenceSha256},
   status:'BLOCKED_PENDING_INDEPENDENT_PUBLICATION_AND_RIGHTS_EVIDENCE',
   counts:{allExceptions:c.npmExceptionVersions,definitelyTypedExcluded:dt,
     nonDefinitelyTyped:rows.length,groups},
   records:rows,commercialApproval:false,saasReleaseApproved:false,enterpriseReleaseApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==4||process.argv[2]===process.argv[3])fail('USAGE_INPUT_OUTPUT');
  if(statSync(process.argv[2]).size>32*1024*1024)fail('INPUT_TOO_LARGE');
  const value=buildNonDtWorkqueue(JSON.parse(readFileSync(process.argv[2],'utf8')));
  writeFileSync(process.argv[3],JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(value.counts));
 }catch(e){console.error('COM02_NON_DT_NOT_ATTESTED',e.message);process.exitCode=1;}
}
export {buildNonDtWorkqueue};
