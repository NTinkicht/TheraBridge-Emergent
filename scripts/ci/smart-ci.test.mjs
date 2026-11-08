import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPaths,decide,decodeNameStatusNul,expectedJobs} from './smart-ci.mjs';
import {verifySmartGate} from './smart-ci-gate.mjs';
const paths=(...items)=>items.map(path=>({path,status:'M'}));
const eligible=(changes,overrides={})=>decide({changes,eventName:'pull_request',
 baseRef:'main',mode:'targeted',requiredGateReady:true,fromFork:false,...overrides});
test('documentation changes require only security scan and targeted validation',()=>{
 const x=eligible(paths('docs/roadmap/README.md','docs/handover/NEXT_WORK.md'));
 assert.equal(x.execution,'docs');assert.equal(x.required['test'],'skipped');
 assert.equal(x.required['secret-scan'],'success');
 assert.equal(x.required['smart-targeted'],'success');
});
test('CSS and public assets change selects Web + browser, not database or Docker',()=>{
 const x=eligible(paths('apps/web/src/app/globals.css','apps/web/public/logo.svg'));
 assert.equal(x.execution,'web-style');
 assert.equal(x.required['live-session'],'success');
 assert.equal(x.required['demo-journey'],'success');
 assert.equal(x.required['compose'],'skipped');
});
test('security, DB, clinical, dependencies, workflows, scripts, missing and mixed paths force full CI',()=>{
 const samples=[
 'apps/api/src/auth/auth.service.ts','apps/api/prisma/schema.prisma',
 'apps/web/src/app/api/session/route.ts','apps/web/src/app/guardian/page.tsx',
 '.github/workflows/ci.yml','scripts/ci/smart-ci.mjs','package.json','yarn.lock',
 'docs/roadmap/M4-01-66-FEATURE-CROSSWALK.csv','AGENTS.md','docs/qa/SECURITY.md',
 '.github/CODEOWNERS','Dockerfile.preview','render.yaml','apps/web/public/../bad.png'
 ];
 for(const path of samples)assert.equal(eligible(paths(path)).execution,'full',path);
 assert.equal(eligible(paths('README.md','apps/api/src/auth/auth.service.ts')).execution,'full');
 assert.equal(eligible([]).execution,'full');
 assert.equal(eligible(Array.from({length:301},(_,i)=>({path:'docs/a'+i+'.md',status:'A'}))).execution,'full');
});
test('shadow is default; pushes, forked PRs and non-main target remain full',()=>{
 const changes=paths('README.md');
 for(const override of [{mode:'shadow'},{mode:''},{mode:'targeted',requiredGateReady:false},
  {eventName:'push'},{baseRef:'release'},{fromFork:true}])
  assert.equal(eligible(changes,override).execution,'full');
});
test('unrecognized status, incomplete diff, malformed paths and deleted web styles fail closed',()=>{
 assert.equal(eligible([{path:'docs/foo.md',status:'R'}]).execution,'full');
 assert.equal(eligible([{path:'docs/foo.md',status:'A'},{path:'../secret.md',status:'A'}]).execution,'full');
 assert.equal(eligible([{path:'apps/web/public/logo.svg',status:'D'}]).execution,'full');
 assert.throws(()=>decodeNameStatusNul('M\0docs/a.md\0A\0'),/invalid_git_diff/);
 assert.throws(()=>decodeNameStatusNul('R100\0a\0b\0'),/invalid_git/);
 assert.deepEqual(decodeNameStatusNul('A\0docs/new.md\0D\0docs/old.md\0'),[
  {status:'A',path:'docs/new.md'},{status:'D',path:'docs/old.md'}]);
});
test('required gate accepts only genuine success and expected skips',()=>{
 for(const mode of ['docs','web-style','full']){
  const results=expectedJobs(mode);
  const jobs=Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{result:v}]));
  jobs['smart-plan']={result:'success',outputs:{mode}};
  assert.equal(verifySmartGate(jobs).status,'SMART_CI_POLICY_PASS');
  const required=Object.keys(results).find(k=>results[k]==='success');
  jobs[required]={result:'skipped'};
  assert.throws(()=>verifySmartGate(jobs),/required_checks_not_satisfied/);
 }
});
test('gate rejects a skipped test when full mode selected or skipped extra check run',()=>{
 const expected=expectedJobs('full');
 const jobs=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,{result:v}]));
 jobs['smart-plan']={result:'success',outputs:{mode:'full'}};
 jobs.test={result:'skipped'};
 assert.throws(()=>verifySmartGate(jobs),/required_checks_not_satisfied:test/);
 jobs.test={result:'success'};jobs['smart-targeted']={result:'success'};
 assert.throws(()=>verifySmartGate(jobs),/required_checks_not_satisfied:smart-targeted/);
});
test('gate refuses absent plan, missing jobs, misnamed modes and failures',()=>{
 assert.throws(()=>verifySmartGate({}),/plan_not_successful/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'success',outputs:{mode:'invalid'}}}),/invalid_mode/);
 assert.throws(()=>verifySmartGate({'smart-plan':{result:'failure'}}),/plan_not_successful/);
});
