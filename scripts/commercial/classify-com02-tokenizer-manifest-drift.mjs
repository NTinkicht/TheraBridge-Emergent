#!/usr/bin/env node
// COM-02 #402: reproduce and classify raw npm-vs-immutable-Git manifest drift.
// Path names and hashed leaf values only; no unreviewed license text or secrets.
// Difference classification NEVER proves npm publication lineage or grants rights.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import https from 'node:https';
import {parseLock,validatedUrl,verifyIntegrity} from './verify-published-tarballs.mjs';
import {extractPublishedManifest} from './compare-nondt-published-manifests.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blobSha=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const fail=x=>{throw Error('COM02_402_'+x)};
const HEX40=/^[0-9a-f]{40}$/,HEX64=/^[0-9a-f]{64}$/;
const PINS=Object.freeze({name:'@tokenizer/token',version:'0.3.0',
 repository:'Borewit/tokenizer-token',commit:'e068a455370090f44c757946b8571bb3fb1f117e',
 gitManifestBlobSha1:'ad87e5bb1377de7fb461f8d4a74e099e29479d8f',
 sourceManifestSha256:'17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69'});
const sourceUrl=new URL('https://raw.githubusercontent.com/'+PINS.repository+'/'+PINS.commit+'/package.json');
function pathsFor(obj,prefix='',out=new Map(),depth=0){
 if(depth>12)fail('JSON_DEPTH_LIMIT');
 if(obj!==null&&typeof obj==='object'){
  if(Array.isArray(obj)){
   if(obj.length>2000)fail('JSON_ARRAY_LIMIT');
   if(obj.length===0)out.set(prefix||'/',sha(JSON.stringify([])));
   else obj.forEach((value,i)=>pathsFor(value,prefix+'/'+i,out,depth+1));
  }else{
   const keys=Object.keys(obj).sort();
   if(keys.length>2000)fail('JSON_OBJECT_LIMIT');
   if(keys.length===0)out.set(prefix||'/',sha(JSON.stringify({})));
   else for(const k of keys)pathsFor(obj[k],prefix+'/'+k.replaceAll('~','~0').replaceAll('/','~1'),out,depth+1);
  }
 }else out.set(prefix||'/',sha(JSON.stringify(obj)));
 if(out.size>10000)fail('JSON_LEAF_LIMIT');
 return out;
}
function diffFields(source,published){
 const a=pathsFor(source),b=pathsFor(published),keys=[...new Set([...a.keys(),...b.keys()])].sort();
 return keys.filter(k=>a.get(k)!==b.get(k)).map(k=>({
  path:k,kind:!a.has(k)?'PUBLISHED_ONLY':!b.has(k)?'SOURCE_ONLY':'VALUE_CHANGED',
  sourceLeafSha256:a.get(k)||null,publishedLeafSha256:b.get(k)||null
 }));
}
function classify(queue,observations,comparison,lockText,sourceBytes,archive){
 if(queue?.schema!=='therabridge-com02-nondt-publication-evidence-workqueue-v1'||
   queue.counts?.allExceptions!==44||queue.counts?.definitelyTypedExcluded!==21||
   queue.counts?.nonDefinitelyTyped!==23||queue.records?.length!==23||
   queue.commercialApproval!==false||queue.saasReleaseApproved!==false||queue.enterpriseReleaseApproved!==false)
   fail('INVALID_CURRENT_QUEUE');
 if(observations?.schema!=='therabridge-com02-independent-root-observations-v1'||
   observations.observedOn!=='2026-11-15'||observations.records?.length!==15||
   observations.commercialLicenseGranted!==false||observations.publisherToSourceIndependentlyAttested!==0)
   fail('INVALID_FROZEN_OBSERVATIONS');
 if(comparison?.schema!=='therabridge-com02-nondt-published-manifest-byte-comparison-v1'||
   comparison.records?.length!==10||comparison.commercialApproval!==false||
   comparison.counts?.allNonDT!==23||comparison.counts?.sourceRootCandidates!==10||
   comparison.counts?.publisherToSourceAttested!==0)
   fail('INVALID_SAME_RUN_COMPARISON');
 const row=queue.records.filter(x=>x.name===PINS.name&&x.version===PINS.version),
  obs=observations.records.filter(x=>x.name===PINS.name&&x.version===PINS.version),
  previous=comparison.records.filter(x=>x.name===PINS.name&&x.version===PINS.version);
 if(row.length!==1||obs.length!==1||previous.length!==1)fail('EXACT_VERSION_MISSING_OR_DUPLICATED');
 const [r,o,p]=[row[0],obs[0],previous[0]];
 if(r.category!=='SOURCE_ROOT_MANIFEST_ONLY'||r.sourceCommitCandidate!==PINS.commit||
    r.npmPublicationBuildAttested!==false||r.sourceRightsApproved!==false||
    r.commerciallyCleared!==false||r.saasNetworkRightsApproved!==false||
    r.enterpriseRedistributionRightsApproved!==false||r.actualEditionDistributionVerified!==false||
    o.commit!==PINS.commit||o.observedRepository!==PINS.repository||
    o.gitManifestBlobSha1!==PINS.gitManifestBlobSha1||
    o.sourceManifestSha256!==PINS.sourceManifestSha256||
    o.commercialApproval!==false||o.npmTarballBuiltFromSourceIndependentlyVerified!==false||
    p.status!=='PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE'||
    p.sourceCommitCandidate!==PINS.commit||!p.archiveIntegrityVerified||
    p.publicationToSourceIndependentlyAttested!==false||
    p.sourceManifestSha256!==PINS.sourceManifestSha256||
    p.lockedArchiveSha256!==r.publishedTarballSha256||!HEX64.test(r.publishedTarballSha256||''))
  fail('FROZEN_EVIDENCE_CONTRADICTION');
 const lockRows=parseLock(lockText).get(JSON.stringify([PINS.name,PINS.version]))||[];
 if(lockRows.length!==1)fail('AMBIGUOUS_LOCK_VERSION');
 const url=validatedUrl(lockRows[0].resolved);
 if(!Buffer.isBuffer(sourceBytes)||sourceBytes.length>1024*1024||
    sha(sourceBytes)!==PINS.sourceManifestSha256||blobSha(sourceBytes)!==PINS.gitManifestBlobSha1)
  fail('IMMUTABLE_GIT_SOURCE_BYTES_DRIFT');
 if(!Buffer.isBuffer(archive)||archive.length>16*1024*1024)fail('ARCHIVE_LIMIT');
 verifyIntegrity(archive,lockRows[0].integrity);
 if(sha(archive)!==r.publishedTarballSha256)fail('PUBLISHED_ARCHIVE_SHA256_DRIFT');
 const npmBytes=extractPublishedManifest(archive);
 if(sha(npmBytes)!==p.publishedManifestSha256)fail('SAME_RUN_PUBLISHED_MANIFEST_DRIFT');
 let source,published;
 try{source=JSON.parse(sourceBytes.toString('utf8'));published=JSON.parse(npmBytes.toString('utf8'));}
 catch{fail('INVALID_MANIFEST_JSON')}
 if(source.name!==PINS.name||source.version!==PINS.version||
    published.name!==PINS.name||published.version!==PINS.version)fail('MANIFEST_IDENTITY_DRIFT');
 const differences=diffFields(source,published);
 if(sha(sourceBytes)===sha(npmBytes)||differences.length===0){
  // Formatting-only drift is also possible; retain it explicitly rather than
  // silently interpreting JSON semantic equality as proof of byte equivalence.
  return {schema:'therabridge-com02-402-original-npm-manifest-drift-v1',
   status:'RAW_BYTES_DIFFER_BUT_JSON_LEAVES_EQUAL_UNATTESTED',name:PINS.name,version:PINS.version,
   sourceCommit:PINS.commit,sourceManifestSha256:sha(sourceBytes),
   publishedManifestSha256:sha(npmBytes),registryArchiveSha256:sha(archive),
   rawBytesEqual:sha(sourceBytes)===sha(npmBytes),jsonLeafChanges:0,differences:[],
   publisherToSourceBuildAuthenticated:false,legalApproval:false,
   saasReleaseApproved:false,enterpriseReleaseApproved:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
 }
 return {schema:'therabridge-com02-402-original-npm-manifest-drift-v1',
  status:'REPRODUCED_JSON_FIELD_DIFFERENCES_NOT_BUILD_ATTESTATION',
  name:PINS.name,version:PINS.version,sourceCommit:PINS.commit,
  sourceManifestSha256:sha(sourceBytes),sourceGitBlobSha1:blobSha(sourceBytes),
  publishedManifestSha256:sha(npmBytes),registryArchiveSha256:sha(archive),
  archiveUrl:url.href,rawBytesEqual:false,jsonLeafChanges:differences.length,
  differences,publisherToSourceBuildAuthenticated:false,legalApproval:false,
  saasReleaseApproved:false,enterpriseReleaseApproved:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
}
async function fetchBytes(url,max){
 if(url.protocol!=='https:'||!['raw.githubusercontent.com','registry.yarnpkg.com','registry.npmjs.org'].includes(url.hostname)||
  url.username||url.password||url.port||url.search)fail('URL_NOT_ALLOWED');
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:12000,headers:{'user-agent':'TheraBridge-COM02-402/1.0'}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('UPSTREAM_HTTP_'+res.statusCode));return;}
   const chunks=[];let n=0;
   res.on('data',b=>{n+=b.length;if(n>max){req.destroy(Error('SIZE_LIMIT'));return;}chunks.push(b);});
   res.on('end',()=>resolve(Buffer.concat(chunks)));res.on('error',reject);
  });
  const deadline=setTimeout(()=>req.destroy(Error('TOTAL_TIMEOUT')),15000);
  req.on('close',()=>clearTimeout(deadline));req.on('timeout',()=>req.destroy(Error('READ_TIMEOUT')));req.on('error',reject);
 });
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==5||new Set(args).size!==5)fail('USAGE');
  const [queuePath,observationsPath,comparisonPath,lockPath,outPath]=args;
  for(const p of [queuePath,observationsPath,comparisonPath,lockPath])if(statSync(p).size>32*1024*1024)fail('INPUT_TOO_LARGE');
  const read=p=>JSON.parse(readFileSync(p,'utf8'));
  const queue=read(queuePath),obs=read(observationsPath),previous=read(comparisonPath),lockText=readFileSync(lockPath,'utf8');
  const locked=parseLock(lockText).get(JSON.stringify([PINS.name,PINS.version]))||[];
  if(locked.length!==1)fail('AMBIGUOUS_LOCK_VERSION');
  const [source,tarball]=await Promise.all([fetchBytes(sourceUrl,1024*1024),
    fetchBytes(validatedUrl(locked[0].resolved),16*1024*1024)]);
  const receipt=classify(queue,obs,previous,lockText,source,tarball);
  writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:receipt.status,changes:receipt.jsonLeafChanges,
   rawBytesEqual:receipt.rawBytesEqual,publisherToSourceBuildAuthenticated:false,legalApproval:false}));
 }catch(e){console.error('COM02_402_NOT_ATTESTED',e.message);process.exitCode=1;}
}
export {diffFields,classify};
