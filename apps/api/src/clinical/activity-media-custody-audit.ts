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
  const next=transitionCustody(record,e);
  // Only use fields from the validated, immutable result. Never retain raw reason/PII.
  const reasonSha256=createHash('sha256').update(e.reason,'utf8').digest('hex');
  const canonical=[next.centerId,next.templateId,next.draftId,String(next.templateVersion),
    next.candidateSha256,String(e.expectedRevision),String(next.revision),
    String(record.status),next.status,e.actorId.toLowerCase(),reasonSha256].join('|');
  const audit=Object.freeze({
    beforeRevision:e.expectedRevision,afterRevision:next.revision,
    centerId:next.centerId,templateId:next.templateId,draftId:next.draftId,
    templateVersion:next.templateVersion,candidateSha256:next.candidateSha256,
    fromStatus:record.status,toStatus:next.status,actorId:e.actorId.toLowerCase(),
    reasonSha256,evidenceSha256:createHash('sha256').update(canonical).digest('hex'),
    persisted:false as const,publishEnabled:false as const,readEnabled:false as const,
  });
  return Object.freeze({next,audit});
}
