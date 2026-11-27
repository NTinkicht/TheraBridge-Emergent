import {pathToFileURL} from 'node:url';
import {SHARED_ILLUSTRATIONS} from '../../apps/web/src/lib/shared-illustration-manifest.mjs';
import {sharedIllustrationUrl} from '../../apps/web/src/lib/shared-illustrations.mjs';
import {verifySharedBytes} from '../../apps/web/src/lib/shared-illustration-storage.mjs';

// Fixed synthetic preview only. No authentication, redirects, writes or private media.
export const ORIGIN = 'https://therabridge-ahmed-synthetic-demo.onrender.com';
const opts = () => ({redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
async function discard(response) {
  await response.body?.cancel().catch(()=>{});
}
async function checkAsset(asset, fetcher) {
  const response = await fetcher(ORIGIN + sharedIllustrationUrl(asset), opts());
  const cache = (response.headers.get('cache-control') ?? '').toLowerCase().split(',').map(x=>x.trim());
  if(response.status!==200 || response.headers.get('content-type')!=='image/webp' ||
     response.headers.get('content-length')!==String(asset.bytes) ||
     response.headers.get('x-content-type-options')!=='nosniff' ||
     !cache.includes('public') || !cache.includes('immutable') || cache.includes('no-store') ||
     !response.body) {
    await discard(response);
    return 'response_contract';
  }
  const reader=response.body.getReader(), chunks=[];
  let size=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>asset.bytes)return 'length';
      chunks.push(value);
    }
    return verifySharedBytes(asset,Buffer.concat(chunks))?'pass':'integrity';
  } finally {
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
async function checkDenied(path,fetcher) {
  const response=await fetcher(ORIGIN+path,opts());
  const cache=(response.headers.get('cache-control')??'').toLowerCase().split(',').map(x=>x.trim());
  try {
    if(response.status!==404 || !cache.includes('no-store'))return 'response_contract';
    // The denial response must not carry image bytes or any other body.
    if(!response.body)return 'pass';
    const reader=response.body.getReader();
    try {for(;;){const {done,value}=await reader.read();if(done)return 'pass';if(value.byteLength)return 'denial_body';}}
    finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  } finally { /* body is either absent or owned by the reader */ }
}
export async function verifyHostedIllustrations(fetcher=fetch) {
  const safe=async fn=>{try{return await fn();}catch{return 'transport';}};
  const assets=[];
  for(const asset of SHARED_ILLUSTRATIONS) {
    assets.push({id:asset.id,result:await safe(()=>checkAsset(asset,fetcher))});
  }
  const first=SHARED_ILLUSTRATIONS[0];
  const denied=[];
  for(const [id,path] of [
    ['wrong_digest','/illustrations/m5-b-v1/'+first.id+'/'+'0'.repeat(64)+'.webp'],
    ['unknown_reference','/illustrations/m5-b-v1/UNKNOWN/'+first.digest+'.webp']
  ]) denied.push({id,result:await safe(()=>checkDenied(path,fetcher))});
  return {scope:'synthetic-preview-shared-generic-art-only',origin:ORIGIN,
    checked:assets.length,passed:assets.filter(x=>x.result==='pass').length,assets,denied,
    ok:assets.length===25&&assets.every(x=>x.result==='pass')&&denied.every(x=>x.result==='pass')};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const receipt=await verifyHostedIllustrations();
  console.log(JSON.stringify(receipt,null,2));
  if(!receipt.ok)process.exitCode=1;
}
