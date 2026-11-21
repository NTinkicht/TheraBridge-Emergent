import { createHash } from 'node:crypto';
import { inspectPrivateAdmission } from './activity-media-private-admission';
import { snapshotQuarantineIntent, type QuarantineObjectIntent } from './activity-media-quarantine-intent';
import { LocalQuarantineWriter } from './activity-media-local-quarantine';
import { MAX_ACTIVITY_MEDIA_BYTES } from './activity-media-intake-preflight';
import type { PrivateScanner } from './activity-media-scanner-boundary';

/**
 * M5-14: actual offline scan -> integrity -> private-file write composition.
 *
 * This function is NOT an HTTP upload handler or an authorization decision.
 * Inputs MUST come from a future trusted authenticated transaction which
 * commits the object key/custody row. The scanner must be a trusted server-side
 * process, not a caller-supplied HTTP object or a test stub in production.
 * No storage promotion, public read, signed URL, approval or deletion occurs.
 */
export class PrivateStagingError extends Error {
  constructor() { super('Private candidate staging denied.'); }
}
export type PrivateStagingReceipt = Readonly<{
  candidateSha256: string;
  candidateBytes: number;
  integrityVerified: true;
  scannerObserved: true;
  quarantineWriteObserved: true;
  quarantined: true;
  approved: false;
  readEnabled: false;
  publishEnabled: false;
  safeForPublication: false;
}>;

export async function stagePrivateCandidate(
  inputIntent: QuarantineObjectIntent, inputBytes: unknown,
  scanner: PrivateScanner | undefined, writer: LocalQuarantineWriter,
): Promise<PrivateStagingReceipt> {
  // Enforce bounded size before allocating a second buffer or invoking scanner.
  if (!Buffer.isBuffer(inputBytes) || inputBytes.length < 33 ||
      inputBytes.length > MAX_ACTIVITY_MEDIA_BYTES ||
      typeof scanner !== 'function' || !(writer instanceof LocalQuarantineWriter)) {
    throw new PrivateStagingError();
  }
  const snapshot = Buffer.from(inputBytes);
  try {
    // A safe immutable identity must be captured BEFORE the first await.
    const intent = snapshotQuarantineIntent(inputIntent);
    const scope = {
      centerId: intent.centerId, templateId: intent.templateId,
      draftId: intent.draftId, templateVersion: intent.templateVersion,
    };
    // inspectPrivateAdmission verifies PNG integrity and an exact, clean
    // trusted scanner response. It never grants storage/publication.
    const checked = await inspectPrivateAdmission(scope, snapshot, scanner);
    const actualSha256 = createHash('sha256').update(snapshot).digest('hex');
    if (checked.candidateSha256 !== intent.candidateSha256 ||
        actualSha256 !== intent.candidateSha256 ||
        checked.candidateBytes !== intent.candidateBytes ||
        checked.centerId !== intent.centerId ||
        checked.templateId !== intent.templateId ||
        checked.draftId !== intent.draftId ||
        checked.templateVersion !== intent.templateVersion ||
        checked.approved !== false || checked.readEnabled !== false ||
        checked.publishEnabled !== false || checked.safeForStorage !== false) {
      throw new PrivateStagingError();
    }
    // The write is exclusive/no-follow, private-permission and digest-verified.
    // Same snapshotted bytes cross the scanner and storage boundary.
    const written = await writer.write(intent, snapshot);
    if (written.sha256 !== actualSha256 ||
        written.byteLength !== snapshot.length ||
        written.quarantined !== true || written.approved !== false ||
        written.readEnabled !== false || written.publishEnabled !== false) {
      throw new PrivateStagingError();
    }
    return Object.freeze({
      candidateSha256: actualSha256, candidateBytes: snapshot.length,
      integrityVerified: true as const, scannerObserved: true as const,
      quarantineWriteObserved: true as const, quarantined: true as const,
      approved: false as const, readEnabled: false as const,
      publishEnabled: false as const, safeForPublication: false as const,
    });
  } catch {
    // Hide scanner internals, local paths, attempted object keys and grants.
    throw new PrivateStagingError();
  }
}
