import test from 'node:test';
import assert from 'node:assert/strict';
import {qualify,GROUPS} from './build-wu-lic-01-qualification.mjs';
import {makeQueue} from './build-wu-lic-02-edition-rights-queue.mjs';
import {buildNonDtWorkqueue} from './build-com02-nondt-workqueue.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const root=(name,version,sha)=>({name,version,group:'SOURCE_ROOT_MANIFEST_ONLY',
 publisherTarballSha256:sha,independentPublisherToSourceBuildAttestation:false,
 actualSaasDistributionVerified:false,actualEnterpriseDistributionVerified:false,
 legalDecision:'UNRESOLVED',commercialApproval:false,saasNetworkRights:'PENDING_COUNSEL_REVIEW',
 enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
function fixtures(){
 const a='a'.repeat(64),names=Object.entries(GROUPS).flatMap(([g,n])=>
  Array.from({length:n},(_,i)=>({...root((g==='DEFINITELYTYPED_HISTORICAL_RELEASE'?'@types/':'sample-')+g+'-'+i,'1.0.0',a),group:g})));
 names.find(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY'&&x.name.includes('-0')).name='unicode-emoji-modifier-base';
 names.find(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY'&&x.name.includes('-1')).name='@tokenizer/token';
 const e=names.find(x=>x.name==='unicode-emoji-modifier-base');
 const t=names.find(x=>x.name==='@tokenizer/token');
 t.version='0.3.0';
 e.publisherTarballSha256='b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5';
 t.publisherTarballSha256='911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209';
 names.forEach(p=>{p.sourceCommitCandidate=p.group==='SOURCE_ROOT_MANIFEST_ONLY'?'f'.repeat(40):null;});
 e.sourceCommitCandidate='16333bdecc0e399f18bedd00b36995f3399ac5ec';
 t.sourceCommitCandidate='e068a455370090f44c757946b8571bb3fb1f117e';
 const ledger={schema:'therabridge-com02-exhaustive-closure-evidence-v1',
 status:'NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE',
 counts:{npmExceptionVersions:44,definitelyTypedVersions:21,otherNpmVersions:23,nonPackageAssets:91,...GROUPS,
 productionSaasImagesIndependentlyAuthenticated:0,enterpriseDeliverablesIndependentlyAuthenticated:0,
 packagePublicationLineagesIndependentlyAuthenticated:0,legallyApprovedComponents:0},
 sourceEvidenceSha256:{rights:a,correspondence:a,bulk:a,definitelyTyped:a,candidateRelease:a},
 packages:names,assets:Array.from({length:91},(_,i)=>({path:'assets/'+i,sha256:a,legalDecision:'UNRESOLVED',
 commercialApproval:false,independentlyVerifiedDistribution:false})),
 editions:['SAAS','ENTERPRISE'].map(edition=>({edition,commercialLicenseGranted:false,signedRegistryPublicationIndependentlyVerified:false})),
 commercialLicenseGranted:false,finalThirdPartyNoticesIssued:false,approvedCopyrightOwner:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
 const emoji={schema:'therabridge-com02-405-exact-source-npm-root-comparison-v1',
 name:'unicode-emoji-modifier-base',version:'1.0.0',status:'EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION',
 sourceManifestSha256:'242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301',
 publishedManifestSha256:'242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301',
 registryArchiveSha256:e.publisherTarballSha256,sourceCommit:e.sourceCommitCandidate,sourceGitObjectVerified:true,archiveIntegrityVerified:true,
 publisherBuildLineageIndependentlyAttested:false,commercialApproval:false};
 const tokenizer={schema:'therabridge-com02-tokenizer-402-manifest-diff-v1',
 name:'@tokenizer/token',version:'0.3.0',status:'RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL',
 sourceManifestSha256:'17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69',
 publishedManifestSha256:'a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9',
 sourceCommit:t.sourceCommitCandidate,
 originalArchiveSha256:t.publisherTarballSha256,exactArchiveIntegrityVerified:true,
 immutableGitSourceVerified:true,publisherToSourceBuildIndependentlyAttested:false,commercialApproval:false};
 const comparison={schema:'therabridge-com02-nondt-published-manifest-byte-comparison-v1',
 status:'CANDIDATE_SOURCE_MANIFEST_COMPARISON_NOT_PUBLISHER_ATTESTATION',commercialApproval:false,
 g2ClinicalApproved:false,g2bClinicalApproved:false,
 counts:{sourceRootCandidates:10,sourceRootsWithFrozenObservations:9,allNonDT:23,
 publisherToSourceAttested:0,legallyApproved:0,manifestByteMatches:8,manifestByteDifferences:1,
 missingSourceObservations:1,unavailable:1},
 records:names.filter(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY').map(x=>({name:x.name,version:x.version,
 lockedArchiveSha256:x.publisherTarballSha256,
 status:x.name==='@tokenizer/token'?'PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE':
 x.name==='unicode-emoji-modifier-base'?'SOURCE_OBSERVATION_PENDING_CURRENT_LOCKED_PACKAGE':
 'PUBLISHED_MANIFEST_BYTES_MATCH_IMMUTABLE_SOURCE_UNATTESTED',
 sourceManifestSha256:x.name==='@tokenizer/token'?tokenizer.sourceManifestSha256:null,
 publishedManifestSha256:x.name==='@tokenizer/token'?tokenizer.publishedManifestSha256:null,
 archiveIntegrityVerified:x.name==='@tokenizer/token',
 publicationToSourceIndependentlyAttested:false,legalApproval:false,commercialApproval:false}))};
 const queueSha=hash(buildNonDtWorkqueue(ledger)),lockSha='c'.repeat(64);
 emoji.queueSha256=queueSha;emoji.lockSha256=lockSha;
 tokenizer.sourceEvidenceQueueSha256=queueSha;tokenizer.lockedDependencySha256=lockSha;
 comparison.inputSha256={queue:queueSha,lock:lockSha};
 return [ledger,emoji,tokenizer,comparison];
}
function editionFixtures(){
 const [ledger,root,token,comparison]=fixtures();
 const release={schema:'therabridge-com02-release-file-evidence-v1',commercialApproval:false,images:[]};
 ledger.sourceEvidenceSha256.candidateRelease=hash(release);
 ledger.editions.forEach(x=>{x.candidateOCIImageDigest=null;
  x.authenticatedProductionDeploymentOrCustomerDelivery=false;});
 ledger.assets.forEach((x,i)=>{
  x.category=i<73?'IMAGE_OR_ICON':i<88?'BRAND':'CONTAINER_BUILD';
  x.localCandidateComparison={SAAS:'NO_PINNED_RELEASE_IMAGE_PROVIDED',ENTERPRISE:'NO_PINNED_RELEASE_IMAGE_PROVIDED'};
 });
 // The edition fixture modifies ledger evidence and must re-bind every exact
 // source receipt to the NEW same-run ledger hash before creating the WU-01 receipt.
 const queueSha=hash(buildNonDtWorkqueue(ledger));
 root.queueSha256=queueSha;
 token.sourceEvidenceQueueSha256=queueSha;
 comparison.inputSha256.queue=queueSha;
 return [ledger,root,token,comparison,qualify(ledger,root,token,comparison),release];
}
test('complete 44-package and 91-asset dual-edition unresolved evidence queue',()=>{
 const result=makeQueue(...editionFixtures());
 assert.equal(result.counts.npmExceptions,44);
 assert.equal(result.counts.trackedAssets,91);
 assert.equal(result.counts.authenticPublisherBuildLineages,0);
 assert.equal(result.packages.length,44);
 assert.equal(result.assets.length,91);
 assert.deepEqual(result.editions.map(x=>x.edition),['SAAS','ENTERPRISE']);
 assert.ok(result.assets.every(x=>Object.values(x.editions).every(e=>e.decision==='BLOCKED')));
 assert.equal(result.saasReleaseApproved,false);
 assert.equal(result.enterpriseReleaseApproved,false);
});
for(const [name,change] of [
 ['reject absent same-run WU-01 receipt',x=>x[4].status='FORGED'],
 ['reject moved source ledger',x=>x[0].sourceEvidenceSha256.candidateRelease='a'.repeat(64)],
 ['reject unknown asset rightsholder approval',x=>x[0].assets[0].legalDecision='APPROVED'],
 ['reject forged candidate scope comparison',x=>x[0].assets[0].localCandidateComparison.SAAS='BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST'],
 ['reject duplicated asset path',x=>x[0].assets[1].path=x[0].assets[0].path],
 ['reject changed artifact bytes',x=>x[2].publishedManifestSha256='f'.repeat(64)],
 ['reject missing package',x=>x[0].packages.pop()],
 ['reject invented signed image without ledger binding',x=>x[5].images.push({edition:'SAAS',ociDigest:'sha256:'+'a'.repeat(64),imageRef:'test:one',filesystemCaptureStatus:'UNATTESTED_CANDIDATE',releaseApproval:false,files:[]})],
 ['reject partial clinical GO',x=>x[0].g2ClinicalApproved=true]
]){
 test(name,()=>{
  const input=editionFixtures();change(input);
  assert.throws(()=>makeQueue(...input),/WU_LIC_0[12]_|COM02_NON_DT_/);
 });
}
