import {createHash} from 'node:crypto';
import type {CustodyRecord} from './activity-media-custody';

/** Synthetic-only immutable audit chain verifier. No persistence, deletion or release. */
export class CustodyChainError extends Error {
  constructor() {super('Custody audit chain denied.');}
}
export type CustodyChainEntry = Readonly<{
  previousDigest: string; digest: string; revision: number;
  centerId: string; templateId: string; draftId: string; templateVersion: number; candidateSha256: string; status: string;
}>;
const sha = /^[a-f0-9]{64}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const allowed:Record<string,readonly string[]>={QUARANTINED:['REJECTED','REVOKED'],REJECTED:['PURGE_PENDING','REVOKED'],REVOKED:['PURGE_PENDING'],PURGE_PENDING:['PURGED'],PURGED:[]};
function data(value:unknown,keys:string[]):Record<string,unknown> {
  if (!value || typeof value!=='object' || Object.getPrototypeOf(value)!==Object.prototype) throw new CustodyChainError();
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length!==keys.length || keys.some(k=>!descriptors[k] || !('value' in descriptors[k]))) throw new CustodyChainError();
  return Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
}
export function verifyCustodyChain(input:readonly CustodyChainEntry[], expected:CustodyRecord):string {
  if (!Array.isArray(input) || input.length<1 || input.length>10000) throw new CustodyChainError();
  const r=data(expected,['centerId','templateId','draftId','templateVersion','candidateSha256','candidateBytes','revision','status','legalHold','approved','publishEnabled','readEnabled']);
  if(typeof r.centerId!=='string'||!uuid.test(r.centerId)||typeof r.templateId!=='string'||!uuid.test(r.templateId)||typeof r.draftId!=='string'||!uuid.test(r.draftId)||typeof r.templateVersion!=='number'||!Number.isSafeInteger(r.templateVersion)||r.templateVersion<1||typeof r.candidateSha256!=='string'||!sha.test(r.candidateSha256)||
     typeof r.candidateBytes!=='number'||!Number.isSafeInteger(r.candidateBytes)||r.candidateBytes<33||r.candidateBytes>8*1024*1024||
     typeof r.revision!=='number'||!Number.isSafeInteger(r.revision)||r.revision<1||typeof r.legalHold!=='boolean'||r.approved!==false||r.publishEnabled!==false||r.readEnabled!==false) throw new CustodyChainError();
  let previous='0'.repeat(64), revision=0, finalStatus='';
  for(const raw of input) {
    const e=data(raw,['previousDigest','digest','revision','centerId','templateId','draftId','templateVersion','candidateSha256','status']);
    if(typeof e.previousDigest!=='string'||e.previousDigest!==previous||
       typeof e.digest!=='string'||!sha.test(e.digest)||
       typeof e.centerId!=='string'||e.centerId!==r.centerId||
       typeof e.templateId!=='string'||e.templateId!==r.templateId||
       typeof e.draftId!=='string'||e.draftId!==r.draftId||
       typeof e.templateVersion!=='number'||e.templateVersion!==r.templateVersion||
       typeof e.candidateSha256!=='string'||e.candidateSha256!==r.candidateSha256||
       typeof e.revision!=='number'||!Number.isSafeInteger(e.revision)||e.revision!==revision+1||
       typeof e.status!=='string'||!['QUARANTINED','REJECTED','REVOKED','PURGE_PENDING','PURGED'].includes(e.status)||
       (revision===0 ? e.status!=='QUARANTINED' : !allowed[finalStatus]?.includes(e.status)) ||
       (r.legalHold===true && (e.status==='PURGE_PENDING' || e.status==='PURGED'))) throw new CustodyChainError();
    const digest=createHash('sha256').update(JSON.stringify([e.previousDigest,e.revision,e.centerId,e.templateId,e.draftId,e.templateVersion,e.candidateSha256,e.status])).digest('hex');
    if(digest!==e.digest) throw new CustodyChainError();
    previous=digest;revision=e.revision;finalStatus=e.status;
  }
  if(revision!==r.revision||finalStatus!==r.status) throw new CustodyChainError();
  return previous;
}
