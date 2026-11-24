import { createPublicKey, verify } from 'node:crypto';
import { canonicalJson, canonicalFingerprint } from '../common/fingerprints';

export type ArtworkApproval = {
  candidateId: string; centerId: string; templateId: string; templateVersion: number; slot: number;
  digestSha256: string; contextSha256: string; rightsEvidenceSha256: string; clinicalEvidenceSha256: string;
  rightsSignature: string; clinicalSignature: string;
};
export type ArtworkContext = {
  candidateId: string; centerId: string; templateId: string; templateVersion: number; slot: number;
  digestSha256: string; draftId: string; draftVersion: number; service: string;
  styleVersion: string; sceneType: string; sourceReference: string; altText: string;
  license: string; providerTerms: string | null; instruction: string | null;
  activityTitle: string; activitySteps: string[]; activitySafety: string[]; activityMaterials: string[];
};
const sha = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function artworkApprovalMessage(approval: ArtworkApproval, purpose: 'rights' | 'clinical'): Buffer {
  return Buffer.from(canonicalJson({
    domain: 'therabridge-activity-artwork-approval-v1', purpose,
    candidateId: approval.candidateId, centerId: approval.centerId, templateId: approval.templateId,
    templateVersion: approval.templateVersion, slot: approval.slot, digestSha256: approval.digestSha256,
    contextSha256: approval.contextSha256, rightsEvidenceSha256: approval.rightsEvidenceSha256,
    clinicalEvidenceSha256: approval.clinicalEvidenceSha256,
  }), 'utf8');
}
function signature(raw: string): Buffer {
  if (!/^[A-Za-z0-9+/]{86}==$/.test(raw)) throw new Error('Invalid signature');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== raw) throw new Error('Invalid signature');
  return bytes;
}

/** Trusted public keys are deployment-controlled; callers cannot supply keys.
 * Missing, invalid or shared keys fail closed, as does any changed context.
 * A verified receipt is artwork evidence ONLY, never clinical release authority.
 */
export function verifiesArtworkApproval(approval: ArtworkApproval, context: ArtworkContext): boolean {
  try {
    if (!uuid.test(context.candidateId) || !uuid.test(context.centerId) || !uuid.test(context.templateId) ||
        !uuid.test(context.draftId) || !Number.isSafeInteger(context.templateVersion) || context.templateVersion < 1 ||
        !Number.isSafeInteger(context.slot) || context.slot < 0 || context.slot > 64 ||
        !Number.isSafeInteger(context.draftVersion) || context.draftVersion < 1 ||
        !sha.test(context.digestSha256) || !sha.test(approval.rightsEvidenceSha256) ||
        !sha.test(approval.clinicalEvidenceSha256) || approval.rightsEvidenceSha256 === approval.clinicalEvidenceSha256 ||
        approval.candidateId !== context.candidateId || approval.centerId !== context.centerId ||
        approval.templateId !== context.templateId || approval.templateVersion !== context.templateVersion ||
        approval.slot !== context.slot || approval.digestSha256 !== context.digestSha256 ||
        approval.contextSha256 !== canonicalFingerprint(context)) return false;
    const rights = createPublicKey(process.env.TB_ARTWORK_RIGHTS_PUBLIC_KEY_PEM ?? '');
    const clinical = createPublicKey(process.env.TB_ARTWORK_CLINICAL_PUBLIC_KEY_PEM ?? '');
    if (rights.asymmetricKeyType !== 'ed25519' || clinical.asymmetricKeyType !== 'ed25519' ||
        rights.export({type:'spki',format:'der'}).equals(clinical.export({type:'spki',format:'der'}))) return false;
    return verify(null, artworkApprovalMessage(approval, 'rights'), rights, signature(approval.rightsSignature)) &&
      verify(null, artworkApprovalMessage(approval, 'clinical'), clinical, signature(approval.clinicalSignature));
  } catch { return false; }
}
