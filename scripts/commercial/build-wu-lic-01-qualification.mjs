#!/usr/bin/env node
// WU-LIC-01: reconcile the exact 44-version, 91-asset blocked ledger with two
// independently re-fetched npm/source byte receipts. NEVER authorizes commercial use.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
const SHA=/^[a-f0-9]{64}$/;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const GROUPS=Object.freeze({
 DEFINITELYTYPED_HISTORICAL_RELEASE:21,
 SOURCE_ROOT_MANIFEST_ONLY:10,
 MISSING_IMMUTABLE_SOURCE_REVISION:7,
 MONOREPO_SOURCE_SUBPATH_NOT_ATTESTED:3,
 LEGACY_REPO_ORIGIN_UNTRUSTED:3
});
const fail=s=>{throw Error('WU_LIC_01_'+s)};
function qualify(ledger,emoji,tokenizer){
 if(ledger?.schema!=='therabridge-com02-exhaustive-closure-evidence-v1'||
    ledger.status!=='NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE'||
    ledger.counts?.npmExceptionVersions!==44||
    ledger.counts?.definitelyTypedVersions!==21||
    ledger.counts?.otherNpmVersions!==23||
    ledger.counts?.nonPackageAssets!==91||
    ledger.packages?.length!==44||ledger.assets?.length!==91||
    ledger.editions?.length!==2)fail('POPULATION_OR_SCHEMA_DRIFT');
 for(const [group,count] of Object.entries(GROUPS))
  if(ledger.counts[group]!==count)fail('GROUP_COUNT_DRIFT_'+group);
 const packageIds=new Set(),groupCounts=Object.fromEntries(Object.keys(GROUPS).map(k=>[k,0]));
 for(const r of ledger.packages){
  const id=JSON.stringify([r?.name,r?.version]);
  if(!r?.name||!r?.version||packageIds.has(id)||!Object.hasOwn(groupCounts,r.group)||
     !SHA.test(r.publisherTarballSha256||'')||
     r.independentPublisherToSourceBuildAttestation!==false||
     r.actualSaasDistributionVerified!==false||
     r.actualEnterpriseDistributionVerified!==false||
     r.legalDecision!=='UNRESOLVED'||r.commercialApproval!==false||
     r.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     r.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
    fail('UNTRUSTED_PACKAGE_ROW');
  packageIds.add(id);groupCounts[r.group]++;
 }
 for(const [group,count] of Object.entries(GROUPS))
  if(groupCounts[group]!==count)fail('GROUP_MEMBERSHIP_DRIFT_'+group);
 const assets=new Set();
 for(const a of ledger.assets){
  if(!a?.path||assets.has(a.path)||!SHA.test(a.sha256||'')||
     a.legalDecision!=='UNRESOLVED'||a.commercialApproval!==false||
     a.independentlyVerifiedDistribution!==false)fail('UNTRUSTED_ASSET_ROW');
  assets.add(a.path);
 }
 if(emoji?.schema!=='therabridge-com02-405-exact-source-npm-root-comparison-v1'||
    emoji.name!=='unicode-emoji-modifier-base'||emoji.version!=='1.0.0'||
    emoji.status!=='EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION'||
    emoji.sourceManifestSha256!=='242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301'||
    emoji.publishedManifestSha256!==emoji.sourceManifestSha256||
    emoji.registryArchiveSha256!=='b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5'||
    emoji.sourceGitObjectVerified!==true||emoji.archiveIntegrityVerified!==true||
    emoji.publisherBuildLineageIndependentlyAttested!==false||
    emoji.commercialApproval!==false)fail('UNTRUSTED_405_RECEIPT');
 if(tokenizer?.schema!=='therabridge-com02-tokenizer-402-manifest-diff-v1'||
    tokenizer.name!=='@tokenizer/token'||tokenizer.version!=='0.3.0'||
    !['RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL','SEMANTIC_MANIFEST_FIELD_DIFFERENCES'].includes(tokenizer.status)||
    tokenizer.sourceManifestSha256!=='17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69'||
    tokenizer.publishedManifestSha256!=='a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9'||
    tokenizer.originalArchiveSha256!=='911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209'||
    tokenizer.exactArchiveIntegrityVerified!==true||tokenizer.immutableGitSourceVerified!==true||
    tokenizer.publisherToSourceBuildIndependentlyAttested!==false||
    tokenizer.commercialApproval!==false)fail('UNTRUSTED_402_RECEIPT');
 for(const [name,version,sha] of [
  ['unicode-emoji-modifier-base','1.0.0',emoji.registryArchiveSha256],
  ['@tokenizer/token','0.3.0',tokenizer.originalArchiveSha256]]){
  const row=ledger.packages.filter(x=>x.name===name&&x.version===version);
  if(row.length!==1||row[0].group!=='SOURCE_ROOT_MANIFEST_ONLY'||
     row[0].publisherTarballSha256!==sha)fail('RECEIPT_NOT_IN_EXACT_LOCK');
 }
 if(ledger.editions.some(x=>!['SAAS','ENTERPRISE'].includes(x.edition)||
     x.commercialLicenseGranted!==false||x.signedRegistryPublicationIndependentlyVerified!==false)||
    new Set(ledger.editions.map(x=>x.edition)).size!==2||
    ledger.commercialLicenseGranted!==false||
    ledger.finalThirdPartyNoticesIssued!==false||
    ledger.approvedCopyrightOwner!==false||
    ledger.g2ClinicalApproved!==false||ledger.g2bClinicalApproved!==false)
    fail('FORGED_APPROVAL');
 return {
  schema:'therabridge-wu-lic-01-technical-provenance-reconciliation-v1',
  status:'TECHNICAL_TRIAGE_COMPLETE_EXTERNAL_ATTESTATION_AND_RIGHTS_OPEN',
  evidenceSha256:{closureLedger:digest(ledger),emoji405:digest(emoji),tokenizer402:digest(tokenizer)},
  counts:{npmExceptions:44,definitelyTyped:21,nonDefinitelyTyped:23,
   ...groupCounts,sourceRootManifestsExact:9,sourceRootManifestByteDifferences:1,
   independentlyAttestedPublisherBuildLineages:0,assetRightsPending:91,
   verifiedCommercialReleaseImages:0},
  remaining:{npmPublisherBuildLineages:'UNVERIFIED_FOR_ALL_44',
   sourceLicenseAndNotices:'REQUIRE_EXACT_VERSION_COUNSEL_DISPOSITION',
   assetRights:'91_PENDING',saasRelease:'BLOCKED',enterpriseRelease:'BLOCKED'},
  commercialApproval:false,saasReleaseApproved:false,
  enterpriseReleaseApproved:false,g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const paths=process.argv.slice(2);
  if(paths.length!==4||new Set(paths).size!==4)fail('USAGE');
  const values=paths.slice(0,3).map(p=>{
   if(statSync(p).size>32*1024*1024)fail('INPUT_LIMIT');
   return JSON.parse(readFileSync(p,'utf8'));
  });
  const result=qualify(...values);
  writeFileSync(paths[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('WU_LIC_01_BLOCKED',e.message);process.exitCode=1;}
}
export {qualify,GROUPS};
