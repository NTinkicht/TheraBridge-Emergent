#!/usr/bin/env node
// Validate only allowlisted numeric container-load evidence; never accept
// arbitrary response bodies, credentials, identifiers or raw traces.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===expected.length&&expected.every(k=>Object.hasOwn(o,k));
const nonneg=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function validateSustainedReceipt(report) {
  const errors=[];
  if(!keys(report,['schemaVersion','environment','qualification','phases','container']))
    return ['invalid_root_schema'];
  if(report.schemaVersion!==1||report.environment!=='ci_loopback_compose_synthetic'||
     report.qualification!=='ten_minute_health_route_load_not_production_sla')
    errors.push('incorrect_provenance');
  if(!Array.isArray(report.phases)||report.phases.length!==3)errors.push('incorrect_phases');
  else for(const [i,concurrency] of [1,4,8].entries()) {
    const p=report.phases[i];
    if(!keys(p,['concurrency','elapsedMs','requests','errors','p50Ms','p95Ms','p99Ms','throughputPerSecond'])) {
      errors.push('invalid_phase_schema');continue;
    }
    if(p.concurrency!==concurrency||!Number.isSafeInteger(p.requests)||p.requests<1||
       p.errors!==0||!Number.isSafeInteger(p.elapsedMs)||p.elapsedMs<200000||
       ![p.p50Ms,p.p95Ms,p.p99Ms,p.throughputPerSecond].every(nonneg)||
       !(p.p50Ms<=p.p95Ms&&p.p95Ms<=p.p99Ms)||p.throughputPerSecond===0)
      errors.push('failed_or_unmeasured_phase_'+concurrency);
  }
  const c=report.container;
  if(!keys(c,['limitBytes','peakBytes','uid','oomKills'])||c.limitBytes!==536870912||
     c.uid!==1000||c.oomKills!==0||!Number.isSafeInteger(c.peakBytes)||
     c.peakBytes<=0||c.peakBytes>c.limitBytes)errors.push('invalid_nonroot_512m_cgroup');
  return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv[2]!=='.workspace/m4-performance/m4-07-compose-load.json')
      throw Error('disallowed_path');
    const data=JSON.parse(readFileSync(process.argv[2],'utf8'));
    const errors=validateSustainedReceipt(data);
    if(errors.length)throw Error(errors.join(','));
    console.log('PASS: validated 10-minute numeric-only 512MiB synthetic workload receipt (NOT production SLA)');
  } catch(e){console.error('FAIL: synthetic sustained receipt rejected:',e.message);process.exitCode=1;}
}
