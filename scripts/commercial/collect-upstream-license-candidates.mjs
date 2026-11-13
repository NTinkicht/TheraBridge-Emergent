#!/usr/bin/env node
// COM-02 exact-version npm registry manifest CANDIDATES only.
// NEVER treats manifest license claims, repository URLs or installed LICENSE files
// as authoritative upstream license texts or legal approval.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import https from 'node:https';

const MAX_BYTES=256*1024, MAX_RECORDS=1024, MAX_CONCURRENCY=6;
const digest=x=>createHash('sha256').update(x).digest('hex');
const key=x=>JSON.stringify([x.name,x.version]);
function manifestUrl(name,version){
 if(typeof name!=='string'||!/^(@[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*|[a-z0-9][\w.-]*)$/.test(name)||
    typeof version!=='string'||!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?(?:\+[a-zA-Z0-9.-]+)?$/.test(version))
  throw Error('INVALID_EXACT_NPM_NAME_VERSION');
 // Encode the entire scoped package name into one path component; no query.
 const url=new URL('https://registry.npmjs.org/'+encodeURIComponent(name)+'/'+encodeURIComponent(version));
 if(url.protocol!=='https:'||url.hostname!=='registry.npmjs.org'||url.port||url.username||url.password||url.search||url.hash)
  throw Error('INVALID_REGISTRY_SOURCE');
 return url.toString();
}
function fetchManifest(url,{timeoutMs=7000,maxBytes=MAX_BYTES}={}){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.hostname!=='registry.npmjs.org'||parsed.port||parsed.username||parsed.password||parsed.search||parsed.hash)
  return Promise.reject(Error('SOURCE_NOT_ALLOWLISTED'));
 return new Promise((resolve,reject)=>{
  let settled=false;
  const fail=e=>{if(!settled){settled=true;reject(e);}};
  const req=https.get(parsed,{timeout:timeoutMs,headers:{accept:'application/json','user-agent':'TheraBridge-LicenseEvidence/1.0'}},res=>{
   if(res.statusCode!==200){res.resume();fail(Error('REGISTRY_HTTP_'+String(res.statusCode)));return;}
   const mime=String(res.headers['content-type']||'').toLowerCase();
   if(!mime.startsWith('application/json')){res.resume();fail(Error('REGISTRY_NOT_JSON'));return;}
   const parts=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){req.destroy(Error('REGISTRY_RESPONSE_OVERSIZE'));return;}parts.push(chunk);});
   res.on('end',()=>{if(!settled){settled=true;resolve(Buffer.concat(parts));}});
   res.on('error',fail);
  });
  req.on('timeout',()=>req.destroy(Error('REGISTRY_TIMEOUT')));
  req.on('error',fail);
 });
}
function safeText(value,max=512){return typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f]/.test(value)?value:null;}
// A registry-advertised attestation URL is a DISCOVERY HINT only, not a verified
// Sigstore bundle. Any publication-to-source promotion requires npm's trusted
// attestation verification (e.g. npm audit signatures) against exact tarball SRI.
function attestationPointer(dist,name=null,version=null){
 // Advertisement is only an unverified registry hint, never source provenance.
 if(dist?.attestations===undefined)return {status:'NOT_ADVERTISED',url:null};
 const value=dist.attestations?.url;
 const invalid=()=>({status:'INVALID_REGISTRY_ATTESTATION_HINT',url:null});
 if(typeof value!=='string')return invalid();
 // Validate RAW text before WHATWG URL canonicalization: that parser removes
 // encoded dot-segment traversal and would otherwise hide malicious paths.
 const prefix='https://registry.npmjs.org/-/npm/v1/attestations/';
 if(!value.startsWith(prefix))return invalid();
 const rawSuffix=value.slice(prefix.length);
 if(!rawSuffix||rawSuffix.length>350||rawSuffix.includes('/')||
    rawSuffix.includes('\\')||
    !/^[A-Za-z0-9%._~!$&'()+,;=:@-]+$/.test(rawSuffix))
   return invalid();
 let decoded;
 try{decoded=decodeURIComponent(rawSuffix);}catch{return invalid();}
 if(decoded.includes('..')||decoded.includes('\\')||
    decoded.includes('?')||decoded.includes('#')||
    (name!==null||version!==null)&&decoded!==name+'@'+version)
   return invalid();
 let url;
 try{url=new URL(value);}catch{return invalid();}
 if(url.protocol!=='https:'||url.hostname!=='registry.npmjs.org'||
    url.port||url.username||url.password||url.search||url.hash||
    url.pathname!=='/-/npm/v1/attestations/'+rawSuffix)
   return invalid();
 return {status:'UNVERIFIED_REGISTRY_ATTESTATION_POINTER',url:value};
}
function parseManifest(bytes,name,version){'()+,;=:@/-]{1,350}$/.test(url.pathname)||
    url.pathname.includes('..')||url.pathname.includes('//'))
  return {status:'INVALID_REGISTRY_ATTESTATION_HINT',url:null};
 if(name!==null||version!==null){
  let target;
  try{target=decodeURIComponent(url.pathname.slice('/-/npm/v1/attestations/'.length));}
  catch{return {status:'INVALID_REGISTRY_ATTESTATION_HINT',url:null};}
  if(target!==name+'@'+version)
   return {status:'INVALID_REGISTRY_ATTESTATION_HINT',url:null};
 }
 return {status:'UNVERIFIED_REGISTRY_ATTESTATION_POINTER',url:url.toString()};
}
function parseManifest(bytes,name,version){
 if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_BYTES)throw Error('BAD_MANIFEST_BYTES');
 let item;try{item=JSON.parse(bytes.toString('utf8'));}catch{throw Error('BAD_MANIFEST_JSON');}
 if(!item||Array.isArray(item)||typeof item!=='object'||item.name!==name||item.version!==version)
  throw Error('REGISTRY_VERSION_IDENTITY_MISMATCH');
 let license=null;
 if(typeof item.license==='string')license=safeText(item.license,200);
 else if(item.license&&typeof item.license==='object'&&!Array.isArray(item.license))
  license=safeText(item.license.type,200);
 const repo=typeof item.repository==='string'?item.repository:
  item.repository&&typeof item.repository==='object'?item.repository.url:null;
 const home=safeText(item.homepage,1024);
 const dist=item.dist&&typeof item.dist==='object'?item.dist:{};
 const attestation=attestationPointer(dist,name,version);
 return {sha256:digest(bytes),candidateLicenseExpression:license,
  candidateRepositoryUrl:safeText(repo,1024),candidateHomepage:home,
  candidateGitHead:typeof item.gitHead==='string'&&/^[a-f0-9]{40}$/i.test(item.gitHead)?item.gitHead.toLowerCase():null,
  candidateDistIntegrity:safeText(dist.integrity,512),
  candidateDistTarball:safeText(dist.tarball,2048),
  candidateRegistryAttestationUrl:attestation.url,
  candidateRegistryAttestationStatus:attestation.status,
  publisherProvenanceIndependentlyVerified:false,
  candidateNotice:'UNVERIFIED_REGISTRY_MANIFEST_METADATA'};
}
function failureCode(e){
 const msg=String(e?.message||e);
 if(/^REGISTRY_HTTP_\d{3}$/.test(msg))return msg;
 const known=new Set(['REGISTRY_NOT_JSON','REGISTRY_RESPONSE_OVERSIZE','REGISTRY_TIMEOUT','BAD_MANIFEST_BYTES','BAD_MANIFEST_JSON','REGISTRY_VERSION_IDENTITY_MISMATCH','INVALID_EXACT_NPM_NAME_VERSION','SOURCE_NOT_ALLOWLISTED']);
 return known.has(msg)?msg:'REGISTRY_FETCH_FAILED';
}
async function buildUpstreamCandidates(input,{fetcher=fetchManifest,concurrency=4}={}){
 if(input?.schema!=='therabridge-com02-exact-version-rights-queue-v1'||
 input.counts?.legallyApproved!==0||!Array.isArray(input.exceptions)||
 input.counts.exceptions!==input.exceptions.length||!Array.isArray(input.nonPackage)||
 input.counts.nonPackageAssets!==input.nonPackage.length||
 input.finalNoticesIssued!==false||input.commercialLicenseGranted!==false||
 !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>MAX_CONCURRENCY||
 input.exceptions.length<1||input.exceptions.length>MAX_RECORDS)
  throw Error('INVALID_EXCEPTION_REGISTER');
 const seen=new Set();
 const records=input.exceptions.map(p=>{
  if(!p||p.commercialApproval!==false||p.decision!=='UNRESOLVED'||
    p.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||p.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('UNEXPECTED_UPSTREAM_LEGAL_APPROVAL');
  const k=key(p);if(seen.has(k))throw Error('DUPLICATE_VERSION');seen.add(k);
  // Invalid names must stay visible, not silently dropped.
  let url=null;try{url=manifestUrl(p.name,p.version);}catch{}
  return {name:p.name,version:p.version,dependencyScope:p.dependencyScope,
   publisherEvidenceStatus:p.publisherEvidenceStatus,
   exactRegistryManifestUrl:url,lockedIntegrity:p.lockedIntegrity??null,
   pinnedSourceUrl:p.pinnedSourceUrl??null,
   manifestEvidenceStatus:'NOT_FETCHED',registryManifestSha256:null,
   candidateLicenseExpression:null,candidateRepositoryUrl:null,
   candidateHomepage:null,candidateGitHead:null,candidateDistIntegrity:null,candidateDistTarball:null,
   candidateRegistryAttestationUrl:null,candidateRegistryAttestationStatus:'NOT_FETCHED',
   publisherProvenanceIndependentlyVerified:false,
   manifestMatchesLockedIntegrity:false,
   authoritativeLicenseTextSource:null,authoritativeLicenseTextSha256:null,
   upstreamCopyrightVerified:false,sourceRefVersionVerified:false,
   legalReviewStatus:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',commercialApproval:false,
   followUp:'VERIFY_AUTHORITATIVE_LICENSE_TEXT_AT_EXACT_SOURCE_REVISION'};
 });
 let cursor=0;
 async function worker(){
  while(cursor<records.length){
   const idx=cursor++,row=records[idx];
   if(!row.exactRegistryManifestUrl){row.manifestEvidenceStatus='INVALID_EXACT_NPM_NAME_VERSION';continue;}
   try{
    const result=await fetcher(row.exactRegistryManifestUrl);
    const b=Buffer.isBuffer(result)?result:Buffer.from(result);
    const parsed=parseManifest(b,row.name,row.version);
    Object.assign(row,{manifestEvidenceStatus:'REGISTRY_EXACT_VERSION_METADATA_ONLY',
     registryManifestSha256:parsed.sha256,
     candidateLicenseExpression:parsed.candidateLicenseExpression,
     candidateRepositoryUrl:parsed.candidateRepositoryUrl,
     candidateHomepage:parsed.candidateHomepage,
     candidateGitHead:parsed.candidateGitHead,
     candidateDistIntegrity:parsed.candidateDistIntegrity,
     candidateDistTarball:parsed.candidateDistTarball,
     candidateRegistryAttestationUrl:parsed.candidateRegistryAttestationUrl,
     candidateRegistryAttestationStatus:parsed.candidateRegistryAttestationStatus,
     manifestMatchesLockedIntegrity:!!(parsed.candidateDistIntegrity&&row.lockedIntegrity&&parsed.candidateDistIntegrity===row.lockedIntegrity)});
   }catch(e){row.manifestEvidenceStatus=failureCode(e);}
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,records.length)},()=>worker()));
 records.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 const counts={exceptions:records.length,exactVersionMetadata:records.filter(x=>x.manifestEvidenceStatus==='REGISTRY_EXACT_VERSION_METADATA_ONLY').length,
  missingOrInvalidMetadata:records.filter(x=>x.manifestEvidenceStatus!=='REGISTRY_EXACT_VERSION_METADATA_ONLY').length,
  registryAttestationPointersAdvertised:records.filter(x=>x.candidateRegistryAttestationStatus==='UNVERIFIED_REGISTRY_ATTESTATION_POINTER').length,
  registryAttestationPointersInvalid:records.filter(x=>x.candidateRegistryAttestationStatus==='INVALID_REGISTRY_ATTESTATION_HINT').length,
  independentlyVerifiedPublisherProvenance:0,
  authoritativeLicenseTextsVerified:0,legallyApproved:0};
 return {schema:'therabridge-com02-upstream-authority-candidates-v1',
  status:'REGISTRY_METADATA_CANDIDATES_NOT_AUTHORITY_OR_LEGAL_CLEARANCE',
  exceptionRegisterSha256:digest(JSON.stringify(input)),counts,
  records,unresolvedNonPackageAssets:input.nonPackage.length,
  otherDistributionObligations:input.supplementalReview,
  finalNoticesIssued:false,commercialLicenseGranted:false};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [sourcePath,outPath]=process.argv.slice(2);
 if(process.argv.length!==4||sourcePath===outPath){console.error('Usage: collect-upstream-license-candidates.mjs exact-version-rights.json output.json');process.exit(2);}
 try{
  const result=await buildUpstreamCandidates(JSON.parse(readFileSync(sourcePath,'utf8')));
  writeFileSync(outPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {manifestUrl,parseManifest,attestationPointer,buildUpstreamCandidates};
