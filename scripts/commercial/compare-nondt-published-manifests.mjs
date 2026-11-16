#!/usr/bin/env node
// COM-02: independently retrieve original npm archive bytes and compare the
// published package.json to a separately observed immutable Git source manifest.
// An exact byte match is NOT publication/build attestation or a license grant.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import https from 'node:https';
import {parseLock,validatedUrl,verifyIntegrity} from './verify-published-tarballs.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const h64=/^[0-9a-f]{64}$/,h40=/^[0-9a-f]{40}$/;
const fail=m=>{throw Error('COM02_ARCHIVE_SOURCE_'+m);};
const MAX_GZIP=16*1024*1024,MAX_TAR=64*1024*1024;
function extractPublishedManifest(gzip){
 if(!Buffer.isBuffer(gzip)||gzip.length<1||gzip.length>MAX_GZIP)fail('GZIP_LIMIT');
 let tar;try{tar=gunzipSync(gzip,{maxOutputLength:MAX_TAR});}catch{fail('INVALID_GZIP_OR_TAR_LIMIT');}
 let offset=0,manifest=null,extension=false,terminated=false;
 while(offset+512<=tar.length){
  const h=tar.subarray(offset,offset+512);
  if(h.every(x=>x===0)){terminated=true;break;}
  const field=h.subarray(124,136).toString('ascii').replace(/\0.*$/,'').trim();
  if(!/^[0-7]+$/.test(field))fail('BAD_TAR_SIZE');
  const size=parseInt(field,8),type=h[156];
  if(!Number.isSafeInteger(size)||offset+512+size>tar.length)fail('TRUNCATED_TAR');
  const prefix=h.subarray(345,500).toString('utf8').replace(/\0.*$/,'');
  const basename=h.subarray(0,100).toString('utf8').replace(/\0.*$/,'');
  const path=prefix?prefix+'/'+basename:basename;
  if(path.includes('\\')||path.includes('\u0000')||path.includes('\ufffd')||path.split('/').some(x=>x==='..'||x==='.'))fail('UNSAFE_PATH');
  // We do not support PAX, sparse, GNU longname/linkname, hardlinks, or any
  // transformation that could redefine the effective target or its bytes.
  if([103,120,76,75,49,50,83].includes(type))fail('UNSUPPORTED_TAR_SEMANTICS');
  if(path==='package/package.json'){
   if(manifest!==null||![0,48].includes(type)||size>512*1024)fail('DUPLICATE_OR_INVALID_MANIFEST');
   manifest=Buffer.from(tar.subarray(offset+512,offset+512+size));
  }
  offset+=512+Math.ceil(size/512)*512;
 }
 if(!terminated||!manifest)fail('MISSING_MANIFEST_OR_TERMINATOR');
 return manifest;
}
async function fetchArchive(url){
 return await new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:12000,headers:{'user-agent':'TheraBridge-source-evidence/1.0'}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('HTTP_'+res.statusCode));return;}
   const parts=[];let n=0;
   res.on('data',b=>{n+=b.length;if(n>MAX_GZIP){req.destroy(Error('OVERSIZED_GZIP'));return;}parts.push(b);});
   res.on('end',()=>resolve(Buffer.concat(parts)));res.on('error',reject);
  });
  const deadline=setTimeout(()=>req.destroy(Error('TOTAL_DEADLINE')),15000);
  req.on('close',()=>clearTimeout(deadline));
  req.on('timeout',()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);
 });
}
async function buildSourceComparison(queue,observations,rootReceipt,lockText,{fetchBuffer=fetchArchive}={}){
 if(queue?.schema!=='therabridge-com02-nondt-publication-evidence-workqueue-v1'||
   queue.counts?.allExceptions!==44||queue.counts?.definitelyTypedExcluded!==21||
   queue.counts?.nonDefinitelyTyped!==23||queue.commercialApproval!==false||
   queue.saasReleaseApproved!==false||queue.enterpriseReleaseApproved!==false||
   !Array.isArray(queue.records)||queue.records.length!==23||
   observations?.schema!=='therabridge-com02-independent-root-observations-v1'||
   observations.publisherToSourceIndependentlyAttested!==0||
   observations.legallyApproved!==0||observations.commercialLicenseGranted!==false||
   !Array.isArray(observations.records)||observations.records.length!==15)fail('UNTRUSTED_ENVELOPE');
 const lock=parseLock(lockText),seen=new Set(),records=[];
 if(rootReceipt?.schema!=='therabridge-com02-15root-observation-crosscheck-v1'||
    rootReceipt.counts?.originalVersions!==44||
    rootReceipt.counts?.boundToCurrentPopulation!==9||
    rootReceipt.counts?.publicationToSourceBuildCorrespondenceVerified!==0||
    rootReceipt.counts?.legallyApproved!==0||rootReceipt.commercialLicenseGranted!==false||
    !Array.isArray(rootReceipt.records)||rootReceipt.records.length!==15||
    rootReceipt.observationSha256!==sha(JSON.stringify(observations))||
    !h64.test(queue.sourceEvidenceSha256?.correspondence||'')||
    !h64.test(rootReceipt.correspondenceSha256||'')||
    rootReceipt.correspondenceSha256!==queue.sourceEvidenceSha256.correspondence)
   fail('SAME_RUN_ROOT_RECEIPT_NOT_BOUND');
 const liveRoots=new Map();
 for(const x of rootReceipt.records){
   const id=JSON.stringify([x.name,x.version]);
   if(liveRoots.has(id))fail('DUPLICATE_LIVE_ROOT');
   liveRoots.set(id,x);
 }
 const source=new Map(observations.records.map(x=>[JSON.stringify([x.name,x.version]),x]));
 if(source.size!==15)fail('DUPLICATED_SOURCE_OBSERVATIONS');
 for(const row of queue.records){
  const key=JSON.stringify([row.name,row.version]);
  if(seen.has(key)||typeof row.name!=='string'||typeof row.version!=='string'||!h64.test(row.publishedTarballSha256||'')||
     row.npmPublicationBuildAttested!==false||row.sourceRightsApproved!==false||
     row.commerciallyCleared!==false||row.saasNetworkRightsApproved!==false||
     row.enterpriseRedistributionRightsApproved!==false||row.actualEditionDistributionVerified!==false)
   fail('UNSAFE_QUEUE_RECORD');
  seen.add(key);
  if(row.category!=='SOURCE_ROOT_MANIFEST_ONLY')continue;
  const obs=source.get(key);
  const live=liveRoots.get(key);
  if(!obs||!live||live.commit!==obs.commit||live.sourceManifestSha256!==obs.sourceManifestSha256||
     obs.commit!==row.sourceCommitCandidate||!h40.test(obs.commit||'')||
     !h64.test(obs.sourceManifestSha256||'')||obs.npmTarballBuiltFromSourceIndependentlyVerified!==false||
     obs.sourceLicenseTextLegallyApproved!==false||obs.commercialApproval!==false||
     obs.observationStatus!=='DIRECT_CLAIMED_REPOSITORY_EXACT_COMMIT_MANIFEST_MATCH')
   fail('SOURCE_OBSERVATION_NOT_BOUND');
  const liveVerified=live.status==='DIRECT_CLAIMED_REPOSITORY_EXACT_COMMIT_MANIFEST_MATCH';
  if(!liveVerified&&live.status!=='TRANSIENT_SOURCE_READ_UNAVAILABLE_REMAIN_UNVERIFIED')
    fail('SOURCE_NOT_CORROBORATED_SAME_RUN');
  const candidates=lock.get(key)||[];
  if(candidates.length!==1)fail('AMBIGUOUS_OR_MISSING_LOCK_SOURCE');
  const url=validatedUrl(candidates[0].resolved);
  const out={name:row.name,version:row.version,sourceCommitCandidate:obs.commit,
    lockedArchiveSha256:row.publishedTarballSha256,sourceManifestSha256:obs.sourceManifestSha256,
    publishedManifestSha256:null,archiveIntegrityVerified:false,
    status:'UNAVAILABLE',publicationToSourceIndependentlyAttested:false,
    legalApproval:false,commercialApproval:false};
  if(!liveVerified){out.status='SOURCE_NOT_CORROBORATED_SAME_RUN';records.push(out);continue;}
  try{
   const bytes=await fetchBuffer(url);
   if(!Buffer.isBuffer(bytes)||bytes.length>MAX_GZIP)fail('BAD_FETCH_BYTES');
   verifyIntegrity(bytes,candidates[0].integrity);
   const actualSha=sha(bytes);
   if(actualSha!==row.publishedTarballSha256)fail('TARBALL_DIGEST_CONTRADICTS_LEDGER');
   out.archiveIntegrityVerified=true;
   const manifest=extractPublishedManifest(bytes);
   const parsed=JSON.parse(manifest.toString('utf8'));
   if(parsed?.name!==row.name||parsed?.version!==row.version)fail('PUBLISHED_MANIFEST_IDENTITY_MISMATCH');
   out.publishedManifestSha256=sha(manifest);
   out.status=out.publishedManifestSha256===obs.sourceManifestSha256?
    'PUBLISHED_MANIFEST_BYTES_MATCH_IMMUTABLE_SOURCE_UNATTESTED':
    'PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE';
  }catch(e){
   if(String(e.message).startsWith('COM02_ARCHIVE_SOURCE_')||
      /^(INTEGRITY_MISMATCH|INTEGRITY_MISSING|INTEGRITY_UNSUPPORTED|SOURCE_NOT_ALLOWLISTED)$/.test(e.message))
    throw e;
   out.status='UNAVAILABLE_'+String(e.message||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_').slice(0,50);
  }
  records.push(out);
 }
 if(records.length!==9)fail('SOURCE_ROOT_COUNT_DRIFT');
 records.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return {schema:'therabridge-com02-nondt-published-manifest-byte-comparison-v1',
  status:'CANDIDATE_SOURCE_MANIFEST_COMPARISON_NOT_PUBLISHER_ATTESTATION',
  inputSha256:{queue:sha(JSON.stringify(queue)),observations:sha(JSON.stringify(observations)),
    liveSourceRootReceipt:sha(JSON.stringify(rootReceipt)),lock:sha(lockText)},
  counts:{allNonDT:23,sourceRootCandidates:9,
    manifestByteMatches:records.filter(x=>x.status==='PUBLISHED_MANIFEST_BYTES_MATCH_IMMUTABLE_SOURCE_UNATTESTED').length,
    manifestByteDifferences:records.filter(x=>x.status==='PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE').length,
    unavailable:records.filter(x=>x.status.startsWith('UNAVAILABLE')||x.status==='SOURCE_NOT_CORROBORATED_SAME_RUN').length,
    publisherToSourceAttested:0,legallyApproved:0},
  records,commercialApproval:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==5||new Set(args).size!==5)fail('USAGE');
  const [q,o,receipt,lock,dest]=args;
  for(const p of [q,o,receipt,lock])if(statSync(p).size>32*1024*1024)fail('INPUT_TOO_LARGE');
  const result=await buildSourceComparison(JSON.parse(readFileSync(q,'utf8')),
    JSON.parse(readFileSync(o,'utf8')),JSON.parse(readFileSync(receipt,'utf8')),readFileSync(lock,'utf8'));
  writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('COM02_SOURCE_COMPARISON_NOT_AUTHORIZED',e.message);process.exitCode=1;}
}
export {extractPublishedManifest,buildSourceComparison};
