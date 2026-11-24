#!/usr/bin/env node
// WU-LIC-01: reconcile the exact 44-version, 117-asset blocked ledger with two
// independently re-fetched npm/source byte receipts. NEVER authorizes commercial use.
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {buildNonDtWorkqueue} from './build-com02-nondt-workqueue.mjs';
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
function qualify(ledger,emoji,tokenizer,comparison){
 if(ledger?.schema!=='therabridge-com02-exhaustive-closure-evidence-v1'||
    ledger.status!=='NOT_LEGALLY_OR_TECHNICALLY_CLEARED_FOR_COMMERCIAL_RELEASE'||
    ledger.counts?.npmExceptionVersions!==44||
    ledger.counts?.definitelyTypedVersions!==21||
    ledger.counts?.otherNpmVersions!==23||
    ledger.counts?.nonPackageAssets!==117||
    ledger.packages?.length!==44||ledger.assets?.length!==117||
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
 // Reconstruct the original same-run non-DT workqueue from the exact ledger.
 // All receipts must cite this byte-equivalent queue and a single locked dependency graph.
 const queue=buildNonDtWorkqueue(ledger);
 const queueSha=digest(queue);
 const lockSha=emoji?.lockSha256;
 if(!SHA.test(lockSha||'')||
    emoji.queueSha256!==queueSha||
    tokenizer.sourceEvidenceQueueSha256!==queueSha||
    tokenizer.lockedDependencySha256!==lockSha)
    fail('MIXED_SOURCE_QUEUE_OR_LOCK');
 for(const [receipt,packageName,version,commit] of [
  [emoji,'unicode-emoji-modifier-base','1.0.0','16333bdecc0e399f18bedd00b36995f3399ac5ec'],
  [tokenizer,'@tokenizer/token','0.3.0','e068a455370090f44c757946b8571bb3fb1f117e']]){
   const row=queue.records.filter(x=>x.name===packageName&&x.version===version);
   if(row.length!==1||row[0].sourceCommitCandidate!==commit||
      receipt.sourceCommit!==commit)
      fail('SOURCE_COMMIT_OR_VERSION_DRIFT');
 }
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
 // Bind every historical-root claim to the same-run exact archived comparison.
 // The 10th emoji observation is additive and independently revalidated above.
 if(comparison?.schema!=='therabridge-com02-nondt-published-manifest-byte-comparison-v1'||
    comparison.status!=='CANDIDATE_SOURCE_MANIFEST_COMPARISON_NOT_PUBLISHER_ATTESTATION'||
    comparison.commercialApproval!==false||comparison.g2ClinicalApproved!==false||
    comparison.g2bClinicalApproved!==false||
    comparison.counts?.sourceRootCandidates!==10||
    comparison.counts?.sourceRootsWithFrozenObservations!==9||
    comparison.counts?.allNonDT!==23||comparison.counts?.publisherToSourceAttested!==0||
    comparison.counts?.legallyApproved!==0||comparison.records?.length!==10||
    comparison.inputSha256?.queue!==queueSha||comparison.inputSha256?.lock!==lockSha)
    fail('UNTRUSTED_SAME_RUN_ROOT_COMPARISON');
 const comparisonIds=new Set(),statuses={};
 for(const r of comparison.records){
  const id=JSON.stringify([r?.name,r?.version]);
  if(comparisonIds.has(id)||!packageIds.has(id)||
     ledger.packages.filter(p=>p.name===r.name&&p.version===r.version&&p.group==='SOURCE_ROOT_MANIFEST_ONLY').length!==1||
     r.publicationToSourceIndependentlyAttested!==false||
     r.legalApproval!==false||r.commercialApproval!==false)fail('UNTRUSTED_SAME_RUN_ROOT_ROW');
  comparisonIds.add(id);
  statuses[r.status]=(statuses[r.status]||0)+1;
  const ledgerRow=ledger.packages.find(p=>p.name===r.name&&p.version===r.version);
  if(r.lockedArchiveSha256!==ledgerRow.publisherTarballSha256)fail('SAME_RUN_ARCHIVE_DRIFT');
 }
 const matched=statuses.PUBLISHED_MANIFEST_BYTES_MATCH_IMMUTABLE_SOURCE_UNATTESTED||0;
 const differed=statuses.PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE||0;
 const pending=statuses.SOURCE_OBSERVATION_PENDING_CURRENT_LOCKED_PACKAGE||0;
 const unavailable=comparison.records.filter(r=>r.status.startsWith('UNAVAILABLE')||r.status==='SOURCE_NOT_CORROBORATED_SAME_RUN'||r.status==='SOURCE_OBSERVATION_PENDING_CURRENT_LOCKED_PACKAGE').length;
 if(matched!==comparison.counts.manifestByteMatches||differed!==comparison.counts.manifestByteDifferences||
    pending!==comparison.counts.missingSourceObservations||unavailable!==comparison.counts.unavailable||
    matched!==8||differed!==1||pending!==1||unavailable!==1)
    fail('INCOMPLETE_OR_DRIFTED_SAME_RUN_ROOT_EVIDENCE');
 const tokenRow=comparison.records.find(r=>r.name==='@tokenizer/token'&&r.version==='0.3.0');
 const emojiRow=comparison.records.find(r=>r.name==='unicode-emoji-modifier-base'&&r.version==='1.0.0');
 if(tokenRow?.status!=='PUBLISHED_MANIFEST_BYTES_DIFFER_FROM_IMMUTABLE_SOURCE'||
    tokenRow.publishedManifestSha256!==tokenizer.publishedManifestSha256||
    tokenRow.sourceManifestSha256!==tokenizer.sourceManifestSha256||
    tokenRow.archiveIntegrityVerified!==true||
    emojiRow?.status!=='SOURCE_OBSERVATION_PENDING_CURRENT_LOCKED_PACKAGE'||
    emojiRow.lockedArchiveSha256!==emoji.registryArchiveSha256)
    fail('ROOT_COMPARISON_RECEIPT_CROSSCHECK_DRIFT');
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
  evidenceSha256:{closureLedger:digest(ledger),emoji405:digest(emoji),tokenizer402:digest(tokenizer),sameRunRootComparison:digest(comparison),reconstructedQueue:queueSha,lockedDependency:lockSha},
  counts:{npmExceptions:44,definitelyTyped:21,nonDefinitelyTyped:23,
   ...groupCounts,sourceRootManifestsExact:matched+1,sourceRootManifestByteDifferences:differed,
   independentlyAttestedPublisherBuildLineages:0,assetRightsPending:117,
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
  if(paths.length!==5||new Set(paths).size!==5)fail('USAGE');
  const values=paths.slice(0,4).map(p=>{
   if(statSync(p).size>32*1024*1024)fail('INPUT_LIMIT');
   return JSON.parse(readFileSync(p,'utf8'));
  });
  const result=qualify(...values);
  writeFileSync(paths[4],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('WU_LIC_01_BLOCKED',e.message);process.exitCode=1;}
}
export {qualify,GROUPS};
