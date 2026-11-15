import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {compare} from './compare-nextjs-rebuild.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const integrity=b=>'sha512-'+createHash('sha512').update(b).digest('base64');
function tar(files){
 const blocks=[];
 for(const [name,text] of Object.entries(files)){
  const body=Buffer.from(text);
  const h=Buffer.alloc(512);
  h.write('package/'+name,0,100,'utf8');
  h.write('0000644\0',100,'ascii');
  h.write('0000000\0',108,'ascii');
  h.write('0000000\0',116,'ascii');
  h.write(body.length.toString(8).padStart(11,'0')+'\0',124,'ascii');
  h[156]=48;
  blocks.push(h,body,Buffer.alloc((512-body.length%512)%512));
 }
 blocks.push(Buffer.alloc(1024));
 return gzipSync(Buffer.concat(blocks),{mtime:0});
}
function fixture(){
 const bytes=tar({'package.json':'{"name":"@next/env","version":"15.5.29"}','dist/index.js':'original'});
 const files=[
  {path:'dist/index.js',bytes:8,sha256:sha(Buffer.from('original')),extension:'js'},
  {path:'package.json',bytes:40,sha256:sha(Buffer.from('{"name":"@next/env","version":"15.5.29"}')),extension:'json'}
 ];
 // Avoid assuming manifest byte lengths in the fixture.
 files[1].bytes=Buffer.byteLength('{"name":"@next/env","version":"15.5.29"}');
 const target={name:'@next/env',version:'15.5.29',archiveStatus:'INTEGRITY_VERIFIED_PUBLISHED_FILE_INVENTORY_NOT_REPRODUCIBILITY',
  publishedArchiveSha256:sha(bytes),publishedFiles:files,packageFileCount:files.length,
  publishedFilesSha256:sha(Buffer.from(JSON.stringify(files)))};
 const readiness={schema:'therabridge-com02-published-nextjs-archive-reproducibility-readiness-v1',
  counts:{signedCandidates:3,legallyApproved:0},commercialLicenseGranted:false,
  finalNoticesIssued:false,g2ClinicalApproved:false,g2bClinicalApproved:false,
  records:[target,{name:'@next/swc-linux-x64-gnu',version:'15.5.29'},
    {name:'@next/swc-linux-x64-musl',version:'15.5.29'}]};
 const lockfile='"@next/env@15.5.29":\n  version "15.5.29"\n  resolved "https://registry.yarnpkg.com/@next/env/-/env-15.5.29.tgz#'+'e'.repeat(40)+'"\n  integrity '+integrity(bytes)+'\n';
 return {readiness,bytes,lockfile};
}
test('exact archive bytes match, but never claim independently attested source reproduction',()=>{
 const {readiness,bytes,lockfile}=fixture();
 const result=compare(readiness,'@next/env@15.5.29',bytes,bytes,lockfile);
 assert.equal(result.archiveByteIdentical,true);
 assert.equal(result.fileContentsIdentical,true);
 assert.equal(result.independentlyReproducedFromSignedSource,false);
 assert.equal(result.legallyApproved,false);
 assert.equal(result.outcome,'ARCHIVE_BYTES_MATCH_BUILD_ORIGIN_UNATTESTED');
});
test('file content difference is reported, no match claim',()=>{
 const {readiness,bytes,lockfile}=fixture();
 const result=compare(readiness,'@next/env@15.5.29',
  tar({'package.json':'{"name":"@next/env","version":"15.5.29"}','dist/index.js':'modified'}),bytes,lockfile);
 assert.equal(result.archiveByteIdentical,false);
 assert.deepEqual(result.different,['dist/index.js']);
 assert.equal(result.outcome,'REBUILT_FILES_DIFFER');
});
test('same contents but different archive serialization cannot count as identical tarball',()=>{
 const {readiness,bytes,lockfile}=fixture();
 // Re-gzip using a different compression level, preserving file tar content.
 const different=gzipSync(gunzipSync(bytes),{level:1});
 const result=compare(readiness,'@next/env@15.5.29',different,bytes,lockfile);
 assert.equal(result.fileContentsIdentical,true);
 assert.equal(result.archiveByteIdentical,false);
 assert.equal(result.outcome,'FILE_BYTES_MATCH_ARCHIVE_BYTES_DIFFER');
});
test('reject forged approval and unsupported exact versions',()=>{
 const {readiness,bytes,lockfile}=fixture();
 assert.throws(()=>compare({...readiness,commercialLicenseGranted:true},'@next/env@15.5.29',bytes,bytes,lockfile),/UNTRUSTED/);
 assert.throws(()=>compare(readiness,'@next/env@15.5.28',bytes,bytes,lockfile),/UNEXPECTED/);
});
test('reject manipulated file inventory and invalid bytes',()=>{
 const {readiness,bytes,lockfile}=fixture();
 readiness.records[0].publishedFiles[0].sha256='0'.repeat(64);
 assert.throws(()=>compare(readiness,'@next/env@15.5.29',bytes,bytes,lockfile),/UNTRUSTED/);
 const clean=fixture().readiness;
 assert.throws(()=>compare(clean,'@next/env@15.5.29',Buffer.alloc(0),bytes,lockfile),/INVALID/);
});

test('Codex P2: fake inventory with recalculated hashes and fake tarball never matches pinned SRI',()=>{
 const {readiness,bytes,lockfile}=fixture();
 const fake=tar({'not-next.txt':'fraud'});
 const fakeFiles=[{path:'not-next.txt',bytes:5,sha256:sha(Buffer.from('fraud')),extension:'txt'}];
 readiness.records[0].publishedArchiveSha256=sha(fake);
 readiness.records[0].publishedFiles=fakeFiles;
 readiness.records[0].packageFileCount=fakeFiles.length;
 readiness.records[0].publishedFilesSha256=sha(Buffer.from(JSON.stringify(fakeFiles)));
 assert.throws(()=>compare(readiness,'@next/env@15.5.29',fake,fake,lockfile),/SRI_MISMATCH/);
 // Even when the honest published archive is available, the forged inventory is rejected.
 assert.throws(()=>compare(readiness,'@next/env@15.5.29',fake,bytes,lockfile),/READINESS_NOT_BOUND/);
});
test('SRI trust root cannot be replaced with an unpinned different npm archive',()=>{
 const {readiness,bytes,lockfile}=fixture();
 const fake=tar({'package.json':'not trusted'});
 assert.throws(()=>compare(readiness,'@next/env@15.5.29',bytes,fake,lockfile),/SRI_MISMATCH/);
 assert.throws(()=>compare(readiness,'@next/env@15.5.29',bytes,bytes,lockfile.replace(/sha512-[A-Za-z0-9+/=]+/,'sha512-A'+integrity(bytes).slice(8))),/SRI_MISMATCH|UNTRUSTED_PINNED/);
});
