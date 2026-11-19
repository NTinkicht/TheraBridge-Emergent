import { randomUUID } from 'node:crypto';
import type { ActivityMediaPreflight } from './activity-media-intake-preflight';

/**
 * Quarantine-only key material for a FUTURE authenticated, private storage
 * adapter. No upload endpoint, write grant, client URL, or release transition
 * is implemented by this module.
 */
export type QuarantineObjectIntent = Readonly<{
  bucketClass: 'private-quarantine';
  objectKey: string;
  centerId: string;
  templateId: string;
  draftId: string;
  templateVersion: number;
  candidateSha256: string;
  candidateBytes: number;
  quarantineOnly: true;
  publishEnabled: false;
  readEnabled: false;
  approved: false;
}>;

export type QuarantineScope = Readonly<{
  centerId: string;
  templateId: string;
  draftId: string;
  templateVersion: number;
}>;

export class QuarantineIntentError extends Error {
  constructor() { super('Quarantine intent rejected.'); }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

/**
 * Only an internal proposal for a write-only private quarantine object.
 * Callers MUST separately verify current center, membership, activity owner,
 * draft state, CSRF, trial, quota and version inside a DB transaction.
 * The candidate's header preflight is NOT a full decoder/AV/rights approval.
 */
export function planQuarantineObject(
  scope: QuarantineScope,
  candidate: ActivityMediaPreflight,
  objectId: string = randomUUID(),
): QuarantineObjectIntent {
  if (!scope || typeof scope !== 'object' ||
    !UUID.test(scope.centerId) || !UUID.test(scope.templateId) || !UUID.test(scope.draftId) ||
    !Number.isSafeInteger(scope.templateVersion) || scope.templateVersion < 1 ||
    !candidate || typeof candidate !== 'object' ||
    candidate.approved !== false || candidate.publishEnabled !== false ||
    candidate.safeForStorage !== false ||
    candidate.format !== 'png' || !Number.isSafeInteger(candidate.width) ||
    !Number.isSafeInteger(candidate.height) || candidate.width < 1 || candidate.height < 1 ||
    !Number.isSafeInteger(candidate.byteLength) || candidate.byteLength < 33 ||
    candidate.byteLength > 8 * 1024 * 1024 ||
    typeof candidate.sha256 !== 'string' || !SHA256.test(candidate.sha256) ||
    !UUID.test(objectId)) {
    throw new QuarantineIntentError();
  }
  // No user-controlled filename, no external URL, no static/deterministic
  // object name. Independent random key per attempt prevents replacements.
  return Object.freeze({
    bucketClass: 'private-quarantine' as const,
    objectKey: `candidate/v1/${scope.centerId.toLowerCase()}/${randomUUID()}/${objectId.toLowerCase()}.png`,
    centerId: scope.centerId.toLowerCase(),
    templateId: scope.templateId.toLowerCase(),
    draftId: scope.draftId.toLowerCase(),
    templateVersion: scope.templateVersion,
    candidateSha256: candidate.sha256,
    candidateBytes: candidate.byteLength,
    quarantineOnly: true as const,
    publishEnabled: false as const,
    readEnabled: false as const,
    approved: false as const,
  });
}
