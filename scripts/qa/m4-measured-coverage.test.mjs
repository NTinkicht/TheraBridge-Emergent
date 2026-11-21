import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredCoverage} from './m4-measured-coverage.mjs';
const fixture=(covered=96,total=100)=>({total:Object.fromEntries(
 ['lines','branches','functions','statements'].map(name=>[name,{covered,total}]))});
test('coverage is measured from instrumented summary, never suite counts',()=>{
 const report=measuredCoverage({api:fixture(),web:fixture()});
 assert.equal(report.result,'PASS');
 assert.equal(report.scopes.api.lines,96);
 assert.deepEqual(report.belowThreshold,[]);
});
test('missing web, empty denominator, malformed totals and forged values fail closed',()=>{
 assert.throws(()=>measuredCoverage({api:fixture()}),/missing_web/);
 assert.throws(()=>measuredCoverage({api:fixture(0,0),web:fixture()}),/invalid_coverage/);
 assert.throws(()=>measuredCoverage({api:fixture(110,100),web:fixture()}),/invalid_coverage/);
});
test('API and Web under-coverage are reported separately',()=>{
 const r=measuredCoverage({api:fixture(89),web:fixture(87)});
 assert.equal(r.result,'FAIL');
 assert.equal(r.belowThreshold.length,8);
 assert(r.belowThreshold.includes('api_branches'));
 assert(r.belowThreshold.includes('web_statements'));
});

test('89.999% cannot round upward into a 90% acceptance PASS',()=>{
 const nearly=fixture(89999,100000);
 const r=measuredCoverage({api:nearly,web:nearly});
 assert.equal(r.result,'FAIL');
 assert.equal(r.scopes.api.lines,90,'display can round, gate cannot');
 assert.equal(r.belowThreshold.length,8);
});
