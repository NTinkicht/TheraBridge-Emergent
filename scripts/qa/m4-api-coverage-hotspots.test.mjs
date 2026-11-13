import test from 'node:test';
import assert from 'node:assert/strict';
import {apiHotspots} from './m4-api-coverage-hotspots.mjs';
const root='/tmp/fake/apps/api/src';
const file=root+'/auth/access.ts';
const measures=(covered,total)=>({total,covered,pct:total?covered/total*100:100});
const input=()=>({
  total:{lines:measures(1,4),branches:measures(1,4),functions:measures(1,4),statements:measures(1,4)},
  [file]:{lines:measures(1,4),branches:measures(1,4),functions:measures(1,4),statements:measures(1,4)}
});
const run=s=>apiHotspots({summary:s,expectedSourcePaths:[file],sourceRoot:root});
test('reports real aggregate deficit and sanitized relative paths',()=>{
 const r=run(input());
 assert.equal(r.sourceCount,1);
 assert.equal(r.metrics.branches.percent,25);
 assert.equal(r.metrics.branches.additionalCoveredUnitsTo90,3);
 assert.equal(r.topUncoveredBranches[0].path,'apps/api/src/auth/access.ts');
 assert.equal(r.topUncoveredBranches[0].uncovered,3);
 assert.equal(r.kind,'m4_api_full_source_hotspot_diagnostic_not_release_approval');
});
test('rejects missing, extra and duplicate executable modules',()=>{
 const s=input();delete s[file];
 assert.throws(()=>run(s),/incomplete_denominator/);
 const x=input();x[root+'/unexpected.ts']=x[file];
 assert.throws(()=>run(x),/incomplete_denominator/);
 const y=input();
 assert.throws(()=>apiHotspots({summary:y,expectedSourcePaths:[file,file],sourceRoot:root}),/duplicate_source/);
});
test('rejects mismatched totals and negative or oversized counters',()=>{
 const s=input();s.total.branches.covered=2;
 assert.throws(()=>run(s),/mismatch_branches/);
 const x=input();x[file].branches.covered=7;
 assert.throws(()=>run(x),/malformed_branches/);
 const y=input();y[file].lines.covered=-1;
 assert.throws(()=>run(y),/malformed_lines/);
});
test('refuses external source inventory and zero denominator inflation',()=>{
 const s=input();
 assert.throws(()=>apiHotspots({summary:s,expectedSourcePaths:['/tmp/elsewhere/leak.ts'],sourceRoot:root}),/invalid_source/);
 const z=input();z[file].functions.total=0;z[file].functions.covered=0;z.total.functions.total=0;z.total.functions.covered=0;
 assert.throws(()=>run(z),/mismatch_functions/);
});
