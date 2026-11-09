import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateSustainedReceipt } from './m4-sustained-receipt.mjs';

const fixture=()=>({
 schemaVersion:1,environment:'ci_loopback_compose_synthetic',
 qualification:'ten_minute_health_route_load_not_production_sla',
 phases:[1,4,8].map(concurrency=>({
  concurrency,elapsedMs:200100,requests:100,errors:0,
  p50Ms:10,p95Ms:20,p99Ms:30,throughputPerSecond:0.5
 })),
 container:{limitBytes:536870912,peakBytes:200000000,uid:1000,oomKills:0}
});
test('honest fixed workload receipt with non-root and no OOM passes',()=>{
 assert.deepEqual(validateSustainedReceipt(fixture()),[]);
});
test('shortened workload, dropped requests, and altered concurrency fail closed',()=>{
 for(const modify of [
  x=>x.phases[0].elapsedMs=199999,
  x=>x.phases[1].errors=1,
  x=>x.phases[2].concurrency=2,
  x=>x.phases.pop(),
  x=>x.phases[0].requests=0,
  x=>x.phases[0].p95Ms=3
 ]) {
  const x=fixture();modify(x);assert.notDeepEqual(validateSustainedReceipt(x),[]);
 }
});
test('forged container memory cap, root UID, OOM and unexpected raw fields fail closed',()=>{
 for(const modify of [
  x=>x.container.limitBytes=1073741824,
  x=>x.container.uid=0,
  x=>x.container.oomKills=1,
  x=>x.container.peakBytes=600000000,
  x=>x.container.secret='not allowed',
  x=>x.phases[0].responseBody='not allowed',
  x=>x.cookie='not allowed'
 ]) {
  const x=fixture();modify(x);assert.notDeepEqual(validateSustainedReceipt(x),[]);
 }
});
test('load runner rejects missing explicit local-only confirmation before network access',()=>{
 const r=spawnSync('node',['scripts/qa/m4-local-sustained-http.mjs'],{
  env:{PATH:process.env.PATH},encoding:'utf8',timeout:3000
 });
 assert.equal(r.status,2);
 assert.match(r.stderr,/explicit local-only load confirmation/);
});
test('source is pinned to local API and fixed 10-minute, three-tier workload',()=>{
 const source=readFileSync('scripts/qa/m4-local-sustained-http.mjs','utf8');
 assert.match(source,/127\.0\.0\.1:8001\/api\/health/);
 assert.match(source,/\[\[1, 200_000\], \[4, 200_000\], \[8, 200_000\]\]/);
 assert.match(source,/memory\.peak/);
 assert.match(source,/memory\.events/);
 assert.doesNotMatch(source,/https:\/\//);
});
