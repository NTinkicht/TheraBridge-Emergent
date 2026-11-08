import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSessionCookie,verifyRevokedSession} from './hosted-session-guards.mjs';

const cookie={name:'__Host-tb_session',value:'ci_only_replay_fixture',
 secure:true,httpOnly:true,sameSite:'Lax',path:'/',
 domain:'therabridge-ahmed-synthetic-demo.onrender.com'};
test('capture only a valid, single protected cookie before logout',()=>{
 assert.deepEqual(captureSessionCookie([cookie]),{name:cookie.name,value:cookie.value});
 assert.equal(captureSessionCookie([]),null);
 assert.equal(captureSessionCookie([cookie,cookie]),null);
 assert.equal(captureSessionCookie([{...cookie,httpOnly:false}]),null);
 assert.equal(captureSessionCookie([{...cookie,secure:false}]),null);
 assert.equal(captureSessionCookie([{...cookie,value:''}]),null);
});
test('replay the PRE-logout cookie in a new isolated context rather than cleared jar',async()=>{
 const seen=[]; let closed=0;
 const browser={newContext:async opts=>{
  seen.push({kind:'created',opts});
  return {
   request:{get:async (_url,opts)=>{
    seen.push({kind:'request',header:opts.headers.Cookie});
    return {status:()=>401};
   }},
   close:async()=>{closed++;}
  };
 }};
 const result=await verifyRevokedSession(browser,captureSessionCookie([cookie]));
 assert.equal(result,true);
 assert.equal(seen[0].kind,'created');
 assert.equal(seen[1].header,cookie.name+'='+cookie.value);
 assert.equal(closed,1);
});
test('logout failure remains failing if old authenticated cookie still works',async()=>{
 let closed=0;
 const browser={newContext:async()=>({request:{get:async()=>({status:()=>200})},
  close:async()=>{closed++;}})};
 assert.equal(await verifyRevokedSession(browser,captureSessionCookie([cookie])),false);
 assert.equal(closed,1);
});
test('missing old cookie must FAIL CLOSED and avoid creating a second context',async()=>{
 let launched=false;
 const browser={newContext:async()=>{launched=true;throw Error('should_not_run');}};
 assert.equal(await verifyRevokedSession(browser,null),false);
 assert.equal(launched,false);
});
test('failed replay closes isolated context and never prints token',async()=>{
 let closed=0;
 const browser={newContext:async()=>({request:{get:async()=>{
  throw Error('must_not_leak_'+cookie.value);
 }},close:async()=>{closed++;}})};
 assert.equal(await verifyRevokedSession(browser,captureSessionCookie([cookie])),false);
 assert.equal(closed,1);
});
