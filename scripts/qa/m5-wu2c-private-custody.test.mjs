import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,symlink,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {
  PRIVATE_CUSTODY_PUBLICATION_ENABLED,PrivateCustodyError,
  createLocalClamdScanner,stagePrivateIllustration,purgeExpiredPrivateIllustration,
  stagePrivateIllustrationOnHost,
} from './m5-wu2c-private-custody.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const key=()=>randomBytes(32).toString('base64');
const evidence=()=>({providerId:'synthetic-provider-2026',
  providerTermsSha256:'a'.repeat(64),commercialLicenseSha256:'b'.repeat(64)});
const crc32=bytes=>{
  let v=0xffffffff;
  for(const c of bytes){v^=c;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0);}
  return (v^0xffffffff)>>>0;
};
const chunk=(type,bytes)=>{
  const out=Buffer.alloc(bytes.length+12);
  out.writeUInt32BE(bytes.length,0);out.write(type,4,'ascii');bytes.copy(out,8);
  out.writeUInt32BE(crc32(out.subarray(4,8+bytes.length)),8+bytes.length);
  return out;
};
function master(){
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(1600,0);ihdr.writeUInt32BE(1200,4);ihdr[8]=8;ihdr[9]=2;
  const raw=Buffer.alloc(1200*(1+1600*3));
  for(let y=0;y<1200;y++){
    const row=y*(1+1600*3);
    for(let x=0;x<1600;x++){
      const p=row+1+x*3;raw[p]=x%256;raw[p+1]=y%256;raw[p+2]=(x+y)%256;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a','hex'),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:6})),
    chunk('IEND',Buffer.alloc(0)),
  ]);
}
const scan=async bytes=>({verdict:'CLEAN',sha256:sha(bytes),scannedBytes:bytes.length,
  engine:'ClamAV',signatureSetVersion:'1.4.0-test'});
const input=(root,secret,bytes=master())=>({
  root,keyBase64:secret,referenceId:'WU2A-S1-SPEECH',
  evidence:evidence(),masterBytes:bytes,scanner:scan,
  operatorId:'synthetic-operator',nowMs:1792800000000,retentionDays:7,
});
const isolated=async fn=>{
  const root=await mkdtemp(join(tmpdir(),'tb-wu2c-private-'));
  try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}
};

test('scanner identity requires trusted local ClamAV socket (no HTTP or remote address)',()=>{
  for(const p of ['tcp://remote:3310','http://foo','/tmp/clamd.sock','/run/clamav/../unsafe']){
    assert.throws(()=>createLocalClamdScanner(p),PrivateCustodyError);
  }
  assert.equal(typeof createLocalClamdScanner('/run/clamav/clamd.ctl'),'function');
  assert.equal(PRIVATE_CUSTODY_PUBLICATION_ENABLED,false);
});

test('private custody scans all three variants, atomically encrypts and logs; expiry purge requires clearance',async()=>{
  await isolated(async root=>{
    const secret=key(),original=master(),seen=[];
    const req=input(root,secret,original);
    req.scanner=async bytes=>{seen.push(sha(bytes));return scan(bytes);};
    const receipt=await stagePrivateIllustration(req);
    assert.match(receipt.bundleId,/^[a-f0-9-]{36}$/);
    assert.equal(receipt.assetCount,3);
    assert.equal(receipt.storageEncrypted,true);
    assert.equal(receipt.scannerReportedClean,true);
    assert.equal(receipt.published,false);
    assert.equal(receipt.readEnabled,false);
    assert.equal(receipt.guardianReadEnabled,false);
    assert.equal(receipt.independentSecurityApproved,false);
    assert.equal(receipt.legalHoldVerified,false);
    assert.equal(seen.length,3);
    assert.equal(seen[0],sha(original));
    const directory=join(root,'bundles',receipt.bundleId);
    assert.deepEqual((await readdir(directory)).sort(),
      ['card.tbenc','manifest.json','master.tbenc','square.tbenc']);
    const encrypted=await readFile(join(directory,'master.tbenc'));
    assert.equal(encrypted.subarray(0,4).toString(),'TBC1');
    assert.equal(encrypted.includes(original.subarray(0,8)),false);
    assert.notEqual(sha(encrypted),sha(original));
    const envelope=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
    assert.equal(envelope.manifest.referenceId,'WU2A-S1-SPEECH');
    assert.equal(envelope.manifest.styleVersion,'m5-b-v1');
    assert.equal(envelope.manifest.legalHold,'UNVERIFIED');
    assert.equal(envelope.manifest.rightsVerified,false);
    assert.equal(envelope.manifest.published,false);
    assert.equal(envelope.manifest.assets.master.sha256,sha(original));
    assert(!JSON.stringify(receipt).includes(root));
    assert(!JSON.stringify(receipt).includes(secret));
    assert(!JSON.stringify(receipt).includes('http'));
    assert.equal((await readFile(join(root,'custody-audit.jsonl'),'utf8')).split('\n').filter(Boolean).length,1);
    const clearance={bundleId:receipt.bundleId,manifestSha256:receipt.manifestSha256,
      reviewerId:'synthetic-retention-reviewer',noLegalHold:true};
    const purgeArgs={root,keyBase64:secret,bundleId:receipt.bundleId,
      expectedManifestSha256:receipt.manifestSha256,operatorId:'synthetic-operator',
      clearance,nowMs:req.nowMs+7*86400000};
    await assert.rejects(purgeExpiredPrivateIllustration({...purgeArgs,nowMs:req.nowMs}),PrivateCustodyError);
    await assert.rejects(purgeExpiredPrivateIllustration({...purgeArgs,clearance:{...clearance,noLegalHold:false}}),PrivateCustodyError);
    await assert.rejects(purgeExpiredPrivateIllustration({...purgeArgs,keyBase64:key()}),PrivateCustodyError);
    const purged=await purgeExpiredPrivateIllustration(purgeArgs);
    assert.equal(purged.status,'PURGED');
    assert.equal(purged.published,false);
    assert.equal((await readdir(join(root,'bundles')).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e))).length,0);
    const audit=(await readFile(join(root,'custody-audit.jsonl'),'utf8')).split('\n').filter(Boolean).map(JSON.parse);
    assert.deepEqual(audit.map(row=>row.event),['QUARANTINED','PURGE_REQUESTED','PURGED']);
    assert.equal(audit[1].previous,audit[0].mac);
    assert.equal(audit[2].previous,audit[1].mac);
    await assert.rejects(purgeExpiredPrivateIllustration(purgeArgs),PrivateCustodyError);
  });
});

test('missing and infected scanner attestations cannot write private files or mint approval',async()=>{
  await isolated(async root=>{
    const req=input(root,key());
    for(const scanner of [
      undefined,
      async()=>{throw Error('scanner offline');},
      async b=>({...await scan(b),verdict:'INFECTED'}),
      async b=>({...await scan(b),sha256:'0'.repeat(64)}),
      async b=>({...await scan(b),scannedBytes:b.length-1}),
      async b=>({...await scan(b),engine:'User-Agent'}),
    ]){
      await assert.rejects(stagePrivateIllustration({...req,scanner}),PrivateCustodyError);
    }
    const children=await readdir(join(root,'bundles'));
    assert.deepEqual(children,[]);
  });
});

test('invalid crypto, public paths and symlink paths fail closed',async()=>{
  await isolated(async root=>{
    const req=input(root,key());
    await assert.rejects(stagePrivateIllustration({...req,keyBase64:'unsafe'}),PrivateCustodyError);
    await assert.rejects(stagePrivateIllustration({...req,root:join(root,'public','media')}),PrivateCustodyError);
    const to=join(root,'private-target');await mkdir(to,{mode:0o700});
    const alias=join(root,'alias');await symlink(to,alias);
    await assert.rejects(stagePrivateIllustration({...req,root:alias}),PrivateCustodyError);
    assert.equal((await readdir(join(root,'bundles')).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e))).length,0);
  });
});

test('journal tampering blocks any additional storage and retention purge',async()=>{
  await isolated(async root=>{
    const secret=key(),req=input(root,secret);
    const receipt=await stagePrivateIllustration(req);
    const journal=join(root,'custody-audit.jsonl');
    const {writeFile}=await import('node:fs/promises');
    const raw=await readFile(journal,'utf8');
    await writeFile(journal,raw.replace('QUARANTINED','PUBLISHED'));
    await assert.rejects(stagePrivateIllustration(req),PrivateCustodyError);
    const clearance={bundleId:receipt.bundleId,manifestSha256:receipt.manifestSha256,
      reviewerId:'synthetic-operator',noLegalHold:true};
    await assert.rejects(purgeExpiredPrivateIllustration({
      root,keyBase64:secret,bundleId:receipt.bundleId,
      expectedManifestSha256:receipt.manifestSha256,operatorId:'synthetic-operator',
      nowMs:req.nowMs+8*86400000,clearance,
    }),PrivateCustodyError);
    assert((await readdir(join(root,'bundles'))).includes(receipt.bundleId));
  });
});

test('operator host entrypoint refuses absent/remote ClamAV configuration even with valid key',async()=>{
  await isolated(async root=>{
    const req=input(root,key());
    delete req.scanner;delete req.keyBase64;
    for(const env of [{}, {TB_PRIVATE_DATA_KEY_B64:key(),TB_MEDIA_CLAMD_SOCKET:'http://remote'},
      {TB_PRIVATE_DATA_KEY_B64:'invalid',TB_MEDIA_CLAMD_SOCKET:'/run/clamav/not-present.sock'}]){
      await assert.rejects(stagePrivateIllustrationOnHost(req,env),PrivateCustodyError);
    }
  });
});

test('concurrent expirations never delete a bundle without its matching PURGED audit',async()=>{
  await isolated(async root=>{
    const secret=key(),now=1792800000000;
    const receipts=[];
    for(let i=0;i<4;i++){
      const req=input(root,secret);
      req.operatorId='synthetic-operator-'+i;
      receipts.push(await stagePrivateIllustration(req));
    }
    const purges=receipts.map((item,i)=>purgeExpiredPrivateIllustration({
      root,keyBase64:secret,bundleId:item.bundleId,
      expectedManifestSha256:item.manifestSha256,
      operatorId:'synthetic-operator-'+i,
      nowMs:now+8*86400000,
      clearance:{bundleId:item.bundleId,manifestSha256:item.manifestSha256,
        reviewerId:'synthetic-retention-reviewer',noLegalHold:true},
    }));
    const done=await Promise.all(purges);
    assert.equal(done.length,4);
    assert(done.every(x=>x.status==='PURGED'));
    assert.deepEqual(await readdir(join(root,'bundles')),[]);
    const events=(await readFile(join(root,'custody-audit.jsonl'),'utf8'))
      .split('\n').filter(Boolean).map(JSON.parse);
    assert.equal(events.length,12);
    assert.equal(events.filter(x=>x.event==='QUARANTINED').length,4);
    assert.equal(events.filter(x=>x.event==='PURGE_REQUESTED').length,4);
    assert.equal(events.filter(x=>x.event==='PURGED').length,4);
    for(let i=0;i<events.length;i++){
      assert.equal(events[i].seq,i+1);
      assert.equal(events[i].previous,i===0?'0'.repeat(64):events[i-1].mac);
    }
    for(const item of receipts){
      const requested=events.findIndex(e=>e.bundleId===item.bundleId&&e.event==='PURGE_REQUESTED');
      assert.equal(events[requested+1].event,'PURGED');
      assert.equal(events[requested+1].bundleId,item.bundleId);
    }
  });
});

test('near-capacity valid HMAC journal denies purge BEFORE deleting its bundle',async()=>{
  await isolated(async root=>{
    const secret=key(),req=input(root,secret),receipt=await stagePrivateIllustration(req);
    const path=join(root,'custody-audit.jsonl');
    let raw=await readFile(path,'utf8');
    const last=JSON.parse(raw.trimEnd().split('\n').at(-1));
    let previous=last.mac,seq=last.seq;
    const hmacKey=Buffer.from(secret,'base64');
    const limit=2*1024*1024-1400;
    while(Buffer.byteLength(raw)<limit){
      const unsigned={seq:++seq,previous,event:'SYNTHETIC_AUDIT_PADDING',
        bundleId:receipt.bundleId,assetDigest:'a'.repeat(64),
        actor:'synthetic-operator',at:req.nowMs};
      const mac=createHmac('sha256',hmacKey)
        .update('WU2C_AUDIT_V1:'+JSON.stringify(unsigned)).digest('hex');
      raw+=JSON.stringify({...unsigned,mac})+'\n';
      previous=mac;
    }
    assert(Buffer.byteLength(raw)<=2*1024*1024);
    assert(Buffer.byteLength(raw)>2*1024*1024-2048);
    await writeFile(path,raw);
    await assert.rejects(purgeExpiredPrivateIllustration({
      root,keyBase64:secret,bundleId:receipt.bundleId,
      expectedManifestSha256:receipt.manifestSha256,
      operatorId:'synthetic-operator',nowMs:req.nowMs+8*86400000,
      clearance:{bundleId:receipt.bundleId,
        manifestSha256:receipt.manifestSha256,
        reviewerId:'synthetic-retention-reviewer',noLegalHold:true},
    }),PrivateCustodyError);
    assert((await readdir(join(root,'bundles'))).includes(receipt.bundleId));
    assert.equal(await readFile(path,'utf8'),raw);
  });
});
