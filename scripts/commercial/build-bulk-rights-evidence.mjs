#!/usr/bin/env node
// COM-02 consolidated audit: hashes upstream text candidates and preserves
// every unresolved package and non-package rights item. NO legal approvals.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {repoIdentity} from './corroborate-source-revisions.mjs';
import {validatedRawUrl,fetchRaw,validateText} from './verify-immutable-license-texts.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const id=r=>JSON.stringify([r.name,r.version]);
const SOURCE_MATCH='REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY';
const PATH_PATTERN=/^(?:[A-Za-z0-9_.-]+\/){0,4}(?:licen[cs]e|copying|notice|copyright)(?:[._-][A-Za-z0-9_.-]+)?$/i;
function classify(row){
 switch(row.evidenceStatus){
  case SOURCE_MATCH:return 'PINNED_ROOT_PACKAGE_MATCH_PENDING_RELEASE_ATTESTATION';
  case 'SOURCE_PACKAGE_IDENTITY_MISMATCH':
   return row.name.startsWith('@next/')?'MONOREPO_SUBPACKAGE_PATH_UNRESOLVED':'SOURCE_PACKAGE_IDENTITY_MISMATCH';
  case 'UNTRUSTED_REPOSITORY':return 'UNSAFE_LEGACY_REPOSITORY_SCHEME_REQUIRES_REVIEW';
  case 'SOURCE_REVISION_CANDIDATE_UNAVAILABLE':
   return row.name.startsWith('@types/')?'DEFINITELYTYPED_HISTORY_NOT_ATTESTED':'NO_PINNED_UPSTREAM_REVISION';
  default:return 'SOURCE_PROVENANCE_REQUIRES_MANUAL_REVIEW';
 }
}
function classifyAsset(asset){
 // A repository path or category is NOT a filesystem image/enterprise
 // distribution receipt. Treat release status as unknown in all cases.
 if(asset.category==='CONTAINER_BUILD')return 'BUILD_INPUT_RELEASE_PRESENCE_NOT_VERIFIED';
 if(asset.category==='BRAND')return 'BRAND_PERMISSION_AND_RELEASE_PRESENCE_NOT_VERIFIED';
 if(asset.category==='IMAGE_OR_ICON')return 'IMAGE_RIGHTS_AND_RELEASE_PRESENCE_NOT_VERIFIED';
 return 'UNCLASSIFIED_ASSET_RIGHTS_AND_RELEASE_PRESENCE_NOT_VERIFIED';
}
function validateInputs(register,correspondence,config){
 if(register?.schema!=='therabridge-com02-exact-version-rights-queue-v1'||
  correspondence?.schema!=='therabridge-com02-githead-source-corroboration-candidates-v1'||
  config?.schema!=='therabridge-com02-curated-source-license-paths-v1'||
  !Array.isArray(register.exceptions)||!Array.isArray(register.nonPackage)||
  !Array.isArray(correspondence.records)||!Array.isArray(config.records)||
  register.exceptions.length<1||register.exceptions.length>1024||
  register.counts?.exceptions!==register.exceptions.length||
  register.counts?.nonPackageAssets!==register.nonPackage.length||
  correspondence.counts?.exceptions!==register.exceptions.length||
  correspondence.counts?.stillRequiresIndependentAttestation!==register.exceptions.length||
  correspondence.unresolvedNonPackageAssets!==register.nonPackage.length||
  register.counts.legallyApproved!==0||correspondence.counts.legallyApproved!==0||
  correspondence.counts.authoritativeLicenseTextsVerified!==0||
  register.finalNoticesIssued!==false||correspondence.finalNoticesIssued!==false||
  register.commercialLicenseGranted!==false||correspondence.commercialLicenseGranted!==false||
  config.commercialApproval!==false||config.records.length>128)
  throw Error('INVALID_RIGHTS_INVENTORY');
 const versions=new Map();
 for(const e of register.exceptions){
  if(!e||typeof e.name!=='string'||typeof e.version!=='string'||versions.has(id(e))||
   e.commercialApproval!==false||e.decision!=='UNRESOLVED'||
   e.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
   e.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('UNSAFE_EXCEPTION_REGISTER');
  versions.set(id(e),e);
 }
 const matches=new Map();
 for(const r of correspondence.records){
  if(!r||!versions.has(id(r))||matches.has(id(r))||
   r.commercialApproval!==false||r.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED'||
   r.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
   r.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('UNSAFE_CORRESPONDENCE');
  matches.set(id(r),r);
 }
 if(matches.size!==versions.size)throw Error('MISSING_PACKAGE_VERSION');
 const byVersion=new Map();
 for(const e of config.records){
  if(!e||!versions.has(id(e))||byVersion.has(id(e))||
   e.commercialApproval!==false||!Array.isArray(e.paths)||e.paths.length<1||e.paths.length>4||
   typeof e.owner!=='string'||typeof e.repository!=='string'||typeof e.commit!=='string'||
   e.paths.some(p=>typeof p!=='string'||p.length>180||!PATH_PATTERN.test(p))||
   new Set(e.paths).size!==e.paths.length)
   throw Error('INVALID_CURATED_LICENSE_CANDIDATE');
  // Any forged source commit/owner is fatal: the whitelist is candidate-only,
  // but must not point to the wrong upstream package/revision.
  const corresponding=matches.get(id(e));
  if(corresponding.candidateGitHead!==e.commit||
   corresponding.registryManifestEvidenceStatus!=='REGISTRY_EXACT_VERSION_METADATA_ONLY'||
   corresponding.lockedIntegrityMatchesRegistry!==true||
   !/^[a-f0-9]{64}$/.test(corresponding.registryManifestSha256??''))
   throw Error('CURATED_SOURCE_NOT_EXACT_REGISTRY_MATCH');
  // A prior bounded source read may fail transiently while the exact locked
  // source identity remains the same. Preserve the unresolved row instead of
  // dropping the 53-version report or inventing a positive correspondence.
  const temporarilyUnavailable=corresponding.evidenceStatus==='UPSTREAM_TIMEOUT'||
   corresponding.evidenceStatus==='SOURCE_FETCH_FAILED'||
   /^UPSTREAM_HTTP_(?:408|429|5\d\d)$/.test(corresponding.evidenceStatus??'');
  if(corresponding.evidenceStatus!==SOURCE_MATCH&&!temporarilyUnavailable)
   throw Error('CURATED_SOURCE_CORRESPONDENCE_CONTRADICTED');
  let parsed;
  try{parsed=repoIdentity(corresponding.candidateRepositoryUrl);}catch{throw Error('CURATED_SOURCE_HOST_UNTRUSTED');}
  if(parsed.owner!==e.owner||parsed.repository!==e.repository)
   throw Error('CURATED_REPOSITORY_MISMATCH');
  for(const path of e.paths)validatedRawUrl({...e,path});
  byVersion.set(id(e),{...e,corroborationUnavailable:temporarilyUnavailable});
 }
 const assets=new Set();
 for(const a of register.nonPackage){
  if(!a||typeof a.path!=='string'||assets.has(a.path)||
   !/^[a-f0-9]{64}$/.test(a.sha256??'')||a.commercialApproval!==false||
   a.decision!=='UNRESOLVED'||a.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
   a.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('UNSAFE_NONPACKAGE_ASSET');
  assets.add(a.path);
 }
 if(!Array.isArray(register.supplementalReview))throw Error('MISSING_DISTRIBUTION_REVIEW');
 return {versions,matches,byVersion};
}
async function buildBulkEvidence(register,correspondence,config,{fetcher=fetchRaw,concurrency=4}={}){
 if(!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>6)
  throw Error('INVALID_CONCURRENCY');
 const {versions,matches,byVersion}=validateInputs(register,correspondence,config);
 const records=[];
 for(const e of versions.values()){
  const c=matches.get(id(e));
  records.push({
   name:e.name,version:e.version,dependencyScope:e.dependencyScope,
   publisherEvidenceStatus:e.publisherEvidenceStatus,
   publisherTarballSha256:e.tarballSha256,lockedIntegrity:e.lockedIntegrity,
   provenanceCategory:classify(c),sourceRevision:c.candidateGitHead??null,
   sourceRootManifestSha256:c.sourcePackageSha256??null,
   sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED',
   legalSourceTextVerified:false,verifiedPublisherToSourceArtifact:false,
   sourceTextCandidates:[],textCandidateStatus:'NO_CURATED_SOURCE_TEXT_PATH',
   owner:'COM-02_RIGHTS_REVIEW',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   releaseImagePresence:'NOT_VERIFIED_AGAINST_RELEASE_IMAGE',
   decision:'UNRESOLVED',commercialApproval:false
  });
 }
 const jobs=[];
 for(const row of records){
  const chosen=byVersion.get(id(row));
  if(!chosen)continue;
  if(chosen.corroborationUnavailable){
   row.textCandidateStatus='PRIOR_SOURCE_CORROBORATION_UNAVAILABLE_NO_LICENSE_FETCH';
   continue;
  }
  row.textCandidateStatus='CURATED_IMMUTABLE_PATHS_PENDING_FETCH';
  for(const path of chosen.paths)
   jobs.push({row,mapping:{owner:chosen.owner,repository:chosen.repository,commit:chosen.commit,path}});
 }
 let cursor=0;
 async function worker(){
  while(cursor<jobs.length){
   const {row,mapping}=jobs[cursor++];
   const item={path:mapping.path,immutableSourceUrl:validatedRawUrl(mapping),
    sha256:null,bytes:null,status:'NOT_FETCHED'};
   try{
    const fetched=await fetcher(item.immutableSourceUrl);
    const bytes=Buffer.isBuffer(fetched)?fetched:Buffer.from(fetched);
    item.sha256=validateText(bytes);item.bytes=bytes.length;
    item.status='PINNED_UPSTREAM_TEXT_BYTES_HASHED_NOT_LEGALLY_AUTHORIZED';
   }catch(e){
    const code=String(e?.message||'');
    item.status=/^UPSTREAM_HTTP_\d{3}$/.test(code)||[
     'INVALID_TEXT_SIZE','INVALID_UTF8_LICENSE_TEXT','INVALID_LICENSE_TEXT',
     'UPSTREAM_TIMEOUT','TEXT_TOO_LARGE','SOURCE_NOT_ALLOWLISTED'
    ].includes(code)?code:'SOURCE_TEXT_FETCH_FAILED';
   }
   row.sourceTextCandidates.push(item);
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,Math.max(1,jobs.length))},()=>worker()));
 for(const row of records){
  row.sourceTextCandidates.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  if(row.sourceTextCandidates.length)
   row.textCandidateStatus=row.sourceTextCandidates.every(x=>x.sha256)?
    'ALL_CURATED_TEXT_CANDIDATES_HASHED_NOT_LEGALLY_AUTHORIZED':
    'SOME_CURATED_TEXT_CANDIDATES_UNAVAILABLE';
 }
 records.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 const nonPackage=register.nonPackage.map(a=>({
  path:a.path,sha256:a.sha256,category:a.category,
  provenanceCategory:classifyAsset(a),releaseImagePresence:'NOT_VERIFIED_AGAINST_RELEASE_IMAGE',
  rightsHolder:'NOT_VERIFIED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
  commercialApproval:false,decision:'UNRESOLVED'
 })).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 const hashed=records.flatMap(x=>x.sourceTextCandidates).filter(x=>x.sha256!==null).length;
 const byClass={};
 for(const row of records)byClass[row.provenanceCategory]=(byClass[row.provenanceCategory]??0)+1;
 return {
  schema:'therabridge-com02-bulk-rights-review-v1',
  status:'IMMUTABLE_TEXT_HASH_CANDIDATES_NOT_RELEASE_ATTESTATION_OR_LEGAL_APPROVAL',
  exceptionRegisterSha256:sha(JSON.stringify(register)),
  correspondenceSha256:sha(JSON.stringify(correspondence)),
  curatedConfigSha256:sha(JSON.stringify(config)),
  counts:{packages:records.length,nonPackageAssets:nonPackage.length,
   sourceRootManifestMatches:correspondence.counts.sourceRootManifestMatches,
   packagesStillRequiringIndependentAttestation:records.length,
   curatedSourceVersions:byVersion.size,curatedSourceFiles:jobs.length,
   sourceTextFilesHashed:hashed,authoritativeLicenseTextsLegallyVerified:0,
   publisherSourceArtifactAttestationsVerified:0,legallyApproved:0},
  provenanceClasses:byClass,packages:records,nonPackageAssets:nonPackage,
  supplementalDistributionReview:register.supplementalReview,
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
  finalNoticesIssued:false,commercialLicenseGranted:false
 };
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [exceptionPath,sourcePath,configPath,outputPath]=process.argv.slice(2);
 if(process.argv.length!==6||new Set([exceptionPath,sourcePath,configPath,outputPath]).size!==4){
  console.error('Usage: build-bulk-rights-evidence.mjs exception.json source.json curated.json output.json');process.exit(2);
 }
 try{
  const report=await buildBulkEvidence(JSON.parse(readFileSync(exceptionPath)),JSON.parse(readFileSync(sourcePath)),JSON.parse(readFileSync(configPath)));
  writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {buildBulkEvidence,classify,classifyAsset,validateInputs};
