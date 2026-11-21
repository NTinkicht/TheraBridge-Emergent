import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {decide,expectedJobs} from '../ci/smart-ci.mjs';
import {verifySmartGate} from '../ci/smart-ci-gate.mjs';
import {measuredCoverage} from './m4-measured-coverage.mjs';

const root=resolve(import.meta.dirname,'../..');
const workflow=readFileSync(resolve(root,'.github/workflows/ci.yml'),'utf8');
const metrics=['lines','branches','functions','statements'];
const fixture=covered=>({total:Object.fromEntries(metrics.map(k=>[k,{total:10000,covered}]))});

test('the required test job measures both complete application scopes and hard-fails after archiving exact-run receipts',()=>{
 const testJob=workflow.split('\n  test:\n')[1]?.split('\n  live-session:\n')[0];
 assert.ok(testJob,'required test job missing');
 assert.match(testJob,/--collectCoverageFrom='src\/\*\*\/\*\.ts'/);
 assert.match(testJob,/m4-web-jest\.config\.cjs --runInBand/);
 assert.match(testJob,/node scripts\/qa\/m4-web-coverage-audit\.mjs/);
 assert.match(testJob,/node scripts\/qa\/m4-integrated-coverage\.mjs/);
 const integrated=testJob.indexOf('node scripts/qa/m4-integrated-coverage.mjs');
 const archived=testJob.indexOf('name: m4-08-integrated-coverage-');
 const gate=testJob.indexOf('node scripts/qa/m4-measured-coverage.mjs');
 assert.ok(integrated>=0&&archived>integrated&&gate>archived,'measurement must precede archive and mandatory gate');
 assert.match(testJob,/\.workspace\/m4-coverage\/api\/coverage-summary\.json/);
 assert.match(testJob,/\.workspace\/m4-coverage\/web-istanbul\/coverage-summary\.json/);
 const block=testJob.slice(testJob.lastIndexOf('      - name:',gate),testJob.indexOf('      - name:',gate));
 assert.doesNotMatch(block,/continue-on-error:\s*true|\|\|\s*true/);
});

test('failure of any single API or Web metric cannot be rounded or hidden',()=>{
 for(const scope of ['api','web'])for(const metric of metrics){
  const a=fixture(9000),w=fixture(9000);
  const bad=scope==='api'?a:w;
  bad.total[metric]={total:10000,covered:8999};
  const r=measuredCoverage({api:a,web:w});
  assert.equal(r.result,'FAIL');
  assert.deepEqual(r.belowThreshold,[scope+'_'+metric]);
 }
 assert.equal(measuredCoverage({api:fixture(9000),web:fixture(9000)}).result,'PASS');
});

test('missing or invalid measured evidence fails closed',()=>{
 assert.throws(()=>measuredCoverage({api:fixture(9000)}),/missing_web/);
 assert.throws(()=>measuredCoverage({api:fixture(9000),web:{total:{}}}),/invalid_coverage/);
 assert.throws(()=>measuredCoverage({api:fixture(9000),web:fixture(10001)}),/invalid_coverage/);
});

test('every PR including docs and style changes requires the full test and security job matrix',()=>{
 for(const file of ['docs/handover/NEXT_WORK.md','apps/web/src/globals.css','apps/api/src/app.module.ts']){
  const p=decide({changes:[{path:file,status:'M'}],eventName:'pull_request',baseRef:'main',
    mode:'targeted',requiredGateReady:true,fromFork:false,ownerPolicyApproved:true});
  assert.equal(p.execution,'full');
  assert.equal(p.required.test,'success');
  const jobs=Object.fromEntries(Object.entries(expectedJobs('full')).map(([k,v])=>[k,{result:v}]));
  jobs['smart-plan']={result:'success',outputs:{mode:'full'}};
  assert.equal(verifySmartGate(jobs).status,'SMART_CI_POLICY_PASS');
  jobs['smart-plan'].outputs.mode='docs';
  assert.throws(()=>verifySmartGate(jobs),/mandatory_full_coverage_required/);
 }
});
