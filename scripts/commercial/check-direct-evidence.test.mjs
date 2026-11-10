import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const checker=fileURLToPath(new URL('./check-direct-evidence.mjs',import.meta.url));
function fixture(mutator=()=>{}){
 const root=mkdtempSync(join(tmpdir(),'tb-license-evidence-'));
 mkdirSync(join(root,'apps/api'),{recursive:true});mkdirSync(join(root,'apps/web'),{recursive:true});
 const write=(path,obj)=>writeFileSync(join(root,path),JSON.stringify(obj));
 write('package.json',{dependencies:{react:'^18'}});
 write('apps/api/package.json',{});write('apps/web/package.json',{});
 const row={manifest:'package.json',scope:'dependencies',name:'react',requestedRange:'^18',
  reviewStatus:'UPSTREAM_REFERENCE_ONLY',upstreamLicenseCandidate:'MIT',evidenceUrl:'https://github.com/react/react',
  evidenceLevel:'upstream_repository_general',commercialApproval:false,exactPackageVersionVerified:false,
  actualLicenseFileVerified:false,licenseNoticeVerified:false,redistributionReviewed:false};
 const doc={schema:'therabridge-direct-license-evidence-v1',status:'NOT_LEGAL_CLEARANCE',records:[row]};
 mutator({doc,row,write});
 const file=join(root,'index.json');writeFileSync(file,JSON.stringify(doc));
 const p=spawnSync(process.execPath,[checker,file,root],{encoding:'utf8'});
 rmSync(root,{recursive:true,force:true});
 return p;
}
test('upstream metadata is acceptable as a pending review entry, not legal clearance',()=>{
 const p=fixture();assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/approval.*NONE/);
});
test('missing new direct dependency fails closed',()=>{
 const p=fixture(({write})=>write('package.json',{dependencies:{react:'^18',newpkg:'1.0'}}));
 assert.notEqual(p.status,0);assert.match(p.stderr,/Unreviewed direct dependencies/);
});
test('changed range and duplicate evidence fail',()=>{
 assert.notEqual(fixture(({row})=>{row.requestedRange='^19';}).status,0);
 assert.notEqual(fixture(({doc,row})=>doc.records.push({...row})).status,0);
});
test('licensing approval and exact version claims cannot be silently elevated',()=>{
 for(const field of ['commercialApproval','actualLicenseFileVerified','redistributionReviewed','exactPackageVersionVerified']){
  assert.notEqual(fixture(({row})=>{row[field]=true;}).status,0);
 }
});
test('unverified license must not impersonate upstream evidence',()=>{
 const p=fixture(({row})=>{
  row.reviewStatus='PENDING_UPSTREAM_REVIEW';
  row.evidenceUrl=null;row.evidenceLevel='not_checked';row.upstreamLicenseCandidate=null;
 });
 assert.equal(p.status,0,p.stderr);
});
