import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeCaptures,checkedCapture} from './merge-release-captures.mjs';
const HEX='a'.repeat(64);
function fixture(edition){
 return {schema:'therabridge-com02-release-file-evidence-v1',
  commercialApproval:false,
  images:[{edition,imageRef:'registry.example:5000/therabridge/api:v1',
   ociDigest:'sha256:'+HEX,filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
   releaseApproval:false,
   files:[{path:'opt/app/a',sha256:HEX,bytes:7}],
   captureLimitations:{
    source:'LOCAL_DOCKER_EXPORT_NOT_DEPLOYMENT_ATTESTATION',
    nonRegularEntriesOmitted:{symlinks:0,hardlinks:0,directories:1,other:0},
    volumesAndRuntimeMountsNotIncluded:true,
    independentSignatureVerified:false,commercialApproval:false
   }}]};
}
test('joins two real-edition candidates without implying signed release',()=>{
 const out=mergeCaptures(fixture('SAAS'),fixture('ENTERPRISE'));
 assert.equal(out.images.length,2);
 assert.deepEqual(out.images.map(x=>x.edition),['SAAS','ENTERPRISE']);
 assert.equal(out.captureSummary.independentlyVerifiedReleaseImages,0);
 assert.equal(out.captureSummary.commercialLicenseGranted,false);
 assert.equal(out.captureSummary.captures[0].scope,'LOCAL_DOCKER_EXPORT_UNATTESTED');
 assert.equal(out.images[1].captureLimitations.independentSignatureVerified,false);
});
test('rejects swapped edition, duplicate, empty and extra injection rows',()=>{
 for (const change of [
  x=>x.images[0].edition='ENTERPRISE',
  x=>x.images.push({...x.images[0]}),
  x=>x.images=[],
  x=>x.commercialApproval=true,
  x=>x.signed=true,
  x=>x.images[0].releaseApproval=true,
  x=>x.images[0].filesystemCaptureStatus='ATTESTED',
  x=>x.images[0].captureLimitations.independentSignatureVerified=true,
  x=>x.images[0].captureLimitations.commercialApproval=true,
  x=>x.images[0].captureLimitations.volumesAndRuntimeMountsNotIncluded=false,
  x=>x.images[0].captureLimitations.nonRegularEntriesOmitted.other=-1,
  x=>x.images[0].ociDigest='sha256:'+'b'.repeat(63),
  x=>x.images[0].imageRef='image;exit 0'
 ]){
  const saas=fixture('SAAS');
  change(saas);
  assert.throws(()=>mergeCaptures(saas,fixture('ENTERPRISE')));
 }
});
test('rejects file traversal, duplicated paths and forged byte inventory',()=>{
 for(const change of [
  x=>x.path='../secret',
  x=>x.path='/root/file',
  x=>x.path='a//b',
  x=>x.path='a\\b',
  x=>x.sha256='no',
  x=>x.bytes=-1,
  x=>x.bytes=600*1024*1024
 ]){
  const f=fixture('SAAS');
  change(f.images[0].files[0]);
  assert.throws(()=>checkedCapture(f,'SAAS'));
 }
 const x=fixture('SAAS');
 x.images[0].files.push({...x.images[0].files[0]});
 assert.throws(()=>checkedCapture(x,'SAAS'),/UNSAFE_CAPTURE_FILE/);
});
test('file list order is canonicalized without changing encoded file evidence',()=>{
 const a=fixture('SAAS'), b=fixture('SAAS');
 a.images[0].files.push({path:'opt/app/z',sha256:'b'.repeat(64),bytes:8});
 b.images[0].files.unshift({path:'opt/app/z',sha256:'b'.repeat(64),bytes:8});
 assert.deepEqual(checkedCapture(a,'SAAS').files,checkedCapture(b,'SAAS').files);
});
