#!/usr/bin/env node
// COM-02 #402: explain raw published npm vs immutable Git source manifest
// discrepancies. No source-to-publication, licensing, or clinical clearance.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {parseLock,validatedUrl} from './verify-published-tarballs.mjs';
import {extractPublishedManifest} from './compare-nondt-published-manifests.mjs';
import {verifyCurrentRoot,getBytes} from './verify-com02-root-405.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pins=Object.freeze({
 name:'@tokenizer/token',version:'0.3.0',repository:'Borewit/tokenizer-token',
 commit:'e068a455370090f44c757946b8571bb3fb1f117e',
 gitManifestBlobSha1:'ad87e5bb1377de7fb461f8d4a74e099e29479d8f',
 sourceManifestSha256:'17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69',
 archiveSha256:'911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209',
 publishedManifestSha256:'a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9'
});
const fail=x=>{throw Error('COM02_402_'+x);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const valueClass=x=>x===null?'null':Array.isArray(x)?'array':typeof x;
function changesBetween(source,published){
 const delta=[];let compared=0;
 function walk(a,b,path='',depth=0){
  if(depth>24||delta.length>512||++compared>10000)fail('MANIFEST_TOO_COMPLEX');
  if(plain(a)&&plain(b)){
   const keys=new Set([...Object.keys(a),...Object.keys(b)]);
   for(const key of [...keys].sort()){
    if(!/^[\w$@.-]{1,96}$/.test(key)&&!/^@[a-z0-9_.-]{1,96}\/[a-z0-9_.-]{1,96}$/i.test(key))fail('UNSAFE_KEY');
    const p=path?path+'.'+key:key;
    if(!Object.hasOwn(a,key))delta.push({path:p,kind:'PUBLISHED_FIELD_ADDED',publishedType:valueClass(b[key])});
    else if(!Object.hasOwn(b,key))delta.push({path:p,kind:'PUBLISHED_FIELD_REMOVED',sourceType:valueClass(a[key])});
    else walk(a[key],b[key],p,depth+1);
   }
  }else if(JSON.stringify(a)!==JSON.stringify(b)){
   delta.push({path:path||'$root',kind:'VALUE_CHANGED',
    sourceType:valueClass(a),publishedType:valueClass(b)});
  }
 }
 walk(source,published);if(delta.length>512)fail('TOO_MANY_DIFFERENCES');
 return delta;
}
function describeDiff(sourceBytes,publishedBytes){
 if(!Buffer.isBuffer(sourceBytes)||!Buffer.isBuffer(publishedBytes)||
  sourceBytes.length>1024*1024||publishedBytes.length>1024*1024)fail('INPUT_BYTES_LIMIT');
 let src,pub;try{src=JSON.parse(sourceBytes.toString('utf8'));pub=JSON.parse(publishedBytes.toString('utf8'));}
 catch{fail('INVALID_MANIFEST_JSON')}
 if(!plain(src)||!plain(pub)||src.name!==pins.name||pub.name!==pins.name||
   src.version!==pins.version||pub.version!==pins.version)fail('MANIFEST_IDENTITY_DRIFT');
 const differences=changesBetween(src,pub);
 return {status:sha(sourceBytes)===sha(publishedBytes)?'RAW_BYTES_EXACT_MATCH':
  differences.length?'SEMANTIC_MANIFEST_FIELD_DIFFERENCES':'RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL',
  sourceManifestSha256:sha(sourceBytes),publishedManifestSha256:sha(publishedBytes),
  sourceBytes:sourceBytes.length,publishedBytes:publishedBytes.length,
  semanticChangedPaths:differences.length,differences};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==5||new Set(process.argv.slice(2)).size!==3)fail('USAGE');
  const [queuePath,lockPath,outPath]=process.argv.slice(2);
  for(const p of [queuePath,lockPath])if(statSync(p).size>32*1024*1024)fail('INPUT_LIMIT');
  const queue=JSON.parse(readFileSync(queuePath,'utf8')),lock=readFileSync(lockPath,'utf8');
  const entries=parseLock(lock).get(JSON.stringify([pins.name,pins.version]))||[];
  if(entries.length!==1)fail('AMBIGUOUS_EXACT_ARCHIVE');
  const sourceUrl=new URL('https://raw.githubusercontent.com/'+pins.repository+'/'+pins.commit+'/package.json');
  const archiveUrl=validatedUrl(entries[0].resolved);
  const [source,archive]=await Promise.all([getBytes(sourceUrl,1024*1024),getBytes(archiveUrl)]);
  const base=verifyCurrentRoot(queue,lock,source,archive,{pins});
  const published=extractPublishedManifest(archive);
  if(sha(published)!==pins.publishedManifestSha256)fail('PUBLISHED_MANIFEST_PIN_DRIFT');
  const diff=describeDiff(source,published);
  if(diff.status==='RAW_BYTES_EXACT_MATCH')fail('PREVIOUSLY_OBSERVED_MISMATCH_DISAPPEARED');
  const receipt={schema:'therabridge-com02-tokenizer-402-manifest-diff-v1',
   name:pins.name,version:pins.version,sourceCommit:pins.commit,
   originalArchiveSha256:pins.archiveSha256,gitManifestBlobSha1:pins.gitManifestBlobSha1,
   exactArchiveIntegrityVerified:base.archiveIntegrityVerified,
   immutableGitSourceVerified:base.sourceGitObjectVerified,
   sourceEvidenceQueueSha256:base.queueSha256,lockedDependencySha256:base.lockSha256,
   ...diff,publisherToSourceBuildIndependentlyAttested:false,
   legalRightsApproved:false,commercialApproval:false,
   saasReleaseApproved:false,enterpriseReleaseApproved:false,
   g2ClinicalApproved:false,g2bClinicalApproved:false};
  writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:receipt.status,semanticChangedPaths:receipt.semanticChangedPaths,
    publisherToSourceBuildIndependentlyAttested:false,commercialApproval:false}));
 }catch(e){console.error('COM02_402_NOT_CLEARED',e.message);process.exitCode=1}
}
export {changesBetween,describeDiff,pins};
