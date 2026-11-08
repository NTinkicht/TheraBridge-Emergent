import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('M4-02 policy drift: all 7 forbidden routes exist and remain forbidden under current Nest policy',()=>{
 const policy=readFileSync('apps/api/src/auth/policy.ts','utf8');
 const operations=readFileSync('apps/api/src/operations/operations.controller.ts','utf8');
 const centers=readFileSync('apps/api/src/centers/centers.controller.ts','utf8');
 const spec=[
  {actor:'platform',role:'PLATFORM_ADMIN',route:'children',permission:'center.children.read',control:'platform.centers.read',source:operations},
  {actor:'admin',role:'CENTER_ADMIN',route:'family',permission:'family.portal.read',control:'center.settings.read',source:operations},
  {actor:'coordinator',role:'COORDINATOR',route:'family',permission:'family.portal.read',control:'center.children.read',source:operations},
  {actor:'speech',role:'THERAPIST',route:'settings',permission:'center.settings.read',control:'center.children.read',source:centers},
  {actor:'ot',role:'THERAPIST',route:'settings',permission:'center.settings.read',control:'center.children.read',source:centers},
  {actor:'supervisor',role:'CLINICAL_SUPERVISOR',route:'settings',permission:'center.settings.read',control:'center.children.read',source:centers},
  {actor:'guardian',role:'GUARDIAN',route:'children',permission:'center.children.read',control:'family.portal.read',source:operations}
 ];
 const rolesFor=permission=>{
  const escaped=permission.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const m=policy.match(new RegExp("'"+escaped+"'\\s*:\\s*\\[([^\\]]*)\\]"));
  assert(m,'permission must exist in canonical policy: '+permission);
  return [...m[1].matchAll(/'([A-Z_]+)'/g)].map(x=>x[1]);
 };
 for(const item of spec){
  const route=new URL(deniedRoute(item.actor,session));
  assert(route.pathname.endsWith('/'+item.route),item.actor+' must probe its declared path');
  const signature=new RegExp("@Get\\('"+item.route+"'\\)\\s*@RequirePermission\\('"+item.permission+"'\\)");
  assert.match(item.source,signature,'forbidden probe must reach an actual decorated endpoint');
  assert(!rolesFor(item.permission).includes(item.role),
   'newly granted forbidden permission needs an explicit updated protected-QA contract: '+item.actor);
  assert(rolesFor(item.control).includes(item.role),
   'positive control must be genuinely granted to the actor: '+item.actor);
 }
 // This guards policy-source drift. Authenticated proof against a second VALID
 // center is independently required by #268; never treat a nonexistent UUID
 // response alone as sufficient for tenant-isolation acceptance.
});
