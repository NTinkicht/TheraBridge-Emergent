import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPaths,decide,decodeNameStatusNul,expectedJobs} from './smart-ci.mjs';
import {verifySmartGate} from './smart-ci-gate.mjs';
const paths=(...items)=>items.map(path=>({path,status:'M'}));
const selected=(changes,overrides={})=>decide({changes,eventName:'pull_request',
 baseRef:'main',mode:'targeted',requiredGateReady:true,fromFork:false,
 ownerPolicyApproved:true,...overrides});

test('EVERY PR, including docs-only and CSS-only, executes the full eight-metric coverage CI job',()=>{
 for(const changes of [
  paths('docs/roadmap/README.md','docs/handover/NEXT_WORK.md'),
  paths('apps/web/src/app/globals.css','apps/web/public/logo.png'),
  paths('apps/api/src/auth/auth.service.ts'),
  paths('apps/web/src/app/guardian/page.tsx'),
  paths('.github/workflows/ci.yml'),
  [],
 ]) {
  const x=selected(changes);
  assert.equal(x.execution,'full');
  assert.equal(x.reason,'mandatory_full_90_percent_api_web_coverage');
  assert.equal(x.required.test,'success');
  for(const job of ['secret-scan','sbom','commercial-provenance','commercial-contracts',
     'source-contracts','live-session','demo-journey','m5-child360-browser',
     'compose','preview-container'])assert.equal(x.required[job],'success',job);
  assert.equal(x.required['smart-targeted'],'skipped');
 }
});

test('CI settings, fork, event, base and owner approval cannot bypass full 90% coverage',()=>{
 const cases=[
  {mode:'shadow'},{mode:''},{mode:'targeted',requiredGateReady:false},
  {eventName:'push'},{baseRef:'release'},{fromFork:true},
  {ownerPolicyApproved:false},
 ];
 for(const option of cases) assert.equal(selected(paths('README.md'),option).execution,'full');
});

test('the path classifier remains conservative for future risk diagnostics',()=>{
 assert.equal(classifyPaths(paths('docs/a.md')).candidate,'docs');
 assert.equal(classifyPaths(paths('apps/web/src/globals.css')).candidate,'web-style');
 for(const x of ['AGENTS.md','apps/web/public/logo.svg','scripts/ci/smart-ci.mjs',
   'apps/api/prisma/schema.prisma','../bad.md']){
  assert.equal(classifyPaths(paths(x)).candidate,'full',x);
 }
 assert.equal(classifyPaths([]).candidate,'full');
 assert.equal(classifyPaths(Array.from({length:301},(_,i)=>({path:'docs/a'+i+'.md',status:'A'}))).candidate,'full');
});

test('malformed Git changes fail closed',()=>{
 assert.throws(()=>decodeNameStatusNul('M\\0docs/a.md\\0A\\0'),/invalid_git_diff/);
 assert.throws(()=>decodeNameStatusNul('R100\\0a\\0b\\0'),/invalid_git/);
 assert.deepEqual(decodeNameStatusNul('A\\0docs/new.md\\0D\\0docs/old.md\\0'),[
  {status:'A',path:'docs/new.md'},{status:'D',path:'docs/old.md'}]);
});

test('final Smart CI gate accepts only all genuinely successful full checks',()=>{
 const expected=expectedJobs('full');
 const jobs=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,{result:v}]));
 jobs['smart-plan']={result:'success',outputs:{mode:'full'}};
 assert.equal(verifySmartGate(jobs).status,'SMART_CI_POLICY_PASS');
 for(const name of Object.keys(expected).filter(k=>expected[k]==='success')){
  const bad={...jobs,[name]:{result:'skipped'}};
  assert.throws(()=>verifySmartGate(bad),/required_checks_not_satisfied/);
 }
 const bad={...jobs,'smart-targeted':{result:'success'}};
 assert.throws(()=>verifySmartGate(bad),/required_checks_not_satisfied/);
});

test('final gate rejects formerly optional docs/web-style plans regardless of green subset',()=>{
 for(const mode of ['docs','web-style']){
  const expected=expectedJobs(mode);
  const jobs=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,{result:v}]));
  jobs['smart-plan']={result:'success',outputs:{mode}};
  assert.throws(()=>verifySmartGate(jobs),/mandatory_full_coverage_required/);
 }
});

test('final gate rejects absent plan or invalid modes',()=>{
 assert.throws(()=>verifySmartGate({}),/plan_not_successful/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'success',outputs:{mode:'invalid'}}}),/mandatory_full_coverage_required/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'failure'}}),/plan_not_successful/);
});
