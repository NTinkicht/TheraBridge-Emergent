import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNonDtWorkqueue} from './build-com02-nondt-workqueue.mjs';
const hex='a'.repeat(64);
const mk=(name,version,group,sha=null)=>({
 name,version,group,sourceCommitCandidate:sha,publisherTarballSha256:hex,
 independentPublisherToSourceBuildAttestation:false,actualSaasDistributionVerified:false,
 actualEnterpriseDistributionVerified:false,commercialApproval:false,
 legalDecision:'UNRESOLVED',saasNetworkRights:'PENDING_COUNSEL_REVIEW',
 enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'
});
const fixture=(nonDt=2)=>{
 const packages=[mk('@types/sample','1.2.3','DEFINITELYTYPED_HISTORICAL_RELEASE')];
 const other=[mk('sample-a','2.0.0','SOURCE_ROOT_MANIFEST_ONLY','b'.repeat(40)),
   mk('sample-b','3.0.0','MISSING_IMMUTABLE_SOURCE_REVISION')].slice(0,nonDt);
 packages.push(...other);
 const groups={SOURCE_ROOT_MANIFEST_ONLY:other.filter(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY').length,
 MISSING_IMMUTABLE_SOURCE_REVISION:other.filter(x=>x.group==='MISSING_IMMUTABLE_SOURCE_REVISION').length,
 MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED:0,LEGACY_REPO_ORIGIN_UNTRUSTED:0};
 return {schema:'therabridge-com02-exhaustive-closure-evidence-v1',
 status:'NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE',
 sourceEvidenceSha256:{rights:hex,correspondence:hex,bulk:hex,definitelyTyped:hex,candidateRelease:hex},
 counts:{npmExceptionVersions:packages.length,definitelyTypedVersions:1,otherNpmVersions:other.length,
 ...groups,productionSaasImagesIndependentlyAuthenticated:0,
 enterpriseDeliverablesIndependentlyAuthenticated:0,
 packagePublicationLineagesIndependentlyAuthenticated:0,legallyApprovedComponents:0},
 packages,commercialLicenseGranted:false,g2ClinicalApproved:false,g2bClinicalApproved:false,
 finalThirdPartyNoticesIssued:false};
};
test('reconciles source ledger and rejects every commercial approval implication',()=>{
 for(const n of [1,2]){
  const result=buildNonDtWorkqueue(fixture(n));
  assert.equal(result.counts.nonDefinitelyTyped,n);
  assert.equal(result.counts.definitelyTypedExcluded,1);
  assert(result.records.every(r=>!r.npmPublicationBuildAttested&&!r.commerciallyCleared));
  assert.equal(result.commercialApproval,false);
  assert.equal(result.saasReleaseApproved,false);
  assert.equal(result.enterpriseReleaseApproved,false);
  assert.match(result.sourceLedgerSha256,/^[0-9a-f]{64}$/);
 }
});
test('rejects forged rights, publication provenance and release approvals',()=>{
 for(const edit of [
  x=>x.commercialLicenseGranted=true,
  x=>x.g2ClinicalApproved=true,
  x=>x.counts.legallyApprovedComponents=1,
  x=>x.counts.productionSaasImagesIndependentlyAuthenticated=1,
  x=>x.packages[1].independentPublisherToSourceBuildAttestation=true,
  x=>x.packages[1].commercialApproval=true,
  x=>x.packages[1].saasNetworkRights='APPROVED',
  x=>x.packages[1].actualEnterpriseDistributionVerified=true
 ]){
  const x=fixture();edit(x);assert.throws(()=>buildNonDtWorkqueue(x),/COM02_NON_DT_/);
 }
});
test('rejects drift, duplicate version, missing digest and invented source group',()=>{
 for(const edit of [
  x=>x.counts.otherNpmVersions=27,
  x=>x.counts.SOURCE_ROOT_MANIFEST_ONLY=2,
  x=>x.packages.push({...x.packages[1]}),
  x=>{x.packages[2].name=x.packages[1].name;x.packages[2].version=x.packages[1].version;},
  x=>x.packages[1].publisherTarballSha256='invalid',
  x=>x.packages[1].sourceCommitCandidate=null,
  x=>x.packages[2].group='SIGNED_AND_APPROVED',
  x=>x.sourceEvidenceSha256.rights='',
  x=>x.packages[0].group='SOURCE_ROOT_MANIFEST_ONLY'
 ]){
  const x=fixture();edit(x);assert.throws(()=>buildNonDtWorkqueue(x),/COM02_NON_DT_/);
 }
});
