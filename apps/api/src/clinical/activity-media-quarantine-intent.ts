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

// Snapshot untrusted metadata once, without invoking accessors or coercing
// arbitrary objects into tenant identity, filenames or candidate fingerprints.
// The caller's later mutation cannot redirect the quarantine object key.
function snapshotPlain<T extends object>(value: T, keys: readonly string[]): T {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new QuarantineIntentError();
  }
  const fields = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(fields).length !== keys.length ||
      keys.some(key => !Object.prototype.hasOwnProperty.call(fields[key] ?? {}, 'value'))) {
    throw new QuarantineIntentError();
  }
  return Object.fromEntries(keys.map(key => [key, fields[key].value])) as T;
}

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
  const scoped = snapshotPlain(scope, ['centerId', 'templateId', 'draftId', 'templateVersion']);
  const inspected = snapshotPlain(candidate, [
    'format', 'width', 'height', 'byteLength', 'sha256', 'approved', 'publishEnabled', 'safeForStorage',
  ]);
  if (typeof scoped.centerId !== 'string' || typeof scoped.templateId !== 'string' ||
    typeof scoped.draftId !== 'string' ||
    !UUID.test(scoped.centerId) || !UUID.test(scoped.templateId) || !UUID.test(scoped.draftId) ||
    !Number.isSafeInteger(scoped.templateVersion) || scoped.templateVersion < 1 ||
    inspected.approved !== false || inspected.publishEnabled !== false ||
    inspected.safeForStorage !== false ||
    inspected.format !== 'png' || !Number.isSafeInteger(inspected.width) ||
    !Number.isSafeInteger(inspected.height) || inspected.width < 1 || inspected.height < 1 ||
    !Number.isSafeInteger(inspected.byteLength) || inspected.byteLength < 33 ||
    inspected.byteLength > 8 * 1024 * 1024 ||
    typeof inspected.sha256 !== 'string' || !SHA256.test(inspected.sha256) ||
    typeof objectId !== 'string' || !UUID.test(objectId)) {
    throw new QuarantineIntentError();
  }
  // No user-controlled filename, no external URL, no static/deterministic
  // object name. Independent random key per attempt prevents replacements.
  return Object.freeze({
    bucketClass: 'private-quarantine' as const,
    objectKey: `candidate/v1/${scoped.centerId.toLowerCase()}/${randomUUID()}/${objectId.toLowerCase()}.png`,
    centerId: scoped.centerId.toLowerCase(),
    templateId: scoped.templateId.toLowerCase(),
    draftId: scoped.draftId.toLowerCase(),
    templateVersion: scoped.templateVersion,
    candidateSha256: inspected.sha256,
    candidateBytes: inspected.byteLength,
    quarantineOnly: true as const,
    publishEnabled: false as const,
    readEnabled: false as const,
    approved: false as const,
  });
}


/**
 * Freeze an exact, plain-data quarantine intent before any scanner or disk await.
 * Runtime validation matters: TypeScript interfaces cannot prevent hostile
 * accessor-backed metadata, mutated object keys or a spoofed center identity.
 * This grants NO approval, read, storage-safety or publication authority.
 */
export function snapshotQuarantineIntent(value: unknown): QuarantineObjectIntent {
  const keys = ['bucketClass','objectKey','centerId','templateId','draftId','templateVersion',
    'candidateSha256','candidateBytes','quarantineOnly','publishEnabled','readEnabled','approved'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) throw new QuarantineIntentError();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== keys.length ||
      keys.some(key => !Object.prototype.hasOwnProperty.call(descriptors[key] ?? {}, 'value'))) {
    throw new QuarantineIntentError();
  }
  const claim = Object.fromEntries(keys.map(key => [key, descriptors[key].value])) as QuarantineObjectIntent;
  const id = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  const keyPattern = new RegExp('^candidate/v1/(' + id + ')/(' + id + ')/(' + id + ')\\.png$');
  const match = typeof claim.objectKey === 'string' ? keyPattern.exec(claim.objectKey) : null;
  if (claim.bucketClass !== 'private-quarantine' || !match ||
      typeof claim.centerId !== 'string' || !UUID.test(claim.centerId) ||
      typeof claim.templateId !== 'string' || !UUID.test(claim.templateId) ||
      typeof claim.draftId !== 'string' || !UUID.test(claim.draftId) ||
      match[1] !== claim.centerId.toLowerCase() ||
      !Number.isSafeInteger(claim.templateVersion) || claim.templateVersion < 1 ||
      typeof claim.candidateSha256 !== 'string' || !SHA256.test(claim.candidateSha256) ||
      !Number.isSafeInteger(claim.candidateBytes) || claim.candidateBytes < 33 ||
      claim.candidateBytes > 8 * 1024 * 1024 ||
      claim.quarantineOnly !== true || claim.approved !== false ||
      claim.readEnabled !== false || claim.publishEnabled !== false) {
    throw new QuarantineIntentError();
  }
  return Object.freeze({ ...claim });
}
