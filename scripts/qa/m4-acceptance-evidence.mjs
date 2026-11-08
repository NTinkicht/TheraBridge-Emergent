// M4-F03: private hosted result qualification. This is not a hosted runner.
// Supply ONLY sanitized status artifacts from an approved protected workflow.
// Never serialize credentials, cookies, page text, child IDs, or API bodies.
import {readFileSync} from 'node:fs';
const LEGACY=['platform','admin','coordinator','speech','ot','supervisor','guardian'];
const EXTRA=['aba2','ot2','speech2'];
const SHA=/^[a-f0-9]{40}$/;
const STATUSES=['PASS','FAIL','BLOCKED'];
const secureRows=(report,kind,roles)=>{
 if(report?.schema!==1 || report.kind!==kind || !Array.isArray(report.rows)
  || report.clinicalGatesUnchanged!==true)return false;
 if(!report.counts || STATUSES.some(s=>report.counts[s]!==report.rows.filter(r=>r.status===s).length))
  return false;
 return report.rows.every(r=>r && roles.includes(r.role) &&
   STATUSES.includes(r.status) && /^[a-z_]+$/.test(r.step) &&
   /^[a-z_]+$/.test(r.reason));
};
const isPass=(report,role,step)=>
 report.rows.some(r=>r.role===role&&r.step===step&&r.status==='PASS');
export function evaluateM4HostedEvidence({legacy,extra,deployedSha,verifiedSha,
 operatorApproved=false,validTwoTenantReceipt=false}={}){
 const reasons=[];
 if(!SHA.test(deployedSha??'')||deployedSha!==verifiedSha)
  reasons.push('deployed_sha_unverified');
 if(operatorApproved!==true)reasons.push('protected_approval_missing');
 if(!secureRows(legacy,'hosted_synthetic_interactive_readonly',LEGACY))
  reasons.push('legacy_artifact_invalid');
 else{
  if(legacy.counts.FAIL||legacy.counts.BLOCKED)reasons.push('legacy_cases_not_all_pass');
  for(const role of LEGACY)
   for(const step of ['authentication','forbidden_role_read','session_cleanup'])
    if(!isPass(legacy,role,step))reasons.push('legacy_required_check_missing');
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
 if(validTwoTenantReceipt!==true)reasons.push('two_valid_tenant_test_not_verified');
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
   validTwoTenantReceipt:process.env.TB_TWO_VALID_TENANT_EVIDENCE_APPROVED==='true'
  });
  console.log(JSON.stringify(data));if(!data.qualified)process.exitCode=2;
 }catch{console.error('M4 evidence inputs unavailable or invalid');process.exitCode=2;}
}
