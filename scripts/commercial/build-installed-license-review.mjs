#!/usr/bin/env node
// Turn exact-installed LICENSE/NOTICE hashes into a deterministic legal-review queue.
// Neither manifest SPDX metadata nor file presence is legal approval.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const [input,output]=process.argv.slice(2);
if(process.argv.length!==4||!input||!output||input===output){
 console.error('Usage: node build-installed-license-review.mjs installed.json review.json');process.exit(2);
}
let inventory;
try{inventory=JSON.parse(readFileSync(input,'utf8'));}
catch{console.error('Installed license evidence is unreadable');process.exit(1);}
if(inventory.schema!=='therabridge-installed-license-file-inventory-v1'||!Array.isArray(inventory.packages)||
 inventory.approved!==0||inventory.count!==inventory.packages.length||
 inventory.withFile+inventory.missingFile!==inventory.count||inventory.packages.length===0){
 console.error('Invalid or misleading installed license evidence');process.exit(1);
}
const blocked=/\b(?:GPL|AGPL|LGPL|SSPL|BUSL|BSL|NONCOMMERCIAL|CC-BY-NC|POLYFORM|ELASTIC|Commons Clause)\b/i;
const validHash=/^[a-f0-9]{64}$/;
const byPath=new Set(),rows=[];
for(const p of inventory.packages){
 if(typeof p.name!=='string'||!p.name||typeof p.version!=='string'||!p.version||
 typeof p.installedPath!=='string'||!p.installedPath||p.installedPath.includes('..')||
 p.installedPath.startsWith('/')||p.commercialApproval!==false||
 p.actualLicenseTextReviewed!==false||!Array.isArray(p.foundLicenseFiles)||
 !['EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED','NO_LICENSE_FILE_FOUND'].includes(p.reviewStatus)){
  console.error('Incomplete, unsafe or falsely approved package evidence');process.exit(1);
 }
 if(byPath.has(p.installedPath)){console.error('Duplicate installed package path');process.exit(1);}
 byPath.add(p.installedPath);
 const files=[],names=new Set();
 for(const f of p.foundLicenseFiles){
  if(typeof f.file!=='string'||!/^(?:licen[cs]e|copying|notice|copyright)(?:\.[a-z0-9_-]+)?$/i.test(f.file)||
   names.has(f.file.toLowerCase())||!validHash.test(f.sha256)||!Number.isSafeInteger(f.bytes)||f.bytes<=0){
   console.error('Invalid LICENSE/NOTICE evidence');process.exit(1);
  }
  names.add(f.file.toLowerCase());files.push({file:f.file,sha256:f.sha256,bytes:f.bytes});
 }
 files.sort((a,b)=>a.file.localeCompare(b.file,'en'));
 if((files.length>0)!==(p.reviewStatus==='EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED')){
  console.error('License file count contradicts review status');process.exit(1);
 }
 const license=typeof p.manifestLicenseDeclared==='string'&&p.manifestLicenseDeclared.trim()?
  p.manifestLicenseDeclared.trim():null;
 const attention=files.length===0?'NO_LICENSE_FILE':
  !license?'MISSING_MANIFEST_LICENSE':
  blocked.test(license)?'RESTRICTIVE_LICENSE_CANDIDATE':
  /\b(?:OR|AND|WITH)\b/i.test(license)?'COMPOUND_OR_EXCEPTION_CANDIDATE':'FILE_PRESENT_UNREVIEWED';
 const record={name:p.name,version:p.version,installedPath:p.installedPath,
  manifestLicenseCandidate:license,licenseFiles:files,triage:attention,
  publishedPackageTextVerified:false,actualLicenseTextReviewed:false,
  saasObligationsReviewed:false,enterpriseRedistributionReviewed:false,
  legalApproval:false,decision:'UNRESOLVED'};
 rows.push(record);
}
if(rows.filter(x=>x.licenseFiles.length>0).length!==inventory.withFile||
 rows.filter(x=>x.licenseFiles.length===0).length!==inventory.missingFile){
 console.error('Inventoried file counts are inconsistent');process.exit(1);
}
rows.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en')||a.installedPath.localeCompare(b.installedPath,'en'));
const summary={};
for(const r of rows)summary[r.triage]=(summary[r.triage]||0)+1;
const report={schema:'therabridge-installed-license-review-v1',status:'TECHNICAL_TRIAGE_NOT_LEGAL_CLEARANCE',
 sourceSha256:createHash('sha256').update(readFileSync(input)).digest('hex'),
 totalInstalled:rows.length,legallyApproved:0,summary,records:rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'REVIEW_REQUIRED',total:rows.length,summary,legallyApproved:0}));
