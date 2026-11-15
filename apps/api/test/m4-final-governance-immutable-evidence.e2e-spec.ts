// M4-08: execute original governance-core and canonical evidence primitives.
// Fictional snapshots only. No consent, clinical signing or release.
import {createHash} from 'node:crypto';
import {assertActor,snapshot,transitionHistory,INTERNAL_NOTICE,EDITABLE,canonical,fingerprint,json} from '../src/clinical/governance-core';
import {canonicalJson,canonicalFingerprint,orderedJsonFingerprint} from '../src/common/fingerprints';
const center='fictional-center',child='fictional-child';
const therapist={role:'THERAPIST',membershipId:'fictional-membership',userId:'fictional-user'} as any;
const prepare=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  membership:{findFirst:jest.fn().mockResolvedValue({id:'fictional-membership'})},
  governanceSnapshot:{create:jest.fn(async({data})=>({id:'snapshot-a',...data}))},
  governanceHistory:{create:jest.fn(async({data})=>({id:'history-a',...data}))}
 };
 return tx;
};
const source={
 centerId:center,childId:child,kind:'PLAN' as const,documentId:'fictional-document',
 sourceVersion:3,authorId:'fictional-author',
 content:{b:2,a:{z:true,x:'fictional'}},
 evidence:{points:[{id:'fictional-observation',value:2}],signed:false,released:false}
};
describe('M4-08 immutable governance fingerprints preserve evidence identity',()=>{
 test('dictionary key order is canonical, not an uncontrolled version change',()=>{
  expect(canonicalJson({b:2,a:1})).toBe('{"a":1,"b":2}');
  expect(canonicalJson({a:1,b:2})).toBe('{"a":1,"b":2}');
  expect(canonical({a:1,b:2})).toBe(canonicalJson({b:2,a:1}));
  expect(fingerprint({b:2,a:1})).toBe(fingerprint({a:1,b:2}));
 });
 test('arrays preserve intentional order; changing clinical evidence ordering changes fingerprint',()=>{
  const a={points:[{id:'a',value:1},{id:'b',value:2}]};
  const b={points:[{id:'b',value:2},{id:'a',value:1}]};
  expect(canonicalJson(a)).not.toBe(canonicalJson(b));
  expect(canonicalFingerprint(a)).not.toBe(canonicalFingerprint(b));
 });
 test('nullable values, strings, dates and nested objects are represented deterministically',()=>{
  expect(canonicalJson(null)).toBe('null');
  expect(canonicalJson(3)).toBe('3');
  expect(canonicalJson('fictional')).toBe('"fictional"');
  expect(canonicalJson(new Date('2026-11-11T12:00:00.000Z'))).toBe('"2026-11-11T12:00:00.000Z"');
  expect(canonicalJson({nested:[null,true,{y:2,x:1}]})).toBe('{"nested":[null,true,{"x":1,"y":2}]}');
 });
 test('historical canonical and deliberately ordered hashes are not silently interchanged',()=>{
  const a={z:1,a:2};
  expect(canonicalFingerprint(a)).toBe(createHash('sha256').update('{"a":2,"z":1}').digest('hex'));
  expect(orderedJsonFingerprint(a)).toBe(createHash('sha256').update('{"z":1,"a":2}').digest('hex'));
  expect(orderedJsonFingerprint(a)).not.toBe(canonicalFingerprint(a));
 });
 test('source JSON envelope is defensive deep copy without clinical value promotion',()=>{
  const value={goal:{id:'fictional-goal',released:false},observations:[{value:1}]};
  const saved=json(value) as any;
  saved.goal.id='changed';
  saved.observations[0].value=100;
  expect(value).toEqual({goal:{id:'fictional-goal',released:false},observations:[{value:1}]});
  expect(INTERNAL_NOTICE).toMatch(/not approved, signed or released/);
  expect(EDITABLE).toEqual(['DRAFT','RETURNED_FOR_REVISION']);
 });
});
describe('M4-08 live governance actor revalidation locks and rejects stale privileges',()=>{
 test('wrong role cannot acquire row locks or perform any subsequent read',async()=>{
  const tx=prepare();
  await expect(assertActor(tx,center,{...therapist,role:'GUARDIAN'},['THERAPIST'])).rejects.toMatchObject({status:403});
  expect(tx.$queryRaw).not.toHaveBeenCalled();
  expect(tx.membership.findFirst).not.toHaveBeenCalled();
 });
 test('therapist requires two row locks and exact role, membership and tenant',async()=>{
  const tx=prepare();await assertActor(tx,center,therapist,['THERAPIST']);
  expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  expect(tx.membership.findFirst).toHaveBeenCalledWith({where:{
   id:'fictional-membership',userId:'fictional-user',centerId:center,status:'ACTIVE',
   user:{status:'ACTIVE'},center:{status:'ACTIVE'},roles:{some:{role:'THERAPIST'}}
  }});
 });
 test.each([null,false])('revoked active membership %s prevents clinical governance mutation',async value=>{
  const tx=prepare();tx.membership.findFirst.mockResolvedValueOnce(value);
  await expect(assertActor(tx,center,therapist,['THERAPIST'])).rejects.toMatchObject({status:403});
 });
 test('supervisor allowed in role set still requires the exact live supervisor assignment',async()=>{
  const tx=prepare();const supervisor={...therapist,role:'CLINICAL_SUPERVISOR'};
  await assertActor(tx,center,supervisor,['CLINICAL_SUPERVISOR','THERAPIST']);
  expect(tx.membership.findFirst.mock.calls[0][0].where.roles).toEqual({some:{role:'CLINICAL_SUPERVISOR'}});
 });
});
describe('M4-08 immutable snapshots and transition history never authorize a release',()=>{
 const now=new Date('2026-11-11T12:00:00Z');
 test('snapshot stores canonical fingerprint from exact evidence and identity',async()=>{
  const tx=prepare();const result=await snapshot(tx,source,'fictional-operator',now);
  expect(result.id).toBe('snapshot-a');
  const saved=tx.governanceSnapshot.create.mock.calls[0][0].data;
  expect(saved).toMatchObject({
   centerId:center,childId:child,documentId:'fictional-document',
   kind:'PLAN',sourceVersion:3,generatedById:'fictional-operator',createdAt:now
  });
  const envelope={...source,content:JSON.parse(JSON.stringify(source.content)),evidence:JSON.parse(JSON.stringify(source.evidence))};
  expect(saved.fingerprint).toBe(canonicalFingerprint(envelope));
  expect(saved.evidence).toMatchObject({signed:false,released:false});
 });
 test('changing a single observation invalidates fingerprint rather than preserving false provenance',async()=>{
  const tx=prepare();
  const one=await snapshot(tx,source,'fictional-operator',now);
  const two=await snapshot(tx,{...source,evidence:{points:[{id:'fictional-observation',value:3}],signed:false,released:false}},'fictional-operator',now);
  expect(one.fingerprint).not.toBe(two.fingerprint);
 });
 test('history uses exact persisted snapshot ID, reason and prior/new statuses',async()=>{
  const tx=prepare();
  const snap=await snapshot(tx,source,'fictional-operator',now);
  const record=await transitionHistory(tx,snap,'DRAFT','IN_REVIEW','Fictional internal review','fictional-operator',now);
  expect(record).toMatchObject({id:'history-a',centerId:center,childId:child,
   documentId:'fictional-document',sourceVersion:3,snapshotId:'snapshot-a',
   fromStatus:'DRAFT',toStatus:'IN_REVIEW',reason:'Fictional internal review',
   actorId:'fictional-operator',createdAt:now});
  expect(record).not.toHaveProperty('approved');
  expect(record).not.toHaveProperty('released');
 });
});
