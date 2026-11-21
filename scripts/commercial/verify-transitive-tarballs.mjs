#!/usr/bin/env node
// Sample exact installed non-direct npm packages using the independently verified
// Yarn tarball pipeline. Every unverified version remains in the output queue.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audit} from './verify-published-tarballs.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
async function auditTransitive({installed,lockText,direct,installedFiles,maxFetch=768},options={}){
 if(direct.schema!=='therabridge-direct-license-evidence-v1'||
 direct.status!=='NOT_LEGAL_CLEARANCE'||!Array.isArray(direct.records)||direct.records.some(x=>typeof x.name!=='string'||!x.name||x.commercialApproval!==false))throw Error('BAD_DIRECT_DECLARATIONS');
 if(installedFiles.schema!=='therabridge-installed-license-file-inventory-v1'||installedFiles.approved!==0||
 !Array.isArray(installedFiles.packages)||installedFiles.count!==installedFiles.packages.length||
 installedFiles.packages.some(x=>x.commercialApproval!==false||x.actualLicenseTextReviewed!==false))throw Error('BAD_INSTALLED_EVIDENCE');
 if(!Number.isInteger(maxFetch)||maxFetch<1||maxFetch>1024)throw Error('BAD_SAMPLE_CAP');
 const directNames=new Set(direct.records.map(x=>x.name));
 const others=installedFiles.packages.filter(x=>!directNames.has(x.name));
 if(!others.length)throw Error('EMPTY_TRANSITIVE_SCOPE');
 const names=[...new Set(others.map(x=>x.name))].sort((a,b)=>a.localeCompare(b,'en'));
 const scoped={schema:'therabridge-direct-license-evidence-v1',status:'NOT_LEGAL_CLEARANCE',
  records:names.map(name=>({name,commercialApproval:false}))};
 const report=await audit({installed,lockText,direct:scoped,installedFiles,maxFetch},options);
 if(report.legallyApproved!==0||report.records.some(x=>x.legalApproval!==false||x.licenseObligationsReviewed!==false))
  throw Error('FALSE_PUBLISHER_APPROVAL');
 const counts={physicalNonDirectCopies:others.length,distinctNames:names.length,uniqueVersionRows:report.records.length,
  attempted:report.fetched,deferred:report.records.filter(x=>x.status==='DEFERRED_BY_BOUNDED_SAMPLE').length,
  verifiedMatchingInstalledLicense:report.records.filter(x=>x.installedLicenseComparison==='EXACT_SHA256_MATCH'&&x.status==='TARBALL_INTEGRITY_VERIFIED_LICENSE_FILES_HASHED').length,
  unresolved:report.records.filter(x=>x.status!=='TARBALL_INTEGRITY_VERIFIED_LICENSE_FILES_HASHED').length,
  legallyApproved:0};
 return {schema:'therabridge-transitive-tarball-wave-v1',status:counts.deferred===0?'ALL_INSTALLED_NON_DIRECT_VERSIONS_CLASSIFIED_NOT_LEGAL_APPROVAL':'SAMPLED_TECHNICAL_EVIDENCE_NOT_LEGAL_APPROVAL',
  scope:'INSTALLED_NON_DIRECT_NAMES_AND_VERSIONS',lockSha256:sha(lockText),
  installedEvidenceSha256:sha(JSON.stringify(installedFiles)),maxFetch,counts,
  summary:report.summary,records:report.records};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const [installedPath,lockPath,directPath,installedFilesPath,output]=process.argv.slice(2);
 if(process.argv.length!==7||new Set([installedPath,lockPath,directPath,installedFilesPath,output]).size!==5){
  console.error('Usage: verify-transitive-tarballs.mjs installed-provenance.json yarn.lock direct-evidence.json installed-files.json output.json');process.exit(2);
 }
 try{
  const report=await auditTransitive({
   installed:JSON.parse(readFileSync(installedPath,'utf8')),
   lockText:readFileSync(lockPath,'utf8'),
   direct:JSON.parse(readFileSync(directPath,'utf8')),
   installedFiles:JSON.parse(readFileSync(installedFilesPath,'utf8'))});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({counts:report.counts,summary:report.summary}));
  if(report.summary.UNRESOLVED_INTEGRITY_MISMATCH||report.summary.UNRESOLVED_INSTALLED_LICENSE_HASH_MISMATCH)
   process.exitCode=1;
 }catch(e){console.error(String(e.message));process.exitCode=1;}
}
export {auditTransitive};
