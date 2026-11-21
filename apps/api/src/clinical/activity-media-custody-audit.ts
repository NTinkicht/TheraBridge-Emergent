import {createHash} from 'node:crypto';
import {transitionCustody, CustodyTransitionError, type CustodyEvent, type CustodyRecord} from './activity-media-custody';

/** Isolated WU4-M audit proposal: not a persisted event, authorization, or clinical approval.
 * The caller MUST atomically CAS the revision and append an audit record in its trusted store.
 * No storage, HTTP, publication or actual deletion is performed here.
 */
export type CustodyAuditProposal = Readonly<{
  beforeRevision:number; afterRevision:number; centerId:string; templateId:string;
  draftId:string; templateVersion:number; candidateSha256:string;
  fromStatus:CustodyRecord['status']; toStatus:CustodyRecord['status'];
  actorId:string; reasonSha256:string; evidenceSha256:string;
  persisted:false; publishEnabled:false; readEnabled:false;
}>;
export function proposeCustodyAudit(record:CustodyRecord,event:CustodyEvent): Readonly<{
  next:CustodyRecord; audit:CustodyAuditProposal;
}> {
  // Reject accessors before the first read; avoid TOCTOU between transition and audit.
  const keys=['reason','expectedRevision','next','actorId'];
  if(!event || Object.getPrototypeOf(event)!==Object.prototype) throw new CustodyTransitionError();
  const descriptors=Object.getOwnPropertyDescriptors(event);
  if(Object.keys(descriptors).length!==keys.length || keys.some(k=>!Object.prototype.hasOwnProperty.call(descriptors[k]??{},'value'))) throw new CustodyTransitionError();
  const e=Object.fromEntries(keys.map(k=>[k,descriptors[k].value])) as CustodyEvent;
  // Snapshot the custody record too: Proxy get traps must never affect audit evidence.
  const recordKeys=['centerId','templateId','draftId','templateVersion','candidateSha256','candidateBytes','revision','status','legalHold','approved','publishEnabled','readEnabled'];
  if(!record || Object.getPrototypeOf(record)!==Object.prototype) throw new CustodyTransitionError();
  const rd=Object.getOwnPropertyDescriptors(record);
  if(Object.keys(rd).length!==recordKeys.length || recordKeys.some(k=>!Object.prototype.hasOwnProperty.call(rd[k]??{},'value'))) throw new CustodyTransitionError();
  const r=Object.fromEntries(recordKeys.map(k=>[k,rd[k].value])) as CustodyRecord;
  // Runtime callers can violate TypeScript's status union. Reject coercible objects
  // before transition lookup or immutable audit construction (Codex P2).
  if (typeof r.status !== 'string' || !(['QUARANTINED','REJECTED','REVOKED','PURGE_PENDING','PURGED'] as string[]).includes(r.status)) {
    throw new CustodyTransitionError();
  }
  const next=transitionCustody(r,e);
  // Only use fields from the validated, immutable result. Never retain raw reason/PII.
  const reasonSha256=createHash('sha256').update(e.reason,'utf8').digest('hex');
  const canonical=[next.centerId,next.templateId,next.draftId,String(next.templateVersion),
    next.candidateSha256,String(e.expectedRevision),String(next.revision),
    String(r.status),next.status,e.actorId.toLowerCase(),reasonSha256].join('|');
  const audit=Object.freeze({
    beforeRevision:e.expectedRevision,afterRevision:next.revision,
    centerId:next.centerId,templateId:next.templateId,draftId:next.draftId,
    templateVersion:next.templateVersion,candidateSha256:next.candidateSha256,
    fromStatus:r.status,toStatus:next.status,actorId:e.actorId.toLowerCase(),
    reasonSha256,evidenceSha256:createHash('sha256').update(canonical).digest('hex'),
    persisted:false as const,publishEnabled:false as const,readEnabled:false as const,
  });
  return Object.freeze({next,audit});
}
