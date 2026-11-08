import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runExtra} from './hosted-extra-therapists.mjs';
import {EXTRA_IDENTITIES} from './hosted-extra-contracts.mjs';

const users=()=>Object.fromEntries(Object.entries(EXTRA_IDENTITIES).map(([key,v],i)=>
 [key,{email:v.email,password:'ci_only_example_'+'x'.repeat(30)+i}]));

test('broken private secret produces only redacted blocked evidence and zero browser operations',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tb-extra-preflight-'));
 let launched=0;
 try{
  const code=await runExtra({raw:'{malformed',output:dir,launchBrowser:async()=>{launched++;throw Error('DO_NOT_LEAK_BROWSER');}});
  assert.equal(code,2);
  assert.equal(launched,0);
  const artifact=await readFile(join(dir,'hosted-extra-results.json'),'utf8');
  const report=JSON.parse(artifact);
  assert.equal(report.counts.BLOCKED,1);
  assert.equal(artifact.includes('DO_NOT_LEAK'),false);
  assert.equal(artifact.includes('@'),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('failed synthetic logins leave an explicit FAIL and no password/session leak',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tb-extra-login-'));
 const fixture=users();
 let logins=0,closed=0;
 try{
  const mock={newContext:async()=>({
   newPage:async()=>({
    goto:async()=>{},
    waitForFunction:async()=>{},
    getByTestId:()=>({fill:async()=>{},click:async()=>{logins++;}}),
    waitForResponse:async()=>({status:()=>401})
   }),
   request:{get:async()=>({ok:()=>false,status:()=>401})},
   close:async()=>{}
  }),close:async()=>{closed++;}};
  const code=await runExtra({raw:JSON.stringify(fixture),output:dir,launchBrowser:async()=>mock});
  assert.equal(code,1);
  assert.equal(closed,1);
  assert.equal(logins,3);
  const artifact=await readFile(join(dir,'hosted-extra-results.json'),'utf8');
  const data=JSON.parse(artifact);
  assert.equal(data.counts.FAIL,6); // login denied plus unconfirmed logout, each identity
  for(const row of data.rows){
    assert.equal(row.status,'FAIL');
    assert.match(row.step,/^(authentication|session_cleanup)$/);
  }
  for(const item of Object.values(fixture)){
   assert.equal(artifact.includes(item.email),false);
   assert.equal(artifact.includes(item.password),false);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('protected retry atomically replaces stale sanitized report, never stores credentials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tb-extra-retry-'));
 const fixture=users();
 try{
  const first=await runExtra({raw:'not-json',output:dir,launchBrowser:async()=>{throw Error('must_not_launch');}});
  assert.equal(first,2);
  const before=await readFile(join(dir,'hosted-extra-results.json'),'utf8');
  assert.equal(JSON.parse(before).counts.BLOCKED,1);
  const second=await runExtra({raw:JSON.stringify(fixture),output:dir,
   launchBrowser:async()=>({newContext:async()=>({
    newPage:async()=>({
     goto:async()=>{},waitForFunction:async()=>{},
     getByTestId:()=>({fill:async()=>{},click:async()=>{}}),
     waitForResponse:async()=>({status:()=>401})
    }),
    request:{get:async()=>({ok:()=>false,status:()=>401})},
    close:async()=>{}
   }),close:async()=>{}})
  });
  assert.equal(second,1,'retry must report genuine failed authentication, not stale report conflict');
  const output=await readFile(join(dir,'hosted-extra-results.json'),'utf8');
  const data=JSON.parse(output);
  assert.equal(data.counts.FAIL,6);
  assert.equal(data.counts.BLOCKED,0);
  assert.deepEqual(await readdir(dir),['hosted-extra-results.json']);
  for(const user of Object.values(fixture)){
   assert(!output.includes(user.email));assert(!output.includes(user.password));
  }
  if(process.platform!=='win32'){
   assert.equal((await stat(dir)).mode & 0o777,0o700);
   assert.equal((await stat(join(dir,'hosted-extra-results.json'))).mode & 0o777,0o600);
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});
