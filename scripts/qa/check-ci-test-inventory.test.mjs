import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,JOBS,coreThresholds,workflowJobNames,compareSuiteInventory} from './check-ci-test-inventory.mjs';
test('all six exact-head CI jobs remain named and both API/web test runners exist',()=>{
 const x=baseline();
 assert.equal(x.kind,'qa_suite_inventory_not_coverage');
 assert(x.api_suite_count>=30);
 assert(x.web_suite_count>=2);
 assert.deepEqual(x.six_required_jobs,JOBS);
});
test('never claim measured 95% application coverage from suite presence',()=>{
 const x=baseline();
 assert.equal(x.application_wide_coverage_percent,null);
 assert.equal(x.application_wide_95_percent_gate,false);
 assert.equal(x.existing_core_thresholds.statements,95);
 assert.equal(x.existing_core_thresholds.branches,90);
});

test('rejects a weakened individual fingerprint threshold even if other numbers are still 95 and 90',()=>{
 const good="jest --coverage --collectCoverageFrom=src/common/fingerprints.ts --coverageThreshold='{\"global\":{\"statements\":95,\"branches\":90,\"functions\":95,\"lines\":95}}'";
 assert.deepEqual(coreThresholds(good),{statements:95,branches:90,functions:95,lines:95});
 const weak=good.replace('\"statements\":95','\"statements\":0');
 assert.throws(()=>coreThresholds(weak),/Weakened statements/);
 assert.throws(()=>coreThresholds(good.replace('fingerprints.ts','other.ts')),/collection scope/);
});
test('rejects env.compose pretending to be a required CI job',()=>{
 const yaml="name: ci\nenv:\n  compose: test\njobs:\n  test:\n    runs-on: ubuntu-latest\n  secret-scan:\n    runs-on: ubuntu-latest\n";
 const parsed=workflowJobNames(yaml);
 assert(parsed.has('test'));
 assert(!parsed.has('compose'));
 assert(!parsed.has('live-session'));
});

test('reviewed suite snapshot rejects deletion and rename without broadening count floors',()=>{
 const pinned=['alpha.e2e-spec.ts','beta.e2e-spec.ts'];
 assert.deepEqual(compareSuiteInventory(pinned,[...pinned],'API'),[]);
 assert.throws(()=>compareSuiteInventory(pinned,['beta.e2e-spec.ts'],'API'),/alpha.e2e-spec.ts/);
 assert.throws(()=>compareSuiteInventory(pinned,['alpha-renamed.e2e-spec.ts','beta.e2e-spec.ts'],'API'),/alpha.e2e-spec.ts/);
 // A new suite is accepted but surfaced for baseline review.
 assert.deepEqual(compareSuiteInventory(pinned,[...pinned,'gamma.e2e-spec.ts'],'API'),['gamma.e2e-spec.ts']);
 assert.throws(()=>compareSuiteInventory(['beta.e2e-spec.ts','alpha.e2e-spec.ts'],pinned,'API'),/Invalid API suite snapshot/);
 assert.throws(()=>compareSuiteInventory(['alpha.e2e-spec.ts','alpha.e2e-spec.ts'],pinned,'API'),/Invalid API suite snapshot/);
});
test('real repository inventory preserves frozen suites while permitting reported additions',()=>{
 const report=baseline(); // throws if ANY pinned suite was deleted or renamed
 assert(report.api_suite_count>=32);
 assert(report.web_suite_count>=2);
 assert(Array.isArray(report.newly_added_api_suites));
 assert(Array.isArray(report.newly_added_web_suites));
 assert.equal(report.api_suite_count,32+report.newly_added_api_suites.length);
 assert.equal(report.web_suite_count,2+report.newly_added_web_suites.length);
 assert.equal(report.application_wide_coverage_percent,null);
});
