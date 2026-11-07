import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,readdirSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./generate-secrets.mjs',import.meta.url));
const original='render-demo-passwords.json',extra='render-demo-extra-passwords.json';
function inDir(callback) {
 const directory=mkdtempSync(join(tmpdir(),'tb-demo-secret-generator-'));
 try{return callback(directory);}finally{rmSync(directory,{recursive:true,force:true});}
}
function run(cwd) {
 return execFileSync(process.execPath,[script],{cwd,encoding:'utf8',env:{...process.env,DEPLOYMENT_ENV:'local'}});
}
function accounts(cwd,name){
 return JSON.parse(readFileSync(join(cwd,'.workspace/local-credentials',name),'utf8'));
}
test('creates two independent sets of strong distinct demo passwords without logging values',()=>inDir(cwd=>{
 const log=run(cwd),a=accounts(cwd,original),b=accounts(cwd,extra);
 assert.equal(Object.keys(a).length,7);
 assert.equal(Object.keys(b).length,3);
 const all=[...Object.values(a),...Object.values(b)];
 assert.equal(new Set(all).size,10);
 assert(all.every(x=>typeof x==='string'&&x.length>=24));
 for(const password of all)assert(!log.includes(password));
 if(process.platform!=='win32'){
   for(const name of [original,extra]){
     const mode=statSync(join(cwd,'.workspace/local-credentials',name)).mode&0o777;
     assert.equal(mode,0o600);
   }
 }
}));
test('rerun preserves both credential files byte-for-byte',()=>inDir(cwd=>{
 run(cwd);
 const before=[original,extra].map(name=>readFileSync(join(cwd,'.workspace/local-credentials',name),'utf8'));
 run(cwd);
 const after=[original,extra].map(name=>readFileSync(join(cwd,'.workspace/local-credentials',name),'utf8'));
 assert.deepEqual(after,before);
}));
test('missing extra file can be generated independently without overwriting seven',()=>inDir(cwd=>{
 run(cwd);
 const directory=join(cwd,'.workspace/local-credentials');
 const seven=readFileSync(join(directory,original),'utf8');
 rmSync(join(directory,extra));
 const log=run(cwd);
 assert.equal(readFileSync(join(directory,original),'utf8'),seven);
 assert.equal(Object.keys(accounts(cwd,extra)).length,3);
 assert.match(log,/Preserved existing protected credential file/);
 assert.deepEqual(readdirSync(directory).sort(),[extra,original].sort());
}));
test('missing original file can be created without overwriting extra',()=>inDir(cwd=>{
 run(cwd);
 const directory=join(cwd,'.workspace/local-credentials');
 const three=readFileSync(join(directory,extra),'utf8');
 rmSync(join(directory,original));
 run(cwd);
 assert.equal(readFileSync(join(directory,extra),'utf8'),three);
 assert.equal(Object.keys(accounts(cwd,original)).length,7);
}));
