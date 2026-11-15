import test from 'node:test';
import assert from 'node:assert/strict';
import {ancestryReceipt,HISTORIC_MERGES} from './m4-nonforce-ancestry.mjs';
const good=()=>({status:0});
test('historical merge checks are strictly read-only, require all 3 exact PRs and do not claim force-ref lease',()=>{
 const commands=[];
 const r=ancestryReceipt('HEAD',HISTORIC_MERGES,args=>{commands.push(args);return good();});
 assert.equal(r.results.length,3);
 assert.equal(r.originalForceRefLeaseProven,false);
 assert.equal(r.forcePushPermitted,false);
 assert.equal(r.clinicalApproval,false);
 assert.deepEqual(commands,HISTORIC_MERGES.map(x=>['merge-base','--is-ancestor',x.sha,'HEAD']));
});
test('reject an unreachable historical merge rather than certify its presence',()=>{
 let i=0;
 assert.throws(()=>ancestryReceipt('HEAD',HISTORIC_MERGES,()=>({status:++i===2?1:0})),/not ancestor.*#275/);
});
test('missing or shallow Git ancestry is never reported as PASS',()=>{
 assert.throws(()=>ancestryReceipt('HEAD',HISTORIC_MERGES,()=>({status:128})),/fetch complete history/);
});
test('reject manipulated historical evidence scope, duplicate PR and SHA',()=>{
 assert.throws(()=>ancestryReceipt('HEAD',HISTORIC_MERGES.slice(1),good),/scope changed/);
 assert.throws(()=>ancestryReceipt('HEAD',[HISTORIC_MERGES[0],HISTORIC_MERGES[0],HISTORIC_MERGES[2]],good),/scope changed/);
 const bad=HISTORIC_MERGES.map((x,i)=>i===1?{...x,sha:'not-a-sha'}:x);
 assert.throws(()=>ancestryReceipt('HEAD',bad,good),/SHA invalid/);
});
test('reject no head',()=>assert.throws(()=>ancestryReceipt('',HISTORIC_MERGES,good),/HEAD ref required/));
