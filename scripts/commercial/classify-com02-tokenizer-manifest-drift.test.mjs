import test from 'node:test';
import assert from 'node:assert/strict';
import {diffFields,classify} from './classify-com02-tokenizer-manifest-drift.mjs';
const badEnvelope={schema:'therabridge-com02-nondt-publication-evidence-workqueue-v1',
 counts:{allExceptions:44,definitelyTypedExcluded:21,nonDefinitelyTyped:23},records:[],
 commercialApproval:false,saasReleaseApproved:false,enterpriseReleaseApproved:false};
test('nested and array changes recorded as JSON pointers with hashed values only',()=>{
 const before={name:'@tokenizer/token',version:'0.3.0',scripts:{build:'node build.js'},flags:['a','b'],license:'MIT'};
 const after={name:'@tokenizer/token',version:'0.3.0',scripts:{build:'node other.js'},flags:['a'],newField:'test'};
 const result=diffFields(before,after);
 assert.deepEqual(result.map(x=>[x.path,x.kind]),[
  ['/flags/1','SOURCE_ONLY'],['/license','SOURCE_ONLY'],['/newField','PUBLISHED_ONLY'],['/scripts/build','VALUE_CHANGED']
 ]);
 assert(result.every(x=>!JSON.stringify(x).includes('node other.js')&&!JSON.stringify(x).includes('MIT')));
 assert(result.every(x=>x.sourceLeafSha256===null||/^[a-f0-9]{64}$/.test(x.sourceLeafSha256)));
 assert(result.every(x=>x.publishedLeafSha256===null||/^[a-f0-9]{64}$/.test(x.publishedLeafSha256)));
});
test('JSON escape and nested key order cannot hide a changed value',()=>{
 const before={'a/b':{'~key':1},b:{x:true,y:false}};
 const after={b:{y:false,x:true},'a/b':{'~key':2}};
 const result=diffFields(before,after);
 assert.equal(result.length,1);assert.equal(result[0].path,'/a~1b/~0key');
});
test('empty arrays/objects, removed leaves and changes of primitive type are explicit',()=>{
 const a={a:[],b:{},c:null,d:2};
 const b={a:[1],b:{x:0},d:'2'};
 assert.deepEqual(diffFields(a,b).map(x=>x.path),['/a','/a/0','/b','/b/x','/c','/d']);
});
test('input depth and size bounded independently of TAR extraction',()=>{
 let nested={x:1};
 for(let i=0;i<14;i++)nested={a:nested};
 assert.throws(()=>diffFields(nested,{}),/COM02_402_JSON_DEPTH_LIMIT/);
 assert.throws(()=>diffFields({a:Array.from({length:2001},()=>0)},{}),/COM02_402_JSON_ARRAY_LIMIT/);
});
test('untrusted current population refuses forged approvals before reading bytes',()=>{
 const obs={schema:'therabridge-com02-independent-root-observations-v1',
  observedOn:'2026-11-15',records:[],commercialLicenseGranted:false,publisherToSourceIndependentlyAttested:0};
 const receipt={schema:'therabridge-com02-nondt-published-manifest-byte-comparison-v1',records:[],
 counts:{allNonDT:23,sourceRootCandidates:10,publisherToSourceAttested:0},commercialApproval:false};
 for(const mutate of [
  q=>q.commercialApproval=true,
  q=>q.counts.allExceptions=45,
  q=>q.records=[{name:'@tokenizer/token',version:'0.3.0',commerciallyCleared:true}]
 ]){const q=structuredClone(badEnvelope);mutate(q);
  assert.throws(()=>classify(q,obs,receipt,'',Buffer.alloc(0),Buffer.alloc(0)));
 }
});
