import test from 'node:test';
import assert from 'node:assert/strict';
import {deniedRoute,isDeniedStatus,WRONG_CENTER} from './hosted-role-guards.mjs';
import {readFileSync} from 'node:fs';
const centerId='22222222-2222-4222-8222-222222222222';
const session={activeContext:{centerId,role:'THERAPIST'}};
test('each of seven roles uses read-only authorization probe',()=>{
 const expected={
 platform:'/'+centerId+'/children',admin:'/family',coordinator:'/family',
 speech:'/settings',ot:'/settings',supervisor:'/settings',guardian:'/children'
 };
 for(const [role,tail] of Object.entries(expected)) {
  const url=new URL(deniedRoute(role,session,centerId));
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,'therabridge-ahmed-synthetic-demo.onrender.com');
  assert.equal(url.search,'');
  assert.equal(url.pathname.endsWith(tail),true);
 }
});
test('fail closed without center context or on unexpected role',()=>{
 assert.throws(()=>deniedRoute('guardian',{activeContext:null}));
 assert.throws(()=>deniedRoute('centerAdmin',session));
 assert.throws(()=>deniedRoute('platform',session),/private_qa_center_context_unavailable/);
 assert.throws(()=>deniedRoute('platform',session,WRONG_CENTER),/private_qa_center_context_unavailable/);
});
test('success/redirect/server failure cannot be misreported as permission denial',()=>{
 assert.equal(isDeniedStatus(200),false);
 assert.equal(isDeniedStatus(302),false);
 assert.equal(isDeniedStatus(500),false);
 for(const s of [403,404])assert.equal(isDeniedStatus(s),true);
 assert.equal(isDeniedStatus(401),false, 'an expired session is not evidence of RBAC isolation');
});

test('forbidden GET probes remain forbidden in canonical Nest policy and real controller',()=>{
 const policy=readFileSync('apps/api/src/auth/policy.ts','utf8');
 const workspace=readFileSync('apps/api/src/centers/centers.controller.ts','utf8');
 const operations=readFileSync('apps/api/src/operations/operations.controller.ts','utf8');
 // Changes to controller routing or role grants must fail this CI contract,
 // rather than silently accepting a missing endpoint's 404 as RBAC evidence.
 const cases=[
  {actor:'platform',dbRole:'PLATFORM_ADMIN',permission:'center.children.read',controller:operations,method:'children'},
  {actor:'admin',dbRole:'CENTER_ADMIN',permission:'family.portal.read',controller:operations,method:'family'},
  {actor:'coordinator',dbRole:'COORDINATOR',permission:'family.portal.read',controller:operations,method:'family'},
  {actor:'speech',dbRole:'THERAPIST',permission:'center.settings.read',controller:workspace,method:'settings'},
  {actor:'ot',dbRole:'THERAPIST',permission:'center.settings.read',controller:workspace,method:'settings'},
  {actor:'supervisor',dbRole:'CLINICAL_SUPERVISOR',permission:'center.settings.read',controller:workspace,method:'settings'},
  {actor:'guardian',dbRole:'GUARDIAN',permission:'center.children.read',controller:operations,method:'children'},
 ];
 for(const {actor,dbRole,permission,controller,method} of cases){
  const declaration=policy.match(new RegExp("'"+permission.replace(/\./g,'\\.')+"'\\s*:\\s*\\[([^\\]]*)\\]"));
  assert(declaration,actor+' missing canonical permission '+permission);
  assert(!declaration[1].includes("'"+dbRole+"'"),actor+' must remain forbidden '+permission);
  const expectedRoute=new RegExp("@Get\\('"+method+"'\\)\\s*@RequirePermission\\('"+permission.replace(/\./g,'\\.')+"'\\)");
  assert.match(controller,expectedRoute,actor+' route must have real GET permission decorator');
 }
});
