import {denyPrivateMediaRead} from '../src/clinical/activity-media-read-denial';
import {CustodyTransitionError,type CustodyRecord} from '../src/clinical/activity-media-custody';
const r:CustodyRecord={centerId:'11111111-1111-4111-8111-111111111111',templateId:'22222222-2222-4222-8222-222222222222',draftId:'33333333-3333-4333-8333-333333333333',templateVersion:1,candidateSha256:'a'.repeat(64),candidateBytes:100,revision:1,status:'QUARANTINED',legalHold:false,approved:false,publishEnabled:false,readEnabled:false};
describe('WU4-N private media read denial evidence',()=>{
 it.each(['QUARANTINED','REJECTED','REVOKED','PURGE_PENDING','PURGED'] as const)('denies %s without URL or cache permission',status=>{
   const out=denyPrivateMediaRead({...r,status},r.centerId);
   expect(out).toMatchObject({permitted:false,signedUrlIssued:false,cacheable:false,custodyStatus:status});
   expect(Object.isFrozen(out)).toBe(true);
   expect(JSON.stringify(out)).not.toMatch(/objectKey|storagePath|accessToken|https?:/i);
 });
 it('changes digest on status/revision change',()=>{
   expect(denyPrivateMediaRead(r,r.centerId).denialSha256).not.toBe(denyPrivateMediaRead({...r,revision:2},r.centerId).denialSha256);
 });
 it('rejects cross-center requests, forged flags and malformed custody',()=>{
   for(const [rec,center] of [[r,'99999999-9999-4999-8999-999999999999'],[{...r,readEnabled:true},r.centerId],[{...r,revision:0},r.centerId],[{...r,status:'APPROVED'},r.centerId]] as const)
    expect(()=>denyPrivateMediaRead(rec as never,center)).toThrow(CustodyTransitionError);
 });
 it('rejects accessor-backed tenant and revision without invoking getters',()=>{
   let invoked=false;const malicious=Object.defineProperty({...r},'revision',{enumerable:true,get(){invoked=true;return 1;}});
   expect(()=>denyPrivateMediaRead(malicious,r.centerId)).toThrow(CustodyTransitionError);
   expect(invoked).toBe(false);
 });
});
