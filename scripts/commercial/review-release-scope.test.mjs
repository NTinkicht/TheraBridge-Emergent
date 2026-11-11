import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewReleaseScope,validPath} from './review-release-scope.mjs';
function fixtures(){
 const rights={saasNetworkRights:'PENDING_COUNSEL_REVIEW',enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
  commercialApproval:false,decision:'UNRESOLVED'};
 const bulk={schema:'therabridge-com02-bulk-rights-review-v1',
  counts:{packages:2,nonPackageAssets:2,packagesStillRequiringIndependentAttestation:2,legallyApproved:0},
  packages:[{...rights,name:'a',version:'1.0.0',provenanceCategory:'NO_PINNED_UPSTREAM_REVISION',
   verifiedPublisherToSourceArtifact:false,sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED'},
   {...rights,name:'b',version:'2.1.0',provenanceCategory:'MONOREPO_SUBPACKAGE_PATH_UNRESOLVED',
    verifiedPublisherToSourceArtifact:false,sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED'}],
  nonPackageAssets:[{...rights,path:'assets/icon.svg',sha256:'a'.repeat(64),category:'IMAGE_OR_ICON'},
   {...rights,path:'apps/api/Dockerfile',sha256:'b'.repeat(64),category:'CONTAINER_BUILD'}],
  finalNoticesIssued:false,commercialLicenseGranted:false};
 const manifest={schema:'therabridge-com02-release-file-evidence-v1',commercialApproval:false,images:[]};
 return {bulk,manifest};
}
test('without signed release inventories, all asset and package permissions stay unresolved',()=>{
 const {bulk,manifest}=fixtures();
 const out=reviewReleaseScope(bulk,manifest);
 assert.deepEqual(out.counts,{packages:2,nonPackageAssets:2,pinnedImageCandidates:0,
  independentlyAttestedReleaseImages:0,independentlyAttestedPackagePublicationLineages:0,legallyApproved:0});
 assert(out.assets.every(x=>x.releasePresence==='NOT_INDEPENDENTLY_ATTESTED'&&
  x.releaseImageComparisons.SAAS==='NO_PINNED_RELEASE_IMAGE_PROVIDED'&&
  x.releaseImageComparisons.ENTERPRISE==='NO_PINNED_RELEASE_IMAGE_PROVIDED'));
 assert(out.packages.every(x=>x.publicationToSourceAttestation==='NOT_INDEPENDENTLY_VERIFIED'));
 assert.equal(out.finalNoticesIssued,false);
 assert.equal(out.g2ClinicalApproved,false);
});
test('byte hashes can match candidate images without proving provenance or permission',()=>{
 const {bulk,manifest}=fixtures();
 manifest.images=[{
  edition:'ENTERPRISE',ociDigest:'sha256:'+'f'.repeat(64),imageRef:'registry.example/therabridge',
  filesystemCaptureStatus:'UNATTESTED_CANDIDATE',releaseApproval:false,
  files:[{path:'usr/share/icons/a.svg',sha256:'a'.repeat(64),bytes:20}]
 }];
 const out=reviewReleaseScope(bulk,manifest);
 assert.equal(out.counts.pinnedImageCandidates,1);
 assert.equal(out.assets.find(x=>x.path==='assets/icon.svg').releaseImageComparisons.ENTERPRISE,
  'BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST');
 assert.equal(out.assets.find(x=>x.path==='apps/api/Dockerfile').releaseImageComparisons.ENTERPRISE,
  'BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST');
 assert(out.assets.every(x=>x.releasePresence==='NOT_INDEPENDENTLY_ATTESTED'&&!x.commercialApproval));
 assert.equal(out.imageCandidates[0].independentSignatureVerified,false);
});
test('reject traversal, non-normalized paths, shell metacharacters and missing SHA',()=>{
 for(const p of ['','/abs','../x','a/../b','a//b','./a','a\\b','a\0b','x\nb'])
  assert.equal(validPath(p),false);
 assert.equal(validPath('usr/share/fonts/icon.ttf'),true);
 const mutations=[
  x=>x.manifest.images[0].ociDigest='latest',
  x=>x.manifest.images[0].edition='BOTH',
  x=>x.manifest.images[0].imageRef='hello;rm -rf',
  x=>x.manifest.images[0].filesystemCaptureStatus='ATTESTED',
  x=>x.manifest.images[0].releaseApproval=true,
  x=>x.manifest.images[0].files[0].path='../outside',
  x=>x.manifest.images[0].files[0].sha256='no',
  x=>x.manifest.images[0].files[0].bytes=-1,
  x=>x.manifest.images[0].files.push({...x.manifest.images[0].files[0]})
 ];
 for(const mutate of mutations){
  const f=fixtures();
  f.manifest.images=[{edition:'SAAS',ociDigest:'sha256:'+'f'.repeat(64),
   imageRef:'registry/therabridge',filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
   releaseApproval:false,files:[{path:'opt/app/a.svg',sha256:'a'.repeat(64),bytes:2}]}];
  mutate(f);
  assert.throws(()=>reviewReleaseScope(f.bulk,f.manifest));
 }
});
test('reject counterfeit legal grants and package/asset omissions',()=>{
 const edits=[
  x=>x.bulk.counts.nonPackageAssets=1,
  x=>x.bulk.nonPackageAssets[0].commercialApproval=true,
  x=>x.bulk.nonPackageAssets[0].enterpriseRedistributionRights='APPROVED',
  x=>x.bulk.nonPackageAssets.push({...x.bulk.nonPackageAssets[0]}),
  x=>x.bulk.packages[0].sourceVersionCorrespondence='VERIFIED',
  x=>x.bulk.packages[0].verifiedPublisherToSourceArtifact=true,
  x=>x.bulk.packages.pop(),
  x=>x.bulk.finalNoticesIssued=true,
  x=>x.manifest.commercialApproval=true
 ];
 for(const edit of edits){const f=fixtures();edit(f);assert.throws(()=>reviewReleaseScope(f.bulk,f.manifest));}
});
test('duplicate edition cannot rewrite matching output',()=>{
 const f=fixtures(),item={edition:'SAAS',ociDigest:'sha256:'+'f'.repeat(64),
  imageRef:'registry/therabridge',filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
  releaseApproval:false,files:[]};
 f.manifest.images=[item,{...item}];
 assert.throws(()=>reviewReleaseScope(f.bulk,f.manifest),/INVALID_IMAGE_SCOPE/);
});
