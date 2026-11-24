import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateParallelPrReceipt} from './m4-pr-overlap-receipt.mjs';
const fixture=()=>({schemaVersion:1,environment:'ci_loopback_compose_synthetic',
  qualification:'overlapping_200s_pr_health_smoke_not_endurance_or_sla',
  wallElapsedMs:200300,
  phases:[1,4,8].map(c=>({concurrency:c,startOffsetMs:2,elapsedMs:200250,
    requests:100,errors:0,p50Ms:2,p95Ms:4,p99Ms:6,throughputPerSecond:.5})),
  container:{limitBytes:536870912,peakBytes:200000000,uid:1000,oomKills:0}
});
test('valid three-way overlap smoke passes without claiming endurance',()=>{
  assert.deepEqual(validateParallelPrReceipt(fixture()),[]);
});
test('rejects shortened, serial, fabricated or missing streams',()=>{
  for(const change of [
    x=>x.wallElapsedMs=199999,x=>x.wallElapsedMs=600000,
    x=>x.phases[1].startOffsetMs=200000,x=>x.phases[0].elapsedMs=199999,
    x=>x.phases[2].elapsedMs=300000,x=>x.phases[0].errors=1,
    x=>x.phases[0].concurrency=9,x=>x.phases.pop(),
    x=>x.phases[1].requests=0,x=>x.phases[0].p95Ms=1,
    x=>x.qualification='ten_minute_health_route_load_not_production_sla'
  ]){const x=fixture();change(x);assert.notDeepEqual(validateParallelPrReceipt(x),[]);}
});
test('rejects root, resource cap changes, OOM and unknown raw sensitive fields',()=>{
  for(const change of [
    x=>x.container.uid=0,x=>x.container.limitBytes=1073741824,
    x=>x.container.oomKills=1,x=>x.container.peakBytes=600000000,
    x=>x.password='not allowed',x=>x.phases[0].headers='not allowed',
    x=>x.container.ip='not allowed'
  ]){const x=fixture();change(x);assert.notDeepEqual(validateParallelPrReceipt(x),[]);}
});
test('runner refuses network access without explicit local-only opt-in',()=>{
  const p=spawnSync('node',['scripts/qa/m4-pr-overlap-http.mjs'],
    {env:{PATH:process.env.PATH},encoding:'utf8',timeout:3000});
  assert.equal(p.status,2);
  assert.match(p.stderr,/explicit local-only load confirmation/);
});
test('source uses only disposable loopback, 3 simultaneous fixed 200s streams and real cgroups',()=>{
  const s=readFileSync('scripts/qa/m4-pr-overlap-http.mjs','utf8');
  assert.match(s,/127\.0\.0\.1:8001\/api\/health/);
  assert.match(s,/const tiers=\[1,4,8\], durationMs=200000/);
  assert.match(s,/Promise\.all\(tiers\.map\(c=>probe\(c,start\)\)\)/);
  assert.match(s,/memory\.peak/);
  assert.match(s,/memory\.events/);
  assert.doesNotMatch(s,/https:\/\//);
});
