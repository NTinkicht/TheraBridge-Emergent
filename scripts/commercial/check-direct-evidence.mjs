#!/usr/bin/env node
// Fail CI when direct dependency declarations lack evidence entries. Do NOT approve licenses.
import {readFileSync} from 'node:fs';
const indexPath=process.argv[2]||'docs/commercial/direct-license-evidence.json';
const root=process.argv[3]||'.';
if(process.argv.length>4){console.error('Usage: node scripts/commercial/check-direct-evidence.mjs [index.json] [repo-root]');process.exit(2);}
let doc;
try{doc=JSON.parse(readFileSync(indexPath,'utf8'));}
catch{console.error('Cannot read direct license evidence JSON');process.exit(1);}
if(doc.schema!=='therabridge-direct-license-evidence-v1'||doc.status!=='NOT_LEGAL_CLEARANCE'||!Array.isArray(doc.records)){
 console.error('Invalid or misrepresented license evidence document');process.exit(1);
}
const expected=new Map(),allowed=new Set(['UPSTREAM_REFERENCE_ONLY','PENDING_UPSTREAM_REVIEW']);
for(const path of ['package.json','apps/api/package.json','apps/web/package.json']){
 let manifest;
 try{manifest=JSON.parse(readFileSync(root+'/'+path,'utf8'));}
 catch{console.error('Could not read '+path);process.exit(1);}
 for(const scope of ['dependencies','devDependencies','peerDependencies','optionalDependencies'])for(const [name,requestedRange] of Object.entries(manifest[scope]||{})){
  expected.set(JSON.stringify([path,scope,name]),requestedRange);
 }
}
const seen=new Set();
for(const row of doc.records){
 const id=JSON.stringify([row.manifest,row.scope,row.name]);
 if(seen.has(id)||!expected.has(id)||expected.get(id)!==row.requestedRange){
  console.error('Missing, duplicate, unexpected, or stale direct dependency evidence: '+id);process.exit(1);
 }
 if(!allowed.has(row.reviewStatus)||row.commercialApproval!==false||
  row.exactPackageVersionVerified!==false||row.actualLicenseFileVerified!==false||
  row.licenseNoticeVerified!==false||row.redistributionReviewed!==false){
  console.error('Improper claim of verified or commercially approved license: '+id);process.exit(1);
 }
 if(row.reviewStatus==='UPSTREAM_REFERENCE_ONLY' &&
  (typeof row.evidenceUrl!=='string'||!row.evidenceUrl.startsWith('https://')||
   typeof row.upstreamLicenseCandidate!=='string'||!row.upstreamLicenseCandidate)){
   console.error('Incomplete upstream reference: '+id);process.exit(1);
 }
 if(row.reviewStatus==='PENDING_UPSTREAM_REVIEW' &&
    (row.evidenceLevel!=='not_checked'||row.evidenceUrl!==null||row.upstreamLicenseCandidate!==null)){
   console.error('Pending row must not carry license assertions: '+id);process.exit(1);
 }
 seen.add(id);
}
if(seen.size!==expected.size){
 console.error('Unreviewed direct dependencies: '+[...expected.keys()].filter(x=>!seen.has(x)).join(', '));process.exit(1);
}
console.log(JSON.stringify({result:'PASS',directEntries:seen.size,approval:'NONE',evidence:'UPSTREAM_REFERENCE_OR_PENDING_ONLY'}));
