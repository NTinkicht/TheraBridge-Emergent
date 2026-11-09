import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const checker=fileURLToPath(new URL('./check-sbom.mjs',import.meta.url));
function check(x,kind='source'){
 const dir=mkdtempSync(join(tmpdir(),'tb-cdx-'));
 try{
  const f=join(dir,'in.json');writeFileSync(f,JSON.stringify(x));
  return spawnSync(process.execPath,[checker,f,kind],{encoding:'utf8'});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const valid={bomFormat:'CycloneDX',specVersion:'1.6',components:[
 {type:'library',name:'react',version:'18.3.1',purl:'pkg:npm/react@18.3.1'}]};
test('accepts non-empty npm CycloneDX source with clear qualification',()=>{
 const p=check(valid); assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/Scanner discovery only/);
});
test('rejects missing npm dependency in source, not image',()=>{
 const x={...valid,components:[{type:'operating-system',name:'debian',version:'12'}]};
 assert.equal(check(x).status,1);assert.equal(check(x,'image').status,0);
});
test('fail closed on wrong format, missing versioned components, empty list',()=>{
 for(const x of [{...valid,bomFormat:'SPDX'},{...valid,components:[]},
 {...valid,components:[{name:'react',type:'library'}]},
 {...valid,specVersion:'broken'}])assert.equal(check(x).status,1);
});
