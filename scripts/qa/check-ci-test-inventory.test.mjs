import test from 'node:test';
import assert from 'node:assert/strict';
import {baseline,JOBS,coreThresholds,workflowJobNames} from './check-ci-test-inventory.mjs';
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
