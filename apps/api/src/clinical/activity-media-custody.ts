/** M5-14 WU4-K: isolated immutable lifecycle state transition helper.
 * Never connects to HTTP, publishes, deletes files or grants private reads.
 * A trusted persistence layer must CAS the version, append audit and enforce
 * retention, tenant, legal-hold and reviewer access transactionally.
 */
export type CustodyStatus = 'QUARANTINED' | 'REJECTED' | 'REVOKED' | 'PURGE_PENDING' | 'PURGED';
export type CustodyRecord = Readonly<{
  centerId: string; templateId: string; draftId: string; templateVersion: number;
  candidateSha256: string; candidateBytes: number;
  revision: number; status: CustodyStatus; legalHold: boolean;
  approved: false; publishEnabled: false; readEnabled: false;
}>;
export type CustodyEvent = Readonly<{
  reason: string; expectedRevision: number; next: Exclude<CustodyStatus,'QUARANTINED'>;
  actorId: string;
}>;
export class CustodyTransitionError extends Error {
  constructor() { super('Quarantine custody transition denied.'); }
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
function snapshotPlain<T extends object>(value: T, keys: readonly string[]): T {
  if (!value || typeof value !== 'object' ||
      Object.getPrototypeOf(value) !== Object.prototype) throw new CustodyTransitionError();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== keys.length ||
      keys.some(key => !Object.prototype.hasOwnProperty.call(descriptors,key) ||
        !Object.prototype.hasOwnProperty.call(descriptors[key],'value'))) {
    throw new CustodyTransitionError();
  }
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value])) as T;
}
export function transitionCustody(inputRecord: CustodyRecord, inputEvent: CustodyEvent): CustodyRecord {
  const record = snapshotPlain(inputRecord, ['centerId','templateId','draftId','templateVersion','candidateSha256','candidateBytes','revision','status','legalHold','approved','publishEnabled','readEnabled']);
  const event = snapshotPlain(inputEvent, ['reason','expectedRevision','next','actorId']);
  if(!record || !event || typeof record!=='object' || typeof event!=='object' ||
     !UUID.test(record.centerId) || !UUID.test(record.templateId) ||
     !UUID.test(record.draftId) || !UUID.test(event.actorId) ||
     typeof record.candidateSha256!=='string' || !SHA.test(record.candidateSha256) ||
     !Number.isSafeInteger(record.templateVersion) || record.templateVersion<1 ||
     !Number.isSafeInteger(record.candidateBytes) || record.candidateBytes<33 || record.candidateBytes>8*1024*1024 ||
     !Number.isSafeInteger(record.revision) || record.revision<1 ||
     !Number.isSafeInteger(event.expectedRevision) || event.expectedRevision!==record.revision ||
     record.revision===Number.MAX_SAFE_INTEGER ||
     record.approved!==false || record.publishEnabled!==false || record.readEnabled!==false ||
     typeof record.legalHold!=='boolean' || typeof event.reason!=='string' ||
     event.reason.trim().length<8 || event.reason.length>500) throw new CustodyTransitionError();
  const allowed: Record<CustodyStatus, readonly CustodyStatus[]> = {
    QUARANTINED:['REJECTED','REVOKED'], REJECTED:['PURGE_PENDING','REVOKED'],
    REVOKED:['PURGE_PENDING'], PURGE_PENDING:['PURGED'], PURGED:[],
  };
  if(!allowed[record.status]?.includes(event.next) ||
     (record.legalHold && (event.next==='PURGE_PENDING' || event.next==='PURGED'))) throw new CustodyTransitionError();
  return Object.freeze({
    centerId:record.centerId.toLowerCase(),templateId:record.templateId.toLowerCase(),
    draftId:record.draftId.toLowerCase(),templateVersion:record.templateVersion,
    candidateSha256:record.candidateSha256,candidateBytes:record.candidateBytes,
    revision:record.revision+1,status:event.next,legalHold:record.legalHold,
    approved:false as const,publishEnabled:false as const,readEnabled:false as const,
  });
}
