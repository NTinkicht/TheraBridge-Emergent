#!/usr/bin/env node
// PR-only overlap smoke: three simultaneous 200-second health streams against
// one disposable loopback unified preview. NOT M4-07 ten-minute endurance/SLA.
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

if(process.env.TB_M4_LOCAL_LOAD_CONFIRM!=='DISPOSABLE_LOOPBACK_ONLY'){
  console.error('BLOCKED: explicit local-only load confirmation required');
  process.exit(2);
}
const endpoint='http://127.0.0.1:8001/api/health';
const tiers=[1,4,8], durationMs=200000;
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const quantile=(values,p)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)throw Error('no_samples');
  return Math.round(sorted[Math.ceil(p*sorted.length)-1]*100)/100;
};
async function probe(concurrency, commonStart) {
  const start=performance.now(), samples=[];let errors=0;
  while(performance.now()-start<durationMs){
    await Promise.all(Array.from({length:concurrency},async()=>{
      const before=performance.now();
      try{
        const r=await fetch(endpoint,{signal:AbortSignal.timeout(5000),redirect:'error'});
        const body=await r.json();
        if(r.status!==200||body.status!=='ok'||body.database?.status!=='up'||
           !Number.isSafeInteger(body.migrations?.applied)||body.migrations.applied<1){
          errors++;return;
        }
        samples.push(performance.now()-before);
      }catch{errors++;}
    }));
    await sleep(120); // Bounded pacing; no unbounded load or external endpoints.
  }
  const elapsedMs=Math.round(performance.now()-start);
  if(errors!==0||samples.length===0)throw Error('HTTP_health_or_DB_failure');
  return {concurrency,startOffsetMs:Math.round(start-commonStart),elapsedMs,
    requests:samples.length,errors,p50Ms:quantile(samples,.5),
    p95Ms:quantile(samples,.95),p99Ms:quantile(samples,.99),
    throughputPerSecond:Math.round(samples.length*100000/elapsedMs)/100};
}
function containerEvidence(){
  const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:15000}).trim();
  const id='tb-preview-ci';
  const limitBytes=Number(docker('inspect','--format','{{.HostConfig.Memory}}',id));
  const uid=Number(docker('exec',id,'id','-u'));
  const peakBytes=Number(docker('exec',id,'cat','/sys/fs/cgroup/memory.peak'));
  const events=docker('exec',id,'cat','/sys/fs/cgroup/memory.events');
  const match=events.match(/^oom_kill\s+(\d+)$/m);
  if(limitBytes!==536870912||uid!==1000||!Number.isSafeInteger(peakBytes)||
     peakBytes<=0||peakBytes>limitBytes||!match||Number(match[1])!==0)
    throw Error('512m_nonroot_cgroup_limit_or_oom_verification_failed');
  return {limitBytes,peakBytes,uid,oomKills:Number(match[1])};
}
try{
  const start=performance.now();
  const phases=await Promise.all(tiers.map(c=>probe(c,start)));
  const wallElapsedMs=Math.round(performance.now()-start);
  if(wallElapsedMs<200000||wallElapsedMs>260000)throw Error('invalid_overlap_elapsed');
  const output={schemaVersion:1,environment:'ci_loopback_compose_synthetic',
    qualification:'overlapping_200s_pr_health_smoke_not_endurance_or_sla',
    wallElapsedMs,phases,container:containerEvidence()};
  const directory=resolve('.workspace/m4-performance');
  mkdirSync(directory,{recursive:true});
  writeFileSync(resolve(directory,'m4-pr-overlap-load.json'),JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log('PASS: overlapping local-only 200-second synthetic smoke; no endurance or production SLA claim');
  console.log(JSON.stringify(output));
}catch(e){console.error('FAIL: local-only PR overlap smoke:',e.message);process.exitCode=1;}
