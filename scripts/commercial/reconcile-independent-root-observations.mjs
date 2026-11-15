#!/usr/bin/env node
// COM-02 independent public source-root observation reconciliation.
// An exact Git commit and matching source manifest do NOT attest that
// published npm tarballs were built from it or confer redistribution rights.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COM02_UNRESOLVED_VERSIONS as N} from './com02-nextjs-pins.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const h40=/^[a-f0-9]{40}$/,h64=/^[a-f0-9]{64}$/;
const identity=x=>JSON.stringify([x.name,x.version]);
const DIRECT='DIRECT_CLAIMED_REPOSITORY_EXACT_COMMIT_MANIFEST_MATCH';
const ALTERNATE='ALTERNATE_REPOSITORY_EXACT_COMMIT_MATCH_GITHUB_REDIRECT_VERIFIED_COPYRIGHT_UNVERIFIED';
const schema='therabridge-com02-independent-root-observations-v1';
const expectedNames=[
 '@tokenizer/token@0.3.0','abstract-logging@2.0.1','consola@2.15.3',
 'cssesc@3.0.0','dlv@1.1.3','emoji-regex@8.0.0','emoji-regex@9.2.2',
 'esrecurse@4.3.0','glob-to-regexp@0.4.1','jsesc@3.1.0',
 'postcss-selector-parser@6.1.5','punycode@2.3.1','tmp@0.0.33',
 'tr46@0.0.3','type-fest@4.41.0'
];
// Frozen 2026-11-15 observations whose exact versions left the locked
// dependency population (PR #311 Nest 11 / Next 15 upgrade). They stay in
// the dated snapshot and are structurally re-validated, but are never bound
// to current evidence; if one reappears in the lock it must be re-reviewed.
const RETIRED=new Set(['consola@2.15.3','emoji-regex@9.2.2','tmp@0.0.33','tr46@0.0.3']);
const RETIRED_STATUS='RETIRED_NOT_IN_CURRENT_LOCKED_POPULATION';
const allowedAliases=new Map([
 ['consola@2.15.3',['nuxt/consola','unjs/consola','127546642']],
 ['tr46@0.0.3',['Sebmaster/tr46.js','jsdom/tr46','36964214']]
]);
function reconcile(candidates,observations){
 if(candidates?.schema!=='therabridge-com02-githead-source-corroboration-candidates-v1'||
    candidates?.counts?.exceptions!==N||
    candidates?.counts?.stillRequiresIndependentAttestation!==N||
    candidates?.counts?.legallyApproved!==0||
    candidates?.commercialLicenseGranted!==false||
    candidates?.finalNoticesIssued!==false||
    !Array.isArray(candidates.records)||candidates.records.length!==N)
   throw Error('INVALID_COM02_SOURCE_CORRESPONDENCE');
 if(observations?.schema!==schema||observations.observedOn!=='2026-11-15'||
    observations.scope!=='PUBLIC_SOURCE_ROOT_METADATA_ONLY_NOT_PACKAGE_PUBLICATION_OR_LICENSE'||
    observations.candidateCount!==15||observations.sourcePackageManifestMatches!==15||
    observations.claimedRepositoryDirectlyResolved!==13||
    observations.alternativeRepositoryExactCommitMatches!==2||
    observations.githubRepositoryRedirectsVerified!==2||
    observations.publisherToSourceIndependentlyAttested!==0||
    observations.legallyApproved!==0||observations.commercialLicenseGranted!==false||
    observations.g2ClinicalApproved!==false||observations.g2bClinicalApproved!==false||
    !Array.isArray(observations.records)||observations.records.length!==15)
   throw Error('UNTRUSTED_OBSERVATION_ENVELOPE');
 const byCandidate=new Map();
 for(const candidate of candidates.records){
   if(!candidate||!candidate.name||!candidate.version||
      byCandidate.has(identity(candidate))||candidate.commercialApproval!==false||
      candidate.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED')
      throw Error('INVALID_OR_DUPLICATED_CANDIDATE');
   byCandidate.set(identity(candidate),candidate);
 }
 const obs=new Map(),out=[];
 for(const row of observations.records){
  if(!row||typeof row.name!=='string'||typeof row.version!=='string'||row.version.length>64||
     row.manifestPath!=='package.json'||!h40.test(row.commit||'')||
     !h40.test(row.gitManifestBlobSha1||'')||!h64.test(row.sourceManifestSha256||'')||
     row.npmTarballBuiltFromSourceIndependentlyVerified!==false||
     row.sourceLicenseTextLegallyApproved!==false||row.commercialApproval!==false||
     ![DIRECT,ALTERNATE].includes(row.observationStatus)||
     row.manifestLicenseMetadata!==null&&!['MIT','BSD-2-Clause'].includes(row.manifestLicenseMetadata))
     throw Error('UNTRUSTED_SOURCE_ROOT_OBSERVATION');
  const k=row.name+'@'+row.version;
  if(!expectedNames.includes(k)||obs.has(k))throw Error('UNEXPECTED_DUPLICATE_OR_MISSING_SOURCE_ID');
  obs.set(k,row);
  const candidate=byCandidate.get(identity(row));
  if(RETIRED.has(k)){
   if(candidate)throw Error('RETIRED_OBSERVATION_REAPPEARED_REQUIRES_REVIEW');
   const aliases=allowedAliases.get(k);
   if(aliases){
    const redirect=row.githubRepoRedirect;
    if(row.observationStatus!==ALTERNATE||
       row.registryClaimedRepository!==aliases[0]||row.observedRepository!==aliases[1]||
       redirect?.requested!==aliases[0]||redirect?.canonical!==aliases[1]||
       redirect?.repositoryId!==aliases[2]||redirect?.githubEndpointResolvesToSameRepositoryId!==true)
     throw Error('HISTORICAL_REPOSITORY_ALIAS_UNVERIFIED');
   }else if(row.observationStatus!==DIRECT||row.registryClaimedRepository!==row.observedRepository||row.githubRepoRedirect!==null)
     throw Error('FORGED_DIRECT_REPOSITORY_CORROBORATION');
   out.push({name:row.name,version:row.version,claimedRepository:row.registryClaimedRepository,
     observedRepository:row.observedRepository,commit:row.commit,
     sourceManifestSha256:row.sourceManifestSha256,
     gitBlobSha1Observation:row.gitManifestBlobSha1,
     npmSourceRevisionIndependentlyVerified:false,
     rightsApproved:false,status:RETIRED_STATUS});
   continue;
  }
  if(!candidate||candidate.candidateGitHead!==row.commit||
     !candidate.lockedIntegrityMatchesRegistry||
     candidate.registryManifestEvidenceStatus!=='REGISTRY_EXACT_VERSION_METADATA_ONLY')
   throw Error('OBSERVATION_NOT_BOUND_TO_EXACT_LOCKED_NPM_VERSION');
  const claimed='git+https://github.com/'+row.registryClaimedRepository+'.git';
  if(candidate.candidateRepositoryUrl!==claimed)
   throw Error('OBSERVATION_REPOSITORY_DIFFERS_FROM_NPM_CLAIM');
  const aliases=allowedAliases.get(k);
  if(aliases){
   const redirect=row.githubRepoRedirect;
   if(row.observationStatus!==ALTERNATE||
      row.registryClaimedRepository!==aliases[0]||row.observedRepository!==aliases[1]||
      redirect?.requested!==aliases[0]||redirect?.canonical!==aliases[1]||
      redirect?.repositoryId!==aliases[2]||redirect?.githubEndpointResolvesToSameRepositoryId!==true)
    throw Error('HISTORICAL_REPOSITORY_ALIAS_UNVERIFIED');
  }else if(row.observationStatus!==DIRECT||row.registryClaimedRepository!==row.observedRepository||row.githubRepoRedirect!==null)
    throw Error('FORGED_DIRECT_REPOSITORY_CORROBORATION');
  const temporaryUnavailable=['SOURCE_FETCH_FAILED','UPSTREAM_TIMEOUT'].includes(candidate.evidenceStatus)||
      /^UPSTREAM_HTTP_\d+$/.test(candidate.evidenceStatus||'');
  if(!temporaryUnavailable&&
     (candidate.evidenceStatus!=='REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY'||
      candidate.sourcePackageSha256!==row.sourceManifestSha256))
   throw Error('LIVE_IMMUTABLE_SOURCE_MANIFEST_CONTRADICTS_SNAPSHOT');
  out.push({name:row.name,version:row.version,claimedRepository:row.registryClaimedRepository,
    observedRepository:row.observedRepository,commit:row.commit,
    sourceManifestSha256:row.sourceManifestSha256,
    gitBlobSha1Observation:row.gitManifestBlobSha1,
    npmSourceRevisionIndependentlyVerified:false,
    rightsApproved:false,
    status:temporaryUnavailable?'TRANSIENT_SOURCE_READ_UNAVAILABLE_REMAIN_UNVERIFIED':
     row.observationStatus});
 }
 if(obs.size!==expectedNames.length||expectedNames.some(k=>!obs.has(k)))
  throw Error('INCOMPLETE_15_ROOT_OBSERVATIONS');
 const sourceMatches=out.filter(x=>x.status===DIRECT||x.status===ALTERNATE).length;
 return {schema:'therabridge-com02-15root-observation-crosscheck-v1',
   status:'PUBLIC_SOURCE_ROOT_METADATA_ONLY_PUBLISHER_SOURCE_LINEAGE_UNRESOLVED',
   observationSha256:sha(JSON.stringify(observations)),
   correspondenceSha256:sha(JSON.stringify(candidates)),
   counts:{originalVersions:N,observedSourceRoots:15,
     boundToCurrentPopulation:out.filter(x=>x.status!==RETIRED_STATUS).length,
     retiredNotInCurrentPopulation:out.filter(x=>x.status===RETIRED_STATUS).length,
     sourceManifestSha256Matches:sourceMatches,
     claimedRepositoriesDirect:out.filter(x=>x.status===DIRECT).length,
     githubRepositoryRedirectsVerified:2,
     historicalCopyrightTransfersVerified:0,
     publicationToSourceBuildCorrespondenceVerified:0,legallyApproved:0},
   records:out.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en')),
   finalNoticesIssued:false,commercialLicenseGranted:false,
   g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
   const args=process.argv.slice(2);
   if(args.length!==3||new Set(args).size!==3)
    throw Error('USAGE: reconcile-independent-root-observations.mjs correspondence.json frozen-observations.json output.json');
   const load=p=>JSON.parse(readFileSync(p,'utf8'));
   const report=reconcile(load(args[0]),load(args[1]));
   writeFileSync(args[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify(report.counts));
 }catch(e){console.error('SOURCE_ROOT_OBSERVATION_REJECTED',e.message);process.exitCode=1;}
}
export {reconcile};
