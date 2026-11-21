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

test('discovers physical workspace-local non-hoisted packages without following workspace symlinks',t=>{
 const root=mkdtempSync(join(tmpdir(),'tb-lic-workspaces-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const hoisted=join(root,'node_modules','hoisted');
 const apiLocal=join(root,'apps','api','node_modules','local-only');
 const webLocal=join(root,'apps','web','node_modules','@scope','web-only');
 mkdirSync(hoisted,{recursive:true});mkdirSync(apiLocal,{recursive:true});mkdirSync(webLocal,{recursive:true});
 writeFileSync(join(root,'package.json'),JSON.stringify({name:'root',workspaces:['apps/*']}));
 for(const ws of ['api','web'])writeFileSync(join(root,'apps',ws,'package.json'),JSON.stringify({name:'@tb/'+ws}));
 for(const [dir,name] of [[hoisted,'hoisted'],[apiLocal,'local-only'],[webLocal,'@scope/web-only']]){
  writeFileSync(join(dir,'package.json'),JSON.stringify({name,version:'1.0.0',license:'MIT'}));
  writeFileSync(join(dir,'LICENSE'),'Test license for '+name);
 }
 // Symlinked workspace links and package links must remain untraversed.
 symlinkSync(join(root,'apps','api'),join(root,'node_modules','api-link'),'dir');
 const out=join(root,'inventory.json');
 const p=spawnSync(process.execPath,[tool,root,out],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const report=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(report.count,3);
 assert.deepEqual(report.packages.map(x=>x.name).sort(),['@scope/web-only','hoisted','local-only']);
 assert(report.packages.every(x=>x.commercialApproval===false&&x.foundLicenseFiles.length===1));
 assert(report.packages.some(x=>x.installedPath==='apps/api/node_modules/local-only'));
 assert(report.packages.some(x=>x.installedPath==='apps/web/node_modules/@scope/web-only'));
});
test('unsupported workspace pattern fails closed rather than silently skipping packages',t=>{
 const root=mkdtempSync(join(tmpdir(),'tb-lic-glob-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const a=join(root,'node_modules','a');mkdirSync(a,{recursive:true});
 writeFileSync(join(a,'package.json'),JSON.stringify({name:'a',version:'1.0.0'}));
 writeFileSync(join(root,'package.json'),JSON.stringify({workspaces:['apps/**']}));
 const p=spawnSync(process.execPath,[tool,root,join(root,'out.json')],{encoding:'utf8'});
 assert.notEqual(p.status,0);assert.match(p.stderr,/Unsupported workspace patterns/);
});
