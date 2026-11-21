import {createHash} from 'node:crypto';
import {MAX_ACTIVITY_MEDIA_BYTES,preflightActivityMedia} from './activity-media-intake-preflight';
import {verifyPngCandidate} from './activity-media-png-integrity';
import {planQuarantineObject,type QuarantineScope} from './activity-media-quarantine-intent';
import {scanPrivateCandidate,type PrivateScanner} from './activity-media-scanner-boundary';

/** WU4-L: isolated scan+integrity composition. No disk, HTTP, rights grants or approval.
 * Scanner MUST be a trusted process-side adapter, never a browser callback.
 * The private snapshot is used through all checks; storage remains disabled.
 */
export class PrivateAdmissionError extends Error {
  constructor() { super('Private candidate admission rejected.'); }
}
export type PrivateAdmissionEvidence = Readonly<{
  centerId:string;templateId:string;draftId:string;templateVersion:number;
  candidateSha256:string;candidateBytes:number;
  pngStructureVerified:true;scannerObserved:true;quarantineIntentObserved:true;
  approved:false;readEnabled:false;publishEnabled:false;safeForStorage:false;
}>;
export async function inspectPrivateAdmission(
 scope:QuarantineScope,bytes:unknown,scanner?:PrivateScanner,
):Promise<PrivateAdmissionEvidence> {
 if(!Buffer.isBuffer(bytes) || bytes.length<33 || bytes.length>MAX_ACTIVITY_MEDIA_BYTES || typeof scanner!=='function') throw new PrivateAdmissionError();
 // Never allow mutation of the caller's bytes to race asynchronous scanner work.
 const snapshot=Buffer.from(bytes);
 try {
   const preflight=preflightActivityMedia(snapshot);
   const png=verifyPngCandidate(snapshot);
   if(png.sha256!==preflight.sha256)throw new PrivateAdmissionError();
   const intent=planQuarantineObject(scope,preflight);
   const scan=await scanPrivateCandidate(snapshot,scanner);
   const hash=createHash('sha256').update(snapshot).digest('hex');
   if(scan.sha256!==hash || png.sha256!==hash ||
      scan.byteLength!==snapshot.length || intent.candidateBytes!==snapshot.length ||
      intent.candidateSha256!==hash ||
      // Scope was validated and snapshotted by planQuarantineObject before
      // the asynchronous scanner ran. Never read caller-owned metadata again:
      // a mutable scope or accessor must not change the identity after scanning.
      !intent.quarantineOnly || intent.approved!==false ||
      intent.readEnabled!==false || intent.publishEnabled!==false ||
      intent.bucketClass!=='private-quarantine') throw new PrivateAdmissionError();
   return Object.freeze({
     centerId:intent.centerId,templateId:intent.templateId,
     draftId:intent.draftId,templateVersion:intent.templateVersion,
     candidateSha256:hash,candidateBytes:snapshot.length,
     pngStructureVerified:true as const,scannerObserved:true as const,
     quarantineIntentObserved:true as const,approved:false as const,
     readEnabled:false as const,publishEnabled:false as const,
     safeForStorage:false as const,
   });
 } catch {
   throw new PrivateAdmissionError();
 }
}
