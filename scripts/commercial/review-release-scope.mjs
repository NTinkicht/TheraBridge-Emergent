#!/usr/bin/env node
// COM-02 exact release file comparisons. Image listing is not signed
// image provenance and matching a hash is not a copyright license.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const PIN=/^sha256:[a-f0-9]{64}$/;
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<=512&&
 !p.includes('\\')&&!p.includes('\0')&&!p.startsWith('/')&&
 p.split('/').every(s=>s.length>0&&s!=='.'&&s!=='..')&&
 !/[\u0000-\u001f]/.test(p);
function reviewReleaseScope(bulk,manifest){
 if(bulk?.schema!=='therabridge-com02-bulk-rights-review-v1'||
  bulk.counts?.legallyApproved!==0||!Array.isArray(bulk.packages)||
  !Array.isArray(bulk.nonPackageAssets)||
  bulk.counts.packages!==bulk.packages.length||
  bulk.counts.nonPackageAssets!==bulk.nonPackageAssets.length||
  bulk.counts.packagesStillRequiringIndependentAttestation!==bulk.packages.length||
  bulk.finalNoticesIssued!==false||bulk.commercialLicenseGranted!==false||
  manifest?.schema!=='therabridge-com02-release-file-evidence-v1'||
  manifest.commercialApproval!==false||!Array.isArray(manifest.images)||
  manifest.images.length>8)throw Error('INVALID_RIGHTS_OR_RELEASE_SCOPE');
 const assets=new Set();
 for(const a of bulk.nonPackageAssets){
  if(!validPath(a.path)||!HEX.test(a.sha256??'')||assets.has(a.path)||
   a.commercialApproval!==false||a.decision!=='UNRESOLVED'||
   a.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
   a.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')throw Error('UNSAFE_SOURCE_ASSET');
  assets.add(a.path);
 }
 const packages=new Set();
 for(const p of bulk.packages){
  const key=JSON.stringify([p.name,p.version]);
  if(packages.has(key)||p.commercialApproval!==false||
    p.decision!=='UNRESOLVED'||p.verifiedPublisherToSourceArtifact!==false||
    p.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED')
   throw Error('UNSAFE_PACKAGE_ATTESTATION');
  packages.add(key);
 }
 const names=new Set();
 const images=manifest.images.map(im=>{
  if(!['SAAS','ENTERPRISE'].includes(im.edition)||!PIN.test(im.ociDigest??'')||
    typeof im.imageRef!=='string'||im.imageRef.length>200||!/^[a-zA-Z0-9][a-zA-Z0-9._/:-]*$/.test(im.imageRef)||
    names.has(im.edition)||!Array.isArray(im.files)||im.files.length>100000||
    im.filesystemCaptureStatus!=='UNATTESTED_CANDIDATE'||
    im.releaseApproval!==false)throw Error('INVALID_IMAGE_SCOPE');
  names.add(im.edition);
  const paths=new Set(),hashes=new Set();
  const files=im.files.map(f=>{
   if(!validPath(f.path)||!HEX.test(f.sha256??'')||paths.has(f.path)||
    !Number.isSafeInteger(f.bytes)||f.bytes<0)throw Error('INVALID_RELEASE_FILE');
   paths.add(f.path);hashes.add(f.sha256);
   return {path:f.path,sha256:f.sha256,bytes:f.bytes};
  });
  return {edition:im.edition,imageRef:im.imageRef,ociDigest:im.ociDigest,
   filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
   fileInventorySha256:sha(JSON.stringify(files.sort((a,b)=>a.path.localeCompare(b.path,'en')))),
   paths,hashes,filesCount:files.length};
 });
 const assetsOut=bulk.nonPackageAssets.map(asset=>{
  const comparison={};
  for(const name of ['SAAS','ENTERPRISE']){
   const im=images.find(x=>x.edition===name);
   comparison[name]=!im?'NO_PINNED_RELEASE_IMAGE_PROVIDED':
    im.hashes.has(asset.sha256)?'BYTE_HASH_PRESENT_IN_UNATTESTED_IMAGE_FILE_LIST':
    'BYTE_HASH_ABSENT_FROM_UNATTESTED_IMAGE_FILE_LIST';
  }
  return {path:asset.path,sha256:asset.sha256,category:asset.category,
   releaseImageComparisons:comparison,
   releasePresence:'NOT_INDEPENDENTLY_ATTESTED',
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   rightsHolder:'NOT_VERIFIED',decision:'UNRESOLVED',commercialApproval:false};
 }).sort((a,b)=>a.path.localeCompare(b.path,'en'));
 const packageOut=bulk.packages.map(p=>({
  name:p.name,version:p.version,provenanceCategory:p.provenanceCategory,
  releasePresence:'NOT_INDEPENDENTLY_ATTESTED',
  publicationToSourceAttestation:'NOT_INDEPENDENTLY_VERIFIED',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  decision:'UNRESOLVED',commercialApproval:false
 })).sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 const counts={packages:packageOut.length,nonPackageAssets:assetsOut.length,
  pinnedImageCandidates:images.length,
  independentlyAttestedReleaseImages:0,
  independentlyAttestedPackagePublicationLineages:0,
  legallyApproved:0};
 return {schema:'therabridge-com02-release-scope-review-v1',
  status:'FILE_HASH_COMPARISON_NOT_INDEPENDENT_RELEASE_ATTESTATION_OR_LEGAL_APPROVAL',
  bulkEvidenceSha256:sha(JSON.stringify(bulk)),releaseManifestSha256:sha(JSON.stringify(manifest)),
  counts,
  imageCandidates:images.map(({edition,imageRef,ociDigest,fileInventorySha256,filesCount,filesystemCaptureStatus})=>({
   edition,imageRef,ociDigest,fileInventorySha256,filesCount,filesystemCaptureStatus,
   independentSignatureVerified:false,commercialApproval:false
  })),
  assets:assetsOut,packages:packageOut,
  finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [bulkPath,releasePath,output]=process.argv.slice(2);
 if(process.argv.length!==5||new Set([bulkPath,releasePath,output]).size!==3){
  console.error('Usage: review-release-scope.mjs bulk.json release-files.json output.json');process.exit(2);
 }
 try{
  const result=reviewReleaseScope(JSON.parse(readFileSync(bulkPath)),JSON.parse(readFileSync(releasePath)));
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {reviewReleaseScope,validPath};
