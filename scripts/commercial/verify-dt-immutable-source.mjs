#!/usr/bin/env node
// Reproduce a DefinitelyTyped publisher fingerprint using exact Git object bytes.
// A matching fingerprint is NOT an independently verified npm build or license.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
const h40=/^[a-f0-9]{40}$/;
const h64=/^[a-f0-9]{64}$/;
const sha256=x=>createHash('sha256').update(x).digest('hex');
const gitBlob=x=>createHash('sha1').update(Buffer.from('blob '+x.length+'\0')).update(x).digest('hex');
const isDeclaration=p=>/\.d\.(?:ts|cts|mts|[^/]+\.ts)$/.test(p);
function selection(triage,name,version){
 if(triage?.schema!=='therabridge-com02-definitelytyped-26-pinned-triage-v1'||
    triage.counts?.definitelyTypedVersions!==26||
    triage.counts?.publisherToSourceAttested!==0||
    triage.commercialApproval!==false||
    !Array.isArray(triage.records)||triage.records.length!==26||
    !/^@types\/[a-z0-9_-]+$/.test(name)||!/^\d+\.\d+\.\d+$/.test(version))
  throw Error('UNSAFE_EXACT_PUBLISHER_TRIAGE');
 const ids=new Set();
 for(const x of triage.records){
  if(typeof x.name!=='string'||typeof x.version!=='string'||
     ids.has(x.name+'@'+x.version)||x.npmPublisherToSourceIndependentlyVerified!==false||
     x.sourceContentHashIndependentlyMatched!==false)throw Error('UNSAFE_PUBLISHER_ROW');
  ids.add(x.name+'@'+x.version);
 }
 const row=triage.records.find(x=>x.name===name&&x.version===version);
 if(!row||!h64.test(row.publisherContentHashCandidate||'')||
    row.publisherContentHashStatus!=='EXACT_VERSION_PUBLISHER_HASH_CANDIDATE')
  throw Error('MISSING_EXACT_PUBLISHER_CONTENT_HASH');
 return row;
}
function publisherHash(sourceFiles,packageText){
 if(!sourceFiles||typeof sourceFiles!=='object'||Array.isArray(sourceFiles)||
    Object.keys(sourceFiles).length<1||Object.keys(sourceFiles).length>500||
    Object.keys(sourceFiles).some(p=>!isDeclaration(p)||typeof sourceFiles[p]!=='string'))
  throw Error('INVALID_SOURCE_DECLARATIONS');
 const obj=JSON.parse(packageText);
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('INVALID_SOURCE_PACKAGE');
 const sorted={};
 for(const key of Object.keys(obj).sort())sorted[key]=obj[key];
 const segments=Object.entries(sourceFiles).map(([p,v])=>p+'**'+v);
 segments.push('package.json**'+JSON.stringify(sorted));
 return sha256(Buffer.from(segments.join('||').replace(/\r\n?/g,'\n'),'utf8'));
}
async function verify(triage,{name,version,commit,sourceRoot},{fetcher=fetch,token=''}={}){
 const row=selection(triage,name,version);
 if(!h40.test(commit||''))throw Error('INVALID_IMMUTABLE_COMMIT');
 const canonical='types/'+name.slice('@types/'.length);
 if(sourceRoot!==canonical&&!(sourceRoot.startsWith(canonical+'/')&&
     /^v\d+(?:\.\d+)?$/.test(sourceRoot.slice(canonical.length+1))))
  throw Error('UNEXPECTED_SOURCE_PACKAGE_PATH');
 async function get(kind,sha){
  if(!['commits','trees','blobs'].includes(kind)||!h40.test(sha))throw Error('BAD_GIT_OBJECT');
  const url='https://api.github.com/repos/DefinitelyTyped/DefinitelyTyped/git/'+kind+'/'+sha;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetcher(url,{redirect:'error',signal:controller.signal,
    headers:{Accept:'application/vnd.github+json','User-Agent':'therabridge-com02',
     ...(token?{Authorization:'Bearer '+token}:{})}});
   if(response?.status!==200)throw Error('EXACT_GIT_OBJECT_UNAVAILABLE');
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length>8*1024*1024)throw Error('GIT_OBJECT_RESPONSE_TOO_LARGE');
   return JSON.parse(bytes.toString('utf8'));
  }finally{clearTimeout(timer);}
 }
 function entries(tree,limit=3000){
  if(tree?.truncated!==false||!Array.isArray(tree.tree)||tree.tree.length>limit)
   throw Error('GIT_TREE_TRUNCATED_OR_OVERSIZED');
  return [...tree.tree].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 }
 const c=await get('commits',commit);
 if(c.sha!==commit||!h40.test(c.tree?.sha||''))throw Error('COMMIT_NOT_INDEPENDENTLY_PINNED');
 let treeSha=c.tree.sha;
 for(const part of sourceRoot.split('/')){
  const items=entries(await get('trees',treeSha),30000).filter(x=>x.path===part&&x.type==='tree'&&h40.test(x.sha||''));
  if(items.length!==1)throw Error('SOURCE_DIRECTORY_NOT_IN_PINNED_TREE');
  treeSha=items[0].sha;
 }
 const sourceFiles={},evidence=[];let packageText=null;let size=0;
 async function walk(treeSha,prefix=''){
  for(const entry of entries(await get('trees',treeSha))){
   if(!/^[A-Za-z0-9_.-]+$/.test(entry.path||'')||!h40.test(entry.sha||''))
    throw Error('UNSAFE_SOURCE_PATH');
   const path=prefix+entry.path;
   if(entry.type==='tree'){
    if(!prefix&&/^v\d+(?:\.\d+)?$/.test(entry.path))continue;
    await walk(entry.sha,path+'/');continue;
   }
   if(entry.type!=='blob'||(path!=='package.json'&&!isDeclaration(path)))continue;
   if(evidence.length>=500)throw Error('SOURCE_FILE_LIMIT');
   const b=await get('blobs',entry.sha);
   if(b.sha!==entry.sha||b.encoding!=='base64'||typeof b.content!=='string')
    throw Error('INVALID_GIT_BLOB_RESPONSE');
   const binary=Buffer.from(b.content.replace(/\s/g,''),'base64');
   if(binary.length>1024*1024||gitBlob(binary)!==entry.sha)
    throw Error('IMMUTABLE_BLOB_HASH_MISMATCH');
   size+=binary.length;if(size>12*1024*1024)throw Error('SOURCE_BYTES_LIMIT');
   const value=new TextDecoder('utf-8',{fatal:true}).decode(binary);
   if(path==='package.json')packageText=value;else sourceFiles[path]=value;
   evidence.push({path,blobSha1:entry.sha,sha256:sha256(binary)});
  }
 }
 await walk(treeSha);
 if(!packageText)throw Error('SOURCE_PACKAGE_JSON_MISSING');
 const pkg=JSON.parse(packageText);
 const sourceVersionCompatible=pkg.name===name&&
    pkg.version===version.split('.').slice(0,2).join('.')+'.9999';
 const actual=publisherHash(sourceFiles,packageText);
 const match=sourceVersionCompatible&&timingSafeEqual(
   Buffer.from(actual,'hex'),Buffer.from(row.publisherContentHashCandidate,'hex'));
 return {schema:'therabridge-com02-dt-immutable-source-comparison-v1',
  name,version,repository:'DefinitelyTyped/DefinitelyTyped',sourceCommit:commit,sourceRoot,
  sourcePackageVersion:pkg.version,sourceVersionCompatible,
  sourceContentHash:actual,publisherContentHashCandidate:row.publisherContentHashCandidate,
  immutableSourceByteMatch:match,
  independentlyVerifiedHistoricPublishCommit:false,
  independentlyVerifiedNpmBuiltFromThisCommit:false,
  publisherToSourceAttested:false,
  legalRightsApproved:false,saasRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRights:'PENDING_COUNSEL_REVIEW',files:evidence,
  status:match?'IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION':
               'IMMUTABLE_SOURCE_BYTES_NOT_MATCHED',
  commercialApproval:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==6)throw Error('USAGE triage.json @types/name version exactGitSha types/name output.json');
  const report=await verify(JSON.parse(readFileSync(args[0],'utf8')),
   {name:args[1],version:args[2],commit:args[3],sourceRoot:args[4]},
   {token:process.env.GITHUB_TOKEN||''});
  writeFileSync(args[5],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({sourceByteMatch:report.immutableSourceByteMatch,
   publisherToSourceAttested:false,commercialApproval:false}));
 }catch(e){console.error('DT_SOURCE_PROBE_REJECTED',e.message);process.exitCode=1;}
}
export {selection,publisherHash,verify,gitBlob};