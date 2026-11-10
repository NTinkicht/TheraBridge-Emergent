#!/usr/bin/env node
// COM-02: distinguish publisher's Git HEAD claim from corroborated source lineage.
// Even matching source metadata is evidence for HUMAN REVIEW, never proof of
// publication provenance, authoritative LICENSE/NOTICE terms, or legal rights.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {fetchRaw} from './verify-immutable-license-texts.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const key=r=>JSON.stringify([r.name,r.version]);
const SHA=/^[a-f0-9]{40}$/;
const PKG=/^(@[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*|[a-z0-9][\w.-]*)$/;
const VERSION=/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?(?:\+[a-zA-Z0-9.-]+)?$/;
function repoIdentity(repo){
 if(typeof repo!=='string'||repo.length>512)throw Error('UNTRUSTED_REPOSITORY');
 // Reject GitHub repository URLs with a subdirectory, SSH, credentials,
 // query string, fragments, subdomains, encoded traversal or mutable refs.
 const raw=repo.startsWith('git+')?repo.slice(4):repo;
 let u;try{u=new URL(raw);}catch{throw Error('UNTRUSTED_REPOSITORY');}
 if(u.protocol!=='https:'||u.hostname!=='github.com'||u.port||u.username||u.password||u.search||u.hash)
  throw Error('UNTRUSTED_REPOSITORY');
 const match=u.pathname.match(/^\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99})\/([A-Za-z0-9][A-Za-z0-9_.-]{0,99}?)(?:\.git)?\/?$/);
 if(!match||match[1]==='.'||match[2]==='.'||match[1]==='..'||match[2]==='..')
  throw Error('UNTRUSTED_REPOSITORY');
 return {owner:match[1],repository:match[2]};
}
function sourcePackageUrl(repo,commit){
 if(typeof commit!=='string'||!SHA.test(commit))throw Error('UNTRUSTED_COMMIT');
 const {owner,repository}=repoIdentity(repo);
 return `https://raw.githubusercontent.com/${owner}/${repository}/${commit}/package.json`;
}
function checkSourcePackage(bytes,name,version){
 if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>512*1024)throw Error('INVALID_SOURCE_PACKAGE_BYTES');
 let parsed;
 try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw Error('INVALID_SOURCE_PACKAGE_JSON');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.name!==name||parsed.version!==version)
  throw Error('SOURCE_PACKAGE_IDENTITY_MISMATCH');
 return {sourcePackageSha256:sha(bytes),sourcePackageBytes:bytes.length};
}
async function sourceCorrespondenceCandidates(candidates,{fetcher=fetchRaw,concurrency=4}={}){
 if(candidates?.schema!=='therabridge-com02-upstream-authority-candidates-v1'||
 candidates.counts?.legallyApproved!==0||!Array.isArray(candidates.records)||
 candidates.counts.exceptions!==candidates.records.length||candidates.records.length<1||
 candidates.records.length>1024||candidates.finalNoticesIssued!==false||
 candidates.commercialLicenseGranted!==false||!Array.isArray(candidates.otherDistributionObligations)||
 !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>6)
 throw Error('INVALID_CANDIDATE_SOURCE');
 const seen=new Set(),records=candidates.records.map(p=>{
  if(!p||p.commercialApproval!==false||p.legalReviewStatus!=='UNRESOLVED'||
  p.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||p.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
  typeof p.name!=='string'||!PKG.test(p.name)||typeof p.version!=='string'||!VERSION.test(p.version))
   throw Error('UNSAFE_CANDIDATE');
  const k=key(p);if(seen.has(k))throw Error('DUPLICATE_CANDIDATE');seen.add(k);
  return {
   name:p.name,version:p.version,registryManifestSha256:p.registryManifestSha256??null,
   registryManifestEvidenceStatus:p.manifestEvidenceStatus??null,
   publisherEvidenceStatus:p.publisherEvidenceStatus,
   candidateGitHead:p.candidateGitHead??null,candidateRepositoryUrl:p.candidateRepositoryUrl??null,
   lockedIntegrityMatchesRegistry:p.manifestMatchesLockedIntegrity===true,
   sourcePackageUrl:null,sourcePackageSha256:null,sourcePackageBytes:null,
   evidenceStatus:'SOURCE_REVISION_CANDIDATE_UNAVAILABLE',
   sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
   distributionScope:'NOT_CLASSIFIED',authoritativeLicenseTextsVerified:false,
   commercialApproval:false,saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   followUp:'INDEPENDENTLY_CORROBORATE_RELEASE_COMMIT_AND_PUBLISHER_ARTIFACT'};
 });
 let next=0;
 async function worker(){
  while(next<records.length){
   const row=records[next++];
   if(row.registryManifestEvidenceStatus!=='REGISTRY_EXACT_VERSION_METADATA_ONLY'||
      !/^[a-f0-9]{64}$/.test(row.registryManifestSha256??'')||
      !row.lockedIntegrityMatchesRegistry){
    row.evidenceStatus='REGISTRY_MANIFEST_OR_LOCK_INTEGRITY_UNCONFIRMED';
    continue;
   }
   if(!row.candidateGitHead||!row.candidateRepositoryUrl)continue;
   try{
    const url=sourcePackageUrl(row.candidateRepositoryUrl,row.candidateGitHead);
    row.sourcePackageUrl=url;
    const fetched=await fetcher(url);
    const bytes=Buffer.isBuffer(fetched)?fetched:Buffer.from(fetched);
    const metadata=checkSourcePackage(bytes,row.name,row.version);
    Object.assign(row,metadata,{evidenceStatus:'REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY'});
   }catch(e){
    const message=String(e?.message||'');
    row.evidenceStatus=/^(UNTRUSTED_REPOSITORY|UNTRUSTED_COMMIT|INVALID_SOURCE_PACKAGE_BYTES|INVALID_SOURCE_PACKAGE_JSON|SOURCE_PACKAGE_IDENTITY_MISMATCH|UPSTREAM_TIMEOUT|TEXT_TOO_LARGE|SOURCE_NOT_ALLOWLISTED)$/.test(message)||
    /^UPSTREAM_HTTP_\d{3}$/.test(message)?message:'SOURCE_FETCH_FAILED';
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,records.length)},()=>worker()));
 records.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 return {
  schema:'therabridge-com02-githead-source-corroboration-candidates-v1',
  status:'SOURCE_ROOT_MANIFEST_IS_NOT_RELEASE_ARTIFACT_AUTHORITY_OR_LEGAL_CLEARANCE',
  inputRegistryCandidateSha256:sha(JSON.stringify(candidates)),
  counts:{exceptions:records.length,sourceRootManifestMatches:records.filter(x=>x.evidenceStatus==='REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY').length,
   stillRequiresIndependentAttestation:records.length,authoritativeLicenseTextsVerified:0,legallyApproved:0},
  records,unresolvedNonPackageAssets:candidates.unresolvedNonPackageAssets,
  otherDistributionObligations:candidates.otherDistributionObligations,
  finalNoticesIssued:false,commercialLicenseGranted:false
 };
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(process.argv.length!==4||input===output){console.error('Usage: corroborate-source-revisions.mjs registry-candidates.json output.json');process.exit(2);}
 try{
  const report=await sourceCorrespondenceCandidates(JSON.parse(readFileSync(input,'utf8')));
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {repoIdentity,sourcePackageUrl,checkSourcePackage,sourceCorrespondenceCandidates};
