/**
 * Private operator intake of the exact, owner-directed M5 artwork pack.
 * Master provenance is not invented: normalized images are NOT provider
 * originals; provider run, signed rights and clinical approvals stay absent.
 * No network, public Git image bytes, or client delivery.
 */
import {createHash} from 'node:crypto';
import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,resolve} from 'node:path';
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
    }else fail();
  }catch{console.error('Artwork intake stopped. Check the pack and private scanner/rights configuration. No publication enabled.');process.exitCode=1;}
}
