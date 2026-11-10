#!/usr/bin/env node
// COM-02: bounded immutable upstream text hashing for separately corroborated
// exact package/version to Git commit mappings. Hashing DOES NOT verify that
// a source belongs to the published package, and NEVER grants legal approval.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import https from 'node:https';
import {TextDecoder} from 'node:util';
const sha=b=>createHash('sha256').update(b).digest('hex');
const ID=x=>JSON.stringify([x.name,x.version]);
const MAX_FILE=512*1024;
function validatedRawUrl(mapping){
 const {owner,repository,commit,path}=mapping;
 if(![owner,repository,commit,path].every(x=>typeof x==='string'))throw Error('INVALID_SOURCE_MAPPING');
 if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(owner)||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(repository)||
 !/^[a-f0-9]{40}$/.test(commit)||path.length>240||path.includes('\\')||
 !path.split('/').every(x=>/^[A-Za-z0-9_.-]+$/.test(x)&&x!=='.'&&x!=='..')||
 !/(?:^|\/)(?:licen[cs]e|copying|notice|copyright)(?:[._-][A-Za-z0-9_.-]+)?$/i.test(path))
 throw Error('INVALID_IMMUTABLE_SOURCE');
 const uri=new URL('https://raw.githubusercontent.com/'+owner+'/'+repository+'/'+commit+'/'+path.split('/').map(encodeURIComponent).join('/'));
 if(uri.protocol!=='https:'||uri.hostname!=='raw.githubusercontent.com'||uri.search||uri.hash)throw Error('INVALID_SOURCE_URL');
 return uri.toString();
}
function fetchRaw(url,{deadlineMs=7000}={}){
 const uri=new URL(url);
 if(uri.protocol!=='https:'||uri.hostname!=='raw.githubusercontent.com'||uri.port||uri.username||uri.password||uri.search||uri.hash)
 return Promise.reject(Error('SOURCE_NOT_ALLOWLISTED'));
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>15000)return Promise.reject(Error('BAD_DEADLINE'));
 return new Promise((resolve,reject)=>{
  let settled=false;
  let req;
  // Unlike socket inactivity timeout, this deadline is absolute from request start.
  const deadline=setTimeout(()=>req.destroy(Error('UPSTREAM_TIMEOUT')),deadlineMs);
  const complete=(err,value)=>{
   if(settled)return;
   settled=true;clearTimeout(deadline);
   if(err)reject(err);else resolve(value);
  };
  req=https.get(uri,{timeout:deadlineMs,headers:{'user-agent':'TheraBridge-LegalEvidence/1.0'}},res=>{
   // Never follow redirects or drain unbounded error bodies.
   if(res.statusCode!==200){
    const err=Error('UPSTREAM_HTTP_'+res.statusCode);
    complete(err);res.destroy();req.destroy();return;
   }
   const pieces=[];let len=0;
   res.on('data',b=>{
    len+=b.length;
    if(len>MAX_FILE){const err=Error('TEXT_TOO_LARGE');complete(err);res.destroy();req.destroy();return;}
    pieces.push(b);
   });
   res.on('end',()=>complete(null,Buffer.concat(pieces)));
   res.on('error',complete);
  });
  req.on('timeout',()=>req.destroy(Error('UPSTREAM_TIMEOUT')));
  req.on('error',complete);
 });
}
function validateText(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_FILE)throw Error('INVALID_TEXT_SIZE');
 let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('INVALID_UTF8_LICENSE_TEXT');}
 if(value.includes('\0')||!value.trim())throw Error('INVALID_LICENSE_TEXT');
 return sha(bytes);
}
async function collectTextHashes(candidates,mappings,{fetcher=fetchRaw}={}){
 if(candidates?.schema!=='therabridge-com02-upstream-authority-candidates-v1'||candidates.counts?.legallyApproved!==0||
 !Array.isArray(candidates.records)||candidates.counts.exceptions!==candidates.records.length||
 candidates.finalNoticesIssued!==false||candidates.commercialLicenseGranted!==false||
 mappings?.schema!=='therabridge-com02-immutable-source-mappings-v1'||!Array.isArray(mappings.records)||
 mappings.approved!==0)throw Error('INVALID_SOURCE_INVENTORY');
 const keys=new Set(candidates.records.map(ID));
 if(keys.size!==candidates.records.length)throw Error('DUPLICATE_CANDIDATE');
 const map=new Map();
 for(const entry of mappings.records){
  if(!keys.has(ID(entry))||map.has(ID(entry))||entry.commercialApproval!==false||
  entry.sourceVersionCorrespondenceApproved!==false||entry.counselApproval!==false)
   throw Error('UNSAFE_OR_DUPLICATE_MAPPING');
  map.set(ID(entry),entry);
 }
 const records=[];
 for(const row of candidates.records){
  if(row.commercialApproval!==false||row.legalReviewStatus!=='UNRESOLVED'||
    row.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||row.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('FALSE_CANDIDATE_APPROVAL');
  const entry=map.get(ID(row));
  const output={name:row.name,version:row.version,publisherEvidenceStatus:row.publisherEvidenceStatus,
   registryManifestSha256:row.registryManifestSha256??null,
   candidateRepositoryUrl:row.candidateRepositoryUrl??null,
   immutableSourceUrl:null,sourceCommit:null,sourceTextSha256:null,sourceTextBytes:null,
   evidenceStatus:'UNMAPPED_SOURCE_REVISION',sourceVersionCorrespondence:'NOT_INDEPENDENTLY_VERIFIED',
   rightsHolder:'NOT_VERIFIED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',commercialApproval:false};
  if(entry){
   try{
    const url=validatedRawUrl(entry);
    output.immutableSourceUrl=url;output.sourceCommit=entry.commit;
    const bytes=await fetcher(url);
    const buf=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
    output.sourceTextSha256=validateText(buf);
    output.sourceTextBytes=buf.length;
    output.evidenceStatus='IMMUTABLE_SOURCE_BYTES_HASHED_CORRESPONDENCE_UNVERIFIED';
   }catch(e){
    const known=['INVALID_SOURCE_MAPPING','INVALID_IMMUTABLE_SOURCE','INVALID_SOURCE_URL','SOURCE_NOT_ALLOWLISTED',
      'TEXT_TOO_LARGE','INVALID_TEXT_SIZE','INVALID_UTF8_LICENSE_TEXT','INVALID_LICENSE_TEXT','UPSTREAM_TIMEOUT'];
    output.evidenceStatus=known.includes(e.message)?e.message:/^UPSTREAM_HTTP_\d+$/.test(e.message)?e.message:'UPSTREAM_FETCH_ERROR';
   }
  }
  records.push(output);
 }
 records.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 const counts={exceptions:records.length,mapped:map.size,
  immutableSourceFilesHashed:records.filter(x=>x.evidenceStatus==='IMMUTABLE_SOURCE_BYTES_HASHED_CORRESPONDENCE_UNVERIFIED').length,
  unmapped:records.filter(x=>x.evidenceStatus==='UNMAPPED_SOURCE_REVISION').length,
  authoritativeVersionCorrespondenceVerified:0,legallyApproved:0};
 return {schema:'therabridge-com02-immutable-source-text-evidence-v1',
  status:'HASHED_TEXT_NOT_VERSION_CORRESPONDENCE_OR_LEGAL_CLEARANCE',
  registryCandidateSha256:sha(JSON.stringify(candidates)),mappingSha256:sha(JSON.stringify(mappings)),
  counts,records,unresolvedNonPackageAssets:candidates.unresolvedNonPackageAssets,
  finalNoticesIssued:false,commercialLicenseGranted:false};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [source,mapping,destination]=process.argv.slice(2);
 if(process.argv.length!==5||new Set([source,mapping,destination]).size!==3){console.error('Usage: verify-immutable-license-texts.mjs candidates.json mappings.json output.json');process.exit(2);}
 try{const out=await collectTextHashes(JSON.parse(readFileSync(source)),JSON.parse(readFileSync(mapping)));
  writeFileSync(destination,JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {validatedRawUrl,validateText,collectTextHashes,fetchRaw};
