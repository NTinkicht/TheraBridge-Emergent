#!/usr/bin/env node
// Independent required-status verifier; skipped jobs are NOT evidence of tests.
import {expectedJobs} from './smart-ci.mjs';

export function verifySmartGate(needs){
 if(!needs||typeof needs!=='object')throw Error('missing_needs');
 const plan=needs['smart-plan'];
 if(plan?.result!=='success')throw Error('plan_not_successful');
 const mode=plan.outputs?.mode;
 const expected=expectedJobs(mode);
 const mismatches=[];
 for(const [name,outcome] of Object.entries(expected)){
  if(needs[name]?.result!==outcome)mismatches.push(name);
 }
 if(mismatches.length)throw Error('required_checks_not_satisfied:'+mismatches.sort().join(','));
 return {mode,verified:Object.keys(expected).length,
   status:'SMART_CI_POLICY_PASS'};
}
if(process.argv[1]?.endsWith('/smart-ci-gate.mjs')){
 try{
  const data=JSON.parse(process.env.TB_SMART_NEEDS_JSON||'null');
  const result=verifySmartGate(data);
  console.log(JSON.stringify(result));
 }catch{
  console.error('Smart CI policy verification FAILED; missing/incorrect job result or plan');
  process.exitCode=1;
 }
}
