import test from 'node:test';
import assert from 'node:assert/strict';
import {describeDiff,changesBetween,pins} from './explain-com02-tokenizer-402.mjs';
const buf=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x));
const base=()=>({name:pins.name,version:pins.version,license:'MIT',
 repository:{type:'git',url:'https://example.org/owner/repo.git'},
 files:['index.d.ts'],scripts:{build:'tsc'}});
test('an exact byte match is distinguished from published-archive provenance',()=>{
 const x=buf(base()),out=describeDiff(x,x);
 assert.equal(out.status,'RAW_BYTES_EXACT_MATCH');assert.equal(out.semanticChangedPaths,0);
});
test('different JSON whitespace or property ordering remains semantically equivalent',()=>{
 const src=buf(JSON.stringify(base(),null,2)+'\n');
 const pub=buf(base());
 const out=describeDiff(src,pub);
 assert.equal(out.status,'RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL');
 assert.equal(out.semanticChangedPaths,0);
});
test('added, removed, nested, scalar and array values emit only field paths/types',()=>{
 const a=base(),b={...base(),extra:{sensitive:'do-not-copy'},files:['new.d.ts']};
 delete b.license;b.repository={type:'artifact',url:'https://example.net'};
 const out=describeDiff(buf(a),buf(b));
 assert.equal(out.status,'SEMANTIC_MANIFEST_FIELD_DIFFERENCES');
 assert.deepEqual(out.differences.map(x=>[x.path,x.kind]),[
  ['extra','PUBLISHED_FIELD_ADDED'],['files','VALUE_CHANGED'],['license','PUBLISHED_FIELD_REMOVED'],
  ['repository.type','VALUE_CHANGED'],['repository.url','VALUE_CHANGED']]);
 assert(!JSON.stringify(out).includes('do-not-copy'));
});
test('false name/version, invalid JSON, malformed nested keys and unsafe data size fail closed',()=>{
 const a=base();
 assert.throws(()=>describeDiff(buf({...a,name:'other'}),buf(a)),/MANIFEST_IDENTITY_DRIFT/);
 assert.throws(()=>describeDiff(buf(a),buf({...a,version:'9.9.9'})),/MANIFEST_IDENTITY_DRIFT/);
 assert.throws(()=>describeDiff(buf('invalid json'),buf(a)),/INVALID_MANIFEST_JSON/);
 assert.throws(()=>changesBetween({safe:1},{'../unsafe':2}),/UNSAFE_KEY/);
 assert.throws(()=>describeDiff(Buffer.alloc(1024*1024+1),buf(a)),/INPUT_BYTES_LIMIT/);
});
test('deep or unbounded adversarial structures are rejected',()=>{
 let a={value:0},b={value:1};
 for(let i=0;i<26;i++){a={child:a};b={child:b};}
 assert.throws(()=>changesBetween(a,b),/MANIFEST_TOO_COMPLEX/);
});

test('npm scoped dependency keys are valid field identifiers while traversal remains prohibited',()=>{
 const s=base(),p=base();s.devDependencies={'@types/node':'^13.1.0'};p.devDependencies={'@types/node':'^14.0.0'};
 const out=describeDiff(buf(s),buf(p));
 assert.equal(out.status,'SEMANTIC_MANIFEST_FIELD_DIFFERENCES');
 assert.deepEqual(out.differences.map(x=>x.path),['devDependencies.@types/node']);
 const bad={...p,devDependencies:{'../unsafe':'ignored'}};
 assert.throws(()=>describeDiff(buf(s),buf(bad)),/UNSAFE_KEY/);
});
