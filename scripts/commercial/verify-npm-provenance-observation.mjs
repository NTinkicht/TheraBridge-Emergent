#!/usr/bin/env node
// COM-02 - isolated npm CLI signature/provenance audit against the exact
// advertised package versions. No install scripts; no source/legal approvals.
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const sha=x=>createHash('sha256').update(x).digest('hex');
const id=x=>JSON.stringify([x.name,x.version]);
const nameOk=/^(@[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*|[a-z0-9][\w.-]*)$/;
const verOk=/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?(?:\+[a-zA-Z0-9.-]+)?$/;

function select(input){
 if(input?.schema!=='therabridge-com02-upstream-authority-candidates-v1'||
  !Array.isArray(input.records)||input.records.length===0||
  input.records.length>1024||input.counts?.exceptions!==input.records.length||
  input.counts?.legallyApproved!==0||
  input.counts?.independentlyVerifiedPublisherProvenance!==0||
  input.finalNoticesIssued!==false||input.commercialLicenseGranted!==false)
  throw Error('UNSAFE_CANDIDATE_REGISTER');
 const seen=new Set(),selected=[];
 for(const row of input.records){
  const k=id(row);
  if(!nameOk.test(row.name??'')||!verOk.test(row.version??'')||
   seen.has(k)||row.commercialApproval!==false||
   row.publisherProvenanceIndependentlyVerified!==false||
   row.legalReviewStatus!=='UNRESOLVED'||
   row.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
   row.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('INVALID_OR_DUPLICATE_PACKAGE');
  seen.add(k);
  if(row.candidateRegistryAttestationStatus!=='UNVERIFIED_REGISTRY_ATTESTATION_POINTER')
   continue;
  if(row.manifestEvidenceStatus!=='REGISTRY_EXACT_VERSION_METADATA_ONLY'||
   row.manifestMatchesLockedIntegrity!==true||
   typeof row.candidateDistIntegrity!=='string'||
   row.candidateDistIntegrity!==row.lockedIntegrity||
   typeof row.candidateRegistryAttestationUrl!=='string')
   throw Error('UNTRUSTED_REGISTRY_PROVENANCE_CANDIDATE');
  const url=new URL(row.candidateRegistryAttestationUrl);
  if(url.protocol!=='https:'||url.hostname!=='registry.npmjs.org'||url.port||
   url.username||url.password||url.search||url.hash||
   !url.pathname.startsWith('/-/npm/v1/attestations/'))
   throw Error('UNSAFE_ATTESTATION_LOCATION');
  selected.push({name:row.name,version:row.version,lockedIntegrity:row.lockedIntegrity,
   advertisedAttestationUrl:row.candidateRegistryAttestationUrl});
 }
 if(selected.length!==input.counts.registryAttestationPointersAdvertised)
  throw Error('ATTESTATION_CANDIDATE_COUNT_DRIFT');
 selected.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en'));
 return selected;
}
function summarise(input,observed,installedLock,auditBytes,auditExit){
 const selected=select(input);
 if(!Number.isInteger(auditExit)||auditExit < 0 || auditExit > 255)
  throw Error('INVALID_AUDIT_EXIT');
 const byKey=new Map(selected.map(x=>[id(x),x]));
 if(!installedLock||typeof installedLock!=='object'||
  !installedLock.packages||typeof installedLock.packages!=='object')
  throw Error('LOCKFILE_NOT_AVAILABLE');
 const records=selected.map(x=>{
  const installed=installedLock.packages['node_modules/'+x.name];
  const locked=!!installed && installed.version===x.version &&
   installed.integrity===x.lockedIntegrity &&
   typeof installed.resolved==='string' &&
   installed.resolved.startsWith('https://registry.npmjs.org/');
  return {name:x.name,version:x.version,
   advertisedAttestationUrl:x.advertisedAttestationUrl,
   exactIntegrityInstalledFromRegistry:locked,
   publisherProvenanceIndependentlyVerified:false,
   sourceRevisionIndependentlyVerified:false,
   commercialApproval:false,
   auditStatus:locked && auditExit===0?
    'NPM_AUDIT_SIGNATURES_SUCCEEDED_BUT_SUBJECT_REVIEW_REQUIRED':
    'NPM_AUDIT_SIGNATURES_NOT_ESTABLISHED'};
 });
 if(!Array.isArray(observed)||observed.some(x=>!byKey.has(id(x)))||
    new Set(observed.map(id)).size!==observed.length)
  throw Error('UNEXPECTED_AUDITED_PACKAGES');
 // Npm CLI's cryptographic outcome is observed, not silently converted
 // into independently audited version-to-source mappings.
 return {schema:'therabridge-com02-npm-signature-audit-receipt-v1',
  status:'NPM_CLI_OBSERVATION_REQUIRES_INDEPENDENT_SUBJECT_AND_SOURCE_REVIEW',
  candidateRegisterSha256:sha(JSON.stringify(input)),
  npmAuditOutputSha256:sha(auditBytes),
  npmAuditExitCode:auditExit,
  npmAuditParseableJson:(()=>{try{JSON.parse(auditBytes.toString('utf8'));return true;}catch{return false;}})(),
  counts:{allUnresolvedPackages:input.records.length,
   advertisedAttestationCandidates:selected.length,
   exactRegistryLockMatches:records.filter(r=>r.exactIntegrityInstalledFromRegistry).length,
   independentlyVerifiedPublisherSourceLinks:0,legallyApproved:0},
  records,commercialApproval:false,finalNoticesIssued:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
function run(program,args,cwd){
 const r=spawnSync(program,args,{cwd,encoding:null,timeout:180000,maxBuffer:8*1024*1024,
  env:{...process.env,npm_config_registry:'https://registry.npmjs.org/',
   npm_config_ignore_scripts:'true',npm_config_audit:'false',npm_config_fund:'false',
   npm_config_update_notifier:'false',npm_config_cache:join(cwd,'.cache')}});
 return {code:r.status??255,stdout:r.stdout??Buffer.alloc(0),
  stderr:r.stderr??Buffer.alloc(0),error:r.error?.code??null};
}
function audit(input){
 const candidates=select(input);
 const root=mkdtempSync(join(tmpdir(),'tb-com02-npm-audit-'));
 try{
  if(!candidates.length)return {status:'NO_ADVERTISED_ATTESTATION_CANDIDATES',
    candidateCount:0,commercialApproval:false};
  const manifest={name:'therabridge-com02-attestation-review',version:'0.0.0',
   private:true,description:'Isolated no-scripts supply chain evidence',
   dependencies:Object.fromEntries(candidates.map(x=>[x.name,x.version]))};
  writeFileSync(join(root,'package.json'),JSON.stringify(manifest,null,2)+'\n');
  // Explicit versions, isolated directory, no lifecycle scripts. --force
  // permits inspecting Linux GNU/Musl package bytes on one synthetic runner,
  // not executing either platform-specific native binary.
  const installed=run('npm',['install','--force','--ignore-scripts','--no-audit','--no-fund','--package-lock-only'],root);
  if(installed.code!==0)throw Error('NPM_LOCK_GENERATION_FAILED_'+(installed.error??installed.code));
  const install=run('npm',['ci','--force','--ignore-scripts','--no-audit','--no-fund'],root);
  if(install.code!==0)throw Error('NPM_ISOLATED_INSTALL_FAILED_'+(install.error??install.code));
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
  const cmd=run('npm',['audit','signatures','--json','--include-attestations'],root);
  return {receipt:summarise(input,candidates,lock,cmd.stdout,cmd.code),
   auditJson:cmd.stdout};
 } finally{rmSync(root,{recursive:true,force:true,maxRetries:2});}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==3||new Set(args).size!==3){
  console.error('Usage: verify-npm-provenance-observation.mjs registry-candidates.json new-receipt.json new-npm-audit-output.json');
  process.exit(2);
 }
 try{
  const input=JSON.parse(readFileSync(args[0],'utf8'));
  const result=audit(input);
  if(!result.receipt)throw Error('NO_ATTESTATION_CANDIDATES');
  writeFileSync(args[1],JSON.stringify(result.receipt,null,2)+'\n',{flag:'wx'});
  writeFileSync(args[2],result.auditJson,{flag:'wx'});
  console.log(JSON.stringify(result.receipt.counts));
 }catch(e){console.error('NPM_PROVENANCE_OBSERVATION_FAILED',e.message);process.exitCode=1;}
}
export {select,summarise};
