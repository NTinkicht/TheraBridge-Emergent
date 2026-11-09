import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./classify-sbom.mjs',import.meta.url));
const component=(name,version,licenses=[],properties=[])=>({name,version,type:'library',
 purl:'pkg:npm/'+name+'@'+version,licenses,properties});
function run(components){
 const dir=mkdtempSync(join(tmpdir(),'tb-license-'));
 const file=join(dir,'in.json'),report=join(dir,'report.json'),notes=join(dir,'review.md');
 writeFileSync(file,JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',components}));
 const p=spawnSync(process.execPath,[script,file,report,notes],{encoding:'utf8'});
 const data=p.status===0?JSON.parse(readFileSync(report,'utf8')):null;
 const md=p.status===0?readFileSync(notes,'utf8'):null;
 rmSync(dir,{recursive:true,force:true});return{p,data,md};
}
test('candidate licenses never imply legal approval',()=>{
 const {p,data,md}=run([component('lib','1',[{license:{id:'MIT'}}])]);
 assert.equal(p.status,0,p.stderr);
 assert.equal(data.summary.legallyApproved,0);
 assert.equal(data.components[0].classification,'CANDIDATE_REVIEW');
 assert.equal(data.components[0].approved,false);
 assert.match(md,/NOT APPROVED/);
});
test('classifies AGPL, GPL, SSPL and non-commercial expressions for review',()=>{
 const c=['AGPL-3.0-only','GPL-3.0-or-later','SSPL-1.0','CC-BY-NC-4.0']
   .map((id,i)=>component('x'+i,'1',[{license:{id}}]));
 const {p,data}=run(c);assert.equal(p.status,0,p.stderr);
 assert.equal(data.summary.restrictive,4);
 assert(data.components.every(x=>x.reviewRequired&&!x.approved));
});
test('missing license and lockfile-only entries stay review-required',()=>{
 const {p,data}=run([component('missing','1',[],[
  {name:'therabridge:provenance',value:'yarn.lock-only; absent from Syft scan'}])]);
 assert.equal(p.status,0,p.stderr);
 assert.equal(data.summary.unknown,1);
 assert.equal(data.summary.lockfileOnly,1);
 assert.equal(data.components[0].provenance,'LOCKFILE_ONLY');
});
test('rejects missing component identities and empty inventories',()=>{
 assert.notEqual(run([]).p.status,0);
 assert.notEqual(run([{type:'library',name:''}]).p.status,0);
 const partial=run([{type:'library',name:'bad'}]);
 assert.equal(partial.p.status,0,partial.p.stderr);
 assert.equal(partial.data.components[0].classification,'UNKNOWN_REVIEW');
 assert.equal(partial.data.components[0].approved,false);
});
