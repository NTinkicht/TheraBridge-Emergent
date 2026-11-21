// M4-F03: private hosted result qualification. This is not a hosted runner.
// Supply ONLY sanitized status artifacts from an approved protected workflow.
// Never serialize credentials, cookies, page text, child IDs, or API bodies.
import {readFileSync} from 'node:fs';
import {ROLES} from './hosted-readonly.mjs';
const LEGACY=['platform','admin','coordinator','speech','ot','supervisor','guardian'];
const EXTRA=['aba2','ot2','speech2'];
const SHA=/^[a-f0-9]{40}$/;
const STATUSES=['PASS','FAIL','BLOCKED'];
const READ_ONLY_EXCLUSIONS=Object.freeze({
 form_submission_validation:'no_mutating_submission_authorized',
 clinical_or_ai_draft_review:'clinical_gate_and_review_not_exercised'
});
// The legacy runner emits exactly these two excluded cases per role.
// Preserve them as BLOCKED: no clinical mutation/draft may be fabricated
// as a PASS just to qualify the protected read-only acceptance.
const allowedReadOnlyBlock=(row)=>
 Object.hasOwn(READ_ONLY_EXCLUSIONS,row.step) &&
 row.reason===READ_ONLY_EXCLUSIONS[row.step];

const secureRows=(report,kind,roles)=>{
 if(report?.schema!==1 || report.kind!==kind || !Array.isArray(report.rows)
  || report.clinicalGatesUnchanged!==true)return false;
 if(!report.counts || STATUSES.some(s=>report.counts[s]!==report.rows.filter(r=>r.status===s).length))
  return false;
 return report.rows.every(r=>r && roles.includes(r.role) &&
   STATUSES.includes(r.status) &&
   (/^[a-z_]+$/.test(r.step) || /^link:\/app(?:\/[a-z-]+)*$/.test(r.step)) &&
   /^[a-z_]+$/.test(r.reason));
};
// A handful of caller-supplied true booleans cannot establish a hosted
// second tenant or revocation. Require individually attributable, same-run
// observable checks. Even a schema-valid receipt needs external operator
// corroboration and is NOT a cryptographic attestation by this validator.
const TWO_TENANT_STEPS=Object.freeze([
 'authorized_center_a','authorized_center_b',
 'cross_center_a_to_b_denied','cross_center_b_to_a_denied',
 'foreign_child_masked','stale_therapist_revoked',
 'guardian_grant_withdrawn','expired_session_denied'
]);
export function validTwoTenantReceipt(value,sha,protectedRunId){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    value.schema!==2||value.kind!=='protected_two_tenant_synthetic_receipt'||
    value.syntheticOnly!==true||value.deployedSha!==sha||
    value.protectedRunId!==protectedRunId||
    value.operatorApproved!==true||
    value.validTenantCount!==2||
    value.disposableFixtureVerified!==true||
    value.twoDistinctActiveCentersVerified!==true||
    value.clinicalGatesUnchanged!==true||
    !Array.isArray(value.checks)||value.checks.length!==TWO_TENANT_STEPS.length)
   return false;
 const found=new Set();
 for(const check of value.checks){
   if(!check||typeof check!=='object'||Array.isArray(check)||
      !TWO_TENANT_STEPS.includes(check.step)||found.has(check.step)||
      check.status!=='PASS'||
      check.actorAuthenticated!==(check.step!=='expired_session_denied')||
      check.existingTargetVerified!==true||
      typeof check.httpStatus!=='number'||!Number.isInteger(check.httpStatus))
     return false;
   if(check.step.startsWith('authorized_')){
     if(check.httpStatus!==200)return false;
   }else if(check.step==='expired_session_denied'){
     if(check.httpStatus!==401)return false;
   }else if(![403,404].includes(check.httpStatus))return false;
   found.add(check.step);
 }
 return found.size===TWO_TENANT_STEPS.length;
}

const isPass=(report,role,step)=>
 report.rows.some(r=>r.role===role&&r.step===step&&r.status==='PASS');
export function evaluateM4HostedEvidence({legacy,extra,deployedSha,verifiedSha,
 operatorApproved=false,twoTenantEvidence=null}={}){
 const reasons=[];
 if(!SHA.test(deployedSha??'')||deployedSha!==verifiedSha)
  reasons.push('deployed_sha_unverified');
 if(operatorApproved!==true)reasons.push('protected_approval_missing');
 // Both independent runner outputs must attest to one protected run and one
 // operator-supplied deployment SHA. The operator must still verify Render.
 if(!SHA.test(legacy?.deployedSha??'') || legacy.deployedSha!==deployedSha ||
    !SHA.test(extra?.deployedSha??'') || extra.deployedSha!==deployedSha ||
    !/^[0-9]+$/.test(legacy?.protectedRunId??'') ||
    legacy.protectedRunId!==extra?.protectedRunId)
  reasons.push('account_reports_deployment_provenance_invalid');
 if(!secureRows(legacy,'hosted_synthetic_interactive_readonly',LEGACY))
  reasons.push('legacy_artifact_invalid');
 else{
  if(legacy.counts.FAIL)reasons.push('legacy_cases_not_all_pass');
  if(legacy.rows.some(row=>row.status==='BLOCKED'&&!allowedReadOnlyBlock(row)))
   reasons.push('legacy_unexpected_blocked_check');
  for(const role of LEGACY){
   for(const [step,reason] of Object.entries(READ_ONLY_EXCLUSIONS)){
    const matches=legacy.rows.filter(row=>row.role===role&&row.step===step);
    if(matches.length!==1||matches[0].status!=='BLOCKED'||matches[0].reason!==reason)
     reasons.push('legacy_read_only_exclusion_invalid');
   }
  }
  for(const role of LEGACY){
   for(const step of ['authentication','forbidden_role_read','session_cleanup'])
    if(!isPass(legacy,role,step))reasons.push('legacy_required_check_missing');
   // Every positive, role-allowed navigation actually tested by the
   // seven-account runner must pass, not merely login and forbidden-route probes.
   // Reuse its canonical route contract to avoid drifting from the producer.
   for(const route of ROLES[role].routes.filter(route=>route!=='/app'))
    if(!isPass(legacy,role,'link:'+route))
     reasons.push('legacy_authorized_navigation_missing');
  }
 }
 if(!secureRows(extra,'hosted_extra_therapists_private_readonly',EXTRA)
    ||extra.syntheticOnly!==true||extra.checksExpected!==3)
  reasons.push('extra_artifact_invalid');
 else{
  if(extra.counts.FAIL||extra.counts.BLOCKED)reasons.push('extra_cases_not_all_pass');
  for(const role of EXTRA)
   for(const step of ['authentication','role_context','assigned_children','own_clinical_read',
     'cross_assignment_denial','session_still_valid','session_cleanup'])
    if(!isPass(extra,role,step))reasons.push('extra_required_check_missing');
 }
 // A synthetic fixture pass cannot be used as a hosted acceptance receipt.
 if(!validTwoTenantReceipt(twoTenantEvidence,deployedSha,legacy?.protectedRunId))
   reasons.push('two_valid_tenant_test_not_verified');
 return {qualified:reasons.length===0,reasons:[...new Set(reasons)].sort(),
  accountsExpected:10,clinicalActivationAuthorized:false};
}
if(process.argv[1]?.endsWith('/m4-acceptance-evidence.mjs')){
 try{
  const [legacyPath,extraPath,sha]=process.argv.slice(2);
  if(!legacyPath||!extraPath||!SHA.test(sha??''))throw Error('sanitized_inputs_required');
  const data=evaluateM4HostedEvidence({
   legacy:JSON.parse(readFileSync(legacyPath,'utf8')),
   extra:JSON.parse(readFileSync(extraPath,'utf8')),
   deployedSha:sha,verifiedSha:process.env.TB_OPERATOR_VERIFIED_DEPLOYED_SHA,
   operatorApproved:process.env.TB_PROTECTED_QA_APPROVED==='true',
   twoTenantEvidence:process.env.TB_TWO_VALID_TENANT_RECEIPT_FILE
    ? JSON.parse(readFileSync(process.env.TB_TWO_VALID_TENANT_RECEIPT_FILE,'utf8')) : null
  });
  console.log(JSON.stringify(data));if(!data.qualified)process.exitCode=2;
 }catch{console.error('M4 evidence inputs unavailable or invalid');process.exitCode=2;}
}
