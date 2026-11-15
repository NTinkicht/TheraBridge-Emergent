#!/usr/bin/env node
// Candidate Git snapshot observed before npm's reported 2023 publish dates.
// A match proves content at this snapshot, not a historical publication build.
import {readFileSync,writeFileSync} from 'node:fs';
import {verify} from './verify-dt-immutable-source.mjs';
import {DEFINITELYTYPED_VERSIONS as DT} from './com02-nextjs-pins.mjs';
const sourceCommit='b87d8b54b28154cc9f6054238ff4ae63faa76000';
const laterCookiejarCommit='7aa25146316b7bafa0863d69bc5f125cde97f216';
const candidates=Object.freeze([
 {name:'@types/methods',version:'1.1.4',sourceRoot:'types/methods',reportedNpmUpdatedAt:'2023-11-07T09:09:39Z'},
 {name:'@types/cookiejar',version:'2.1.5',sourceRoot:'types/cookiejar',reportedNpmUpdatedAt:'2023-11-20T23:36:24Z'},
 {name:'@types/cookiejar',version:'2.1.5',sourceRoot:'types/cookiejar',commit:laterCookiejarCommit,reportedNpmUpdatedAt:'2023-11-20T23:36:24Z'}
]);
async function probeHistorical(triage,{verifier=verify,token=''}={}){
 if(triage?.schema!=='therabridge-com02-definitelytyped-26-pinned-triage-v1'||
  triage?.counts?.definitelyTypedVersions!==DT||triage.commercialApproval!==false||
  !Array.isArray(triage.records)||triage.records.length!==DT)
   throw Error('UNSAFE_DEFINITELYTYPED_TRIAGE');
 const observations=[];
 for(const candidate of candidates){
  let row;
  try{
   const selectedCommit=candidate.commit||sourceCommit;
   const r=await verifier(triage,{...candidate,commit:selectedCommit},{token});
   if(r.name!==candidate.name||r.version!==candidate.version||
      r.sourceCommit!==selectedCommit||r.sourceRoot!==candidate.sourceRoot||
      r.publisherToSourceAttested!==false||r.commercialApproval!==false||
      r.independentlyVerifiedHistoricPublishCommit!==false||
      r.independentlyVerifiedNpmBuiltFromThisCommit!==false||
      !['IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION','IMMUTABLE_SOURCE_BYTES_NOT_MATCHED'].includes(r.status)||
      (r.immutableSourceByteMatch===true)!==(r.status==='IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION'))
     throw Error('UNSAFE_SOURCE_VERIFICATION_RESPONSE');
   row={name:r.name,version:r.version,sourceCommit:r.sourceCommit,
    sourceRoot:r.sourceRoot,reportedNpmUpdatedAt:candidate.reportedNpmUpdatedAt,
    immutableSourceByteMatch:r.immutableSourceByteMatch,
    sourceContentHash:r.sourceContentHash,
    publisherContentHashCandidate:r.publisherContentHashCandidate,
    sourceVersionCompatible:r.sourceVersionCompatible,
    hashedFileCount:r.files?.length??0,
    status:r.status,publicationLineageIndependentlyVerified:false,commercialApproval:false};
  }catch(e){
   row={name:candidate.name,version:candidate.version,sourceCommit:candidate.commit||sourceCommit,
    sourceRoot:candidate.sourceRoot,reportedNpmUpdatedAt:candidate.reportedNpmUpdatedAt,
    immutableSourceByteMatch:false,status:'HISTORICAL_SNAPSHOT_PROBE_UNAVAILABLE',
    reason:String(e?.message||'UNKNOWN').slice(0,120),
    publicationLineageIndependentlyVerified:false,commercialApproval:false};
  }
  observations.push(row);
 }
 return {schema:'therabridge-com02-dt-prepublication-source-probes-v1',
  sourceRepository:'DefinitelyTyped/DefinitelyTyped',
  candidateSourceCommits:[sourceCommit,laterCookiejarCommit],
  sourceCommitTimeExternallyAuthenticatedInThisReceipt:false,
  reportedPublishDatesArePublisherMetadataNotSignedProof:true,
  immutableSourceMatchCount:observations.filter(x=>x.immutableSourceByteMatch).length,
  candidateCount:3,definitelyTypedVersions:DT,
  otherNpmExceptionVersionsUnresolved:27,sourceAssetsRequiringRightsReview:91,
  historicalPublisherBuildAttestations:0,legalApprovals:0,
  actualSaasReleaseImageVerified:false,actualEnterpriseReleaseImageVerified:false,
  observations,commercialApproval:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==4)throw Error('USAGE: probe-dt-prepublication-snapshots.mjs triage.json new-output.json');
  const report=await probeHistorical(JSON.parse(readFileSync(process.argv[2],'utf8')),{token:process.env.GITHUB_TOKEN||''});
  writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({candidateCount:3,immutableMatches:report.immutableSourceMatchCount,
   publisherBuildAttestations:0,commercialApproval:false}));
 }catch(e){console.error('DT_PREPUBLICATION_PROBE_FAILED',e.message);process.exitCode=1;}
}
export {probeHistorical,sourceCommit,laterCookiejarCommit,candidates};
