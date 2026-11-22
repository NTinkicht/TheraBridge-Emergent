import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyPaths,decide,decodeNameStatusNul,expectedJobs} from './smart-ci.mjs';
import {verifySmartGate} from './smart-ci-gate.mjs';
const paths=(...items)=>items.map(path=>({path,status:'M'}));
const selected=(changes,overrides={})=>decide({changes,eventName:'pull_request',
 baseRef:'main',mode:'targeted',requiredGateReady:true,fromFork:false,
 ownerPolicyApproved:true,...overrides});

test('Every code or executable-style PR still executes the full eight-metric coverage CI job',()=>{
 for(const changes of [
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

test('CI settings, fork, event, base and absent owner approval cannot bypass full coverage',()=>{
 const cases=[
  {mode:'shadow'},{mode:''},{mode:'targeted',requiredGateReady:false},
  {eventName:'push'},{baseRef:'release'},{fromFork:true},
  {ownerPolicyApproved:false},
 ];
 for(const option of cases) assert.equal(selected(paths('apps/web/src/components/clinical/SessionEditor.tsx'),option).execution,'full');
});

test('the path classifier remains conservative for future risk diagnostics',()=>{
 assert.equal(classifyPaths(paths('docs/roadmap/a.md')).candidate,'docs');
 assert.equal(classifyPaths(paths('docs/commercial/launch-decision-register.md')).candidate,'full');
 assert.equal(classifyPaths(paths('docs/qa/TEST_RESULTS.md')).candidate,'full');
 assert.equal(classifyPaths(paths('apps/web/src/globals.css')).candidate,'web-style');
 for(const x of ['AGENTS.md','apps/web/public/logo.svg','scripts/ci/smart-ci.mjs',
   'apps/api/prisma/schema.prisma','../bad.md']){
  assert.equal(classifyPaths(paths(x)).candidate,'full',x);
 }
 assert.equal(classifyPaths([]).candidate,'full');
 assert.equal(classifyPaths(Array.from({length:301},(_,i)=>({path:'docs/a'+i+'.md',status:'A'}))).candidate,'full');
});

test('malformed Git changes fail closed',()=>{
 assert.throws(()=>decodeNameStatusNul('M\0docs/a.md\0A\0'),/invalid_git_diff/);
 assert.throws(()=>decodeNameStatusNul('R100\0a\0b\0'),/invalid_git/);
 assert.deepEqual(decodeNameStatusNul('A\0docs/new.md\0D\0docs/old.md\0'),[
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

test('final gate rejects web-style shortcut even if a subset appears green',()=>{
 for(const mode of ['web-style']){
  const expected=expectedJobs(mode);
  const jobs=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,{result:v}]));
  jobs['smart-plan']={result:'success',outputs:{mode}};
  assert.throws(()=>verifySmartGate(jobs),/unsupported_ci_plan/);
 }
});

test('owner-approved documentation-only PR uses strict reduced matrix and no coverage claims',()=>{
 const safe=selected(paths('docs/roadmap/M5-README.md','docs/handover/NEXT_WORK.md'));
 assert.equal(safe.execution,'docs');
 assert.equal(safe.candidate,'docs');
 assert.equal(safe.reason,'owner_approved_safe_docs_only');
 assert.equal(safe.required['secret-scan'],'success');
 assert.equal(safe.required['sbom'],'success');
 assert.equal(safe.required['smart-targeted'],'success');
 for(const job of ['test','commercial-provenance','commercial-contracts','compose','preview-container','live-session'])
  assert.equal(safe.required[job],'skipped',job);
 const expected=expectedJobs('docs');
 const needs=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,{result:v}]));
 needs['smart-plan']={result:'success',outputs:{mode:'docs'}};
 assert.equal(verifySmartGate(needs).status,'SMART_CI_DOCS_POLICY_PASS');
 needs['sbom']={result:'skipped'};
 assert.throws(()=>verifySmartGate(needs),/required_checks_not_satisfied/);
});
test('docs exception fails closed for forks, unknown paths, deleted docs, mixed code, policy and evidence',()=>{
 for(const changes of [
  paths('docs/roadmap/a.md','apps/web/src/app/page.tsx'),
  paths('docs/commercial/rights.md'),paths('docs/qa/TEST_RESULTS.md'),
  paths('AGENTS.md'),paths('.github/workflows/ci.yml'),
  paths('scripts/ci/smart-ci.mjs'),
  [{path:'docs/handover/NEXT_WORK.md',status:'D'}],
  [],
 ])assert.equal(selected(changes).execution,'full',JSON.stringify(changes));
 for(const overrides of [
  {fromFork:true},{eventName:'push'},{baseRef:'release'},{ownerPolicyApproved:false},
 ])assert.equal(selected(paths('README.md'),overrides).execution,'full');
});
test('final gate rejects absent plan or invalid modes',()=>{
 assert.throws(()=>verifySmartGate({}),/plan_not_successful/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'success',outputs:{mode:'invalid'}}}),/mandatory_full_coverage_required/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'failure'}}),/plan_not_successful/);
});

test('CI triggers once for feature PR commits but still fully qualifies main and manual dispatch',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(workflow,/^on:\n  push:\n    branches: \["main"\]\n  pull_request:\n  workflow_dispatch:/m);
 assert.doesNotMatch(workflow,/branches:\s*\["\*\*"\]/);
 assert.match(workflow,/if: needs\.smart-plan\.outputs\.mode == 'full'/);
 assert.equal(selected(paths('apps/web/src/components/clinical/SessionEditor.tsx')).execution,'full');
 assert.equal(selected(paths('docs/roadmap/README.md')).execution,'docs');
});
