#!/usr/bin/env node
// COM-02: evidence-only, deterministic exact-version exception and rights triage.
// Never produces legal clearance or a final third-party notice.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseLock,validatedUrl} from './verify-published-tarballs.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const KEY=p=>JSON.stringify([p.name,p.version]);
const VERIFIED='TARBALL_INTEGRITY_VERIFIED_LICENSE_FILES_HASHED';
const NO_ROOT='TARBALL_INTEGRITY_VERIFIED_NO_TOP_LEVEL_LICENSE';
function buildExceptionRegister({direct,transitive,installed,lockText,assets}){
 if(direct?.schema!=='therabridge-publisher-tarball-evidence-v1'||direct.legallyApproved!==0||!Array.isArray(direct.records)||
 transitive?.schema!=='therabridge-transitive-tarball-wave-v1'||transitive.counts?.legallyApproved!==0||!Array.isArray(transitive.records)||
 installed?.schema!=='therabridge-installed-license-file-inventory-v1'||installed.approved!==0||installed.count!==installed.packages?.length||
 assets?.schema!=='therabridge-com02-consolidated-obligations-queue-v1'||assets.counts?.legallyApproved!==0)
 throw Error('INVALID_INPUT_EVIDENCE');
 const locked=parseLock(lockText),all=[...direct.records.map(x=>({...x,dependencyScope:'DIRECT_DECLARED'})),
 ...transitive.records.map(x=>({...x,dependencyScope:'INSTALLED_NON_DIRECT'}))];
 if(all.length!==direct.records.length+transitive.records.length)throw Error('INCOMPLETE_SOURCE_SCOPE');
 const copies=new Map(),seen=new Set();
 for(const p of installed.packages){
  if(p.commercialApproval!==false||p.actualLicenseTextReviewed!==false||typeof p.installedPath!=='string'||!Array.isArray(p.foundLicenseFiles))throw Error('FALSE_INSTALLED_APPROVAL');
  const key=KEY(p),list=copies.get(key)||[];
  if(list.some(x=>x.installedPath===p.installedPath))throw Error('DUPLICATE_INSTALLED_COPY');
  list.push(p);copies.set(key,list);
 }
 // Independent installed physical-copy inventory is the coverage authority.
 // Publisher arrays and their claimed counts must not silently omit versions.
 const publisherKeys=new Set(all.map(KEY));
 const installedKeys=new Set(installed.packages.map(KEY));
 for(const key of installedKeys)if(!publisherKeys.has(key))throw Error('INSTALLED_VERSION_MISSING_PUBLISHER_EVIDENCE');
 for(const key of publisherKeys)if(!installedKeys.has(key))throw Error('PUBLISHER_VERSION_NOT_INSTALLED');
 const exceptions=[];
 for(const row of all){
  if(typeof row.name!=='string'||!row.name||typeof row.version!=='string'||!row.version||
   row.legalApproval!==false||row.licenseObligationsReviewed!==false)throw Error('FALSE_PUBLISHER_APPROVAL');
  const key=KEY(row);
  if(seen.has(key))throw Error('DUPLICATE_PUBLISHER_VERSION');
  seen.add(key);
  if(row.status===VERIFIED){
   if(row.installedLicenseComparison!=='EXACT_SHA256_MATCH'||!Array.isArray(row.publishedLicenseFiles)||!row.publishedLicenseFiles.length)throw Error('INCONSISTENT_VERIFIED_EVIDENCE');
   continue;
  }
  const candidates=locked.get(key)||[];
  const source=candidates.length===1?candidates[0]:null;
  let archiveUrl=null;
  if(source){try{archiveUrl=validatedUrl(source.resolved).toString();}catch{}}
  const matches=(copies.get(key)||[]).map(p=>({
   installedPath:p.installedPath,
   files:p.foundLicenseFiles.map(f=>({file:f.file,sha256:f.sha256,bytes:f.bytes??null})).sort((a,b)=>a.file.localeCompare(b.file))
  })).sort((a,b)=>a.installedPath.localeCompare(b.installedPath));
  if(row.status===NO_ROOT&&(!row.tarballSha256||!row.verifiedIntegrityAlgorithm||!Array.isArray(row.publishedLicenseFiles)||row.publishedLicenseFiles.length))throw Error('FALSE_NO_ROOT_EVIDENCE');
  const disposition=row.status===NO_ROOT?'PUBLISHED_TARBALL_HAS_NO_RECOGNIZED_ROOT_LICENSE':'PUBLISHER_ARCHIVE_UNRESOLVED';
  exceptions.push({
   name:row.name,version:row.version,dependencyScope:row.dependencyScope,
   publisherEvidenceStatus:row.status,evidenceClass:disposition,
   tarballSha256:row.tarballSha256??null,verifiedIntegrityAlgorithm:row.verifiedIntegrityAlgorithm??null,
   pinnedSourceUrl:archiveUrl,lockedIntegrity:source?.integrity??null,
   lockSourceState:!source?'MISSING_OR_AMBIGUOUS':!archiveUrl?'SOURCE_INVALID':'EXACT_VERSION_LOCKED_CANDIDATE',
   installedCopies:matches,installedLicenseComparison:row.installedLicenseComparison??'NOT_EVALUATED',
   upstreamLicenseSource:null,upstreamLicenseTextSha256:null,upstreamCopyrightEvidence:null,
   publisherAttribution:'NOT_VERIFIED_UPSTREAM',manifestLicense:'NOT_LEGAL_EVIDENCE',
   runtimeDistribution:'NOT_CLASSIFIED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   decision:'UNRESOLVED',owner:'COM-02_RIGHTS_REVIEW',commercialApproval:false,
   followUp:'VERIFY_EXACT_VERSION_UPSTREAM_LICENSE_AND_REDISTRIBUTION'
  });
 }
 exceptions.sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
 // Asset inventory is a separate evidence category, never a software-license approval.
 if(!Array.isArray(assets.assets)||assets.assets.some(x=>x.approval!==false||x.saasRights!=='PENDING_LEGAL_REVIEW'||x.enterpriseRedistributionRights!=='PENDING_LEGAL_REVIEW'))throw Error('FALSE_ASSET_APPROVAL');
 const nonPackage=assets.assets.map(x=>({
  path:x.path,sha256:x.sha256,bytes:x.bytes,rightsHolder:x.rightsHolder,
  category:/\.woff2?$|\.ttf$|\.otf$/i.test(x.path)?'FONT':/logo|brand/i.test(x.path)?'BRAND':/Dockerfile/.test(x.path)?'CONTAINER_BUILD':'IMAGE_OR_ICON',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',decision:'UNRESOLVED',commercialApproval:false
 })).sort((a,b)=>a.path.localeCompare(b.path));
 const counts={directExamined:direct.records.length,nonDirectExamined:transitive.records.length,
  noPublisherRootLicense:exceptions.filter(x=>x.publisherEvidenceStatus===NO_ROOT).length,
  otherUnresolvedPublisher:exceptions.filter(x=>x.publisherEvidenceStatus!==NO_ROOT).length,
  exceptions:exceptions.length,nonPackageAssets:nonPackage.length,legallyApproved:0};
 if(counts.nonDirectExamined!==transitive.counts.uniqueVersionRows)throw Error('TRANSITIVE_SCOPE_DRIFT');
 return {schema:'therabridge-com02-exact-version-rights-queue-v1',
  status:'REPRODUCIBLE_TECHNICAL_TRIAGE_NOT_LEGAL_CLEARANCE',lockSha256:sha(lockText),
  directSourceSha256:sha(JSON.stringify(direct)),transitiveSourceSha256:sha(JSON.stringify(transitive)),
  installedSourceSha256:sha(JSON.stringify(installed)),assetSourceSha256:sha(JSON.stringify(assets)),
  counts,exceptions,nonPackage,
  supplementalReview:[
   {category:'OS_RUNTIME_CONTAINER',status:'UNRESOLVED',reason:'REQUIRE_RELEASE_IMAGE_DIGEST_AND_COMPONENT_LEVEL_OBLIGATIONS'},
   {category:'POSTGRES_REDIS',status:'UNRESOLVED',reason:'REQUIRE_EXACT_SHIPPED_VERSION_AND_DISTRIBUTION_SCOPE'},
   {category:'MODELS_DATASETS_EXTERNAL_SERVICES',status:'UNRESOLVED',reason:'REQUIRE_PROVIDER_TERMS_INPUT_RIGHTS_AND_DATA_PROCESSING_ASSESSMENT'}
  ],finalNoticesIssued:false,commercialLicenseGranted:false};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==6||new Set(args).size!==6){console.error('Usage: build-license-exception-register.mjs direct.json transitive.json installed.json yarn.lock obligations.json output.json');process.exit(2);}
 try{
  const [direct,transitive,installed,lockText,assets,output]=args;
  const report=buildExceptionRegister({
   direct:JSON.parse(readFileSync(direct,'utf8')),transitive:JSON.parse(readFileSync(transitive,'utf8')),
   installed:JSON.parse(readFileSync(installed,'utf8')),lockText:readFileSync(lockText,'utf8'),assets:JSON.parse(readFileSync(assets,'utf8'))});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {buildExceptionRegister};
