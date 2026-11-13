#!/usr/bin/env node
// COM-02: verify *actual* npm/Sigstore attestations using a pinned npm CLI,
// then separately bind signed SLSA subjects to exact package lock integrity.
// This never constitutes license clearance, customer shipment, or proof that
// every source file was built from the signed commit.
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {select} from './verify-npm-provenance-observation.mjs';

const NPM_VERSION='11.19.1';
const H64=/^[a-f0-9]{64}$/;
const H40=/^[a-f0-9]{40}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
const key=p=>JSON.stringify([p.name,p.version]);
function b64(text){
 if(typeof text!=='string'||text.length>512*1024||text.length<8||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('INVALID_DSSE_BASE64');
 const b=Buffer.from(text,'base64');
 if(b.toString('base64')!==text||b.length>384*1024)throw Error('NONCANONICAL_DSSE');
 return b;
}
function signedSubject(name,version){
 return 'pkg:npm/'+encodeURIComponent(name).replace(/%2F/gi,'/')+'@'+version;
}
function bundleStatements(entry,expected){
 if(!entry||typeof entry!=='object'||entry.name!==expected.name||
    entry.version!==expected.version||
    !Array.isArray(entry.attestationBundles)||entry.attestationBundles.length!==2)
  throw Error('VERIFIED_BUNDLE_ENTRY_MISSING');
 const sri=expected.lockedIntegrity;
 if(typeof sri!=='string'||!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(sri))
  throw Error('INVALID_LOCK_SRI');
 const digest512=Buffer.from(sri.slice(7),'base64');
 if(digest512.length!==64||digest512.toString('base64')!==sri.slice(7))
  throw Error('INVALID_LOCK_SRI');
 const expectedHex=digest512.toString('hex'),purl=signedSubject(expected.name,expected.version);
 const PUBLISH='https://github.com/npm/attestation/tree/main/specs/publish/v0.1';
 const SLSA='https://slsa.dev/provenance/v1';
 const types=new Set(),statements=[];
 for(const item of entry.attestationBundles){
  const bundle=item?.bundle;
  if(!bundle||typeof bundle!=='object'||!bundle.dsseEnvelope||
     !Array.isArray(bundle.dsseEnvelope.signatures)||!bundle.dsseEnvelope.signatures.length)
   throw Error('INVALID_VERIFIED_BUNDLE_SHAPE');
  const payload=b64(bundle.dsseEnvelope.payload);
  let statement;
  try{statement=JSON.parse(payload.toString('utf8'));}catch{throw Error('INVALID_SIGNED_PAYLOAD');}
  const isPublish=statement?._type==='https://in-toto.io/Statement/v0.1'&&statement?.predicateType===PUBLISH;
  const isProvenance=statement?._type==='https://in-toto.io/Statement/v1'&&statement?.predicateType===SLSA;
  if((!isPublish&&!isProvenance)||!Array.isArray(statement?.subject)||
     statement.subject.length!==1||types.has(statement.predicateType)||
     item.predicateType!==statement.predicateType)
   throw Error('BAD_SIGNED_STATEMENT');
  types.add(statement.predicateType);
  if(statement.subject[0]?.name!==purl||
     statement.subject[0]?.digest?.sha512!==expectedHex)
   throw Error('NO_MATCHING_SIGNED_PURL_AND_TARBALL_SHA512');
  if(isPublish&&(statement.predicate?.name!==expected.name||
      statement.predicate?.version!==expected.version||
      statement.predicate?.registry!=='https://registry.npmjs.org'))
    throw Error('SIGNED_PUBLISH_IDENTITY_MISMATCH');
  const sourceCandidates=[];
  if(isProvenance){
   const workflow=statement.predicate?.buildDefinition?.externalParameters?.workflow;
   const deps=statement.predicate?.buildDefinition?.resolvedDependencies;
   if(!Array.isArray(deps)||!workflow||typeof workflow.repository!=='string')
    throw Error('MISSING_SIGNED_SLSA_SOURCE_METADATA');
   for(const dep of deps){
    const uri=dep?.uri,sha=dep?.digest?.gitCommit;
    if(typeof uri!=='string'||typeof sha!=='string'||!H40.test(sha))continue;
    const match=uri.match(/^git\+https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@refs\/(heads|tags)\/([A-Za-z0-9._/-]+)$/);
    if(!match||match[4].includes('..')||match[4].startsWith('/')||
       workflow.repository!=='https://github.com/'+match[1]+'/'+match[2])continue;
    sourceCandidates.push({repositoryClaim:workflow.repository,
      sourceRefClaim:'refs/'+match[3]+'/'+match[4],revisionClaim:sha,
      immutableGitCommitExistenceIndependentlyChecked:false,
      publishedTarballReproducedFromSource:false});
   }
  }
  statements.push({inTotoStatementType:statement._type,predicateType:statement.predicateType,
   dssePayloadSha256:digest(payload),signedPackageAndTarballMatch:true,
   sourceRevisionClaims:sourceCandidates,
   publicationToSourceIndependentlyCorroborated:false,rightsApproved:false});
 }
 if(!types.has(PUBLISH)||!types.has(SLSA))throw Error('MISSING_REQUIRED_PUBLISH_AND_PROVENANCE_ATTESTATIONS');
 return {signedStatements:statements,matchingSubjectStatements:2,
  verifiedBundleCount:entry.attestationBundles.length,
  bundleTrustVerifiedByPinnedNpmCli:true};
}
function classify(input,lock,auditBytes,auditExit,verifiedNpmVersion){
 const selected=select(input);
 if(verifiedNpmVersion!==NPM_VERSION)throw Error('UNEXPECTED_NPM_VERIFIER_VERSION');
 let report;
 try{report=JSON.parse(auditBytes.toString('utf8'));}catch{report=null;}
 const entries=Array.isArray(report?.verified)?report.verified:[];
 const seen=new Set(),byKey=new Map();
 for(const x of entries){
  if(typeof x?.name!=='string'||typeof x?.version!=='string'||
     seen.has(key(x))||!selected.some(p=>key(p)===key(x)))
   throw Error('UNEXPECTED_VERIFIED_ATTESTATION');
  seen.add(key(x));byKey.set(key(x),x);
 }
 const rows=selected.map(x=>{
  const locked=lock?.packages?.['node_modules/'+x.name];
  const exact=locked?.version===x.version&&locked?.integrity===x.lockedIntegrity&&
   typeof locked?.resolved==='string'&&
   locked.resolved.startsWith('https://registry.npmjs.org/');
  let signatureEvidenceStatus='UNVERIFIED_OR_NOT_EXPORTED',signedStatements=[],matchingSubjectStatements=0,verifiedBundleCount=0;
  if(exact&&auditExit===0&&Array.isArray(report?.verified)&&
    Array.isArray(report?.invalid)&&report.invalid.length===0&&
    Array.isArray(report?.missing)&&report.missing.length===0&&byKey.has(key(x))){
   try{
    const result=bundleStatements(byKey.get(key(x)),x);
    signedStatements=result.signedStatements;
    matchingSubjectStatements=result.matchingSubjectStatements;
    verifiedBundleCount=result.verifiedBundleCount;
    signatureEvidenceStatus='PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST';
   }catch(e){signatureEvidenceStatus='INVALID_OR_UNMATCHED_SIGNED_BUNDLE_'+String(e.message).slice(0,80);}
  }
  return {name:x.name,version:x.version,exactRegistryLockMatch:!!exact,
   advertisedAttestationUrl:x.advertisedAttestationUrl,
   signatureEvidenceStatus,matchingSubjectStatements,verifiedBundleCount,
   signedStatements,
   independentlyVerifiedPublisherSourceCorrespondence:false,
   signedSourceClaimNeedsIndependentRepositoryReconciliation:true,
   commercialApproval:false,finalNoticesIssued:false};
 });
 const signatureMatches=rows.filter(x=>x.signatureEvidenceStatus==='PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST').length;
 return {
  schema:'therabridge-com02-verified-npm-sigstore-candidates-v1',
  trustedVerifier:{name:'npm',version:NPM_VERSION,mode:'npm audit signatures --json --include-attestations',
   resultHashSha256:digest(auditBytes),exitCode:auditExit},
  inputManifestSha256:digest(Buffer.from(JSON.stringify(input))),
  status:'SIGNED_SUBJECT_VERIFIED_WITH_NPM_SIGSTORE_TRUST_NOT_SOURCE_REPRODUCIBILITY_OR_LEGAL_APPROVAL',
  counts:{unresolvedExactVersionPackages:input.records.length,
   attestationCandidates:selected.length,verifiedSignedSubjectsAndDigests:signatureMatches,
   independentlyCorroboratedPublisherToSource:0,legallyApproved:0},
  records:rows,finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
function run(program,args,cwd){
 const r=spawnSync(program,args,{cwd,encoding:null,timeout:180000,maxBuffer:16*1024*1024,
  env:{...process.env,npm_config_registry:'https://registry.npmjs.org/',
   npm_config_ignore_scripts:'true',npm_config_audit:'false',npm_config_fund:'false',
   npm_config_update_notifier:'false',npm_config_cache:join(cwd,'.cache')}});
 return {status:r.status??255,stdout:r.stdout||Buffer.alloc(0),error:r.error?.code||null};
}
function obtain(input){
 const selected=select(input);
 const root=mkdtempSync(join(tmpdir(),'tb-com02-pinned-npm-'));
 try{
  if(!selected.length){
   const auditBytes=Buffer.from('{}');
   return {report:classify(input,{packages:{}},auditBytes,255,NPM_VERSION),auditBytes};
  }
  const verifier=join(root,'verifier'),project=join(root,'project');
  mkdirSync(verifier);mkdirSync(project);
  const bootstrap=run('npm',['install','--prefix',verifier,'--ignore-scripts','--no-audit','--no-fund','--no-save','npm@'+NPM_VERSION],root);
  if(bootstrap.status!==0)throw Error('PINNED_NPM_INSTALL_UNAVAILABLE');
  const cli=join(verifier,'node_modules/npm/bin/npm-cli.js');
  const ver=run(process.execPath,[cli,'--version'],project).stdout.toString('utf8').trim();
  if(ver!==NPM_VERSION)throw Error('UNEXPECTED_NPM_VERIFIER_VERSION');
  writeFileSync(join(project,'package.json'),JSON.stringify({name:'com02-publisher-source-verification',
   version:'0.0.0',private:true,dependencies:Object.fromEntries(selected.map(x=>[x.name,x.version]))}));
  const lockGen=run(process.execPath,[cli,'install','--force','--ignore-scripts','--no-audit','--no-fund','--package-lock-only'],project);
  if(lockGen.status!==0)throw Error('PINNED_NPM_LOCK_UNAVAILABLE');
  const inst=run(process.execPath,[cli,'ci','--force','--ignore-scripts','--no-audit','--no-fund'],project);
  if(inst.status!==0)throw Error('PINNED_NPM_ISOLATED_INSTALL_UNAVAILABLE');
  const lock=JSON.parse(readFileSync(join(project,'package-lock.json'),'utf8'));
  const audit=run(process.execPath,[cli,'audit','signatures','--json','--include-attestations'],project);
  return {report:classify(input,lock,audit.stdout,audit.status,ver),auditBytes:audit.stdout};
 }finally{rmSync(root,{recursive:true,force:true,maxRetries:2});}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const paths=process.argv.slice(2);
 if(paths.length!==3||new Set(paths).size!==3){
  console.error('Usage: verify-npm-sigstore-bundles.mjs exact-registry-candidates.json new-summary.json new-verified-bundles.json');process.exit(2);
 }
 try{
  const input=JSON.parse(readFileSync(paths[0],'utf8'));
  const {report,auditBytes}=obtain(input);
  if(auditBytes.length>8*1024*1024)throw Error('OVERSIZED_VERIFIED_BUNDLE_EXPORT');
  writeFileSync(paths[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  writeFileSync(paths[2],auditBytes,{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error('SIGSTORE_BUNDLE_CHECK_FAILED',e.message);process.exitCode=1;}
}
export {classify,bundleStatements,signedSubject};
