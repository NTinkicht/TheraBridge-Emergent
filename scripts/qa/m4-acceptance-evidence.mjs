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
 // An absent-center UUID is not a valid second tenant.
 if(!twoTenantEvidence || twoTenantEvidence.schema!==1 ||
  twoTenantEvidence.syntheticOnly!==true ||
  twoTenantEvidence.deployedSha!==deployedSha ||
  !Number.isInteger(twoTenantEvidence.validTenantCount) ||
  twoTenantEvidence.validTenantCount<2 ||
  twoTenantEvidence.authorizedPositiveControlsPassed!==true ||
  twoTenantEvidence.crossTenantDenied===undefined ||
  twoTenantEvidence.crossTenantDenied!==true ||
  twoTenantEvidence.revocationDenied!==true ||
  twoTenantEvidence.operatorApproved!==true)
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
