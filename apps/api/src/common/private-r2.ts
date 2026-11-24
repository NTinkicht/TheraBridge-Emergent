import { createHash, createHmac } from 'node:crypto';

// Narrow R2 S3 REST adapter. No SDK/lockfile changes, public URLs, retries,
// listing, redirect following, arbitrary endpoints or client-supplied keys.
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const hmac=(key:Buffer|string,value:string)=>createHmac('sha256',key).update(value).digest();
const max=512*1024+29;
const hex=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type R2Config={endpoint:string;bucket:string;accessKey:string;secret:string;region:'auto'};
export type CipherPointer={centerId:string;candidateId:string;digest:string;size:number};
export function privateR2Config(env:NodeJS.ProcessEnv=process.env,operator=false):R2Config {
  const endpoint=env.TB_R2_ENDPOINT??'',bucket=env.TB_R2_BUCKET??'';
  const accessKey=(operator?env.TB_R2_IMPORT_ACCESS_KEY_ID:env.TB_R2_ACCESS_KEY_ID)??'';
  const secret=(operator?env.TB_R2_IMPORT_SECRET_ACCESS_KEY:env.TB_R2_SECRET_ACCESS_KEY)??'';
  if(!/^https:\/\/[a-f0-9]{32}(?:\.(?:eu|fedramp))?\.r2\.cloudflarestorage\.com\/?$/.test(endpoint) ||
     !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) || env.TB_R2_REGION!=='auto' ||
     !/^[a-f0-9]{32}$/i.test(accessKey)||!/^[a-f0-9]{64}$/i.test(secret))
    throw Error('Private object storage unavailable.');
  return {endpoint:endpoint.replace(/\/$/,''),bucket,accessKey,secret,region:'auto'};
}
export function privateR2Key(p:CipherPointer):string {
  if(!uuid.test(p.centerId)||!uuid.test(p.candidateId)||!hex.test(p.digest)||
    !Number.isSafeInteger(p.size)||p.size<30||p.size>max) throw Error('Invalid private object reference.');
  return 'activity-cipher-v1/'+p.centerId+'/'+p.candidateId+'/'+p.digest+'.bin';
}
export function privateR2Pointer(centerId:string,candidateId:string,bytes:Uint8Array):CipherPointer {
  const p={centerId,candidateId,digest:sha(bytes),size:bytes.length};
  privateR2Key(p);return p;
}
export function signR2Request(config:R2Config,p:CipherPointer,method:'GET'|'PUT',body:Uint8Array,
  date:Date=new Date()) {
  const path='/'+config.bucket+'/'+privateR2Key(p),host=new URL(config.endpoint).host;
  const time=date.toISOString().replace(/[:-]|\.\d{3}/g,''),day=time.slice(0,8);
  const payloadHash=sha(body);
  const headers:Record<string,string>={host,'x-amz-content-sha256':payloadHash,'x-amz-date':time};
  if(method==='PUT')headers['if-none-match']='*';
  const names=Object.keys(headers).sort();
  const canonical=[method,path,'',names.map(k=>k+':'+headers[k]+'\n').join(''),names.join(';'),payloadHash].join('\n');
  const scope=day+'/'+config.region+'/s3/aws4_request';
  const toSign=['AWS4-HMAC-SHA256',time,scope,sha(canonical)].join('\n');
  const signing=hmac(hmac(hmac(hmac('AWS4'+config.secret,day),config.region),'s3'),'aws4_request');
  headers.authorization='AWS4-HMAC-SHA256 Credential='+config.accessKey+'/'+scope+', SignedHeaders='+names.join(';')+', Signature='+hmac(signing,toSign).toString('hex');
  return {url:config.endpoint+path,headers};
}
export async function readPrivateR2(p:CipherPointer,config=privateR2Config()):Promise<Buffer> {
  const {url,headers}=signR2Request(config,p,'GET',Buffer.alloc(0));
  const response=await fetch(url,{method:'GET',headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(3500)});
  if(!response.ok||!response.body||response.headers.get('content-length')!==String(p.size)){
    await response.body?.cancel();throw Error('Private object unavailable.');
  }
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let size=0;
  try {
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      size+=value.length;if(size>p.size)throw Error('Private object unavailable.');
      chunks.push(value);
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=Buffer.concat(chunks);
  if(size!==p.size||sha(bytes)!==p.digest)throw Error('Private object unavailable.');
  return bytes;
}
// Operator-only caller must supply a SEPARATE write-scoped credential set.
// Conditional creation + full read-back supports safe reconciliation.
export async function stagePrivateR2(p:CipherPointer,bytes:Uint8Array,config=privateR2Config(process.env,true)):Promise<void> {
  if(bytes.length!==p.size||sha(bytes)!==p.digest)throw Error('Private object integrity mismatch.');
  const {url,headers}=signR2Request(config,p,'PUT',bytes);
  const response=await fetch(url,{method:'PUT',headers,body:Uint8Array.from(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
  await response.body?.cancel();
  if(!response.ok&&response.status!==412)throw Error('Private object staging failed.');
  await readPrivateR2(p,config);
}
