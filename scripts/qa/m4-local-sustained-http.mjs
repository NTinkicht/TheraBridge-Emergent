#!/usr/bin/env node
// Real local Docker Compose API + PostgreSQL performance smoke.
// Fixed 10-minute three-tier workload, one isolated CI run; NOT a production SLA.
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
if (process.env.TB_M4_LOCAL_LOAD_CONFIRM !== 'DISPOSABLE_LOOPBACK_ONLY') {
  console.error('BLOCKED: explicit local-only load confirmation required');
  process.exit(2);
}
const address = 'http://127.0.0.1:8001/api/health';
const phases = [[1, 200_000], [4, 200_000], [8, 200_000]];
const quantile = (values, p) => {
  const a = [...values].sort((x,y)=>x-y);
  if (!a.length) throw Error('no_successful_samples');
  return Math.round(a[Math.ceil(p*a.length)-1]*100)/100;
};
const sleep = ms => new Promise(done=>setTimeout(done,ms));
async function runPhase(concurrency, duration) {
  const times=[];let failed=0; let started=performance.now();
  while (performance.now()-started < duration) {
    await Promise.all(Array.from({length:concurrency},async()=>{
      const before=performance.now();
      try {
        const res=await fetch(address,{signal:AbortSignal.timeout(5000),redirect:'error'});
        const body=await res.json();
        if(res.status!==200 || body.status!=='ok' ||
           body.database?.status!=='up' || !Number.isSafeInteger(body.migrations?.applied) ||
           body.migrations.applied<1) {failed++;return;}
        times.push(performance.now()-before);
      } catch {failed++;}
    }));
    await sleep(100); // deliberately bounded request rate; no uncontrolled flood
  }
  const elapsedMs=Math.round(performance.now()-started);
  if(failed!==0 || times.length===0)throw Error('HTTP_health_or_DB_failure');
  return {concurrency,elapsedMs,requests:times.length,errors:failed,
    p50Ms:quantile(times,.50),p95Ms:quantile(times,.95),
    p99Ms:quantile(times,.99),throughputPerSecond:Math.round(times.length*100000/elapsedMs)/100};
}
const output={schemaVersion:1,environment:'ci_loopback_compose_synthetic',qualification:'ten_minute_health_route_load_not_production_sla',
  phases:[]};
function containerEvidence() {
  // The synthetic preview is a single API+Web non-root container capped at
  // 512 MiB. Values come from Docker + cgroup, not process.memoryUsage().
  const docker = (...args) => execFileSync('docker', args, {encoding:'utf8',timeout:15000}).trim();
  const id = 'tb-preview-ci';
  const limitBytes = Number(docker('inspect','--format','{{.HostConfig.Memory}}',id));
  const uid = Number(docker('exec',id,'id','-u'));
  const peakBytes = Number(docker('exec',id,'cat','/sys/fs/cgroup/memory.peak'));
  const events = docker('exec',id,'cat','/sys/fs/cgroup/memory.events');
  const oomKillMatch = events.match(/^oom_kill\\s+(\\d+)$/m);
  if(limitBytes!==536870912 || uid!==1000 || !Number.isSafeInteger(peakBytes) ||
     peakBytes<=0 || peakBytes>limitBytes || !oomKillMatch || Number(oomKillMatch[1])!==0)
    throw Error('512m_nonroot_cgroup_limit_or_oom_verification_failed');
  return {limitBytes,peakBytes,uid,oomKills:Number(oomKillMatch[1])};
}
try {
  for(const [c,d] of phases)output.phases.push(await runPhase(c,d));
  output.container=containerEvidence();
  const file=resolve('.workspace/m4-performance/m4-07-compose-load.json');
  mkdirSync(resolve('.workspace/m4-performance'),{recursive:true});
  writeFileSync(file,JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log('PASS: 10-minute local-only API/PostgreSQL load across concurrency 1,4,8; all requests successful');
  console.log(JSON.stringify(output));
} catch(e){console.error('FAIL: local-only 10-minute API/PostgreSQL load',e.message);process.exitCode=1;}
