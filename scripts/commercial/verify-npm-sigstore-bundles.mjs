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
    !Array.isArray(entry.attestations?.bundles)||
    entry.attestations.bundles.length<1||entry.attestations.bundles.length>12)
  throw Error('VERIFIED_BUNDLE_ENTRY_MISSING');
 const sri=expected.lockedIntegrity;
 if(typeof sri!=='string'||!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(sri))
  throw Error('INVALID_LOCK_SRI');
 const digest512=Buffer.from(sri.slice(7),'base64');
 if(digest512.length!==64||digest512.toString('base64')!==sri.slice(7))
  throw Error('INVALID_LOCK_SRI');
 const expectedHex=digest512.toString('hex');
 const purl=signedSubject(expected.name,expected.version);
 let matched=0;
 const statements=[];
 for(const item of entry.attestations.bundles){
  const bundle=item.bundle;
  if(!bundle||typeof bundle!=='object'||!bundle.dsseEnvelope||
     !Array.isArray(bundle.dsseEnvelope.signatures)||!bundle.dsseEnvelope.signatures.length)
   throw Error('INVALID_VERIFIED_BUNDLE_SHAPE');
  const payload=b64(bundle.dsseEnvelope.payload);
  let statement;
  try{statement=JSON.parse(payload.toString('utf8'));}catch{throw Error('INVALID_SIGNED_PAYLOAD');}
  if(!statement||statement._type!=='https://in-toto.io/Statement/v1'||
     !Array.isArray(statement.subject)||statement.subject.length<1||
     statement.subject.length>16)
   throw Error('BAD_SIGNED_STATEMENT');
  const match=statement.subject.some(s=>s?.name===purl &&
   s.digest?.sha512===expectedHex);
  if(match)matched++;
  const pred=statement.predicate||{};
  const sourceCandidates=[];
  function source(uri,digestValue){
   if(typeof uri!=='string'||uri.length>1500||!uri.startsWith('git+https://github.com/'))return;
   if(typeof digestValue!=='string'||!H40.test(digestValue))return;
   sourceCandidates.push({repositoryClaim:uri,revisionClaim:digestValue});
  }
  for(const dep of pred.buildDefinition?.resolvedDependencies||[]){
   source(dep?.uri,dep?.digest?.gitCommit||dep?.digest?.sha1);
  }
  for(const dep of pred.materials||[]){
   source(dep?.uri,dep?.digest?.gitCommit||dep?.digest?.sha1);
  }
  statements.push({
   predicateType:statement.predicateType||null,
   dssePayloadSha256:digest(payload),
   signedPackageAndTarballMatch:match,
   sourceRevisionClaims:sourceCandidates.slice(0,16),
   publicationToSourceIndependentlyCorroborated:false,
   rightsApproved:false
  });
 }
 if(matched===0)throw Error('NO_MATCHING_SIGNED_PURL_AND_TARBALL_SHA512');
 return {signedStatements:statements,matchingSubjectStatements:matched,
  verifiedBundleCount:entry.attestations.bundles.length,
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
  if(!selected.length)return classify(input,{packages:{}},Buffer.from('{}'),255,NPM_VERSION);
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
  return classify(input,lock,audit.stdout,audit.status,ver);
 }finally{rmSync(root,{recursive:true,force:true,maxRetries:2});}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const paths=process.argv.slice(2);
 if(paths.length!==2||paths[0]===paths[1]){
  console.error('Usage: verify-npm-sigstore-bundles.mjs exact-registry-candidates.json new-summary.json');process.exit(2);
 }
 try{
  const input=JSON.parse(readFileSync(paths[0],'utf8'));
  const report=obtain(input);
  writeFileSync(paths[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error('SIGSTORE_BUNDLE_CHECK_FAILED',e.message);process.exitCode=1;}
}
export {classify,bundleStatements,signedSubject};
