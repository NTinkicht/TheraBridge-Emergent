#!/usr/bin/env node
// Strict allowlist receipt validation; do not accept raw traces, PII or secrets.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const keys=(obj,want)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.keys(obj).length===want.length&&want.every(k=>Object.hasOwn(obj,k));
const nonneg=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function validateParallelPrReceipt(report){
  const errors=[];
  if(!keys(report,['schemaVersion','environment','qualification','wallElapsedMs','phases','container']))
    return ['invalid_root_schema'];
  if(report.schemaVersion!==1||report.environment!=='ci_loopback_compose_synthetic'||
     report.qualification!=='overlapping_200s_pr_health_smoke_not_endurance_or_sla')
    errors.push('invalid_qualification');
  if(!Number.isSafeInteger(report.wallElapsedMs)||report.wallElapsedMs<200000||
     report.wallElapsedMs>260000)errors.push('invalid_wall_time');
  if(!Array.isArray(report.phases)||report.phases.length!==3)errors.push('invalid_phases');
  else for(const [i,concurrency] of [1,4,8].entries()){
    const p=report.phases[i];
    if(!keys(p,['concurrency','startOffsetMs','elapsedMs','requests','errors','p50Ms','p95Ms','p99Ms','throughputPerSecond'])){
      errors.push('invalid_phase_schema');continue;
    }
    if(p.concurrency!==concurrency||!Number.isSafeInteger(p.startOffsetMs)||
       p.startOffsetMs<0||p.startOffsetMs>5000||
       !Number.isSafeInteger(p.elapsedMs)||p.elapsedMs<200000||
       p.elapsedMs>report.wallElapsedMs||!Number.isSafeInteger(p.requests)||p.requests<1||
       p.errors!==0||![p.p50Ms,p.p95Ms,p.p99Ms,p.throughputPerSecond].every(nonneg)||
       !(p.p50Ms<=p.p95Ms&&p.p95Ms<=p.p99Ms)||p.throughputPerSecond===0)
      errors.push('failed_or_unmeasured_phase_'+concurrency);
  }
  const c=report.container;
  if(!keys(c,['limitBytes','peakBytes','uid','oomKills'])||c.limitBytes!==536870912||
     c.uid!==1000||c.oomKills!==0||!Number.isSafeInteger(c.peakBytes)||
     c.peakBytes<=0||c.peakBytes>c.limitBytes)errors.push('invalid_nonroot_512m_cgroup');
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv[2]!=='.workspace/m4-performance/m4-pr-overlap-load.json')
      throw Error('disallowed_path');
    const r=JSON.parse(readFileSync(process.argv[2],'utf8'));
    const errors=validateParallelPrReceipt(r);
    if(errors.length)throw Error(errors.join(','));
    console.log('PASS: validated overlapping 200-second numeric-only PR smoke (NOT 10-minute endurance)');
  }catch(e){console.error('FAIL: PR overlap receipt rejected:',e.message);process.exitCode=1;}
}
