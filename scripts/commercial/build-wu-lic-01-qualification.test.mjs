import test from 'node:test';
import assert from 'node:assert/strict';
import {qualify,GROUPS} from './build-wu-lic-01-qualification.mjs';
const root=(name,version,sha)=>({name,version,group:'SOURCE_ROOT_MANIFEST_ONLY',
 publisherTarballSha256:sha,independentPublisherToSourceBuildAttestation:false,
 actualSaasDistributionVerified:false,actualEnterpriseDistributionVerified:false,
 legalDecision:'UNRESOLVED',commercialApproval:false,saasNetworkRights:'PENDING_COUNSEL_REVIEW',
 enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'});
function fixtures(){
 const a='a'.repeat(64),names=Object.entries(GROUPS).flatMap(([g,n])=>
  Array.from({length:n},(_,i)=>({...root('sample-'+g+'-'+i,'1.0.0',a),group:g})));
 names.find(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY'&&x.name.includes('-0')).name='unicode-emoji-modifier-base';
 names.find(x=>x.group==='SOURCE_ROOT_MANIFEST_ONLY'&&x.name.includes('-1')).name='@tokenizer/token';
 const e=names.find(x=>x.name==='unicode-emoji-modifier-base');
 const t=names.find(x=>x.name==='@tokenizer/token');
 e.publisherTarballSha256='b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5';
 t.publisherTarballSha256='911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209';
 const ledger={schema:'therabridge-com02-exhaustive-closure-evidence-v1',
 status:'NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE',
 counts:{npmExceptionVersions:44,definitelyTypedVersions:21,otherNpmVersions:23,nonPackageAssets:91,...GROUPS},
 packages:names,assets:Array.from({length:91},(_,i)=>({path:'assets/'+i,sha256:a,legalDecision:'UNRESOLVED',
 commercialApproval:false,independentlyVerifiedDistribution:false})),
 editions:['SAAS','ENTERPRISE'].map(edition=>({edition,commercialLicenseGranted:false,signedRegistryPublicationIndependentlyVerified:false})),
 commercialLicenseGranted:false,finalThirdPartyNoticesIssued:false,approvedCopyrightOwner:false,g2ClinicalApproved:false,g2bClinicalApproved:false};
 const emoji={schema:'therabridge-com02-405-exact-source-npm-root-comparison-v1',
 name:'unicode-emoji-modifier-base',version:'1.0.0',status:'EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION',
 sourceManifestSha256:'242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301',
 publishedManifestSha256:'242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301',
 registryArchiveSha256:e.publisherTarballSha256,sourceGitObjectVerified:true,archiveIntegrityVerified:true,
 publisherBuildLineageIndependentlyAttested:false,commercialApproval:false};
 const tokenizer={schema:'therabridge-com02-tokenizer-402-manifest-diff-v1',
 name:'@tokenizer/token',version:'0.3.0',status:'RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL',
 sourceManifestSha256:'17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69',
 publishedManifestSha256:'a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9',
 originalArchiveSha256:t.publisherTarballSha256,exactArchiveIntegrityVerified:true,
 immutableGitSourceVerified:true,publisherToSourceBuildIndependentlyAttested:false,commercialApproval:false};
 return [ledger,emoji,tokenizer];
}
test('joins the exact current evidence without authorizing legal rights',()=>{
 const result=qualify(...fixtures());
 assert.equal(result.counts.npmExceptions,44);assert.equal(result.counts.assetRightsPending,91);
 assert.equal(result.commercialApproval,false);
});
for(const [description,mutate] of [
 ['rejects omitted package',x=>x[0].packages.pop()],
 ['rejects duplicate package',x=>x[0].packages[1]=x[0].packages[0]],
 ['rejects scope approval forgery',x=>x[0].editions[0].commercialLicenseGranted=true],
 ['rejects fake publisher proof',x=>x[2].publisherToSourceBuildIndependentlyAttested=true],
 ['rejects mismatched original registry archive',x=>x[2].originalArchiveSha256='f'.repeat(64)],
 ['rejects missing asset',x=>x[0].assets.pop()],
 ['rejects version population drift',x=>x[0].counts.npmExceptionVersions=53]
]){
 test(description,()=>{const inputs=fixtures();mutate(inputs);assert.throws(()=>qualify(...inputs),/WU_LIC_01_/);});
}
