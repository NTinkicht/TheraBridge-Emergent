#!/usr/bin/env node
// COM-02 independent immutable source-manifest corroboration of exact npm
// Sigstore publish/SLSA claims; NOT tarball reproducibility or rights clearance.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {select} from './verify-npm-provenance-observation.mjs';
import {bundleStatements} from './verify-npm-sigstore-bundles.mjs';
import {fetchRaw} from './verify-immutable-license-texts.mjs';
import {NEXTJS_TARGETS as TARGETS,NEXTJS_SOURCE_REF,OUT_OF_SCOPE_SIGNED,
 COM02_UNRESOLVED_VERSIONS,NEXTJS_SIGNED_COUNT,ALL_SIGNED_COUNT,REMAINING_WITHOUT_SIGSTORE} from './com02-nextjs-pins.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const key=x=>JSON.stringify([x.name,x.version]);
const OUT_OF_SCOPE=new Set(OUT_OF_SCOPE_SIGNED);
const REPO='https://github.com/vercel/next.js';
const REV=/^[a-f0-9]{40}$/;

function validate(candidates,verified,rawBytes){
 const selected=select(candidates);
 const ids=selected.map(x=>x.name+'@'+x.version);
 const nextjs=selected.filter(x=>TARGETS[x.name+'@'+x.version]);
 if(candidates.records.length!==COM02_UNRESOLVED_VERSIONS||selected.length!==ALL_SIGNED_COUNT||
    new Set(ids).size!==ALL_SIGNED_COUNT||nextjs.length!==NEXTJS_SIGNED_COUNT||
    ids.some(k=>!TARGETS[k]&&!OUT_OF_SCOPE.has(k))||
    OUT_OF_SCOPE_SIGNED.some(k=>!ids.includes(k)))
  throw Error('EXPECTED_COM02_EXACT_REGISTRY_IDENTITIES');
 if(verified?.schema!=='therabridge-com02-verified-npm-sigstore-candidates-v1'||
    verified.trustedVerifier?.name!=='npm'||
    verified.trustedVerifier?.version!=='11.19.1'||
    verified.trustedVerifier?.exitCode!==0||
    verified.trustedVerifier?.resultHashSha256!==sha(rawBytes)||
    verified.inputManifestSha256!==sha(Buffer.from(JSON.stringify(candidates)))||
    verified.counts?.unresolvedExactVersionPackages!==COM02_UNRESOLVED_VERSIONS||
    verified.counts?.attestationCandidates!==ALL_SIGNED_COUNT||
    verified.counts?.verifiedSignedSubjectsAndDigests!==ALL_SIGNED_COUNT||
    verified.counts?.independentlyCorroboratedPublisherToSource!==0||
    verified.counts?.legallyApproved!==0||
    verified.finalNoticesIssued!==false||
    verified.commercialLicenseGranted!==false||
    verified.g2ClinicalApproved!==false||
    verified.g2bClinicalApproved!==false||
    !Array.isArray(verified.records)||verified.records.length!==ALL_SIGNED_COUNT)
  throw Error('UNTRUSTED_SIGSTORE_AUDIT_RECEIPT');
 let raw;
 try{raw=JSON.parse(rawBytes.toString('utf8'));}
 catch{throw Error('INVALID_RAW_NPM_VERIFIED_BUNDLES');}
 if(!Array.isArray(raw?.verified)||raw.verified.length!==ALL_SIGNED_COUNT||
    !Array.isArray(raw.invalid)||raw.invalid.length||
    !Array.isArray(raw.missing)||raw.missing.length)
  throw Error('UNEXPECTED_NPM_BUNDLE_VERIFICATION_RESULT');
 const trusted=new Map(verified.records.map(x=>[key(x),x]));
 const byRaw=new Map(raw.verified.map(x=>[key(x),x]));
 if(trusted.size!==ALL_SIGNED_COUNT||byRaw.size!==ALL_SIGNED_COUNT)throw Error('DUPLICATED_VERIFIED_PACKAGE');
 // Non-Next.js signed packages must be verified and accounted for, but are
 // never corroborated here; they remain UNRESOLVED for counsel review.
 for(const candidate of selected.filter(x=>!TARGETS[x.name+'@'+x.version])){
  const receipt=trusted.get(key(candidate));
  if(!receipt||!byRaw.get(key(candidate))||
    receipt.signatureEvidenceStatus!=='PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST'||
    receipt.exactRegistryLockMatch!==true||receipt.commercialApproval!==false)
   throw Error('INCOMPLETE_OUT_OF_SCOPE_SIGNED_RECEIPT');
 }
 return nextjs.map(candidate=>{
  const receipt=trusted.get(key(candidate)),source=byRaw.get(key(candidate));
  if(!receipt||!source||
    receipt.signatureEvidenceStatus!=='PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST'||
    receipt.exactRegistryLockMatch!==true||
    receipt.matchingSubjectStatements!==2||
    receipt.verifiedBundleCount!==2||
    receipt.independentlyVerifiedPublisherSourceCorrespondence!==false||
    receipt.commercialApproval!==false)
   throw Error('INCOMPLETE_TRUSTED_PACKAGE_RECEIPT');
  // Reparse raw signed subjects and require verbatim SHA256/predicate/source
  // agreement with the preceding pinned npm CLI verified evidence receipt.
  const parsed=bundleStatements(source,candidate);
  if(JSON.stringify(parsed.signedStatements)!==JSON.stringify(receipt.signedStatements))
    throw Error('SIGNATURE_RECEIPT_RAW_BUNDLE_MISMATCH');
  const slsa=parsed.signedStatements.find(x=>x.predicateType==='https://slsa.dev/provenance/v1');
  const claims=slsa?.sourceRevisionClaims;
  if(!Array.isArray(claims)||claims.length!==1||
     claims[0].repositoryClaim!==REPO||
     claims[0].sourceRefClaim!==NEXTJS_SOURCE_REF||
     !REV.test(claims[0].revisionClaim))
    throw Error('UNEXPECTED_NEXTJS_SLSA_COMMIT_CLAIM');
  return {name:candidate.name,version:candidate.version,lockedIntegrity:candidate.lockedIntegrity,
   signedRevision:claims[0].revisionClaim,sourceSpec:TARGETS[candidate.name+'@'+candidate.version],
   sourceClaimsSha256:sha(Buffer.from(JSON.stringify(claims)))};
 });
}
function immutableUrl(commit,path){
 if(!REV.test(commit)||!Object.values(TARGETS).some(x=>x.path===path))
  throw Error('UNTRUSTED_SOURCE_PATH');
 return 'https://raw.githubusercontent.com/vercel/next.js/'+commit+'/'+path;
}
function checkSourceManifest(bytes,expected){
 if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>512*1024)
  throw Error('INVALID_IMMUTABLE_SOURCE');
 let source;
 try{source=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw Error('INVALID_SOURCE_MANIFEST');}
 if(!source||typeof source!=='object'||Array.isArray(source)||
    source.name!==expected.sourceSpec.sourceName||
    source.version!==expected.version)
  throw Error('SOURCE_VERSION_IDENTITY_MISMATCH');
 return {sourceFileSha256:sha(bytes),sourceFileBytes:bytes.length};
}
async function corroborate(candidates,verified,rawBytes,{fetcher=fetchRaw}={}){
 const rows=validate(candidates,verified,rawBytes);
 const results=[];
 for(const row of rows){
  const sourceUrl=immutableUrl(row.signedRevision,row.sourceSpec.path);
  const record={name:row.name,version:row.version,
   trustedSignedPackageAndDigest:true,
   signedSourceRepository:REPO,
   signedSourceRevision:row.signedRevision,
   signedSourceRef:NEXTJS_SOURCE_REF,
   sourcePackagePath:row.sourceSpec.path,
   expectedSourcePackageName:row.sourceSpec.sourceName,
   sourceManifestSha256:null,sourceManifestBytes:null,
   sourceManifestStatus:'IMMUTABLE_SOURCE_NOT_CONFIRMED',
   exactNpmTarballReproducedFromSource:false,
   signedReleaseBuildWorkflowIndependentlyReproduced:false,
   sourceVersionLegallyAuthorized:false,
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   commercialApproval:false};
  try{
   const bytes=await fetcher(sourceUrl);
   const buf=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
   const check=checkSourceManifest(buf,row);
   record.sourceManifestSha256=check.sourceFileSha256;
   record.sourceManifestBytes=check.sourceFileBytes;
   record.sourceManifestStatus=row.name==='@next/env'?
    'SIGNED_REVISION_IMMUTABLE_EXACT_PACKAGE_MANIFEST_MATCH':
    'SIGNED_REVISION_IMMUTABLE_PARENT_SWC_SOURCE_MANIFEST_MATCH_ONLY';
  }catch(e){
   const allowed=['UPSTREAM_TIMEOUT','TEXT_TOO_LARGE','INVALID_IMMUTABLE_SOURCE','INVALID_SOURCE_MANIFEST','SOURCE_VERSION_IDENTITY_MISMATCH','SOURCE_NOT_ALLOWLISTED'];
   const reason=String(e?.message||'');
   record.sourceManifestStatus=allowed.includes(reason)||/^UPSTREAM_HTTP_\d{3}$/.test(reason)?
    reason:'IMMUTABLE_SOURCE_FETCH_UNAVAILABLE';
  }
  results.push(record);
 }
 results.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return {schema:'therabridge-com02-signed-nextjs-immutable-source-review-v1',
  status:'SIGNED_NEXTJS_SOURCE_MANIFEST_CORROBORATION_ONLY_NOT_PUBLISHED_TARBALL_REPRODUCIBILITY_OR_LICENSE',
  fullRegistryCandidateSha256:sha(Buffer.from(JSON.stringify(candidates))),
  npmVerifiedBundleSha256:sha(rawBytes),
  verifiedSigstoreReceiptSha256:sha(Buffer.from(JSON.stringify(verified))),
  counts:{allOriginalUnresolvedVersions:COM02_UNRESOLVED_VERSIONS,sigstoreSignedPackages:NEXTJS_SIGNED_COUNT,
   outOfScopeSigstoreSignedPackages:OUT_OF_SCOPE_SIGNED.length,
   sourceManifestMatches:results.filter(x=>x.sourceManifestStatus.includes('_MANIFEST_MATCH')).length,
   exactPackageSourceManifestMatches:results.filter(x=>x.sourceManifestStatus==='SIGNED_REVISION_IMMUTABLE_EXACT_PACKAGE_MANIFEST_MATCH').length,
   nativeBinaryParentSourceMatches:results.filter(x=>x.sourceManifestStatus==='SIGNED_REVISION_IMMUTABLE_PARENT_SWC_SOURCE_MANIFEST_MATCH_ONLY').length,
   remainingWithoutAdvertisedSigstore:REMAINING_WITHOUT_SIGSTORE,
   independentlyReproducedPublishedNpmTarballs:0,
   legallyApproved:0},
  outOfScopeSignedPackages:[...OUT_OF_SCOPE_SIGNED],
  records:results,finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==4||new Set(args).size!==4){
  console.error('Usage: corroborate-signed-nextjs-source.mjs candidates.json trusted-summary.json verified-raw-bundles.json output.json');
  process.exit(2);
 }
 try{
  const [a,b,c]=args.slice(0,3).map(f=>readFileSync(f));
  const result=await corroborate(JSON.parse(a),JSON.parse(b),c);
  writeFileSync(args[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('NEXTJS_SIGNED_SOURCE_REVIEW_FAILED',e.message);process.exitCode=1;}
}
export {validate,immutableUrl,checkSourceManifest,corroborate};
