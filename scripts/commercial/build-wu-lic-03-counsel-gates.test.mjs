import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLaunchPackage,required} from './build-wu-lic-03-counsel-gates.mjs';
const H='a'.repeat(64);
const id=(name,version,group)=>({name,version,group,originalNpmArchiveSha256:H,
 immutableGitCommitCandidate:null,sourceEvidence:'NO_INDEPENDENT_NPM_PUBLISHER_BUILD_TO_SOURCE_ATTESTATION',
 exactPublisherBuildAttested:false,legalDecision:'UNRESOLVED',commercialApproval:false,
 editions:Object.fromEntries(['SAAS','ENTERPRISE'].map(e=>[e,{
 actualShippedScope:'UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE',
 publicationOrCustomerDeliveryAttested:false,exactVersionSbomMatched:false,
 licenseTextReviewedByCounsel:false,networkOrRedistributionRights:'PENDING_COUNSEL_REVIEW',decision:'BLOCKED'}]))});
function fixture(){
 const rights={schema:'therabridge-wu-lic-02-edition-rights-provenance-queue-v1',
 status:'EVIDENCE_QUEUE_PREPARED_EXTERNAL_ATTESTATIONS_AND_LEGAL_RIGHTS_REQUIRED',
 commercialApproval:false,saasReleaseApproved:false,enterpriseReleaseApproved:false,
 g2ClinicalApproved:false,g2bClinicalApproved:false,
 counts:{npmExceptions:44,definitelyTyped:21,nonDefinitelyTyped:23,trackedAssets:117,
 authenticPublisherBuildLineages:0,independentReleaseImages:0,legallyApproved:0},
 sources:{closureLedgerSha256:H,wuLic01Sha256:H,releaseManifestSha256:H,
 root405Sha256:H,tokenizer402Sha256:H,sameRunComparisonSha256:H},
 packages:Array.from({length:44},(_,i)=>id(i<21?'@types/fixture-'+i:'fixture-'+i,'1.0.0',i<21?'DEFINITELYTYPED_HISTORICAL_RELEASE':'MISSING_IMMUTABLE_SOURCE_REVISION')),
 assets:Array.from({length:117},(_,i)=>({path:'assets/'+i,sha256:H,category:i<98?'IMAGE_OR_ICON':i<113?'BRAND':'CONTAINER_BUILD',
 legalDecision:'UNRESOLVED',commercialApproval:false,
 editions:Object.fromEntries(['SAAS','ENTERPRISE'].map(e=>[e,{
 authenticatedShippedScope:'UNKNOWN_NO_INDEPENDENT_PUBLISHED_RELEASE_IMAGE',
 rightsHolder:'NOT_VERIFIED',permissionEvidence:'NOT_VERIFIED',
 applicableLicenseAndNotice:'NOT_APPROVED',
 networkOrRedistributionRights:'PENDING_COUNSEL_REVIEW',decision:'BLOCKED'}]))})),
 editions:['SAAS','ENTERPRISE'].map(edition=>({edition,candidateOCIImageDigest:null,
 independentlySignedRegistryPublication:false,
 authenticatedProductionDeploymentOrCustomerDelivery:false,independentlyVerifiedImageSBOM:false,
 editionDistributionInventoryStatus:'UNKNOWN',approval:'BLOCKED_REQUIRE_REAL_IMAGE_PROVENANCE_AND_COUNSEL'})),
 supplementalDistributionObligations:['OS_RUNTIME_CONTAINER','POSTGRES_REDIS','MODELS_DATASETS_EXTERNAL_SERVICES','FONTS_BRAND_MEDIA'].map(category=>
  ({category,requirement:'External signed evidence required',saas:{status:'UNRESOLVED'},
  enterprise:{status:'UNRESOLVED'},counselApproval:false}))
 };
 const decision=JSON.parse(readFileSync(new URL('../../docs/commercial/launch-decision-register.json',import.meta.url)));
 return [rights,decision];
}
test('unattested local candidate is preserved but never becomes an approved release',()=>{
 const x=fixture();
 x[0].editions[0].candidateOCIImageDigest='sha256:'+H;
 const r=buildLaunchPackage(...x);
 assert.equal(r.editions.SAAS.unattestedCandidateOCIImageDigest,'sha256:'+H);
 assert.equal(r.editions.SAAS.releaseDigest,null);
 assert.equal(r.editions.SAAS.status,'BLOCKED');
 assert.equal(r.commercialLicenseGranted,false);
});
test('all 44 packages and 117 assets remain separate SaaS/Enterprise BLOCKED decisions',()=>{
 const r=buildLaunchPackage(...fixture());
 assert.equal(r.counts.npmExceptions,44);assert.equal(r.counts.assets,117);
 assert.deepEqual(Object.keys(r.editions).sort(),['ENTERPRISE','SAAS']);
 assert.equal(r.editions.SAAS.status,'BLOCKED');
 assert.equal(r.editions.ENTERPRISE.status,'BLOCKED');
 assert.equal(r.finalNoticesIssued,false);
 assert.equal(r.clinical.g2,'NO_GO');
});
for(const [name,change] of [
 ['reject missing package',a=>a[0].packages.pop()],
 ['reject invented publisher lineage',a=>a[0].packages[0].exactPublisherBuildAttested=true],
 ['reject forged license grant',a=>a[1].commercialLicenseGranted=true],
 ['reject counterfeit lawyer evidence',a=>a[1].editions.SAAS.evidence.counselApproval='fake'],
 ['reject SaaS approval only',a=>a[1].editions.SAAS.status='APPROVED'],
 ['reject forged independently signed enterprise publication',a=>a[0].editions[1].independentlySignedRegistryPublication=true],
 ['reject shuffled mandatory approvals',a=>a[1].editions.SAAS.required.reverse()],
 ['reject false patient release',a=>a[1].clinical.realPatientProcessingAllowed=true],
 ['reject false third party notices',a=>a[1].finalThirdPartyNoticesIssued=true],
 ['reject duplicate asset',a=>a[0].assets[1].path=a[0].assets[0].path],
 ['reject forged asset permission',a=>a[0].assets[0].editions.ENTERPRISE.permissionEvidence='approved'],
 ['reject missing supplemental license obligation',a=>a[0].supplementalDistributionObligations.pop()],
 ['reject mislabeled DefinitelyTyped category',a=>a[0].packages[0].group='MISSING_IMMUTABLE_SOURCE_REVISION'],
 ['reject fake brand asset category',a=>a[0].assets[0].category='BRAND'],
 ['reject duplicate supplemental category',a=>a[0].supplementalDistributionObligations[0].category='POSTGRES_REDIS'],
 ['reject fake source receipt SHA',a=>a[0].sources.wuLic01Sha256='invalid'],
 ['reject wrong rights status',a=>a[0].status='APPROVED'],
 ['reject unapproved repo copyright claims',a=>a[1].scope='LICENSED'],
 ]){
 test(name,()=>{const a=fixture();change(a);assert.throws(()=>buildLaunchPackage(...a),/WU_LIC_03_/);});
}
