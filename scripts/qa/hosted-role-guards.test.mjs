import test from 'node:test';
import assert from 'node:assert/strict';
import {deniedRoute,isDeniedStatus,WRONG_CENTER} from './hosted-role-guards.mjs';
const centerId='22222222-2222-4222-8222-222222222222';
const session={activeContext:{centerId,role:'THERAPIST'}};
test('each of seven roles uses read-only authorization probe',()=>{
 const expected={
 platform:'/'+WRONG_CENTER+'/children',admin:'/family',coordinator:'/family',
 speech:'/settings',ot:'/settings',supervisor:'/settings',guardian:'/children'
 };
 for(const [role,tail] of Object.entries(expected)) {
  const url=new URL(deniedRoute(role,session));
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'therabridge-ahmed-synthetic-demo.onrender.com');
  assert.equal(url.search,'');
  assert.equal(url.pathname.endsWith(tail),true);
 }
});
test('fail closed without center context or on unexpected role',()=>{
 assert.throws(()=>deniedRoute('guardian',{activeContext:null}));
 assert.throws(()=>deniedRoute('centerAdmin',session));
});
test('success/redirect/server failure cannot be misreported as permission denial',()=>{
 assert.equal(isDeniedStatus(200),false);
 assert.equal(isDeniedStatus(302),false);
 assert.equal(isDeniedStatus(500),false);
 for(const s of [403,404])assert.equal(isDeniedStatus(s),true);
 assert.equal(isDeniedStatus(401),false, 'an expired session is not evidence of RBAC isolation');
});
