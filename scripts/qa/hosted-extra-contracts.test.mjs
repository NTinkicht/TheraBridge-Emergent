import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EXTRA_IDENTITIES,DENIED_PAIRS,validateExtraUsers,inspectTherapistContext,
 inspectAssignedChildren,inspectClinicalScope,safeResponseCode,denied,safeResult,totals} from './hosted-extra-contracts.mjs';
const creds=()=>Object.fromEntries(Object.entries(EXTRA_IDENTITIES).map(([key,p],i)=>
 [key,{email:p.email,password:'ci_only_fixture'+'x'.repeat(28)+i}]));
const json=()=>JSON.stringify(creds());
test('accept exact three private identities without serializing passwords',()=>{
 const users=validateExtraUsers(json());
 assert.deepEqual(Object.keys(users).sort(),['aba2','ot2','speech2']);
 for(const [key,p] of Object.entries(EXTRA_IDENTITIES))assert.equal(users[key].email,p.email);
});
test('fail closed on missing/extra/wrong/short/duplicate credentials and arrays',()=>{
 const variants=[
  '{}','not json','[]',
  JSON.stringify({...creds(),unexpected:{email:'x',password:'y'}}),
  JSON.stringify({...creds(),aba2:{email:'wrong@example.test',password:'x'.repeat(30)}}),
  JSON.stringify({...creds(),aba2:{email:EXTRA_IDENTITIES.aba2.email,password:'short'}}),
  JSON.stringify({...creds(),ot2:{...creds().ot2,password:creds().aba2.password}})
 ];
 for(const raw of variants)assert.throws(()=>validateExtraUsers(raw),/private_extra_therapist_preflight_failed/);
});
const session=(key)=>{const p=EXTRA_IDENTITIES[key];const c={
 type:'center',role:'THERAPIST',centerId:'11111111-1111-4111-8111-111111111111',
 membershipId:'22222222-2222-4222-8222-222222222222'};
 return {user:{email:p.email},contexts:[c],activeContext:{...c}};
};
test('require exact therapist-only membership and active context',()=>{
 const s=session('aba2');assert.equal(inspectTherapistContext(s,'aba2'),true);
 assert.equal(inspectTherapistContext({...s,contexts:[...s.contexts,{role:'CENTER_ADMIN'}]},'aba2'),false);
 assert.equal(inspectTherapistContext({...s,activeContext:{...s.activeContext,role:'GUARDIAN'}},'aba2'),false);
 assert.equal(inspectTherapistContext({...s,user:{email:'wrong@example.test'}},'aba2'),false);
 assert.equal(inspectTherapistContext({...s,activeContext:null},'aba2'),true);
});
test('child scope requires exact assigned list and matching therapist specialty',()=>{
 for(const [key,p] of Object.entries(EXTRA_IDENTITIES)){
  const items=p.children.map((n,i)=>({id:String(i),firstName:n.split(' ').at(0),lastName:n.split(' ').slice(1).join(' '),
    team:[{service:p.specialty}]}));
  assert.equal(inspectAssignedChildren({items},key),true);
  assert.equal(inspectAssignedChildren({items:[...items,{...items[0],firstName:'Extra'}]},key),false);
  // Team is the entire child's team, not the actor. Do not infer the actor's
  // permitted specialty from a different clinician's team membership.
  assert.equal(inspectAssignedChildren({items:items.map(x=>({...x,team:[{service:'other'}]}))},key),true);
  const childId=items[0].id;
  assert.equal(inspectClinicalScope({synthetic:true,locked:'Signing, approval and release are disabled until policy',child:{id:childId,services:[p.specialty]}},key,childId),true);
  const other=p.specialty==='speech'?'behavioral':'speech';
  assert.equal(inspectClinicalScope({synthetic:true,locked:'Signing, approval and release are disabled until policy',child:{id:childId,services:[other]}},key,childId),false);
  assert.equal(inspectClinicalScope({synthetic:true,locked:'Signing, approval and release are disabled until policy',child:{id:childId,services:[p.specialty,other]}},key,childId),false);
  assert.equal(inspectClinicalScope({synthetic:true,locked:'Signing, approval and release are disabled until policy',child:{id:'another-child',services:[p.specialty]}},key,childId),false);
  assert.equal(inspectClinicalScope({synthetic:true,locked:'',child:{id:childId,services:[p.specialty]}},key,childId),false);
 }
 assert.equal(DENIED_PAIRS.ot2,'Amina Ahmed');
});
test('authenticated denial requires 403 or 404, never a lost 401 session',()=>{
 for(const s of [403,404])assert.equal(denied(s),true);
 for(const s of [200,302,401,422,500])assert.equal(denied(s),false);
 assert.equal(safeResponseCode(200),'unexpected_success');
});
test('results never contain email/password, only allowlisted status and reason',()=>{
 const r=safeResult('ot2','clinical_access','PASS','authorized_assigned_child');
 assert.deepEqual(totals([r]),{PASS:1,FAIL:0,BLOCKED:0});
 assert.equal(JSON.stringify(r).includes('@'),false);
 assert.throws(()=>safeResult('ot2','clinical_access','FAIL','password=secret'),/invalid_safe_result/);
});

test('private hosted child IDs and negative probes remain coupled to the canonical synthetic seed',()=>{
 const source=fs.readFileSync('apps/api/src/cli/seed-demo.ts','utf8');
 const runner=fs.readFileSync('scripts/qa/hosted-extra-therapists.mjs','utf8');
 const rootPattern=/const SCOPE\s*=\s*'([^']+)'/;
 const seedScope=source.match(rootPattern)?.[1];
 const qaScope=runner.match(rootPattern)?.[1];
 assert.equal(seedScope,'therabridge-childrens-home-ahmed-synthetic-v1');
 assert.equal(qaScope,seedScope, 'private QA must use same deterministic seed namespace');
 const normalize=s=>s.replace(/\s+/g,'');
 const algorithm="return [s.slice(0,8),s.slice(8,12),'4'+s.slice(13,16),'8'+s.slice(17,20),s.slice(20,32)].join('-');";
 assert.match(source,/function id\(name: string\): string/);
 assert(normalize(source).includes(normalize(algorithm)));
 assert(normalize(runner).includes(normalize(algorithm)));
 for(const [key,child] of [['aba2','leen'],['ot2','amina'],['speech2','zayd']]){
  assert.match(source,new RegExp("key:'"+child+"'"), 'negative child must be seeded');
  assert(runner.includes(key+":syntheticChildId('"+child+"')"), 'deny fixture must reference canonical seed');
 }
 assert(runner.includes('scopeOkAll&&denied(other.status())'));
 assert(runner.includes('scopeOkAll&&denied(wrong.status())'));
});
