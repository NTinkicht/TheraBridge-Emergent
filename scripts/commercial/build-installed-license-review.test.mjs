import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const tool=fileURLToPath(new URL('./build-installed-license-review.mjs',import.meta.url));
const hash='a'.repeat(64);
function fixture(){
 const pkgs=[
  {name:'a',version:'1.0.0',installedPath:'node_modules/a',manifestLicenseDeclared:'MIT',
   foundLicenseFiles:[{file:'LICENSE',sha256:hash,bytes:10}],actualLicenseTextReviewed:false,commercialApproval:false,reviewStatus:'EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED'},
  {name:'b',version:'2.0.0',installedPath:'apps/api/node_modules/b',manifestLicenseDeclared:null,
   foundLicenseFiles:[],actualLicenseTextReviewed:false,commercialApproval:false,reviewStatus:'NO_LICENSE_FILE_FOUND'},
  {name:'c',version:'3.0.0',installedPath:'node_modules/c',manifestLicenseDeclared:'AGPL-3.0-only',
   foundLicenseFiles:[{file:'COPYING',sha256:hash,bytes:20}],actualLicenseTextReviewed:false,commercialApproval:false,reviewStatus:'EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED'}
 ];
 return {schema:'therabridge-installed-license-file-inventory-v1',count:3,withFile:2,missingFile:1,approved:0,packages:pkgs};
}
function run(t,mutate=x=>x){
 const dir=mkdtempSync(join(tmpdir(),'tb-license-triage-'));t.after(()=>rmSync(dir,{force:true,recursive:true}));
 const input=join(dir,'input.json'),out=join(dir,'output.json');
 writeFileSync(input,JSON.stringify(mutate(fixture())));
 const result=spawnSync(process.execPath,[tool,input,out],{encoding:'utf8'});
 return {result,out};
}
test('classifies actual installed file evidence without granting approval',t=>{
 const {result,out}=run(t);
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(report.legallyApproved,0);assert.equal(report.totalInstalled,3);
 assert.deepEqual(report.summary,{FILE_PRESENT_UNREVIEWED:1,NO_LICENSE_FILE:1,RESTRICTIVE_LICENSE_CANDIDATE:1});
 assert(report.records.every(r=>r.decision==='UNRESOLVED'&&r.legalApproval===false&&r.saasObligationsReviewed===false&&r.enterpriseRedistributionReviewed===false));
 assert.match(report.sourceSha256,/^[a-f0-9]{64}$/);
});
test('fails closed on claims of approval, unreviewed hashes and invalid counters',t=>{
 for(const change of [
  x=>{x.approved=1;return x},
  x=>{x.packages[0].commercialApproval=true;return x},
  x=>{x.packages[0].foundLicenseFiles[0].sha256='invalid';return x},
  x=>{x.packages[0].foundLicenseFiles[0].bytes=0;return x},
  x=>{x.withFile=3;return x},
  x=>{x.packages[0].installedPath='../escape';return x},
  x=>{x.packages.push({...x.packages[0]});x.count++;x.withFile++;return x},
  x=>{x.packages[1].reviewStatus='EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED';return x}
 ]){const {result,out}=run(t,change);assert.notEqual(result.status,0);assert.equal(existsSync(out),false);}
});
test('classifies compound SPDX candidates for independent legal review',t=>{
 const {result,out}=run(t,x=>{x.packages[0].manifestLicenseDeclared='MIT OR CC0-1.0';return x});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(report.records.find(x=>x.name==='a').triage,'COMPOUND_OR_EXCEPTION_CANDIDATE');
});
