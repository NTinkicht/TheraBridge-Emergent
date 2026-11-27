import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SHARED_ILLUSTRATIONS} from '../../apps/web/src/lib/shared-illustration-manifest.mjs';
import {sharedIllustrationUrl} from '../../apps/web/src/lib/shared-illustrations.mjs';
import {ORIGIN,verifyHostedIllustrations} from './m5-hosted-shared-illustrations.mjs';
const fixtures=new Map();
for(const asset of SHARED_ILLUSTRATIONS){
  const bytes=await readFile(new URL('../../apps/web/reference-assets/m5-b-v1/'+asset.id+'/'+asset.digest+'.webp',import.meta.url));
  fixtures.set(ORIGIN+sharedIllustrationUrl(asset),bytes);
}
const headers=bytes=>({'content-type':'image/webp','content-length':String(bytes.length),'cache-control':'public, max-age=86400, immutable','x-content-type-options':'nosniff'});
const deny=()=>new Response(null,{status:404,headers:{'cache-control':'no-store'}});
const fetchFixture=async(url,opts)=>{
  assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');assert.ok(opts.signal);
  const bytes=fixtures.get(url);
  return bytes?new Response(bytes,{headers:headers(bytes)}):deny();
};
test('all 25 real derivative bytes and two negative routes qualify, no secrets or bytes in receipt',async()=>{
  const seen=[];
  const r=await verifyHostedIllustrations((url,opts)=>{seen.push(url);return fetchFixture(url,opts);});
  assert.equal(r.ok,true);assert.equal(r.checked,25);assert.equal(r.passed,25);assert.equal(r.denied.length,2);
  assert.equal(new Set(seen).size,27);assert.ok(seen.every(url=>url.startsWith(ORIGIN+'/illustrations/m5-b-v1/')));
  assert.deepEqual(Object.keys(r.assets[0]),['id','result']);
});
test('corruption, overflow, wrong MIME, transport and cache contract fail independently',async()=>{
  const urls=[...fixtures.keys()];
  const r=await verifyHostedIllustrations(async(url,opts)=>{
    const b=fixtures.get(url);
    if(url===urls[0]){const bad=Buffer.from(b);bad[bad.length-1]^=1;return new Response(bad,{headers:headers(b)});}
    if(url===urls[1])return new Response(Buffer.concat([b,Buffer.from([0])]),{headers:headers(b)});
    if(url===urls[2])return new Response(b,{headers:{...headers(b),'content-type':'text/html'}});
    if(url===urls[3])throw Error('untrusted transport details');
    if(url===urls[4])return new Response(b,{headers:{...headers(b),'cache-control':'no-store'}});
    return fetchFixture(url,opts);
  });
  assert.equal(r.ok,false);assert.equal(r.passed,20);
  assert.deepEqual(r.assets.slice(0,5).map(a=>a.result),['integrity','length','response_contract','transport','response_contract']);
  assert.ok(!JSON.stringify(r).includes('untrusted transport details'));
});
test('404 cannot pass with a body or cacheable denial; complete positive inventory does not override denial',async()=>{
  let n=0;
  const r=await verifyHostedIllustrations(async(url,opts)=>{
    if(fixtures.has(url))return fetchFixture(url,opts);
    return ++n===1?new Response('unexpected body',{status:404,headers:{'cache-control':'no-store'}}):
      new Response(null,{status:404,headers:{'cache-control':'public'}});
  });
  assert.equal(r.passed,25);assert.equal(r.ok,false);
  assert.deepEqual(r.denied.map(x=>x.result),['denial_body','response_contract']);
});
