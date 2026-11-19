/**
 * WU4-J: server-only rights/provenance evidence consistency gate, not a
 * publication approval path. All facts must come from authenticated persisted
 * records and independently verified sign-offs, never request DTOs.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
export class MediaRightsEvidenceError extends Error {
  constructor() { super('Artwork rights evidence incomplete.'); }
}
export type MediaRightsFacts = Readonly<{
  centerId: string; templateId: string; draftId: string;
  templateVersion: number; assetSha256: string;
  creatorUserId: string; reviewerUserId: string;
  sourceType: 'ORIGINAL' | 'LICENSED' | 'GENERATED';
  sourceReference: string; licenseId: string; providerTerms?: string;
  attribution: string; rightsCheckedAt: string;
  reviewDecision: 'RIGHTS_VERIFIED' | 'REJECTED' | 'PENDING';
  reviewAssetSha256: string; reviewTemplateVersion: number;
  reviewCenterId: string; reviewDraftId: string;
}>;
export type MediaRightsEvidence = Readonly<{
  centerId: string; templateId: string; draftId: string;
  templateVersion: number; assetSha256: string;
  rightsReviewObserved: true; clinicalReviewObserved: false;
  publishEnabled: false; approved: false; readEnabled: false;
}>;
/** Reject stale or mismatched rights records; always keep clinical review NO-GO. */
export function verifyMediaRightsEvidence(facts: MediaRightsFacts): MediaRightsEvidence {
  if (!facts || typeof facts !== 'object' ||
      !UUID.test(facts.centerId) || !UUID.test(facts.templateId) ||
      !UUID.test(facts.draftId) || !UUID.test(facts.creatorUserId) ||
      !UUID.test(facts.reviewerUserId) ||
      facts.creatorUserId.toLowerCase() === facts.reviewerUserId.toLowerCase() ||
      !Number.isSafeInteger(facts.templateVersion) || facts.templateVersion < 1 ||
      typeof facts.assetSha256 !== 'string' || !SHA.test(facts.assetSha256) ||
      !['ORIGINAL','LICENSED','GENERATED'].includes(facts.sourceType) ||
      typeof facts.sourceReference !== 'string' ||
      facts.sourceReference.trim().length < 8 || facts.sourceReference.length > 500 ||
      typeof facts.licenseId !== 'string' ||
      facts.licenseId.trim().length < 4 || facts.licenseId.length > 160 ||
      typeof facts.attribution !== 'string' || facts.attribution.trim().length < 4 ||
      facts.attribution.length > 300 ||
      (facts.sourceType === 'GENERATED' &&
        (typeof facts.providerTerms !== 'string' || facts.providerTerms.trim().length < 8)) ||
      facts.reviewDecision !== 'RIGHTS_VERIFIED' ||
      facts.reviewAssetSha256 !== facts.assetSha256 ||
      facts.reviewTemplateVersion !== facts.templateVersion ||
      facts.reviewCenterId.toLowerCase() !== facts.centerId.toLowerCase() ||
      facts.reviewDraftId.toLowerCase() !== facts.draftId.toLowerCase() ||
      typeof facts.rightsCheckedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(facts.rightsCheckedAt) ||
      !Number.isFinite(Date.parse(facts.rightsCheckedAt))) {
    throw new MediaRightsEvidenceError();
  }
  return Object.freeze({
    centerId: facts.centerId.toLowerCase(), templateId: facts.templateId.toLowerCase(),
    draftId: facts.draftId.toLowerCase(), templateVersion: facts.templateVersion,
    assetSha256: facts.assetSha256,
    rightsReviewObserved: true as const, clinicalReviewObserved: false as const,
    publishEnabled: false as const, approved: false as const, readEnabled: false as const,
  });
}
