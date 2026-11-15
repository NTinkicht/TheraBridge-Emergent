#!/usr/bin/env node
// Non-authorizing public release register. This verifier must never infer legal authority.
import {readFileSync} from 'node:fs';
const base=['ipChainOfTitle','contractingEntity','assetRights','counselApproval','ownerApproval'];
const editions=Object.freeze({
 SAAS:[...base,'saasContract','privacyDpa','thirdPartyNetworkRights','saasReleaseScope'],
 ENTERPRISE:[...base,'enterpriseContract','thirdPartyRedistributionRights','enterpriseReleaseScope','thirdPartyNotices']
});
const keys=(v,a)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===a.length&&a.every(k=>Object.hasOwn(v,k));
function assess(r){
 if(!keys(r,['schema','scope','lastReviewed','editions','clinical','commercialLicenseGranted','finalThirdPartyNoticesIssued']) ||
    r.schema!=='therabridge-commercial-launch-decision-register-v1'||
    r.scope!=='NON_AUTHORIZING_PUBLIC_TRACKING_ONLY'||
    !/^20\d{2}-\d{2}-\d{2}$/.test(r.lastReviewed)||
    r.commercialLicenseGranted!==false||r.finalThirdPartyNoticesIssued!==false||
    !keys(r.clinical,['g2','g2b','realPatientProcessingAllowed','consentOrReportReleaseAllowed'])||
    r.clinical.g2!=='NO_GO'||r.clinical.g2b!=='NO_GO'||
    r.clinical.realPatientProcessingAllowed!==false||
    r.clinical.consentOrReportReleaseAllowed!==false||
    !keys(r.editions,['SAAS','ENTERPRISE']))throw Error('UNTRUSTED_COMMERCIAL_REGISTER');
 const output={schema:'therabridge-commercial-launch-gate-assessment-v1',
   status:'BLOCKED',commercialAuthorization:false,clinicalAuthorization:false,editions:{}};
 for(const [edition,required] of Object.entries(editions)){
  const e=r.editions[edition];
  if(!keys(e,['status','releaseDigest','required','evidence'])||
     e.status!=='BLOCKED'||e.releaseDigest!==null||
     !Array.isArray(e.required)||e.required.length!==required.length||
     new Set(e.required).size!==required.length||
     !required.every(x=>e.required.includes(x))||
     !keys(e.evidence,[]))throw Error('UNTRUSTED_'+edition+'_APPROVAL');
  output.editions[edition]={status:'BLOCKED',missingEvidence:required,
    releaseDigestIndependentlyAttested:false,rightsHolderApproved:false,
    counselApproved:false,commercialLicenseGranted:false};
 }
 return output;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==3)throw Error('USAGE: verify-launch-decision.mjs public-register.json');
  console.log(JSON.stringify(assess(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
 }catch(e){console.error('COM_LAUNCH_REGISTER_FAILED',e.message);process.exitCode=1;}
}
export {assess};
