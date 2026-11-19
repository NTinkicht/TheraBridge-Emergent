import { createHash } from 'node:crypto';

/**
 * WU4-E: pure intake preflight only. This is NOT a safe image decoder, malware
 * scanner, rights attestation, storage adapter or publication authorization.
 * Never expose this helper as an upload or approved-media endpoint.
 */
export const MAX_ACTIVITY_MEDIA_BYTES = 8 * 1024 * 1024;
export const MAX_ACTIVITY_MEDIA_EDGE = 4096;
export const MAX_ACTIVITY_MEDIA_PIXELS = 12_000_000;

export type ActivityMediaPreflight = Readonly<{
  format: 'png';
  width: number;
  height: number;
  byteLength: number;
  sha256: string;
  approved: false;
  publishEnabled: false;
  safeForStorage: false;
}>;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export class ActivityMediaPreflightError extends Error {
  constructor() { super('Activity image intake preflight rejected.'); }
}

/**
 * Fail-closed, bounded PNG header preflight for synthetic candidate bytes.
 * A valid return value is INSUFFICIENT to store, display, or approve imagery.
 * A dedicated, sandboxed image decoder, full-file integrity validation, AV,
 * immutable provenance and human rights/clinical review are mandatory later.
 */
export function preflightActivityMedia(bytes: unknown): ActivityMediaPreflight {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 || bytes.length > MAX_ACTIVITY_MEDIA_BYTES) {
    throw new ActivityMediaPreflightError();
  }
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ActivityMediaPreflightError();
  // PNG must begin with an exact 13-byte IHDR data chunk.
  if (bytes.readUInt32BE(8) !== 13 || !bytes.subarray(12, 16).equals(Buffer.from([0x49, 0x48, 0x44, 0x52]))) {
    throw new ActivityMediaPreflightError();
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const depth = bytes[24];
  const color = bytes[25];
  const compression = bytes[26];
  const filter = bytes[27];
  const interlace = bytes[28];
  if (
    width < 1 || height < 1 ||
    width > MAX_ACTIVITY_MEDIA_EDGE || height > MAX_ACTIVITY_MEDIA_EDGE ||
    width * height > MAX_ACTIVITY_MEDIA_PIXELS ||
    depth !== 8 || ![2, 6].includes(color) ||
    compression !== 0 || filter !== 0 || interlace !== 0
  ) throw new ActivityMediaPreflightError();

  // Digest is an untrusted-candidate fingerprint, NOT proof of clean content.
  return Object.freeze({
    format: 'png' as const, width, height, byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    approved: false as const, publishEnabled: false as const, safeForStorage: false as const,
  });
}
