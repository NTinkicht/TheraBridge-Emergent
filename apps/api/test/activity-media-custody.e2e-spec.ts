import {CustodyTransitionError,transitionCustody,type CustodyRecord} from '../src/clinical/activity-media-custody';
const record=(): CustodyRecord=>({
 centerId:'11111111-1111-4111-8111-111111111111',
 templateId:'22222222-2222-4222-8222-222222222222',
 draftId:'33333333-3333-4333-8333-333333333333',
 templateVersion:1,candidateSha256:'a'.repeat(64),candidateBytes:100,
 revision:1,status:'QUARANTINED',legalHold:false,approved:false,publishEnabled:false,readEnabled:false,
});
const event=()=>({expectedRevision:1,next:'REJECTED' as const,actorId:'44444444-4444-4444-8444-444444444444',reason:'Synthetic reviewer rejected candidate'});
describe('WU4-K immutable custody transitions (no file deletion or publication)',()=>{
 it('rejects publish and leaves each version immutable and closed',()=>{
   const original=record();const changed=transitionCustody(original,event());
   expect(original.status).toBe('QUARANTINED');
   expect(changed).toMatchObject({status:'REJECTED',revision:2,approved:false,publishEnabled:false,readEnabled:false});
   expect(Object.isFrozen(changed)).toBe(true);
   expect(JSON.stringify(changed)).not.toMatch(/https?:|url|objectKey|storagePath/);
 });
 it('enforces monotonic rejection, revocation, pending purge and final purged',()=>{
   const rejected=transitionCustody(record(),event());
   const pending=transitionCustody(rejected,{...event(),expectedRevision:2,next:'PURGE_PENDING'});
   const purged=transitionCustody(pending,{...event(),expectedRevision:3,next:'PURGED'});
   expect(purged.status).toBe('PURGED');
   expect(()=>transitionCustody(purged,{...event(),expectedRevision:4,next:'REVOKED'})).toThrow(CustodyTransitionError);
 });
 it('rejects stale version, illegal transitions and forged publication rights',()=>{
  for(const [state,evt] of [
   [record(),{...event(),expectedRevision:0}],
   [record(),{...event(),next:'PURGED'}],
   [record(),{...event(),next:'APPROVED'}],
   [{...record(),approved:true},event()],
   [{...record(),publishEnabled:true},event()],
   [{...record(),readEnabled:true},event()],
   [{...record(),revision:Number.MAX_SAFE_INTEGER},{...event(),expectedRevision:Number.MAX_SAFE_INTEGER}],
  ] as Array<[unknown,unknown]>) expect(()=>transitionCustody(state as never,evt as never)).toThrow(CustodyTransitionError);
 });
 it('retains legal hold across transitions and forbids purge while held',()=>{
  const held=record();const rejected=transitionCustody({...held,legalHold:true},event());
  expect(rejected.legalHold).toBe(true);
  expect(()=>transitionCustody(rejected,{...event(),expectedRevision:2,next:'PURGE_PENDING'}))
    .toThrow(CustodyTransitionError);
 });
 it('rejects invalid identity, proof and reason',()=>{
   for(const patch of [{centerId:'../public'},{templateVersion:0},{candidateSha256:'wrong'},{candidateBytes:0},{revision:0}]){
     expect(()=>transitionCustody({...record(),...patch},event())).toThrow(CustodyTransitionError);
   }
   for(const patch of [{actorId:'wrong'},{reason:'x'},{expectedRevision:2}]){
     expect(()=>transitionCustody(record(),{...event(),...patch})).toThrow(CustodyTransitionError);
   }
 });
});
