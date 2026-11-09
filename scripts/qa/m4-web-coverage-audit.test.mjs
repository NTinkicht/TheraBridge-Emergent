import test from 'node:test';
import assert from 'node:assert/strict';
import { auditWebCoverage } from './m4-web-coverage-audit.mjs';
const root = '/repo/apps/web/src';
const paths = [root+'/lib/a.ts', root+'/app/page.tsx'];
const fields = (total=10,covered=10) => Object.fromEntries(['lines','branches','functions','statements'].map(m=>[m,{total,covered,pct:covered*100/total,skipped:0}]));
const fixture = () => ({
  [paths[0]]: fields(10,10),
  [paths[1]]: fields(10,0),
  total: fields(20,10),
});
const inspect = summary => auditWebCoverage({summary,sourcePaths:paths,webRoot:root});
test('real coverage totals include zero-executed source files and truthfully fail target',()=>{
 const report=inspect(fixture());
 assert.equal(report.instrumentedFileCount,2);
 assert.equal(report.zeroStatementCoverageFiles,1);
 assert.equal(report.percentages.branches,50);
 assert.deepEqual(report.below95,['lines','branches','functions','statements']);
 assert.equal(report.m4_08_gate,'NOT_QUALIFIED');
});
test('omitting an unexecuted file cannot improve the reported denominator',()=>{
 const s=fixture(); delete s[paths[1]];
 assert.throws(()=>inspect(s),/source_denominator_missing/);
});
test('aggregate totals cannot be manipulated independently',()=>{
 const s=fixture(); s.total.statements.covered=20;
 assert.throws(()=>inspect(s),/aggregate_mismatch_statements/);
});
test('unexpected instrumented sources, duplicate source paths, empty inputs fail closed',()=>{
 const s=fixture();s[root+'/lib/unknown.ts']=fields(10,0);
 assert.throws(()=>inspect(s),/unexpected_instrumented_source/);
 assert.throws(()=>auditWebCoverage({summary:fixture(),sourcePaths:[paths[0],paths[0]],webRoot:root}),/duplicate_source_path/);
 assert.throws(()=>inspect({total:fields(20,10)}),/source_denominator_missing/);
});
test('invalid counters and zero denominator fail closed',()=>{
 const s=fixture(); s[paths[0]].branches.covered=11;
 assert.throws(()=>inspect(s),/invalid_branches/);
 const t=fixture();t.total.lines.total=0;
 assert.throws(()=>inspect(t),/invalid_lines/);
});
test('modules without branches may truthfully have zero branch totals',()=>{
 const s=fixture();
 s[paths[0]].branches={total:0,covered:0,pct:100};
 s.total.branches.total=10;s.total.branches.covered=0;
 const out=inspect(s);
 assert.equal(out.percentages.branches,0);
});
