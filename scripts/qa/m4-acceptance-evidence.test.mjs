import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateM4HostedEvidence} from './m4-acceptance-evidence.mjs';
const oldRoles=['platform','admin','coordinator','speech','ot','supervisor','guardian'];
const newRoles=['aba2','ot2','speech2'];
const requiredOld=['authentication','forbidden_role_read','session_cleanup'];
const requiredNew=['authentication','role_context','assigned_children','own_clinical_read','cross_assignment_denial','session_still_valid','session_cleanup'];
const make=(roles,steps,kind)=> {
 const rows=roles.flatMap(role=>steps.map(step=>({role,step,status:'PASS',reason:'synthetic_pass'})));
 return {schema:1,kind,clinicalGatesUnchanged:true,syntheticOnly:true,
  checksExpected:3,rows,counts:{PASS:rows.length,FAIL:0,BLOCKED:0}};
};
const fixture=()=>{
 const sha='a'.repeat(40);
 return {legacy:make(oldRoles,requiredOld,'hosted_synthetic_interactive_readonly'),
  extra:make(newRoles,requiredNew,'hosted_extra_therapists_private_readonly'),
  deployedSha:sha,verifiedSha:sha,operatorApproved:true,
  twoTenantEvidence:{schema:1,syntheticOnly:true,deployedSha:sha,validTenantCount:2,
   authorizedPositiveControlsPassed:true,crossTenantDenied:true,revocationDenied:true,operatorApproved:true}};
};
test('complete synthetic status contract qualifies only with external approval and two valid tenants',()=>{
 const result=evaluateM4HostedEvidence(fixture());
 assert.equal(result.qualified,true);
 assert.equal(result.accountsExpected,10);
 assert.equal(result.clinicalActivationAuthorized,false);
});
test('default and missing protected evidence always block M4 closure',()=>{
 assert.equal(evaluateM4HostedEvidence().qualified,false);
 const input=fixture();
 delete input.twoTenantEvidence;
 assert.deepEqual(evaluateM4HostedEvidence(input).reasons,['two_valid_tenant_test_not_verified']);
});
test('expired deployment identity, missing roles and a 401 masquerading as PASS do not qualify',()=>{
 const input=fixture();
 input.verifiedSha='b'.repeat(40);
 assert.equal(evaluateM4HostedEvidence(input).qualified,false);
 input.verifiedSha=input.deployedSha;
 input.extra.rows=input.extra.rows.filter(x=>x.role!=='speech2');
 input.extra.counts.PASS=input.extra.rows.length;
 assert(evaluateM4HostedEvidence(input).reasons.includes('extra_required_check_missing'));
});
test('FAIL, BLOCKED, fabricated role and tampered counts fail closed',()=>{
 const input=fixture();
 input.legacy.rows[0].status='FAIL';
 input.legacy.counts={PASS:input.legacy.rows.length-1,FAIL:1,BLOCKED:0};
 assert(evaluateM4HostedEvidence(input).reasons.includes('legacy_cases_not_all_pass'));
 input.legacy.rows[0].role='unknown';
 assert(evaluateM4HostedEvidence(input).reasons.includes('legacy_artifact_invalid'));
 input.legacy.rows[0].role='platform';
 input.legacy.counts.PASS+=1;
 assert(evaluateM4HostedEvidence(input).reasons.includes('legacy_artifact_invalid'));
});

test('independent tenant receipt cannot be reduced to a boolean or wrong deployment',()=>{
 const input=fixture();
 input.twoTenantEvidence=true;
 assert(evaluateM4HostedEvidence(input).reasons.includes('two_valid_tenant_test_not_verified'));
 input.twoTenantEvidence=fixture().twoTenantEvidence;
 input.twoTenantEvidence.deployedSha='b'.repeat(40);
 assert(evaluateM4HostedEvidence(input).reasons.includes('two_valid_tenant_test_not_verified'));
 input.twoTenantEvidence=fixture().twoTenantEvidence;
 input.twoTenantEvidence.crossTenantDenied=false;
 assert(evaluateM4HostedEvidence(input).reasons.includes('two_valid_tenant_test_not_verified'));
});
