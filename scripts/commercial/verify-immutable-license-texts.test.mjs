import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import https from 'node:https';
import {validatedRawUrl,validateText,collectTextHashes,fetchRaw} from './verify-immutable-license-texts.mjs';
function fixture(){
 const row={name:'alpha',version:'1.0.0',publisherEvidenceStatus:'TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE',
  registryManifestSha256:'a'.repeat(64),commercialApproval:false,legalReviewStatus:'UNRESOLVED',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'};
 const candidates={schema:'therabridge-com02-upstream-authority-candidates-v1',
  counts:{exceptions:2,legallyApproved:0},records:[row,{...row,name:'beta',version:'2.0.0'}],
  unresolvedNonPackageAssets:91,finalNoticesIssued:false,commercialLicenseGranted:false};
 const mappings={schema:'therabridge-com02-immutable-source-mappings-v1',approved:0,records:[]};
 return {candidates,mappings};
}
const pinned={name:'alpha',version:'1.0.0',owner:'org',repository:'project',commit:'a'.repeat(40),path:'LICENSE.md',
 commercialApproval:false,sourceVersionCorrespondenceApproved:false,counselApproval:false};
test('refuses mutable SHA, unsafe paths, domains and traversal',()=>{
 assert.equal(validatedRawUrl(pinned),'https://raw.githubusercontent.com/org/project/'+ 'a'.repeat(40)+'/LICENSE.md');
 for(const mutation of [
 x=>x.commit='main',x=>x.commit='f'.repeat(39),x=>x.path='../LICENSE',
 x=>x.path='LICENSE/../NOTICE',x=>x.path='readme.md',
 x=>x.owner='evil.com/other',x=>x.repository='x?url=bad',x=>x.path='LICENSE\\text',
 ]){const x={...pinned};mutation(x);assert.throws(()=>validatedRawUrl(x));}
});
test('no mapping means preserve every exception with zero texts or approvals',async()=>{
 const {candidates,mappings}=fixture();
 const out=await collectTextHashes(candidates,mappings,{fetcher:async()=>{throw Error('must not fetch');}});
 assert.deepEqual(out.counts,{exceptions:2,mapped:0,immutableSourceFilesHashed:0,unmapped:2,authoritativeVersionCorrespondenceVerified:0,legallyApproved:0});
 assert(out.records.every(x=>x.evidenceStatus==='UNMAPPED_SOURCE_REVISION'&&x.commercialApproval===false));
 assert.equal(out.unresolvedNonPackageAssets,91);
});
test('pinned source bytes are hashed but source/version correspondence stays UNVERIFIED',async()=>{
 const {candidates,mappings}=fixture();mappings.records.push({...pinned});
 const bytes=Buffer.from('Copyright 2026\nLicense terms sample for tests only.\n');
 const out=await collectTextHashes(candidates,mappings,{fetcher:async()=>bytes});
 assert.equal(out.counts.immutableSourceFilesHashed,1);
 const row=out.records.find(x=>x.name==='alpha');
 assert.equal(row.sourceTextSha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(row.sourceVersionCorrespondence,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(row.commercialApproval,false);
 assert.equal(out.counts.authoritativeVersionCorrespondenceVerified,0);
 assert.equal(out.finalNoticesIssued,false);
});
test('rejects empty, oversize, malformed UTF8 and binary/null text',()=>{
 for(const b of [Buffer.alloc(0),Buffer.alloc(512*1024+1,65),Buffer.from([0xff]),Buffer.from('a\0b'),Buffer.from('   ')])
  assert.throws(()=>validateText(b));
});
test('unavailable upstream text retains package and accurate unresolved status',async()=>{
 const {candidates,mappings}=fixture();mappings.records.push({...pinned});
 const out=await collectTextHashes(candidates,mappings,{fetcher:async()=>{throw Error('UPSTREAM_HTTP_404');}});
 assert.equal(out.records.find(x=>x.name==='alpha').evidenceStatus,'UPSTREAM_HTTP_404');
 assert.equal(out.counts.immutableSourceFilesHashed,0);
 assert.equal(out.records.length,2);
});
test('forged approval, duplicate mappings, unknown package and changed scope fail closed',async()=>{
 for(const mutation of [
 (x,y)=>x.records[0].commercialApproval=true,
 (x,y)=>x.counts.exceptions=1,
 (x,y)=>y.records.push({...pinned,commercialApproval:true}),
 (x,y)=>y.records.push({...pinned,sourceVersionCorrespondenceApproved:true}),
 (x,y)=>y.records.push({...pinned,version:'9.0.0'}),
 (x,y)=>y.records.push({...pinned},{...pinned}),
 (x,y)=>x.finalNoticesIssued=true,
 ]){
  const {candidates,mappings}=fixture();mutation(candidates,mappings);
  await assert.rejects(collectTextHashes(candidates,mappings,{fetcher:async()=>Buffer.from('terms')}));
 }
});

test('absolute deadline aborts a trickle response and destroys the request',async()=>{
 const original=https.get;let destroyed=false;let tick=null;
 try{
  https.get=(url,opts,cb)=>{
   const req=new EventEmitter();
   req.destroy=(err)=>{destroyed=true;if(tick)clearInterval(tick);if(err)queueMicrotask(()=>req.emit('error',err));return req;};
   queueMicrotask(()=>{
    const res=new EventEmitter();res.statusCode=200;
    res.destroy=()=>{if(tick)clearInterval(tick);};
    cb(res);
    tick=setInterval(()=>res.emit('data',Buffer.from('x')),2);
   });
   return req;
  };
  await assert.rejects(fetchRaw('https://raw.githubusercontent.com/org/repo/'+ 'a'.repeat(40)+'/LICENSE',{deadlineMs:25}),/UPSTREAM_TIMEOUT/);
  assert.equal(destroyed,true);
 }finally{https.get=original;if(tick)clearInterval(tick);}
});
test('non-200 upstream response is aborted without draining body',async()=>{
 const original=https.get;let destroyed=false;
 try{
  https.get=(url,opts,cb)=>{
   const req=new EventEmitter();req.destroy=()=>{destroyed=true;return req;};
   queueMicrotask(()=>{
    const res=new EventEmitter();res.statusCode=302;res.destroy=()=>{};
    cb(res);
   });
   return req;
  };
  await assert.rejects(fetchRaw('https://raw.githubusercontent.com/org/repo/'+ 'a'.repeat(40)+'/LICENSE',{deadlineMs:100}),/UPSTREAM_HTTP_302/);
  assert.equal(destroyed,true);
 }finally{https.get=original;}
});
