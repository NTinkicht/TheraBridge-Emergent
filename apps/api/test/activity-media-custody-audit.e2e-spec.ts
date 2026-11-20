import {proposeCustodyAudit} from '../src/clinical/activity-media-custody-audit';
import {CustodyTransitionError,type CustodyRecord} from '../src/clinical/activity-media-custody';
const r:CustodyRecord={centerId:'11111111-1111-4111-8111-111111111111',templateId:'22222222-2222-4222-8222-222222222222',draftId:'33333333-3333-4333-8333-333333333333',templateVersion:1,candidateSha256:'a'.repeat(64),candidateBytes:100,revision:1,status:'QUARANTINED',legalHold:false,approved:false,publishEnabled:false,readEnabled:false};
const e=()=>({reason:'Synthetic reviewer rejects this draft',expectedRevision:1,next:'REJECTED' as const,actorId:'44444444-4444-4444-8444-444444444444'});
describe('WU4-M immutable audit proposal (not persistence)',()=>{
 it('binds transition, tenant, version and actor without exposing raw reason',()=>{
   const {next,audit}=proposeCustodyAudit(r,e());
   expect(next.status).toBe('REJECTED');expect(audit).toMatchObject({beforeRevision:1,afterRevision:2,fromStatus:'QUARANTINED',toStatus:'REJECTED',persisted:false,publishEnabled:false,readEnabled:false});
   expect(Object.isFrozen(audit)).toBe(true);expect(Object.isFrozen(next)).toBe(true);
   expect(JSON.stringify(audit)).not.toContain(e().reason);
   expect(audit.reasonSha256).toMatch(/^[a-f0-9]{64}$/);
 });
 it('binds distinct reasons and actors to distinct receipts',()=>{
   expect(proposeCustodyAudit(r,e()).audit.evidenceSha256).not.toBe(proposeCustodyAudit(r,{...e(),reason:'Another synthetic rejection reason'}).audit.evidenceSha256);
 });
 it('rejects stale revisions, legal hold purge, forged publication and invalid actor',()=>{
   for(const [rec,evt] of [[r,{...e(),expectedRevision:2}],[{...r,approved:true},e()],[r,{...e(),actorId:'not-uuid'}]] as const)
     expect(()=>proposeCustodyAudit(rec as never,evt as never)).toThrow(CustodyTransitionError);
 });
 it('never evaluates malicious event getters',()=>{
   let invoked=false;const malicious=Object.defineProperty({...e()},'reason',{enumerable:true,get(){invoked=true;return e().reason;}});
   expect(()=>proposeCustodyAudit(r,malicious)).toThrow(CustodyTransitionError);
   expect(invoked).toBe(false);
 });
});
