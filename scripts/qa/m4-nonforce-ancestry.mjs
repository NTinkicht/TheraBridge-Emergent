#!/usr/bin/env node
// M4-09 / #279: read-only ancestry evidence for three historically rewritten
// feature branches. Never repairs refs or infers the original ref lease.
// Requires full git checkout (fetch-depth: 0) and immutable merged SHAs.
import { spawnSync } from 'node:child_process';

export const HISTORIC_MERGES = Object.freeze([
  { pr: 274, sha: 'dd2a0ff345f5d1a0b38330222491c464344f9819' },
  { pr: 275, sha: 'f29ccac1e9572171c7b210e415003061ee9edd70' },
  { pr: 276, sha: '198238e684ff5ac2cb4f01e67664e11dc19b4723' },
]);
const SHA=/^[a-f0-9]{40}$/;

export function ancestryReceipt(head, entries=HISTORIC_MERGES, run=(args)=>spawnSync('git',args,{encoding:'utf8',timeout:10000})) {
  if (typeof head!=='string' || !head.trim()) throw Error('HEAD ref required');
  if (!Array.isArray(entries) || entries.length!==3 || new Set(entries.map(x=>x.pr)).size!==3 ||
      entries.map(x=>x.pr).sort().join(',')!=='274,275,276') throw Error('Historic PR scope changed');
  const results=[];
  for (const {pr,sha} of entries) {
    if (!SHA.test(sha)) throw Error('Historic merge SHA invalid for PR #'+pr);
    const result=run(['merge-base','--is-ancestor',sha,head]);
    if (result?.status===0) results.push({pr,mergeSha:sha,reachable:true});
    else if (result?.status===1) throw Error('Historic merge not ancestor of HEAD: #'+pr);
    else throw Error('Git ancestry verification failed for PR #'+pr+'; fetch complete history');
  }
  return {kind:'m4_historic_merge_ancestry_not_force_lease_proof',results,
    originalForceRefLeaseProven:false,forcePushPermitted:false,
    releaseApproval:false,clinicalApproval:false};
}

if (process.argv[1]?.endsWith('/m4-nonforce-ancestry.mjs')) {
  try {
    const receipt=ancestryReceipt('HEAD');
    console.log(JSON.stringify(receipt));
  } catch(e) {console.error(e.message);process.exitCode=1;}
}
