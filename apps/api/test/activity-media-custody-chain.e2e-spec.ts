import {createHash} from 'node:crypto';
import {verifyCustodyChain,CustodyChainError} from '../src/clinical/activity-media-custody-chain';
import type {CustodyRecord} from '../src/clinical/activity-media-custody';
const centerId='11111111-1111-4111-8111-111111111111', candidateSha256='a'.repeat(64);
const record:CustodyRecord={centerId,templateId:'22222222-2222-4222-8222-222222222222',draftId:'33333333-3333-4333-8333-333333333333',templateVersion:1,candidateSha256,candidateBytes:100,revision:2,status:'REJECTED',legalHold:false,approved:false,publishEnabled:false,readEnabled:false};
const entry=(previousDigest:string,revision:number,status:string)=>({previousDigest,revision,centerId,candidateSha256,status,digest:createHash('sha256').update(JSON.stringify([previousDigest,revision,centerId,candidateSha256,status])).digest('hex')});
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
 it('rejects accessor-backed and forged rights',()=>{
  expect(()=>verifyCustodyChain([first,second],{...record,approved:true} as never)).toThrow(CustodyChainError);
  const malicious=Object.defineProperty({...second},'status',{enumerable:true,get(){return 'REJECTED';}});
  expect(()=>verifyCustodyChain([first,malicious],record)).toThrow(CustodyChainError);
 });
});
