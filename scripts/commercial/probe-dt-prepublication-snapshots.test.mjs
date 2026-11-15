import test from 'node:test';
import assert from 'node:assert/strict';
import {probeHistorical,sourceCommit,laterCookiejarCommit,candidates} from './probe-dt-prepublication-snapshots.mjs';
const triage={schema:'therabridge-com02-definitelytyped-26-pinned-triage-v1',
 counts:{definitelyTypedVersions:26},commercialApproval:false,
 records:Array.from({length:26},(_,i)=>({name:'@types/test'+i,version:'1.0.0'}))};
const mock=async(t,c)=>({name:c.name,version:c.version,sourceCommit:c.commit,sourceRoot:c.sourceRoot,
 immutableSourceByteMatch:true,sourceVersionCompatible:true,sourceContentHash:'f'.repeat(64),
 publisherContentHashCandidate:'f'.repeat(64),files:[{path:'index.d.ts'}],
 status:'IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION',
 publisherToSourceAttested:false,commercialApproval:false,
 independentlyVerifiedHistoricPublishCommit:false,
 independentlyVerifiedNpmBuiltFromThisCommit:false});
test('three 2023 candidate snapshots never grant historical publisher lineage, licensing or clinical approval',async()=>{
 const r=await probeHistorical(triage,{verifier:mock});
 assert.equal(r.immutableSourceMatchCount,3);
 assert.equal(r.historicalPublisherBuildAttestations,0);
 assert.equal(r.legalApprovals,0);
 assert.equal(r.sourceCommitTimeExternallyAuthenticatedInThisReceipt,false);
 assert.equal(r.actualEnterpriseReleaseImageVerified,false);
 assert.equal(r.commercialApproval,false);
 assert.equal(r.g2ClinicalApproved,false);
 assert.equal(r.g2bClinicalApproved,false);
 assert.deepEqual(r.observations.map(x=>x.reportedNpmUpdatedAt),candidates.map(x=>x.reportedNpmUpdatedAt));
 assert.ok(r.observations.every(x=>!x.publicationLineageIndependentlyVerified));
 assert.deepEqual(r.observations.map(x=>x.sourceCommit),[sourceCommit,sourceCommit,laterCookiejarCommit]);
});
test('forged verified publishing state is rejected as unavailable, not promoted to proof',async()=>{
 const r=await probeHistorical(triage,{verifier:async(t,c)=>({...await mock(t,c),publisherToSourceAttested:true})});
 assert.equal(r.immutableSourceMatchCount,0);
 assert.ok(r.observations.every(x=>x.status==='HISTORICAL_SNAPSHOT_PROBE_UNAVAILABLE'));
});
test('source and exact version swapping is rejected without substituting another version',async()=>{
 const r=await probeHistorical(triage,{verifier:async(t,c)=>({...await mock(t,c),name:'@types/wrong'})});
 assert.equal(r.immutableSourceMatchCount,0);
 assert.ok(r.observations.every(x=>x.name!=='@types/wrong'));
});
test('Git upstream failure remains unresolved and the right queue is preserved',async()=>{
 const r=await probeHistorical(triage,{verifier:async()=>{throw Error('UPSTREAM_RATE_LIMIT');}});
 assert.equal(r.immutableSourceMatchCount,0);
 assert.equal(r.definitelyTypedVersions,26);
 assert.equal(r.otherNpmExceptionVersionsUnresolved,27);
 assert.equal(r.sourceAssetsRequiringRightsReview,91);
 assert.ok(r.observations.every(x=>x.status==='HISTORICAL_SNAPSHOT_PROBE_UNAVAILABLE'));
});
test('invalid source triage fails closed without attempting network probes',async()=>{
 let calls=0;
 const f=async()=>{calls++;return {};};
 for(const changed of [{...triage,commercialApproval:true},{...triage,records:triage.records.slice(1)},
  {...triage,counts:{definitelyTypedVersions:25}}]){
  await assert.rejects(probeHistorical(changed,{verifier:f}),/UNSAFE_DEFINITELYTYPED_TRIAGE/);
 }
 assert.equal(calls,0);
});
test('mismatched hash/status cannot be counted as a successful proof',async()=>{
 const r=await probeHistorical(triage,{verifier:async(t,c)=>({...await mock(t,c),
  immutableSourceByteMatch:false})});
 assert.equal(r.immutableSourceMatchCount,0);
 assert.ok(r.observations.every(x=>x.status==='HISTORICAL_SNAPSHOT_PROBE_UNAVAILABLE'));
});
