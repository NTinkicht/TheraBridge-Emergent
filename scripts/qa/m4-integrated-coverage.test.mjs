import test from 'node:test';
import assert from 'node:assert/strict';
import {integratedReceipt} from './m4-integrated-coverage.mjs';
const metrics=['lines','branches','functions','statements'];
const sha='a'.repeat(40);
function fixture(covered=90){
 const row=Object.fromEntries(metrics.map(x=>[x,{total:100,covered,skipped:0,pct:covered}]));
 return {api:{total:structuredClone(row),'/repo/apps/api/src/a.ts':structuredClone(row)},
 web:{total:structuredClone(row),'/repo/apps/web/src/a.ts':structuredClone(row)},
 webAudit:{kind:'m4_web_full_source_instrumented_baseline_not_release_gate',
  sourceFileCount:1,instrumentedFileCount:1,zeroStatementCoverageFiles:covered?0:1,
  percentages:Object.fromEntries(metrics.map(x=>[x,covered])),
  below95:covered<95?[...metrics]:[]},
 runId:'12345',sha};
}
test('publishes honest measured shortfalls for both APIs and Web, never autoapproves release',()=>{
 const x=integratedReceipt(fixture());
 assert.deepEqual(x.belowThreshold,['api_lines','api_branches','api_functions','api_statements',
   'web_lines','web_branches','web_functions','web_statements']);
 assert.equal(x.m4_08_gate,'NOT_QUALIFIED');
 assert.equal(x.scope.webSourceFiles,1);
});
test('even 100% measured does not constitute clinical release approval',()=>{
 const x=integratedReceipt(fixture(100));
 assert.deepEqual(x.belowThreshold,[]);
 assert.equal(x.reason,'independent_release_approval_pending');
});
test('reject missing files, tampered scope, wrong aggregate and audit mismatch',()=>{
 const x=fixture();
 delete x.web['/repo/apps/web/src/a.ts'];
 assert.throws(()=>integratedReceipt(x),/incomplete_source_scope/);
 const y=fixture();y.webAudit.instrumentedFileCount=2;
 assert.throws(()=>integratedReceipt(y),/unqualified_web_source_audit/);
 const z=fixture();z.webAudit.percentages.lines=99;
 assert.throws(()=>integratedReceipt(z),/web_audit_metric_mismatch/);
 const k=fixture();k.webAudit.below95=[];
 assert.throws(()=>integratedReceipt(k),/web_audit_threshold_mismatch/);
});
test('reject absent exact SHA, run ID and invalid counters',()=>{
 const x=fixture();x.sha='not-a-sha';
 assert.throws(()=>integratedReceipt(x),/missing_exact_execution_provenance/);
 const y=fixture();y.api.total.lines.covered=110;
 assert.throws(()=>integratedReceipt(y),/invalid_coverage/);
});
