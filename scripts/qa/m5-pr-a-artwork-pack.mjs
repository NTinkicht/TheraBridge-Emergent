/**
 * Private operator intake of the exact, owner-directed M5 artwork pack.
 * Master provenance is not invented: normalized images are NOT provider
 * originals; provider run, signed rights and clinical approvals stay absent.
 * No network, public Git image bytes, or client delivery.
 */
import {createHash,createHmac,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {GENERATED_ARTWORK} from '../../apps/web/src/lib/generated-artwork.mjs';
import {stagePrivateIllustrationOnHost} from './m5-wu2c-private-custody.mjs';

export const PACK_MANIFEST_SHA256='b573eb4f5bb578ed14c5a33688045a24950fa383afc14ed32dec11527502b2c3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const fail=()=>{throw new Error('Generated artwork pack verification or private intake failed.');};

async function readBounded(root,name,max){
  if(typeof name!=='string'||!/^[a-zA-Z0-9._-]+$/.test(name)||name==='.'||name==='..')fail();
  const path=join(root,name);
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const stat=await file.stat();
    if(!stat.isFile()||stat.size<1||stat.size>max)fail();
    const bytes=Buffer.alloc(stat.size);
    let offset=0;
    while(offset<bytes.length){
      const {bytesRead}=await file.read(bytes,offset,bytes.length-offset,offset);
      if(!bytesRead)fail();
      offset+=bytesRead;
    }
    const extra=Buffer.alloc(1);
    if((await file.read(extra,0,1,bytes.length)).bytesRead!==0)fail();
    return bytes;
  } finally {await file.close();}
}
function validatePngHeader(bytes,w,h){
  if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
    bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR'||
    bytes.readUInt32BE(16)!==w||bytes.readUInt32BE(20)!==h||
    bytes[24]!==8||bytes[25]!==2||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)fail();
}

/** The manifest and all 100 asset hashes are pinned. This is local integrity, not antivirus. */
export async function verifyArtworkPack(root){
  const dir=resolve(root);
  const stat=await lstat(dir);
  if(!stat.isDirectory()||stat.isSymbolicLink())fail();
  const raw=await readBounded(dir,'manifest.json',128*1024);
  if(sha(raw)!==PACK_MANIFEST_SHA256)fail();
  const pack=JSON.parse(raw.toString('utf8'));
  if(pack.schemaVersion!==1||pack.styleVersion!=='m5-b-v1'||pack.assets?.length!==25||
    pack.status!=='SYNTHETIC_ART_INTAKE_NOT_RELEASED')fail();
  const seen=new Set();
  for(const item of pack.assets){
    const ref=GENERATED_ARTWORK.find(x=>x.referenceId===item.referenceId);
    if(!ref||seen.has(ref.referenceId)||item.reviewSha256!==ref.reviewSha256||
      item.reviewByteLength!==ref.reviewByteLength||item.reviewFile!==ref.reviewFile||
      item.scene!==ref.scene||item.family!==ref.family||item.alt!==ref.alt||item.publishEnabled!==false)fail();
    const prefix=ref.referenceId.toLowerCase();
    for(const [kind,suffix,w,h,max] of [
      ['master','.png',1600,1200,12*1024*1024],
      ['review','-review.png',400,300,512*1024],
      ['thumbnail','-thumb.webp',400,300,512*1024],
      ['square','-square.webp',400,400,512*1024],
    ]){
      const name=item[kind+'File'],digest=item[kind+'Sha256'];
      if(name!==prefix+suffix||typeof digest!=='string'||!HEX.test(digest))fail();
      const bytes=await readBounded(dir,name,max);
      if(sha(bytes)!==digest)fail();
      if(kind==='master'||kind==='review')validatePngHeader(bytes,w,h);
      if(kind==='review'&&bytes.length!==ref.reviewByteLength)fail();
    }
    seen.add(ref.referenceId);
  }
  return Object.freeze({dir,assets:Object.freeze(pack.assets.map(x=>Object.freeze(x))),
    manifestSha256:PACK_MANIFEST_SHA256,verifiedReferences:25,verifiedFiles:100,
    status:'LOCAL_INTEGRITY_ONLY',approved:false,published:false,clinicalGate:'NO_GO_G2_G2b'});
}

/** Deliberately no fallback scanner, default rights evidence, or invented provider run receipt. */
export async function stageArtworkPack({packDir,custodyRoot,evidence,operatorId,journalPath}){
  const checked=await verifyArtworkPack(packDir);
  if(!evidence||Object.keys(evidence).length!==3||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{3,79}$/.test(evidence.providerId||'')||
    !HEX.test(evidence.providerTermsSha256||'')||!HEX.test(evidence.commercialLicenseSha256||''))fail();
  if(!process.env.TB_PRIVATE_DATA_KEY_B64||!process.env.TB_MEDIA_CLAMD_SOCKET)fail();
  const journal=await open(journalPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
  let count=0;
  try{
    for(const item of checked.assets){
      // Read and compare the master again immediately before staging.
      const master=await readBounded(checked.dir,item.masterFile,12*1024*1024);
      if(sha(master)!==item.masterSha256)fail();
      const receipt=await stagePrivateIllustrationOnHost({
        root:custodyRoot,referenceId:item.referenceId,evidence,masterBytes:master,operatorId,
      });
      await journal.writeFile(JSON.stringify({referenceId:item.referenceId,masterSha256:item.masterSha256,
        bundleId:receipt.bundleId,manifestSha256:receipt.manifestSha256,
        status:receipt.status,published:false})+'\n');
      await journal.sync();count++;
    }
    return {staged:count,status:'PRIVATE_QUARANTINED_NOT_RELEASED',published:false};
  }finally{await journal.close();}
}
// Verify an actual, completed host import. This exposes no decrypted bytes,
// storage paths, key, or rights decision. A missing/partial journal is failure.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const macFor=(key,prefix,record)=>createHmac('sha256',key).update(prefix+JSON.stringify(record)).digest('hex');
function sameMac(actual,expected){
  return typeof actual==='string'&&HEX.test(actual)&&timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
}
function jsonLines(bytes){
  const raw=bytes.toString('utf8');
  if(!raw.endsWith('\n'))fail();
  return raw.slice(0,-1).split('\n').map(line=>JSON.parse(line));
}
async function privateDir(path){
  const stat=await lstat(path);
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)fail();
}
function checkEncryptedAsset(ciphertext,key,bundleId,referenceId,kind,proof){
  if(!proof||!HEX.test(proof.sha256)||!Number.isSafeInteger(proof.bytes)||
    proof.bytes<60||proof.bytes>12*1024*1024||proof.scanner!=='ClamAV'||
    typeof proof.signatureSetVersion!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(proof.signatureSetVersion)||
    ciphertext.length!==proof.bytes+32||ciphertext.subarray(0,4).toString('ascii')!=='TBC1')fail();
  const decipher=createDecipheriv('aes-256-gcm',key,ciphertext.subarray(4,16));
  decipher.setAAD(Buffer.from('WU2C:v1:'+bundleId+':'+referenceId+':'+kind+':'+proof.sha256));
  decipher.setAuthTag(ciphertext.subarray(16,32));
  const bytes=Buffer.concat([decipher.update(ciphertext.subarray(32)),decipher.final()]);
  try{
    if(sha(bytes)!==proof.sha256||bytes.length!==proof.bytes)fail();
    const [w,h]=kind==='master'?[1600,1200]:kind==='square'?[1200,1200]:[400,300];
    validatePngHeader(bytes,w,h);
  }finally{bytes.fill(0);}
}
/** Operator-only verification against the original exact 25-reference pack. */
export async function verifyStagedArtworkPack({packDir,custodyRoot,journalPath}){
  const pack=await verifyArtworkPack(packDir);
  const encoded=process.env.TB_PRIVATE_DATA_KEY_B64;
  if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(encoded))fail();
  const key=Buffer.from(encoded,'base64');
  if(key.length!==32||key.toString('base64')!==encoded){key.fill(0);fail();}
  try{
    const root=resolve(custodyRoot),bundles=join(root,'bundles');
    await privateDir(root);await privateDir(bundles);
    const journal=resolve(journalPath);
    const rows=jsonLines(await readBounded(dirname(journal),journal.split('/').pop(),64*1024));
    if(rows.length!==pack.verifiedReferences)fail();
    const audit=jsonLines(await readBounded(root,'custody-audit.jsonl',2*1024*1024));
    let previous='0'.repeat(64);
    const last=new Map();
    for(const [i,row] of audit.entries()){
      const {mac,...unsigned}=row;
      if(row.seq!==i+1||row.previous!==previous||
        !sameMac(mac,macFor(key,'WU2C_AUDIT_V1:',unsigned)))fail();
      previous=mac;last.set(row.bundleId,row);
    }
    const references=new Set(),bundleIds=new Set();
    for(const row of rows){
      const item=pack.assets.find(a=>a.referenceId===row.referenceId);
      if(!item||references.has(row.referenceId)||!UUID.test(row.bundleId)||
        bundleIds.has(row.bundleId)||row.masterSha256!==item.masterSha256||
        !HEX.test(row.manifestSha256)||row.status!=='PRIVATE_QUARANTINED'||row.published!==false)fail();
      const event=last.get(row.bundleId);
      if(!event||event.event!=='QUARANTINED'||event.assetDigest!==row.manifestSha256)fail();
      const dir=join(bundles,row.bundleId);
      await privateDir(dir);
      const raw=await readBounded(dir,'manifest.json',12000);
      if(sha(raw)!==row.manifestSha256)fail();
      const {manifest,mac}=JSON.parse(raw.toString('utf8'));
      if(!manifest||!sameMac(mac,macFor(key,'WU2C_MANIFEST_V1:',manifest))||
        manifest.bundleId!==row.bundleId||manifest.referenceId!==row.referenceId||
        manifest.schemaVersion!==1||manifest.styleVersion!=='m5-b-v1'||
        manifest.status!=='PRIVATE_QUARANTINED'||manifest.legalHold!=='UNVERIFIED'||
        manifest.rightsVerified!==false||manifest.independentSecurityApproved!==false||
        manifest.published!==false||manifest.readEnabled!==false||manifest.guardianReadEnabled!==false||
        manifest.clinicalGate!=='NO_GO_G2_G2b'||manifest.assets?.master?.sha256!==item.masterSha256)fail();
      for(const kind of ['master','square','card']){
        const encrypted=await readBounded(dir,kind+'.tbenc',12*1024*1024+32);
        checkEncryptedAsset(encrypted,key,row.bundleId,row.referenceId,kind,manifest.assets[kind]);
      }
      references.add(row.referenceId);bundleIds.add(row.bundleId);
    }
    return Object.freeze({verifiedReferences:references.size,verifiedEncryptedFiles:references.size*3,
      status:'PRIVATE_CUSTODY_INTEGRITY_VERIFIED',rightsVerified:false,independentSecurityApproved:false,
      published:false,readEnabled:false,guardianReadEnabled:false,clinicalGate:'NO_GO_G2_G2b'});
  }finally{key.fill(0);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [command,packDir,root,evidencePath,operatorId,journalPath]=process.argv.slice(2);
  try{
    if(command==='verify'&&packDir){
      const v=await verifyArtworkPack(packDir);
      console.log(JSON.stringify({verifiedReferences:v.verifiedReferences,verifiedFiles:v.verifiedFiles,
        manifestSha256:v.manifestSha256,status:v.status,published:false}));
    }else if(command==='stage'&&packDir&&root&&evidencePath&&operatorId&&journalPath){
      const evidence=JSON.parse(await readBounded(resolve(evidencePath,'..'),evidencePath.split('/').pop(),4096));
      console.log(JSON.stringify(await stageArtworkPack({packDir,custodyRoot:root,evidence,operatorId,journalPath})));
    }else if(command==='verify-staged'&&packDir&&root&&evidencePath){
      console.log(JSON.stringify(await verifyStagedArtworkPack({packDir,custodyRoot:root,journalPath:evidencePath})));
    }else fail();
  }catch{console.error('Artwork intake stopped. Check the pack and private scanner/rights configuration. No publication enabled.');process.exitCode=1;}
}
