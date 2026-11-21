#!/usr/bin/env node
// Cross-ecosystem commercial rights queue; no license or distribution approval.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
function buildReview(direct,installed,publisher,assets){
 if(direct.schema!=='therabridge-direct-license-evidence-v1'||direct.status!=='NOT_LEGAL_CLEARANCE'||!Array.isArray(direct.records)||
 installed.schema!=='therabridge-installed-license-file-inventory-v1'||installed.approved!==0||installed.count!==installed.packages.length||
 publisher.schema!=='therabridge-publisher-tarball-evidence-v1'||publisher.legallyApproved!==0||!Array.isArray(publisher.records)||!Array.isArray(assets))throw Error('INVALID_SOURCE_EVIDENCE');
 const names=new Set(direct.records.map(x=>x.name));
 const directRows=publisher.records.map(x=>{
  if(x.legalApproval!==false||x.licenseObligationsReviewed!==false)throw Error('FALSE_PUBLISHER_APPROVAL');
  return {name:x.name,version:x.version,technicalStatus:x.status,installedLicenseComparison:x.installedLicenseComparison??'NOT_EVALUATED',saasRights:'PENDING_LEGAL_REVIEW',enterpriseRedistributionRights:'PENDING_LEGAL_REVIEW',approval:false};
 });
 const transient=installed.packages.filter(p=>!names.has(p.name)).map(p=>{
  if(p.commercialApproval!==false||p.actualLicenseTextReviewed!==false)throw Error('FALSE_INSTALLED_APPROVAL');
  return {name:p.name,version:p.version,installedPath:p.installedPath,hasInstalledLicenseFile:p.foundLicenseFiles.length>0,
   verification:'TRANSITIVE_OR_NON_DIRECT_NOT_PUBLISHER_VERIFIED',saasRights:'PENDING_LEGAL_REVIEW',enterpriseRedistributionRights:'PENDING_LEGAL_REVIEW',approval:false};
 });
 const assetRows=assets.map(a=>{
  if(typeof a.path!=='string'||!a.path||!/^([a-f0-9]{64})$/.test(a.sha256)||!Number.isSafeInteger(a.bytes))throw Error('INVALID_ASSET');
  return {...a,rightsHolder:'NOT_VERIFIED',saasRights:'PENDING_LEGAL_REVIEW',enterpriseRedistributionRights:'PENDING_LEGAL_REVIEW',approval:false};
 });
 directRows.sort((a,b)=>a.name.localeCompare(b.name)||String(a.version).localeCompare(String(b.version)));
 transient.sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version)||a.installedPath.localeCompare(b.installedPath));
 assetRows.sort((a,b)=>a.path.localeCompare(b.path));
 return {schema:'therabridge-com02-consolidated-obligations-queue-v1',status:'EVIDENCE_TRIAGE_NOT_LEGAL_CLEARANCE',
  counts:{installedPackages:installed.count,directEntries:directRows.length,transitiveOrOtherInstalled:transient.length,trackedAssets:assetRows.length,legallyApproved:0},
  direct:directRows,transitive:transient,assets:assetRows,
  remaining:['PUBLISHER_LICENSE_TEXT_AND_COPYRIGHT_REVIEW','SAAS_NETWORK_OBLIGATIONS',
   'ON_PREM_ENTERPRISE_REDISTRIBUTION','CONTAINER_OS_AND_EXTERNAL_SERVICES',
   'FONTS_ILLUSTRATIONS_LOGOS_MODELS_DATASETS','QUALIFIED_COUNSEL_SIGNATURE']};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [directPath,installedPath,publisherPath,output]=process.argv.slice(2);
 if(process.argv.length!==6||new Set([directPath,installedPath,publisherPath,output]).size!==4){
  console.error('Usage: build-com02-obligations-queue.mjs direct-evidence.json installed-files.json publisher-evidence.json output.json');process.exit(2);
 }
 try{
  const tracked=execFileSync('git',['ls-files','-z'],{encoding:'buffer',maxBuffer:16*1024*1024}).toString().split('\0').filter(Boolean);
  const assets=tracked.filter(path=>/\.(svg|png|jpe?g|webp|gif|avif|ico|woff2?|ttf|otf)$/i.test(path)||/(^|\/)Dockerfile(\.[^/]*)?$/.test(path))
   .map(path=>{const b=readFileSync(path);return{path,sha256:sha(b),bytes:b.length};});
  const report=buildReview(JSON.parse(readFileSync(directPath)),JSON.parse(readFileSync(installedPath)),JSON.parse(readFileSync(publisherPath)),assets);
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {buildReview};
