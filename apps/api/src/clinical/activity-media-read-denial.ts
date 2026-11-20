import {createHash} from 'node:crypto';
import {type CustodyRecord, CustodyTransitionError} from './activity-media-custody';

/** WU4-N: deterministic, private revocation/deny receipt, not an HTTP or storage ACL.
 * All candidate states deny reads, including quarantined and revoked; no token or URL is emitted.
 * A real object-store/cache revocation requires separately approved, audited integration.
 */
export type PrivateReadDenial = Readonly<{
 centerId:string; templateId:string; draftId:string; templateVersion:number;
 candidateSha256:string; custodyRevision:number; custodyStatus:CustodyRecord['status'];
 denialSha256:string; permitted:false; signedUrlIssued:false; cacheable:false;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function denyPrivateMediaRead(input:CustodyRecord, requestedCenterId:string):PrivateReadDenial {
 if(!input || typeof input!=='object' || Object.getPrototypeOf(input)!==Object.prototype) throw new CustodyTransitionError();
 const keys=['centerId','templateId','draftId','templateVersion','candidateSha256','candidateBytes','revision','status','legalHold','approved','publishEnabled','readEnabled'];
 const d=Object.getOwnPropertyDescriptors(input);
 if(Object.keys(d).length!==keys.length || keys.some(k=>!Object.prototype.hasOwnProperty.call(d[k]??{},'value'))) throw new CustodyTransitionError();
 const r=Object.fromEntries(keys.map(k=>[k,d[k].value])) as CustodyRecord;
 if(typeof requestedCenterId!=='string' || !UUID.test(requestedCenterId) ||
    !UUID.test(r.centerId) || !UUID.test(r.templateId) || !UUID.test(r.draftId) ||
    requestedCenterId.toLowerCase()!==r.centerId.toLowerCase() ||
    !Number.isSafeInteger(r.templateVersion) || r.templateVersion<1 ||
    !Number.isSafeInteger(r.revision) || r.revision<1 ||
    !Number.isSafeInteger(r.candidateBytes) || r.candidateBytes<33 || r.candidateBytes>8*1024*1024 ||
    typeof r.candidateSha256!=='string' || !/^[a-f0-9]{64}$/.test(r.candidateSha256) ||
    !['QUARANTINED','REJECTED','REVOKED','PURGE_PENDING','PURGED'].includes(r.status) ||
    r.approved!==false || r.publishEnabled!==false || r.readEnabled!==false ||
    typeof r.legalHold!=='boolean') throw new CustodyTransitionError();
 const centerId=r.centerId.toLowerCase(),templateId=r.templateId.toLowerCase(),draftId=r.draftId.toLowerCase();
 const canonical=[centerId,templateId,draftId,r.templateVersion,r.candidateSha256,r.revision,r.status,'DENY'].join('|');
 return Object.freeze({centerId,templateId,draftId,templateVersion:r.templateVersion,
  candidateSha256:r.candidateSha256,custodyRevision:r.revision,custodyStatus:r.status,
  denialSha256:createHash('sha256').update(canonical).digest('hex'),
  permitted:false as const,signedUrlIssued:false as const,cacheable:false as const});
}
