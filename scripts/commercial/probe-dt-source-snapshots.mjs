#!/usr/bin/env node
// Bounded public Git snapshot probes. Nothing here proves a historical npm build.
import {readFileSync,writeFileSync} from 'node:fs';
import {verify} from './verify-dt-immutable-source.mjs';
const pinnedSource='302dab5cd36dba67332a8fde616727f7936de115';
const candidates=[
 {name:'@types/methods',version:'1.1.4',sourceRoot:'types/methods'},
 {name:'@types/cookiejar',version:'2.1.5',sourceRoot:'types/cookiejar'}
];
async function probe(triage,options={}){
 if(triage?.counts?.definitelyTypedVersions!==26)throw Error('DEFINITELYTYPED_26_REQUIRED');
 const observations=[];
 for(const candidate of candidates){
  try{
   const r=await verify(triage,{...candidate,commit:pinnedSource},options);
   observations.push({name:r.name,version:r.version,sourceCommit:r.sourceCommit,
    sourceRoot:r.sourceRoot,sourceVersionCompatible:r.sourceVersionCompatible,
    immutableSourceByteMatch:r.immutableSourceByteMatch,sourceContentHash:r.sourceContentHash,
    publisherContentHashCandidate:r.publisherContentHashCandidate,
    hashedFileCount:r.files.length,
    status:r.status,publicationLineageIndependentlyVerified:false,commercialApproval:false});
  }catch(e){
   observations.push({name:candidate.name,version:candidate.version,sourceCommit:pinnedSource,
    sourceRoot:candidate.sourceRoot,immutableSourceByteMatch:false,
    status:'SOURCE_PROBE_NOT_ESTABLISHED',reason:String(e?.message||'UNKNOWN').slice(0,120),
    publicationLineageIndependentlyVerified:false,commercialApproval:false});
  }
 }
 return {
  schema:'therabridge-com02-dt-exact-snapshot-probes-v1',
  sourceRepository:'DefinitelyTyped/DefinitelyTyped',
  sourceRevision:pinnedSource,
  sourceCommitHistoricallyBoundToPublisher:false,
  sourceRootSnapshotMatches:observations.filter(x=>x.immutableSourceByteMatch===true).length,
  publicationToSourceAttestations:0,
  totalDefinitelyTypedVersionsRequiringHistoricalAuthority:26,
  otherNpmExceptionVersionsUnresolved:27,
  sourceAssetsRequiringRightsReview:91,
  actualSaasReleaseImageVerified:false,
  actualEnterpriseReleaseImageVerified:false,
  observations,commercialApproval:false,g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==4)throw Error('USAGE: probe-dt-source-snapshots.mjs triage.json new-output.json');
  const receipt=await probe(JSON.parse(readFileSync(process.argv[2],'utf8')),
   {token:process.env.GITHUB_TOKEN||''});
  writeFileSync(process.argv[3],JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({matches:receipt.sourceRootSnapshotMatches,
    historicalPublisherProvenance:0,commercialApproval:false}));
 }catch(e){console.error('DT_SNAPSHOT_RECEIPT_FAILED',e.message);process.exitCode=1;}
}
export {probe,candidates,pinnedSource};