import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const tool=fileURLToPath(new URL('./collect-installed-licenses.mjs',import.meta.url));
test('hashes exact installed license files and leaves every license unapproved',t=>{
 const root=mkdtempSync(join(tmpdir(),'tb-lic-files-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const a=join(root,'node_modules','a'),b=join(root,'node_modules','@scope','b');
 mkdirSync(a,{recursive:true});mkdirSync(b,{recursive:true});
 writeFileSync(join(a,'package.json'),JSON.stringify({name:'a',version:'1.2.3',license:'MIT'}));
 writeFileSync(join(a,'LICENSE'),'Sample test license');
 writeFileSync(join(b,'package.json'),JSON.stringify({name:'@scope/b',version:'2.0.0'}));
 symlinkSync(a,join(root,'node_modules','link-a'),'dir');
 const out=join(root,'report.json');
 const p=spawnSync(process.execPath,[tool,root,out],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const report=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(report.count,2);assert.equal(report.withFile,1);assert.equal(report.missingFile,1);
 assert(report.packages.every(x=>x.commercialApproval===false && x.actualLicenseTextReviewed===false));
 assert.match(report.packages.find(x=>x.name==='a').foundLicenseFiles[0].sha256,/^[0-9a-f]{64}$/);
});
test('fails when installed packages absent',t=>{
 const root=mkdtempSync(join(tmpdir(),'tb-lic-empty-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const p=spawnSync(process.execPath,[tool,root,join(root,'out.json')],{encoding:'utf8'});
 assert.notEqual(p.status,0);
});
