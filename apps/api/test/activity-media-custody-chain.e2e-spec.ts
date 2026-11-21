import {createHash} from 'node:crypto';
import {verifyCustodyChain,CustodyChainError} from '../src/clinical/activity-media-custody-chain';
import type {CustodyRecord} from '../src/clinical/activity-media-custody';
const centerId='11111111-1111-4111-8111-111111111111', candidateSha256='a'.repeat(64);
const record:CustodyRecord={centerId,templateId:'22222222-2222-4222-8222-222222222222',draftId:'33333333-3333-4333-8333-333333333333',templateVersion:1,candidateSha256,candidateBytes:100,revision:2,status:'REJECTED',legalHold:false,approved:false,publishEnabled:false,readEnabled:false};
const entry=(previousDigest:string,revision:number,status:string,identity:Pick<CustodyRecord,'centerId'|'templateId'|'draftId'|'templateVersion'|'candidateSha256'>=record)=>({previousDigest,revision,centerId:identity.centerId,templateId:identity.templateId,draftId:identity.draftId,templateVersion:identity.templateVersion,candidateSha256:identity.candidateSha256,status,digest:createHash('sha256').update(JSON.stringify([previousDigest,revision,identity.centerId,identity.templateId,identity.draftId,identity.templateVersion,identity.candidateSha256,status])).digest('hex')});
describe('WU4-O synthetic immutable custody audit chain',()=>{
 const first=entry('0'.repeat(64),1,'QUARANTINED'),second=entry(first.digest,2,'REJECTED');
 it('accepts only a complete, matching sequence',()=>expect(verifyCustodyChain([first,second],record)).toBe(second.digest));
 it('rejects missing, reordered, duplicate and tampered evidence',()=>{
  for(const chain of [[],[second],[first],[first,first],[first,{...second,digest:'f'.repeat(64)}],[first,{...second,status:'PURGED'}]])expect(()=>verifyCustodyChain(chain,record)).toThrow(CustodyChainError);
 });
 it('rejects cross-tenant and mismatched final state',()=>{
  expect(()=>verifyCustodyChain([first,second],{...record,centerId:'99999999-9999-4999-8999-999999999999'})).toThrow(CustodyChainError);
  expect(()=>verifyCustodyChain([first,second],{...record,status:'PURGED'})).toThrow(CustodyChainError);
 });
 it('rejects cross-draft and cross-version substitution even with identical candidate bytes',()=>{
   for(const identity of [{...record,draftId:'55555555-5555-4555-8555-555555555555'}, {...record,templateId:'66666666-6666-4666-8666-666666666666'}, {...record,templateVersion:2}]) {
     const a=entry('0'.repeat(64),1,'QUARANTINED',identity);
     const b=entry(a.digest,2,'REJECTED',identity);
     expect(()=>verifyCustodyChain([a,b],record)).toThrow(CustodyChainError);
   }
 });
 it('rejects correctly rehashed illegal lifecycle histories',()=>{
   for(const sequence of [['QUARANTINED','PURGED'],['QUARANTINED','REJECTED','QUARANTINED'],['QUARANTINED','REVOKED','REJECTED'],['REJECTED','PURGE_PENDING']]) {
     let prev='0'.repeat(64);
     const chain=sequence.map((status,i)=>{const e=entry(prev,i+1,status);prev=e.digest;return e;});
     expect(()=>verifyCustodyChain(chain,{...record,revision:chain.length,status:sequence[sequence.length-1]} as CustodyRecord)).toThrow(CustodyChainError);
   }
 });
 it('rejects correctly hashed purge evidence while legal hold is active',()=>{
   const a=entry('0'.repeat(64),1,'QUARANTINED');
   const b=entry(a.digest,2,'REJECTED');
   const c=entry(b.digest,3,'PURGE_PENDING');
   const d=entry(c.digest,4,'PURGED');
   expect(()=>verifyCustodyChain([a,b,c,d],{...record,revision:4,status:'PURGED',legalHold:true})).toThrow(CustodyChainError);
   expect(verifyCustodyChain([a,b,c,d],{...record,revision:4,status:'PURGED',legalHold:false})).toBe(d.digest);
 });
 it('rejects accessor-backed and forged rights',()=>{
  expect(()=>verifyCustodyChain([first,second],{...record,approved:true} as never)).toThrow(CustodyChainError);
  const malicious=Object.defineProperty({...second},'status',{enumerable:true,get(){return 'REJECTED';}});
  expect(()=>verifyCustodyChain([first,malicious],record)).toThrow(CustodyChainError);
 });
 it('rejects forged candidate-byte boundaries despite a valid signed chain',()=>{
  for(const candidateBytes of [undefined,null,0,32,8*1024*1024+1,NaN,Infinity,-1,33.5,'100',{},[]]) {
   expect(()=>verifyCustodyChain([first,second],{...record,candidateBytes} as never)).toThrow(CustodyChainError);
  }
  expect(verifyCustodyChain([first,second],{...record,candidateBytes:33})).toBe(second.digest);
  expect(verifyCustodyChain([first,second],{...record,candidateBytes:8*1024*1024})).toBe(second.digest);
 });

});
