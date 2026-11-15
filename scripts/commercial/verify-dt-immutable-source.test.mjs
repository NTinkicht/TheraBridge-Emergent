import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selection,publisherHash,verify,gitBlob} from './verify-dt-immutable-source.mjs';
const key=(c)=>createHash('sha256').update(c).digest('hex');
const sha=(n)=>String(n).repeat(40);
const name='@types/sample',version='1.2.3';
const source='export interface Demo { x: string; }\n';
const pkg='{"version":"1.2.9999","name":"@types/sample"}';
const expected=publisherHash({'index.d.ts':source},pkg);
function fixture(){
 const records=[{name,version,publisherContentHashCandidate:expected,
  publisherContentHashStatus:'EXACT_VERSION_PUBLISHER_HASH_CANDIDATE',
  npmPublisherToSourceIndependentlyVerified:false,sourceContentHashIndependentlyMatched:false}];
 for(let i=0;i<24;i++)records.push({name:'@types/pkg'+i,version:'1.0.0',
  publisherContentHashCandidate:key('package'+i),
  publisherContentHashStatus:'EXACT_VERSION_PUBLISHER_HASH_CANDIDATE',
  npmPublisherToSourceIndependentlyVerified:false,sourceContentHashIndependentlyMatched:false});
 return {schema:'therabridge-com02-definitelytyped-26-pinned-triage-v1',
  counts:{definitelyTypedVersions:25,publisherToSourceAttested:0},commercialApproval:false,records};
}
function mockGitHub({corrupt=false}={}){
 const src=Buffer.from(source),json=Buffer.from(pkg);
 const blobs=new Map([[gitBlob(src),src],[gitBlob(json),json]]);
 const data=new Map([
 ['commits',new Map([[sha('a'),{sha:sha('a'),tree:{sha:sha('b')}}]])],
 ['trees',new Map([
  [sha('b'),{tree:[{path:'types',type:'tree',sha:sha('c')}],truncated:false}],
  [sha('c'),{tree:[{path:'sample',type:'tree',sha:sha('d')}],truncated:false}],
  [sha('d'),{tree:[{path:'index.d.ts',type:'blob',sha:gitBlob(src)},
                       {path:'package.json',type:'blob',sha:gitBlob(json)}],truncated:false}]
 ])],
 ['blobs',new Map([...blobs].map(([id,b])=>[id,{sha:id,encoding:'base64',
  content:(corrupt?Buffer.from('corrupted'):b).toString('base64')}]))]
 ]);
 return async url=>{
  const match=url.match(/\/git\/(commits|trees|blobs)\/([0-9a-f]{40})$/);
  const item=match&&data.get(match[1]).get(match[2]);
  return {status:item?200:404,arrayBuffer:async()=>Buffer.from(JSON.stringify(item||{error:'not found'}))};
 };
}
test('replays publisher shallow-sort and newline normalization',()=>{
 const content={'index.d.ts':'declare const value: string;\r\n'};
 const original='{"z":2,"a":1}';
 const reordered='{"a":1,"z":2}';
 assert.equal(publisherHash(content,original),publisherHash({'index.d.ts':'declare const value: string;\n'},reordered));
 assert.throws(()=>publisherHash({'README.md':'hello'},original),/INVALID_SOURCE_DECLARATIONS/);
});
test('valid exact Git object bytes can match publisher hash without publisher/build or legal approval',async()=>{
 const r=await verify(fixture(),{name,version,commit:sha('a'),sourceRoot:'types/sample'},
  {fetcher:mockGitHub()});
 assert.equal(r.immutableSourceByteMatch,true);
 assert.equal(r.sourceToPublisherPublicationAttested??r.publisherToSourceAttested,false);
 assert.equal(r.independentlyVerifiedNpmBuiltFromThisCommit,false);
 assert.equal(r.commercialApproval,false);
 assert.equal(r.files.length,2);
});
test('mismatched publisher hash is not a positive source attribution',async()=>{
 const triage=fixture();
 triage.records[0].publisherContentHashCandidate='f'.repeat(64);
 const r=await verify(triage,{name,version,commit:sha('a'),sourceRoot:'types/sample'},
  {fetcher:mockGitHub()});
 assert.equal(r.immutableSourceByteMatch,false);
 assert.equal(r.publisherToSourceAttested,false);
});
test('rejects malicious content, missing Git objects, unpinned source and malformed source selector',async()=>{
 const args={name,version,commit:sha('a'),sourceRoot:'types/sample'};
 await assert.rejects(()=>verify(fixture(),args,{fetcher:mockGitHub({corrupt:true})}),/IMMUTABLE_BLOB_HASH_MISMATCH/);
 await assert.rejects(()=>verify(fixture(),{...args,commit:sha('e')},{fetcher:mockGitHub()}),/EXACT_GIT_OBJECT_UNAVAILABLE/);
 await assert.rejects(()=>verify(fixture(),{...args,commit:'main'},{fetcher:mockGitHub()}),/INVALID_IMMUTABLE_COMMIT/);
 await assert.rejects(()=>verify(fixture(),{...args,sourceRoot:'types/other'},{fetcher:mockGitHub()}),/UNEXPECTED_SOURCE_PACKAGE_PATH/);
});
test('cannot forge confirmed provenance or commercial approval in triage',()=>{
 const input=fixture();
 input.records[0].npmPublisherToSourceIndependentlyVerified=true;
 assert.throws(()=>selection(input,name,version),/UNSAFE_PUBLISHER_ROW/);
 const next=fixture();next.commercialApproval=true;
 assert.throws(()=>selection(next,name,version),/UNSAFE_EXACT_PUBLISHER_TRIAGE/);
 const dup=fixture();dup.records[2].name=dup.records[1].name;
 assert.throws(()=>selection(dup,name,version),/UNSAFE_PUBLISHER_ROW/);
});
test('must match exact version and canonical 25-element fingerprint set',()=>{
 const input=fixture();input.records.pop();
 assert.throws(()=>selection(input,name,version),/UNSAFE_EXACT_PUBLISHER_TRIAGE/);
 const exact=fixture();exact.records[0].publisherContentHashCandidate=null;
 assert.throws(()=>selection(exact,name,version),/MISSING_EXACT_PUBLISHER_CONTENT_HASH/);
});