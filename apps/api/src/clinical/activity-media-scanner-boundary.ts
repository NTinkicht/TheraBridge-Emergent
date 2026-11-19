import { createHash } from 'node:crypto';
import { MAX_ACTIVITY_MEDIA_BYTES } from './activity-media-intake-preflight';

/**
 * WU4-I: isolated fail-closed antivirus evidence boundary. There is no live
 * scanner wired, no HTTP endpoint, no storage promotion, and no release path.
 * The caller MUST supply an authenticated trusted server-side scanner adapter;
 * user-provided scan results MUST NOT be passed as scanner implementations.
 */
export type ScannerAttestation = Readonly<{
  verdict: 'CLEAN' | 'INFECTED' | 'ERROR' | 'UNKNOWN';
  sha256: string;
  scannedBytes: number;
  engine: string;
  signatureSetVersion: string;
}>;
export type PrivateScanner = (snapshot: Buffer) => Promise<ScannerAttestation>;
export type ScannerEvidence = Readonly<{
  sha256: string;
  byteLength: number;
  engine: string;
  signatureSetVersion: string;
  scanObserved: true;
  quarantined: true;
  approved: false;
  readEnabled: false;
  publishEnabled: false;
}>;
export class ScannerBoundaryError extends Error {
  constructor() { super('Private candidate scan rejected.'); }
}
const DIGEST = /^[0-9a-f]{64}$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/;

export async function scanPrivateCandidate(bytes: unknown, scanner?: PrivateScanner): Promise<ScannerEvidence> {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 ||
      bytes.length > MAX_ACTIVITY_MEDIA_BYTES || typeof scanner !== 'function') {
    throw new ScannerBoundaryError();
  }
  // Snapshot caller-controlled bytes before the first async boundary.
  const snapshot = Buffer.from(bytes);
  const expectedHash = createHash('sha256').update(snapshot).digest('hex');
  let proof: ScannerAttestation;
  try {
    proof = await scanner(Buffer.from(snapshot));
  } catch {
    throw new ScannerBoundaryError();
  }
  if (!proof || typeof proof !== 'object' ||
      proof.verdict !== 'CLEAN' || typeof proof.sha256 !== 'string' ||
      !DIGEST.test(proof.sha256) || proof.sha256 !== expectedHash ||
      proof.scannedBytes !== snapshot.length ||
      typeof proof.engine !== 'string' || !LABEL.test(proof.engine) ||
      typeof proof.signatureSetVersion !== 'string' || !LABEL.test(proof.signatureSetVersion)) {
    throw new ScannerBoundaryError();
  }
  return Object.freeze({
    sha256: expectedHash,
    byteLength: snapshot.length,
    engine: proof.engine,
    signatureSetVersion: proof.signatureSetVersion,
    scanObserved: true as const,
    quarantined: true as const,
    approved: false as const,
    readEnabled: false as const,
    publishEnabled: false as const,
  });
}
