import test from 'node:test';
import assert from 'node:assert/strict';
import {reportBaseline} from './m4-app-coverage-baseline.mjs';
const full=(p=90)=>({total:Object.fromEntries(['lines','branches','functions','statements']
 .map(k=>[k,{total:100,covered:p}])),
 'apps/api/src/auth/auth.service.ts':{}});
test('full API source coverage is measured and its shortfalls are explicit',()=>{
 const x=reportBaseline({apiSummary:full(89),webSourceCount:130,webInstrumentedPaths:[]});
 assert.equal(x.api.instrumentedFileCount,1);
 assert.equal(x.api.percentages.lines,89);
 assert.deepEqual(x.api.below90,['lines','branches','functions','statements']);
 assert.equal(x.web.istanbulCoverageMeasured,false);
 assert.equal(x.web.percentages,null);
 assert.equal(x.m4_08_gate,'NOT_QUALIFIED');
});
test('a 100% single-side API score still cannot qualify uninstrumented Web',()=>{
 const x=reportBaseline({apiSummary:full(100),webSourceCount:100,webInstrumentedPaths:['file:///repo/apps/web/src/app/index.js']});
 assert.deepEqual(x.api.below90,[]);
 assert.equal(x.web.observedRuntimeModuleCount,1);
 assert.equal(x.m4_08_gate,'NOT_QUALIFIED');
});
test('missing application scope, invalid percent or missing Web source inventory fails closed',()=>{
 assert.throws(()=>reportBaseline({apiSummary:{total:full().total},webSourceCount:1}),/missing_api_source/);
 assert.throws(()=>reportBaseline({apiSummary:full(),webSourceCount:0}),/missing_coverage_inputs/);
 const bad=full();bad.total.lines.covered=101;
 assert.throws(()=>reportBaseline({apiSummary:bad,webSourceCount:1}),/invalid_measured/);
});

test('uses independently audited Web Istanbul percentages when coverage is actually measured',()=>{
 const row=Object.fromEntries(['lines','branches','functions','statements'].map(k=>[k,{total:100,covered:5}]));
 const web={total:row,'/repo/apps/web/src/lib/a.ts':row};
 const audit={kind:'m4_web_full_source_instrumented_baseline_not_release_gate',
  sourceFileCount:1,instrumentedFileCount:1,
  percentages:{lines:5,branches:5,functions:5,statements:5},
  below90:['lines','branches','functions','statements']};
 const out=reportBaseline({apiSummary:full(),webSourceCount:1,
  webInstrumentedPaths:[],webSummary:web,webAudit:audit});
 assert.equal(out.web.istanbulCoverageMeasured,true);
 assert.equal(out.web.percentages.statements,5);
 assert.deepEqual(out.web.below90,['lines','branches','functions','statements']);
 assert.equal(out.m4_08_gate,'NOT_QUALIFIED');
 const malformed={...audit,sourceFileCount:2};
 assert.throws(()=>reportBaseline({apiSummary:full(),webSourceCount:1,webSummary:web,webAudit:malformed}),/unqualified_measured_web_scope/);
 const fabricated={...audit,percentages:{...audit.percentages,lines:100}};
 assert.throws(()=>reportBaseline({apiSummary:full(),webSourceCount:1,webSummary:web,webAudit:fabricated}),/web_metric_mismatch/);
});
