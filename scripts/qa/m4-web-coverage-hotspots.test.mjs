import { test } from 'node:test';
import assert from 'node:assert/strict';
import { report } from './m4-web-coverage-hotspots.mjs';
const entry=(total=10,covered=4)=>Object.fromEntries(['lines','branches','functions','statements'].map(k=>[k,{total,covered,pct:100*covered/total}]));
const base=()=>({
 total:entry(20,8),
 '/home/runner/work/TheraBridge/apps/web/src/lib/a.ts':entry(),
 '/home/runner/work/TheraBridge/apps/web/src/app/app/children/[id]/page.tsx':entry(),
});
test('reports genuine source lines, all four metrics and sanitized prioritized paths',()=>{
 const result=report(base());
 assert.equal(result.sourceFileCount,2);
 assert.deepEqual(result.totals.lines,{total:20,covered:8,pct:40});
 assert.equal(result.topUncoveredLines[0].uncoveredLines,6);
 assert.ok(result.topUncoveredLines.every(x=>x.path.startsWith('apps/web/src/')));
 assert.ok(!JSON.stringify(result).includes('/home/runner/'));
});
test('preserves zero-coverage sources rather than hiding them',()=>{
 const sample=base();
 sample['/home/runner/work/TheraBridge/apps/web/src/lib/a.ts']=entry(10,0);
 sample.total=entry(20,4);
 const result=report(sample);
 assert.equal(result.zeroStatementCoverageFiles,1);
 assert.equal(result.topUncoveredLines[0].path,'apps/web/src/lib/a.ts');
});
test('fails closed on total tampering, duplicates, traversal and path outside Web source',()=>{
 const make=(fn,pattern)=>{const sample=base();fn(sample);assert.throws(()=>report(sample),pattern);};
 make(v=>{v.total=entry(20,9);},/total mismatch/);
 make(v=>{v['apps/web/src/lib/a.ts']=entry();v.total=entry(30,12);},/duplicate source path/);
 make(v=>{v['/tmp/outside.ts']=entry();v.total=entry(30,12);},/invalid source path/);
 make(v=>{v['apps/web/src/../secret.ts']=entry();v.total=entry(30,12);},/invalid source path/);
 make(v=>{v['apps/web/src/lib/a.ts'].lines.covered=11;},/malformed metric/);
});
test('requires nonempty complete counters and valid source scope',()=>{
 assert.throws(()=>report({total:entry()}),/empty denominator/);
 const v=base();delete v['/home/runner/work/TheraBridge/apps/web/src/lib/a.ts'].functions;
 assert.throws(()=>report(v),/malformed metric/);
});
