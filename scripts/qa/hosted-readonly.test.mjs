import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,WIDTHS,ROLES,caseId,validateTarget,inspectCookieJar,inspectSetCookie,
 inspectGeometry,statusForPages,blocked,run} from './hosted-readonly.mjs';
const jar={name:'__Host-tb_session',value:'SECRET_NEVER_EXPORT',secure:true,httpOnly:true,
 sameSite:'Lax',path:'/',domain:'therabridge-ahmed-synthetic-demo.onrender.com'};
const header='__Host-tb_session=SECRET_NEVER_EXPORT; Path=/; HttpOnly; SameSite=Lax; Secure';
test('42 unique IDs N-052..N-093',()=>{
 const ids=Object.keys(ROLES).flatMap(r=>[...WIDTHS.map((_,i)=>caseId(ROLES[r].start+i)),caseId(ROLES[r].cookie)]);
 assert.equal(ids.length,42);assert.deepEqual(new Set(ids),new Set(Array.from({length:42},(_,i)=>caseId(i+52))));
});
test('strict approved HTTPS target',()=>{
 assert.equal(validateTarget(BASE),true);
 assert.equal(validateTarget(BASE+'/app'),false);
 assert.equal(validateTarget('http://therabridge-ahmed-synthetic-demo.onrender.com'),false);
 assert.equal(validateTarget('https://example.com'),false);
});
test('cookie attributes; no secret exported',()=>{
 const a=inspectCookieJar([jar]);assert.equal(a.ok,true);assert.equal(JSON.stringify(a).includes('SECRET'),false);
 assert.equal(inspectCookieJar([{...jar,secure:false}]).ok,false);
 assert.equal(inspectCookieJar([{...jar,domain:'.therabridge-ahmed-synthetic-demo.onrender.com'}]).ok,false);
 const b=inspectSetCookie([header]);assert.equal(b.ok,true);assert.equal(JSON.stringify(b).includes('SECRET'),false);
 assert.equal(inspectSetCookie([header+'; Domain=example.com']).ok,false);
 assert.equal(inspectSetCookie([header.replace('HttpOnly','')]).ok,false);
});
test('viewport regression detector',()=>{
 const d={viewport:320,documentWidth:320,mainVisible:true,mainLeft:0,mainRight:320,
 headerVisible:true,navigationVisible:true};
 assert.deepEqual(inspectGeometry(d,320),[]);
 assert.deepEqual(inspectGeometry({...d,documentWidth:500},320),['document_overflow']);
 assert.deepEqual(inspectGeometry({...d,navigationVisible:false},320),['navigation_missing']);
});
test('geometry alone cannot establish complete dialog/visual acceptance',()=>{
 assert.equal(statusForPages([{outcome:'PASS'}],false),'BLOCKED');
 assert.equal(statusForPages([{outcome:'FAIL'}],false),'FAIL');
 assert.equal(statusForPages([{outcome:'BLOCKED'}],false),'BLOCKED');
});
test('no credentials -> strictly blocked case IDs',()=>{
 const r=blocked('guardian','missing');assert.equal(r.length,6);assert.equal(r[5].id,'N-093');
 assert.ok(r.every(c=>c.status==='BLOCKED'));
});
test('offline execution emits complete blocked ledger, no fake PASS',async()=>{
 const {mkdtemp,rm,readFile}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-em-025-'));
 try{
  assert.equal(await run({credentialsFile:null,output:dir}),1);
  const j=JSON.parse(await readFile(join(dir,'hosted-readonly-results.json'),'utf8'));
  assert.deepEqual(j.counts,{PASS:0,FAIL:0,BLOCKED:42});assert.equal(j.rows.length,42);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unavailable Playwright/Chromium emits blocked evidence, never exits without a ledger',async()=>{
 const {mkdtemp,rm,readFile,writeFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-em-025-launch-'));
 try{
  const users=join(dir,'users.json');
  await writeFile(users,JSON.stringify({platform:{email:'fictional@example.invalid',password:'LOCAL_FIXTURE_ONLY'}}),{mode:0o600});
  await chmod(users,0o600);
  // The offline-contracts job intentionally does not install Playwright.
  // Any runtime without a working Chromium must report 42 BLOCKED.
  const r=await run({credentialsFile:users,output:join(dir,'evidence')});
  assert.equal(r,1);
  const d=JSON.parse(await readFile(join(dir,'evidence','hosted-readonly-results.json'),'utf8'));
  assert.deepEqual(d.counts,{PASS:0,FAIL:0,BLOCKED:42});
  assert.equal(d.rows.length,42);
 }finally{await rm(dir,{recursive:true,force:true});}
});
