#!/usr/bin/env node
// COM-02: compare a locally rebuilt npm .tgz against independently verified
// published bytes. This does not attest the origin of the rebuilt input.
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
import {readArchive} from './inventory-nextjs-published-builds.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ALLOW = new Set(['@next/env@14.2.35','@next/swc-linux-x64-gnu@14.2.33','@next/swc-linux-x64-musl@14.2.33']);
const ARCHIVE_MAX = 48*1024*1024;
const EXPECTED_STATUS='INTEGRITY_VERIFIED_PUBLISHED_FILE_INVENTORY_NOT_REPRODUCIBILITY';

function compare(readiness, key, rebuilt) {
 if (!ALLOW.has(key)) throw Error('UNEXPECTED_EXACT_PACKAGE');
 if (readiness?.schema!=='therabridge-com02-published-nextjs-archive-reproducibility-readiness-v1' ||
     readiness?.counts?.signedCandidates!==3 || readiness?.counts?.legallyApproved!==0 ||
     readiness?.commercialLicenseGranted!==false || readiness?.finalNoticesIssued!==false ||
     readiness?.g2ClinicalApproved!==false || readiness?.g2bClinicalApproved!==false ||
     !Array.isArray(readiness.records) || readiness.records.length!==3)
   throw Error('UNTRUSTED_PUBLISHED_READINESS');
 const [name,version]=key.split('@').slice(1).length===2
   ? ['@'+key.split('@')[1], key.split('@')[2]]
   : [null,null];
 const matches=readiness.records.filter(r=>r.name===name && r.version===version);
 if (matches.length!==1) throw Error('MISSING_OR_DUPLICATE_EXACT_PACKAGE');
 const target=matches[0];
 if (target.archiveStatus!==EXPECTED_STATUS ||
     !/^[a-f0-9]{64}$/.test(target.publishedArchiveSha256||'') ||
     !/^[a-f0-9]{64}$/.test(target.publishedFilesSha256||'') ||
     !Array.isArray(target.publishedFiles) || target.publishedFiles.length!==target.packageFileCount ||
     sha(Buffer.from(JSON.stringify(target.publishedFiles)))!==target.publishedFilesSha256)
   throw Error('UNTRUSTED_PUBLISHED_FILE_INVENTORY');
 if (!Buffer.isBuffer(rebuilt) || rebuilt.length===0 || rebuilt.length>ARCHIVE_MAX)
   throw Error('INVALID_REBUILT_ARCHIVE_SIZE');
 const archive=readArchive(rebuilt);
 const rebuiltFiles=archive.files.map(({path,bytes,sha256,extension})=>({path,bytes,sha256,extension}));
 const publishedMap=new Map(target.publishedFiles.map(f=>[f.path,f]));
 if (publishedMap.size!==target.publishedFiles.length) throw Error('DUPLICATE_PUBLISHED_FILE');
 const rebuiltMap=new Map(rebuiltFiles.map(f=>[f.path,f]));
 const missing=target.publishedFiles.filter(f=>!rebuiltMap.has(f.path)).map(f=>f.path);
 const extra=rebuiltFiles.filter(f=>!publishedMap.has(f.path)).map(f=>f.path);
 const different=rebuiltFiles.filter(f=>{
   const p=publishedMap.get(f.path);
   return p && (p.sha256!==f.sha256 || p.bytes!==f.bytes);
 }).map(f=>f.path);
 const archiveSha=sha(rebuilt);
 const byteIdentical=archiveSha===target.publishedArchiveSha256;
 const sameFiles=missing.length===0 && extra.length===0 && different.length===0;
 if(byteIdentical && !sameFiles)throw Error('PUBLISHED_EVIDENCE_CONTRADICTS_ARCHIVE_DIGEST');
 return {
   schema:'therabridge-com02-controlled-rebuild-comparison-v1',
   package:key,
   publishedArchiveSha256:target.publishedArchiveSha256,
   rebuiltArchiveSha256:archiveSha,
   outcome:byteIdentical?'ARCHIVE_BYTES_MATCH_BUILD_ORIGIN_UNATTESTED':
     sameFiles?'FILE_BYTES_MATCH_ARCHIVE_BYTES_DIFFER':'REBUILT_FILES_DIFFER',
   publishedFileCount:target.publishedFiles.length,
   rebuiltFileCount:rebuiltFiles.length,
   missing,extra,different,
   archiveByteIdentical:byteIdentical,
   fileContentsIdentical:sameFiles,
   buildOriginIndependentlyAttested:false,
   independentlyReproducedFromSignedSource:false,
   legallyApproved:false,commercialLicenseGranted:false,
   g2ClinicalApproved:false,g2bClinicalApproved:false
 };
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
   const [readinessPath,key,archivePath,outputPath]=process.argv.slice(2);
   if(process.argv.length!==6 || new Set([readinessPath,archivePath,outputPath]).size!==3)
     throw Error('USAGE: comparator.mjs readiness.json @next/name@version rebuilt.tgz output.json');
   const st=statSync(archivePath);
   if(!st.isFile()||st.size<1||st.size>ARCHIVE_MAX)throw Error('INVALID_REBUILT_ARCHIVE_SIZE');
   const report=compare(JSON.parse(readFileSync(readinessPath,'utf8')),key,readFileSync(archivePath));
   writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({outcome:report.outcome,package:report.package}));
   if(!report.archiveByteIdentical)process.exitCode=1;
 }catch(e){console.error('COM02_REBUILD_COMPARE_FAILED',e.message);process.exitCode=2;}
}
export {compare};
