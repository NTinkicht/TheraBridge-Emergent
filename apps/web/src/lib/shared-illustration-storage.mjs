import {createHash,createHmac} from 'node:crypto';
import {sharedIllustration} from './shared-illustrations.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const mac=(k,v)=>createHmac('sha256',k).update(v).digest();
export function sharedObjectKey(asset) {
  return 'shared-illustrations/m5-b-v1/'+asset.id+'/'+asset.digest+'.webp';
}
export function sharedR2Config(env=process.env,write=false) {
  const endpoint=env.TB_R2_ENDPOINT??'',bucket=env.TB_R2_BUCKET??'';
  const id=env[write?'TB_R2_IMPORT_ACCESS_KEY_ID':'TB_R2_ACCESS_KEY_ID']??'';
  const secret=env[write?'TB_R2_IMPORT_SECRET_ACCESS_KEY':'TB_R2_SECRET_ACCESS_KEY']??'';
  if(!/^https:\/\/[a-f0-9]{32}(?:\.(?:eu|fedramp))?\.r2\.cloudflarestorage\.com\/?$/.test(endpoint)||
     !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)||env.TB_R2_REGION!=='auto'||
     !/^[a-f0-9]{32}$/i.test(id)||!/^[a-f0-9]{64}$/i.test(secret))throw Error('Shared artwork storage unavailable');
  return {endpoint:endpoint.replace(/\/$/,''),bucket,id,secret};
}
export function signSharedRequest(config,asset,method,body,now=new Date()) {
  const path='/'+config.bucket+'/'+sharedObjectKey(asset),host=new URL(config.endpoint).host;
  const time=now.toISOString().replace(/[:-]|\.\d{3}/g,''),day=time.slice(0,8),payload=sha(body);
  const h={host,'x-amz-content-sha256':payload,'x-amz-date':time};
  if(method==='PUT'){h['if-none-match']='*';h['content-type']='image/webp';}
  const names=Object.keys(h).sort(),scope=day+'/auto/s3/aws4_request';
  const canonical=[method,path,'',names.map(n=>n+':'+h[n]+'\n').join(''),names.join(';'),payload].join('\n');
  const key=mac(mac(mac(mac('AWS4'+config.secret,day),'auto'),'s3'),'aws4_request');
  h.authorization='AWS4-HMAC-SHA256 Credential='+config.id+'/'+scope+', SignedHeaders='+names.join(';')+', Signature='+mac(key,['AWS4-HMAC-SHA256',time,scope,sha(canonical)].join('\n')).toString('hex');
  return {url:config.endpoint+path,headers:h};
}
export function verifySharedBytes(asset,bytes) {
  return bytes.length===asset.bytes&&bytes.length<=512*1024&&bytes.toString('ascii',0,4)==='RIFF'&&
    bytes.toString('ascii',8,12)==='WEBP'&&sha(bytes)===asset.digest;
}
export async function readSharedObject(asset,config=sharedR2Config(),fetcher=fetch) {
  const {url,headers}=signSharedRequest(config,asset,'GET',Buffer.alloc(0));
  const response=await fetcher(url,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok||!response.body||response.headers.get('content-length')!==String(asset.bytes)){
    await response.body?.cancel();throw Error('Shared artwork unavailable');
  }
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;
      if(size>asset.bytes)throw Error('Shared artwork unavailable');chunks.push(value);}
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=Buffer.concat(chunks);
  if(!verifySharedBytes(asset,bytes))throw Error('Shared artwork unavailable');
  return bytes;
}
export async function sharedIllustrationResponse(id,file,env=process.env,read=readSharedObject) {
  const asset=sharedIllustration(id);
  // Only the existing synthetic demo may serve these reference assets. No
  // patient media, object path input, plan release or clinical authorization.
  if(env.DEPLOYMENT_ENV!=='preview'||env.DEMO_SEED_CONFIRM!=='CHILDRENS_HOME_SYNTHETIC_ONLY'||
    !asset||file!==asset.digest+'.webp')return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  try{
    const bytes=await read(asset,sharedR2Config(env));
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','Content-Length':String(bytes.length),
      'Cache-Control':'public, max-age=86400, immutable','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
}
