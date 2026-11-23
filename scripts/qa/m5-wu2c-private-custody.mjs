/**
 * M5 WU2-C — operator-only encrypted private illustration custody.
 * No API/controller imports this file; there is no read/public URL, generated
 * image provider call, tenant grant, rights approval or clinical release.
 * Even real scanner success is NOT independent privacy/security qualification.
 */
import {createHash,createHmac,createCipheriv,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {constants} from 'node:fs';
import {mkdir,lstat,open,readFile,rename,rm,unlink} from 'node:fs/promises';
import {dirname,isAbsolute,join,parse,resolve,sep} from 'node:path';
import {createConnection} from 'node:net';
import {setTimeout as sleep} from 'node:timers/promises';
import {preparePrivateDerivatives} from './m5-wu2c-private-derivatives.mjs';

const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ACTOR=/^[a-zA-Z0-9_.-]{3,64}$/;
const SOCKET=/^\/(?:run|var\/run)\/clamav\/[a-zA-Z0-9._-]{1,80}$/;
const HEX=bytes=>createHash('sha256').update(bytes).digest('hex');
const HASH=(key,data)=>createHmac('sha256',key).update(data).digest('hex');
const ASSETS=Object.freeze(['master','square','card']);
export const PRIVATE_CUSTODY_PUBLICATION_ENABLED=false;
/** Optional WU2-D provenance, HMAC-bound to the encrypted private custody manifest.
 * An operator's model/run claim is NOT independent provider or rights evidence.
 */
function snapshotProductionProvenance(input,receipt){
  if(input===undefined)return null;
  const keys=['referenceId','providerRunId','modelId','modelVersion','costMicros',
    'masterSha256','promptSha256','sourceConceptSha256','batchRevision'];
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.getPrototypeOf(input)!==Object.prototype)deny();
  const desc=Object.getOwnPropertyDescriptors(input);
  if(Reflect.ownKeys(input).length!==keys.length ||
     keys.some(key=>!Object.hasOwn(desc,key)||!Object.hasOwn(desc[key],'value')))deny();
  const plain=Object.fromEntries(keys.map(key=>[key,desc[key].value]));
  if(plain.referenceId!==receipt.referenceId||
     plain.masterSha256!==receipt.masterSha256||
     plain.promptSha256!==receipt.promptSha256||
     plain.sourceConceptSha256!==receipt.sourceConceptSha256||
     plain.batchRevision!==receipt.batchRevision||
     !ACTOR.test(plain.providerRunId||'')||
     !ACTOR.test(plain.modelId||'')||
     !ACTOR.test(plain.modelVersion||'')||
     !Number.isSafeInteger(plain.costMicros)||plain.costMicros<0||
     plain.costMicros>1_000_000_000)deny();
  return Object.freeze({
    ...plain,sourceEvidence:'OPERATOR_ASSERTED_NOT_PROVIDER_VERIFIED',
    assetDesignReview:'NOT_PROVIDED',assetClinicalReview:'NOT_PROVIDED',
    rightsReview:'NOT_VERIFIED',publishEnabled:false,
  });
}

export class PrivateCustodyError extends Error {
  constructor(){super('Private image custody denied; no public or guardian access.');}
}
const deny=()=>{throw new PrivateCustodyError();};
function keyBytes(raw){
  if(typeof raw!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(raw))deny();
  const b=Buffer.from(raw,'base64');
  if(b.length!==32||b.toString('base64')!==raw)deny();
  return b;
}
async function secureDirectory(path,make=false){
  if(make)try{await mkdir(path,{mode:0o700});}catch(e){if(e?.code!=='EEXIST')deny();}
  const s=await lstat(path);
  if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0)deny();
}
async function safeRoot(root){
  if(typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root||
     root===sep||/(^|\/)(public|static|uploads|www|htdocs|_next)(\/|$)/i.test(root))deny();
  const anchor=parse(root).root;
  let p=dirname(root);
  while(true){
    const s=await lstat(p);
    if(!s.isDirectory()||s.isSymbolicLink())deny();
    if(p===anchor)break;
    p=dirname(p);
  }
  await secureDirectory(root,true);
  const bundles=join(root,'bundles');
  await secureDirectory(bundles,true);
  return bundles;
}
async function exclusiveWrite(path,bytes){
  const fd=await open(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
  try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}
}
function encrypt(bytes,key,scope){
  const nonce=randomBytes(12);
  const c=createCipheriv('aes-256-gcm',key,nonce);
  c.setAAD(Buffer.from('WU2C:v1:'+scope));
  const body=Buffer.concat([c.update(bytes),c.final()]);
  return Buffer.concat([Buffer.from('TBC1'),nonce,c.getAuthTag(),body]);
}
/**
 * Serialize all append operations, including a purge's request/delete/final
 * event, using one root-wide lock. A bounded retry avoids losing events on
 * ordinary concurrent staging/purge; a stale/crashed lock fails closed.
 */
async function withAuditLock(root,work){
  const lockPath=join(root,'.audit-lock');
  let fd;
  try{
    for(let n=0;n<250;n++){
      try{
        fd=await open(lockPath,
          constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
        break;
      }catch(e){
        if(e?.code!=='EEXIST')deny();
        if(n===249)deny();
        await sleep(30);
      }
    }
    if(!fd)deny();
    return await work();
  }catch{deny();}
  finally{
    if(fd){
      await fd.close().catch(()=>{});
      await unlink(lockPath).catch(()=>{});
    }
  }
}
async function appendAuditUnlocked(root,key,event){
  const path=join(root,'custody-audit.jsonl');
  let raw='';
  try{raw=await readFile(path,'utf8');}catch(e){if(e?.code!=='ENOENT')deny();}
  if(raw.length>2*1024*1024)deny();
  const lines=raw?raw.trimEnd().split('\n'):[];
  if(raw&&!raw.endsWith('\n'))deny();
  let previous='0'.repeat(64);
  for(let i=0;i<lines.length;i++){
    const row=JSON.parse(lines[i]);
    if(row.seq!==i+1||row.previous!==previous||typeof row.mac!=='string'||!SHA.test(row.mac))deny();
    const {mac,...unsigned}=row;
    const expected=HASH(key,'WU2C_AUDIT_V1:'+JSON.stringify(unsigned));
    if(!timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(expected,'hex')))deny();
    previous=row.mac;
  }
  const unsigned={seq:lines.length+1,previous,event:event.kind,bundleId:event.bundleId,
    assetDigest:event.assetDigest,actor:event.actor,at:event.at};
  const line={...unsigned,mac:HASH(key,'WU2C_AUDIT_V1:'+JSON.stringify(unsigned))};
  const out=await open(path,constants.O_CREAT|constants.O_APPEND|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
  try{await out.writeFile(JSON.stringify(line)+'\n');await out.sync();}finally{await out.close();}
  return Object.freeze({sequence:line.seq,mac:line.mac});
}
async function audit(root,key,event){
  return withAuditLock(root,()=>appendAuditUnlocked(root,key,event));
}
/** Actual local ClamAV UNIX-socket scanner. Not an independent security approval. */
async function clamd(socket,command){
  if(!SOCKET.test(socket)||!Buffer.isBuffer(command)||command.length>14*1024*1024)deny();
  return new Promise((fulfill,reject)=>{
    let ended=false,result='';
    const client=createConnection({path:socket});
    const failure=()=>{if(!ended){ended=true;client.destroy();reject(new PrivateCustodyError());}};
    client.setTimeout(20000,failure);
    client.on('error',failure);
    client.on('data',data=>{result+=data.toString('utf8');if(result.length>512)failure();});
    client.on('end',()=>{if(!ended){ended=true;fulfill(result.replace(/\0/g,'').trim());}});
    client.on('connect',()=>client.end(command));
  });
}
export function createLocalClamdScanner(socket){
  if(!SOCKET.test(socket||''))deny();
  return async bytes=>{
    if(!Buffer.isBuffer(bytes)||bytes.length<60||bytes.length>12*1024*1024)deny();
    const ping=await clamd(socket,Buffer.from('zPING\0'));
    if(ping!=='PONG')deny();
    const version=await clamd(socket,Buffer.from('zVERSION\0'));
    if(!/^ClamAV [a-zA-Z0-9.\/-]{3,40}/.test(version))deny();
    const len=Buffer.alloc(4);len.writeUInt32BE(bytes.length);
    const response=await clamd(socket,Buffer.concat([Buffer.from('zINSTREAM\0'),len,bytes,Buffer.alloc(4)]));
    if(response!=='stream: OK')deny();
    return {verdict:'CLEAN',sha256:HEX(bytes),scannedBytes:bytes.length,
      engine:'ClamAV',signatureSetVersion:version.split(/\s+/)[1].replace(/[^a-zA-Z0-9._-]/g,'').slice(0,60)};
  };
}
/**
 * Store master and each derivative ONLY after a clean scanner attestation,
 * with AES-256-GCM AAD-bound encryption and atomic private directory rename.
 * Injection of scanner is exclusively for deterministic synthetic tests:
 * its receipt is never an independent operational security approval.
 */
export async function stagePrivateIllustration({root,keyBase64,referenceId,evidence,masterBytes,
  scanner,operatorId,productionProvenance,nowMs=Date.now(),retentionDays=7}){
  if(!Buffer.isBuffer(masterBytes)||masterBytes.length>12*1024*1024||
     typeof scanner!=='function'||!ACTOR.test(operatorId||'')||
     !Number.isSafeInteger(nowMs)||nowMs<0||
     !Number.isSafeInteger(retentionDays)||retentionDays<1||retentionDays>30)deny();
  const snapshot=Buffer.from(masterBytes);
  let key,pending,final,committed=false;
  try{
    key=keyBytes(keyBase64);
    const bundles=await safeRoot(root);
    const output=await preparePrivateDerivatives({evidence,referenceId,masterBytes:snapshot});
    const provenance=snapshotProductionProvenance(productionProvenance,output.receipt);
    const assets={master:snapshot,square:output.squareBytes,card:output.cardBytes};
    const scans={};
    for(const kind of ASSETS){
      const bytes=assets[kind];
      const proof=await scanner(Buffer.from(bytes));
      if(!proof||typeof proof!=='object'||Object.getPrototypeOf(proof)!==Object.prototype ||
         proof.verdict!=='CLEAN'||proof.sha256!==HEX(bytes)||
         proof.scannedBytes!==bytes.length||proof.engine!=='ClamAV'||
         !/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(proof.signatureSetVersion||''))deny();
      scans[kind]=Object.freeze({sha256:proof.sha256,bytes:bytes.length,
        scanner:'ClamAV',signatureSetVersion:proof.signatureSetVersion});
    }
    const bundleId=randomUUID();
    pending=join(bundles,'.pending-'+bundleId);
    final=join(bundles,bundleId);
    await mkdir(pending,{mode:0o700});
    await secureDirectory(pending);
    const manifest={
      schemaVersion:1,bundleId,referenceId,styleVersion:'m5-b-v1',
      batchRevision:output.receipt.batchRevision,sourceConceptSha256:output.receipt.sourceConceptSha256,
      providerId:output.receipt.providerId,
      providerTermsSha256:output.receipt.providerTermsSha256,
      commercialLicenseSha256:output.receipt.commercialLicenseSha256,
      createdAt:nowMs,expiresAt:nowMs+retentionDays*86400000,
      ...(provenance?{productionProvenance:provenance}:{}),
      legalHold:'UNVERIFIED',status:'PRIVATE_QUARANTINED',
      assets:scans,rightsVerified:false,independentSecurityApproved:false,
      published:false,guardianReadEnabled:false,readEnabled:false,
      clinicalGate:'NO_GO_G2_G2b',
    };
    for(const kind of ASSETS){
      const ciphertext=encrypt(assets[kind],key,bundleId+':'+referenceId+':'+kind+':'+scans[kind].sha256);
      await exclusiveWrite(join(pending,kind+'.tbenc'),ciphertext);
    }
    const signed={manifest,mac:HASH(key,'WU2C_MANIFEST_V1:'+JSON.stringify(manifest))};
    const json=JSON.stringify(signed);
    await exclusiveWrite(join(pending,'manifest.json'),Buffer.from(json));
    await rename(pending,final);
    pending=undefined;committed=true;
    const receipt=await audit(root,key,{kind:'QUARANTINED',bundleId,
      assetDigest:HEX(Buffer.from(json)),actor:operatorId,at:nowMs});
    return Object.freeze({
      bundleId,manifestSha256:HEX(Buffer.from(json)),
      auditSequence:receipt.sequence,assetCount:3,
      status:'PRIVATE_QUARANTINED',storageEncrypted:true,
      scannerReportedClean:true,independentSecurityApproved:false,
      legalHoldVerified:false,rightsVerified:false,
      published:false,readEnabled:false,guardianReadEnabled:false,
      clinicalGate:'NO_GO_G2_G2b',
    });
  }catch{
    if(pending)await rm(pending,{recursive:true,force:true}).catch(()=>{});
    if(committed&&final)await rm(final,{recursive:true,force:true}).catch(()=>{});
    deny();
  }finally{if(key)key.fill(0);snapshot.fill(0);}
}
/**
 * Explicit operator-only retention purge. Every bundle defaults to legal hold
 * UNKNOWN: refuse deletion unless a matching operator clearance is supplied.
 * Clearance is an operational assertion, NOT a trusted legal signature.
 * No application route invokes this action.
 */
export async function purgeExpiredPrivateIllustration({root,keyBase64,bundleId,
  expectedManifestSha256,operatorId,nowMs=Date.now(),clearance}){
  if(!UUID.test(bundleId||'')||!SHA.test(expectedManifestSha256||'')||
     !ACTOR.test(operatorId||'')||!Number.isSafeInteger(nowMs)||nowMs<0||
     !clearance||Object.getPrototypeOf(clearance)!==Object.prototype ||
     clearance.noLegalHold!==true||clearance.bundleId!==bundleId||
     clearance.manifestSha256!==expectedManifestSha256||
     !ACTOR.test(clearance.reviewerId||''))deny();
  let key,lock;
  try{
    key=keyBytes(keyBase64);
    const bundles=await safeRoot(root),target=join(bundles,bundleId);
    lock=await open(join(bundles,bundleId+'.purge.lock'),
      constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
    await secureDirectory(target);
    const raw=await readFile(join(target,'manifest.json'));
    if(raw.length>12000||HEX(raw)!==expectedManifestSha256)deny();
    const {manifest,mac}=JSON.parse(raw.toString('utf8'));
    if(!manifest||Object.getPrototypeOf(manifest)!==Object.prototype||
       typeof mac!=='string'||!SHA.test(mac)||
       !timingSafeEqual(Buffer.from(mac,'hex'),
         Buffer.from(HASH(key,'WU2C_MANIFEST_V1:'+JSON.stringify(manifest)),'hex'))||
       manifest.bundleId!==bundleId||manifest.status!=='PRIVATE_QUARANTINED'||
       manifest.legalHold!=='UNVERIFIED'||manifest.published!==false||
       !Number.isSafeInteger(manifest.expiresAt)||nowMs<manifest.expiresAt)deny();
    // Keep the root journal lock over BOTH audit events and the destructive
    // rm. Other bundles cannot interleave or falsely fail after deletion.
    const receipt=await withAuditLock(root,async()=>{
      // The audit file has a hard 2 MiB ceiling. Before ANY deletion reserve
      // room for BOTH fixed-shape events and their MACs. Each serialized
      // entry is < 1 KiB (bounded actor, UUID, SHA and safe integer time).
      // Prevent deterministic loss of PURGED when journal is near capacity.
      const journal=await readFile(join(root,'custody-audit.jsonl'));
      if(journal.length>2*1024*1024-2048)deny();
      await appendAuditUnlocked(root,key,{kind:'PURGE_REQUESTED',bundleId,
        assetDigest:expectedManifestSha256,actor:operatorId,at:nowMs});
      await rm(target,{recursive:true,force:false});
      return appendAuditUnlocked(root,key,{kind:'PURGED',bundleId,
        assetDigest:expectedManifestSha256,actor:operatorId,at:nowMs});
    });
    return Object.freeze({bundleId,status:'PURGED',auditSequence:receipt.sequence,
      published:false,readEnabled:false,guardianReadEnabled:false,
      clinicalGate:'NO_GO_G2_G2b'});
  }catch{deny();}
  finally{
    if(lock){await lock.close().catch(()=>{});await unlink(join(root,'bundles',bundleId+'.purge.lock')).catch(()=>{});}
    if(key)key.fill(0);
  }
}

/**
 * The operator-facing entrypoint NEVER accepts a caller-selected scan verdict.
 * Scanner location and key come only from the server-host environment, and
 * real ClamAV is mandatory. Missing variables fail before image persistence.
 */
export async function stagePrivateIllustrationOnHost({
  root,referenceId,evidence,masterBytes,operatorId,productionProvenance,nowMs,retentionDays,
},env=process.env){
  try{
    if(!env||typeof env!=='object')deny();
    const scanner=createLocalClamdScanner(env.TB_MEDIA_CLAMD_SOCKET);
    return await stagePrivateIllustration({
      root,keyBase64:env.TB_PRIVATE_DATA_KEY_B64,
      referenceId,evidence,masterBytes,operatorId,productionProvenance,nowMs,retentionDays,scanner,
    });
  }catch{deny();}
}
